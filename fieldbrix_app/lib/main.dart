import 'package:flutter/material.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  const dsn = String.fromEnvironment('SENTRY_DSN');

  await SentryFlutter.init(
    (options) {
      options.dsn = dsn;
      options.environment = const String.fromEnvironment(
        'SENTRY_ENVIRONMENT',
        defaultValue: 'local',
      );
      options.release = const String.fromEnvironment(
        'SENTRY_RELEASE',
        defaultValue: 'fieldbrix-mobile@0.0.0-dev',
      );
      options.sendDefaultPii = false;
      options.tracesSampleRate = dsn.isEmpty ? 0 : 0.1;
      options.beforeSend = (event, hint) => event;
    },
    appRunner: () => runApp(const FieldbrixApp()),
  );
}

class FieldbrixApp extends StatelessWidget {
  const FieldbrixApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'FieldBrix',
      theme: ThemeData(colorScheme: ColorScheme.fromSeed(seedColor: Colors.teal)),
      home: const FoundationScreen(),
    );
  }
}

class FoundationScreen extends StatelessWidget {
  const FoundationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('FieldBrix', style: TextStyle(fontSize: 30, fontWeight: FontWeight.w700)),
            SizedBox(height: 8),
            Text('Mobile foundation is ready.'),
          ],
        ),
      ),
    );
  }
}
