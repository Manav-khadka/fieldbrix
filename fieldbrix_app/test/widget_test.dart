import 'package:fieldbrix_app/main.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('renders the FieldBrix foundation shell', (tester) async {
    await tester.pumpWidget(const FieldbrixApp());

    expect(find.text('FieldBrix'), findsOneWidget);
    expect(find.text('Mobile foundation is ready.'), findsOneWidget);
  });
}
