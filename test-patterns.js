// Test script to verify credit card pattern detection
const testCreditCardPattern = /\b(?:4[0-9]{3}|5[1-5][0-9]{2}|3[47][0-9]{2}|6(?:011|5[0-9]{2}))[\s\-]?[0-9]{4}[\s\-]?[0-9]{4}[\s\-]?[0-9]{4}\b|\b(?:4[0-9]{3}|5[1-5][0-9]{2}|3[47][0-9]{2}|6(?:011|5[0-9]{2}))[0-9\s\-]{8,16}\b/g;

const testCases = [
  "4485-5687-9385-0969",
  "4485568793850969",
  "4485 5687 9385 0969",
  "5555-4444-3333-2222",
  "4111-1111-1111-1111",
  "This is not a credit card: 1234-5678-9012-3456",
  "Regular text with no sensitive data"
];

console.log("Testing credit card pattern detection:");
console.log("=====================================");

testCases.forEach((testCase, index) => {
  const matches = testCase.match(testCreditCardPattern);
  const isMatch = matches && matches.length > 0;
  
  console.log(`Test ${index + 1}: "${testCase}"`);
  console.log(`  Result: ${isMatch ? '✅ DETECTED' : '❌ NOT DETECTED'}`);
  if (isMatch) {
    console.log(`  Matches: ${matches.join(', ')}`);
  }
  console.log("");
});

// Test the specific case you mentioned
const yourNumber = "4485-5687-9385-0969";
const result = yourNumber.match(testCreditCardPattern);
console.log(`Your specific number: "${yourNumber}"`);
console.log(`Detection result: ${result ? '✅ WILL BE DETECTED' : '❌ WILL NOT BE DETECTED'}`);
if (result) {
  console.log(`Matched: ${result.join(', ')}`);
} 