import { describe, it, expect } from '@jest/globals';

// Test basic functionality
describe('Online Ordering Utils', () => {
  it('should have basic functionality', () => {
    // This is a placeholder test to ensure the test setup works
    expect(true).toBe(true);
  });

  it('should handle basic calculations', () => {
    const result = 15 + 25;
    expect(result).toBe(40);
  });
});

// Test the cn utility
describe('CN Utility', () => {
  it('should combine class names correctly', () => {
    // Import the cn utility
    const { cn } = require('../utils/cn');
    
    const result = cn('online-class1', 'online-class2', { 'online-conditional': true });
    expect(result).toBe('online-class1 online-class2 online-conditional');
  });
}); 