import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:sentry_flutter/sentry_flutter.dart';
import 'src/screens/home_tasks_screen.dart';

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
      title: 'FieldBrix Mobile',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.teal),
        useMaterial3: true,
      ),
      home: const HomeTasksScreen(),
    );
  }
}

class FoundationScreen extends StatelessWidget {
  const FoundationScreen({super.key});

  static const _sentryDebugEnabled = bool.fromEnvironment(
    'SENTRY_DEBUG_ENABLED',
  );

  void _triggerSentryError() {
    throw StateError('This is test exception from FieldBrix Mobile');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('FieldBrix', style: TextStyle(fontSize: 30, fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            const Text('Mobile foundation is ready.'),
            if (kDebugMode && _sentryDebugEnabled) ...[
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _triggerSentryError,
                style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                child: const Text('Break the world (Mobile)'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
