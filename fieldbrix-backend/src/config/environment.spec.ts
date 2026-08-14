import { validateEnvironment } from './environment';

describe('validateEnvironment', () => {
  it('normalizes safe defaults', () => {
    expect(validateEnvironment({})).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3000,
      APP_ENV: 'local',
      AWS_REGION: 'ap-south-1',
    });
  });

  it('fails fast for invalid ports', () => {
    expect(() => validateEnvironment({ PORT: 'not-a-port' })).toThrow('PORT');
  });
});
