import { getFestiveTypeForDate } from './festiveUtils';

// Test the festive system with different dates
export const testFestiveSystem = () => {
  const testDates = [
    { date: new Date(2024, 11, 25), expected: 'christmas', description: 'Christmas Day' },
    { date: new Date(2024, 0, 1), expected: 'christmas', description: 'New Year' },
    { date: new Date(2024, 0, 7), expected: 'none', description: 'After Epiphany' },
    { date: new Date(2024, 9, 31), expected: 'halloween', description: 'Halloween' },
    { date: new Date(2024, 10, 2), expected: 'halloween', description: 'Day of the Dead' },
    { date: new Date(2024, 10, 3), expected: 'none', description: 'After Halloween season' },
    { date: new Date(2024, 5, 15), expected: 'none', description: 'Regular day' },
  ];

  console.log('Testing Festive System:');
  console.log('=======================');
  
  testDates.forEach(({ date, expected, description }) => {
    const result = getFestiveTypeForDate(date);
    const status = result === expected ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${description}: ${date.toDateString()} -> ${result} (expected: ${expected})`);
  });
  
  console.log('=======================');
  console.log('Current date test:');
  const currentResult = getFestiveTypeForDate(new Date());
  console.log(`Today (${new Date().toDateString()}) -> ${currentResult}`);
};

// Run the test if this file is executed directly
if (typeof window !== 'undefined') {
  // In browser environment, expose the test function
  (window as any).testFestiveSystem = testFestiveSystem;
} 