# POS Test Automation Framework

This directory contains the test automation framework for the POS system using Playwright.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Install browsers:
```bash
npm run install:browsers
```

## Running Tests

### Unit Tests
```bash
# Run all unit tests
npm run test:unit

# Run unit tests in watch mode
npm run test:unit:watch

# Run unit tests with coverage
npm run test:unit:coverage
```

### E2E Tests
```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run E2E tests in headed mode (visible browser)
npm run test:e2e:headed

# Run E2E tests in debug mode
npm run test:e2e:debug

# Show E2E test report
npm run test:e2e:report
```

### All Tests
```bash
# Run all tests (unit + E2E)
npm run test:all
```

## Test Structure

### Unit Tests
- Located in each application's `src/__tests__/` directory
- Test individual components and utilities
- Use Jest and React Testing Library

### E2E Tests
- Located in `tests/` directory
- Test complete user workflows
- Use Playwright for browser automation

## Test Applications

### POS Client (`pos-client.spec.ts`)
- Tests the main POS application
- Covers menu navigation, cart functionality, and checkout process

### Admin Dashboard (`admin-dashboard.spec.ts`)
- Tests the admin management interface
- Covers login, menu management, and order viewing

### Online Ordering (`online-ordering.spec.ts`)
- Tests the customer-facing online ordering system
- Covers store selection, menu browsing, and order placement

## Configuration

### Playwright Config (`playwright.config.ts`)
- Configures test browsers (Chrome, Firefox, Safari, Mobile)
- Sets up web servers for each application
- Configures test timeouts and retries

### Jest Config (`../jest.config.js`)
- Configures unit test environment
- Sets up TypeScript support
- Configures test coverage reporting

## CI/CD Integration

The test automation is integrated with Bitbucket Pipelines:

1. **Unit Tests**: Run Jest tests for all applications
2. **Linting**: Run ESLint on all TypeScript/React code
3. **Build Tests**: Verify all applications build successfully
4. **E2E Tests**: Run Playwright tests against all applications

## Adding New Tests

### Unit Tests
1. Create test file in `src/__tests__/` directory
2. Use Jest and React Testing Library
3. Follow naming convention: `*.test.ts` or `*.spec.ts`

### E2E Tests
1. Create test file in `tests/` directory
2. Use Playwright test framework
3. Follow naming convention: `*.spec.ts`

## Test Data

- Use `data-testid` attributes for reliable element selection
- Mock external dependencies (Firebase, APIs)
- Use test fixtures for consistent test data

## Debugging

### Unit Tests
```bash
npm run test:unit -- --verbose
```

### E2E Tests
```bash
# Run with debug mode
npm run test:e2e:debug

# Run specific test file
npm run test:e2e -- tests/pos-client.spec.ts

# Run with headed browser
npm run test:e2e:headed
```

## Best Practices

1. **Isolation**: Each test should be independent
2. **Reliability**: Use stable selectors (`data-testid`)
3. **Performance**: Keep tests fast and efficient
4. **Maintainability**: Write clear, readable test code
5. **Coverage**: Aim for comprehensive test coverage 