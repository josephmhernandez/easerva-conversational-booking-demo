# Calendar Integration Tests

This directory contains comprehensive unit tests for the Calendar Integration page and related components.

## Test Structure

```
__tests__/
├── app/
│   ├── business/
│   │   └── onboarding/
│   │       ├── calendar-integration-new.test.tsx           # Main component tests
│   │       ├── calendar-integration-new-components.test.tsx # Component-specific tests
│   │       └── calendar-integration-new-integration.test.tsx # Integration tests
│   ├── constants/
│   │   └── businessConstants.test.ts                      # Constants validation
│   └── types/
│       └── businessTypes.test.ts                          # Type definitions tests
├── utils/
│   └── test-utils.tsx                                     # Test utilities and helpers
└── README.md                                              # This file
```

## Test Categories

### 1. Main Component Tests (`calendar-integration-new.test.tsx`)

- **Rendering**: Tests that the page renders correctly with proper title, progress, and content
- **Data Loading**: Tests API data loading and state management
- **Strategy Selection**: Tests switching between different booking strategies
- **User Interactions**: Tests button clicks, form interactions, and modal operations
- **Error Handling**: Tests error states and graceful degradation

### 2. Component-Specific Tests (`calendar-integration-new-components.test.tsx`)

- **Booking Requirements Builder**: Tests requirement configuration logic
- **Service Location Combo Cards**: Tests card display and interaction
- **Calendar Connection Status**: Tests connection status display and management
- **Strategy-Specific Rendering**: Tests different strategy UI components
- **Combining Interface**: Tests service combining functionality
- **Modal Interactions**: Tests dialog and modal behavior
- **Form Validation**: Tests input validation and error display
- **Accessibility**: Tests ARIA labels, keyboard navigation, and screen reader support

### 3. Integration Tests (`calendar-integration-new-integration.test.tsx`)

- **Complete User Journeys**: Tests full workflows for each booking strategy
- **Data Persistence**: Tests saving and restoring user data
- **Error Handling**: Tests API failures and edge cases
- **Performance**: Tests rendering with large datasets and rapid state changes
- **Accessibility**: Tests keyboard navigation and screen reader compatibility

### 4. Type and Constant Tests

- **Business Types**: Tests type definitions and validation
- **Business Constants**: Tests constant values and API compatibility

## Test Utilities

The `test-utils.tsx` file provides:

- **Mock Data Generators**: Functions to create test data for employees, resources, services, etc.
- **API Response Mocking**: Setup functions for mocking fetch responses
- **Custom Render Function**: Enhanced render function with providers
- **Helper Functions**: Utilities for common test operations

## Running Tests

### From Root Directory

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests for CI
npm run test:ci
```

### From Frontend Directory

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests for CI
npm run test:ci
```

## Test Coverage

The tests aim for comprehensive coverage including:

- **Component Rendering**: All UI components render correctly
- **User Interactions**: All user actions work as expected
- **Data Flow**: API data is processed and displayed correctly
- **State Management**: Component state changes work properly
- **Error Handling**: Errors are handled gracefully
- **Accessibility**: Components are accessible to all users
- **Performance**: Components render efficiently

## Mock Data

Tests use realistic mock data that matches the expected API responses:

- **Business Locations**: Physical, virtual, and mobile locations
- **Team Members**: Employees with different roles and locations
- **Booking Strategies**: All five strategy types
- **Resources**: Conference rooms, equipment, and other resources
- **Services**: Various service types with pricing and descriptions
- **Service Location Configurations**: Mappings between services and locations

## Best Practices

1. **Isolation**: Each test is independent and doesn't affect others
2. **Realistic Data**: Mock data closely matches real API responses
3. **User-Centric**: Tests focus on user interactions and workflows
4. **Accessibility**: Tests include accessibility requirements
5. **Performance**: Tests verify efficient rendering and state management
6. **Error Handling**: Tests cover error scenarios and edge cases

## Adding New Tests

When adding new tests:

1. Follow the existing naming conventions
2. Use the provided test utilities
3. Mock external dependencies appropriately
4. Test both happy path and error scenarios
5. Include accessibility considerations
6. Document complex test scenarios

## Debugging Tests

To debug failing tests:

1. Use `screen.debug()` to see the current DOM state
2. Use `waitFor()` for async operations
3. Check mock implementations and API responses
4. Verify test data matches expected formats
5. Use browser dev tools for component debugging
