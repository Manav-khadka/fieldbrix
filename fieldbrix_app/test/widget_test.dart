import 'package:fieldbrix_app/main.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('renders the FieldBrix Mobile home tasks screen', (tester) async {
    await tester.pumpWidget(const FieldbrixApp());
    await tester.pumpAndSettle();

    expect(find.text('FieldBrix Mobile'), findsOneWidget);
    expect(find.text('Today'), findsOneWidget);
    expect(find.text('Start Duty'), findsOneWidget);
  });
}
