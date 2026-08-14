const required = [
  'LT_USERNAME',
  'LT_ACCESS_KEY',
  'LT_WEB_URL',
  'LT_BROWSER',
  'LT_PLATFORM',
];

for (const name of required) {
  if (!process.env[name]) {
    throw new Error(`${name} is required`);
  }
}

const username = process.env.LT_USERNAME;
const accessKey = process.env.LT_ACCESS_KEY;
const targetUrl = new URL(process.env.LT_WEB_URL);
if (targetUrl.protocol !== 'https:') {
  throw new Error('LT_WEB_URL must use HTTPS');
}

const browser = process.env.LT_BROWSER;
const platform = process.env.LT_PLATFORM;
const baseUrl = 'https://hub.lambdatest.com/wd/hub';
const auth = `Basic ${Buffer.from(`${username}:${accessKey}`).toString('base64')}`;

async function webdriver(path, method, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      `LambdaTest WebDriver ${method} ${path} failed (${response.status}): ${
        payload.value?.message ?? payload.message ?? 'unknown error'
      }`,
    );
  }
  return payload.value ?? payload;
}

let sessionId;
try {
  const session = await webdriver('/session', 'POST', {
    capabilities: {
      alwaysMatch: {
        browserName: browser,
        browserVersion: 'latest',
        platformName: platform,
        'LT:Options': {
          project: 'FieldBrix',
          build: process.env.GITHUB_RUN_ID
            ? `sprint-01-web-${process.env.GITHUB_RUN_ID}`
            : 'sprint-01-web-local',
          name: `${browser} smoke`,
          w3c: true,
          console: 'error',
          network: false,
          video: true,
        },
      },
    },
  });
  sessionId = session.sessionId;
  if (!sessionId) throw new Error('LambdaTest did not return a session ID');

  await webdriver(`/session/${sessionId}/url`, 'POST', { url: targetUrl.href });
  const state = await webdriver(`/session/${sessionId}/execute/sync`, 'POST', {
    script: 'return { readyState: document.readyState, url: location.href, title: document.title };',
    args: [],
  });

  if (state.readyState !== 'complete') {
    throw new Error(`Page did not finish loading (state: ${state.readyState})`);
  }
  if (new URL(state.url).origin !== targetUrl.origin) {
    throw new Error(`Unexpected redirect from ${targetUrl.origin} to ${state.url}`);
  }

  let consoleCheck = 'unavailable';
  try {
    const logTypes = await webdriver(
      `/session/${sessionId}/se/log/types`,
      'GET',
    );
    if (logTypes.includes('browser')) {
      const logs = await webdriver(`/session/${sessionId}/se/log`, 'POST', {
        type: 'browser',
      });
      const severeErrors = logs.filter((entry) => entry.level === 'SEVERE');
      if (severeErrors.length > 0) {
        throw new Error(
          `Browser console has ${severeErrors.length} severe error(s): ${severeErrors
            .map((entry) => entry.message)
            .join(' | ')}`,
        );
      }
      consoleCheck = 'passed';
    }
  } catch (error) {
    if (String(error.message).includes('severe error(s)')) throw error;
    console.warn(`Browser-console check unavailable: ${error.message}`);
  }

  console.log(
    JSON.stringify({
      event: 'lambdatest.web_smoke_passed',
      browser,
      platform,
      url: state.url,
      title: state.title,
      consoleCheck,
    }),
  );
} finally {
  if (sessionId) {
    await webdriver(`/session/${sessionId}`, 'DELETE').catch((error) => {
      console.warn(`Unable to close LambdaTest session: ${error.message}`);
    });
  }
}
