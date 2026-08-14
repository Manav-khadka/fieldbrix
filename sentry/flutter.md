# Sentry for Flutter

Hosted project: `fieldbrixxx/flutter`. Use the latest compatible stable `sentry_flutter` release from pub.dev when Sprint 12 begins; commit `pubspec.lock` and run the complete mobile compatibility matrix.

## Build-time contract

The checked-in example already defines:

```json
{
  "SENTRY_DSN": "",
  "SENTRY_ENVIRONMENT": "local",
  "SENTRY_RELEASE": "fieldbrix-mobile@0.0.0-dev"
}
```

Pass real values through an ignored environment JSON file or CI `--dart-define`; never hard-code a DSN or put `SENTRY_AUTH_TOKEN` in a mobile build.

Initialize before the application starts:

```dart
import 'package:flutter/widgets.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

Future<void> main() async {
  const dsn = String.fromEnvironment('SENTRY_DSN');
  if (dsn.isEmpty) {
    runApp(const FieldbrixApp());
    return;
  }

  await SentryFlutter.init(
    (options) {
      options.dsn = dsn;
      options.environment = const String.fromEnvironment('SENTRY_ENVIRONMENT');
      options.release = const String.fromEnvironment('SENTRY_RELEASE');
      options.sendDefaultPii = false;
      options.tracesSampleRate = 0.1;
      options.beforeSend = (event, hint) {
        // Implement the tested mobile scrubber before production enablement.
        return event;
      };
    },
    appRunner: () => runApp(const FieldbrixApp()),
  );
}
```

## Mobile requirements

- Add navigation, HTTP, local-database, sync and upload spans with stable names; do not capture answers, evidence paths, coordinates, access tokens or customer identifiers.
- Keep offline event caching bounded and encrypted by platform storage; flush safely after reconnect.
- Do not attach screenshots by default. Breadcrumbs and support exports must pass the same privacy policy.
- Upload Android/iOS debug symbols and source maps from CI using `SENTRY_AUTH_TOKEN`, `SENTRY_ORG=fieldbrixxx` and `SENTRY_MOBILE_PROJECT=flutter`.
- The uploaded release/dist must match the signed APK/IPA manifest. Keep the SDK-derived build number as `dist`, or explicitly set the same immutable build number in both SDK initialization and the symbol-upload job; environment names are not distribution identifiers.

## Safe verification

Use a development-only button that throws a `StateError`. Verify the event reaches `fieldbrixxx/flutter`, is symbolicated, has the expected release/environment, survives an offline/reconnect test and contains no secrets, PII, evidence or precise location. Remove the button from release builds.
