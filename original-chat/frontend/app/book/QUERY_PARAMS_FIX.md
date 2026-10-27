# Query Parameters Fix & Testing Guide

## Issues Fixed

### 1. Date Comparison Bug

**Problem:** Date comparison was including time, causing today's date to be treated as "past" sometimes.

**Fix:** Now compares dates with time components zeroed out:

```typescript
const today = new Date();
today.setHours(0, 0, 0, 0);
const selectedDateOnly = new Date(date);
selectedDateOnly.setHours(0, 0, 0, 0);

if (selectedDateOnly < today) {
  // Show error
}
```

### 2. Time Reset on Initial Load

**Problem:** Selected time from URL was being reset by the date change effect.

**Fix:** Added check to preserve urlTime on initial mount:

```typescript
const isInitialMount = useRef(true);

useEffect(() => {
  if (isInitialMount.current) {
    isInitialMount.current = false;
    return; // Keep urlTime on initial mount
  }

  if (selectedDate) {
    setSelectedTime(undefined);
  }
}, [selectedDate]);
```

### 3. Invalid Date Handling

**Problem:** Invalid date formats would cause errors.

**Fix:** Added validation and fallback to today's date:

```typescript
if (!isNaN(date.getTime())) {
  // Valid date
} else {
  // Invalid date - default to today
  setSelectedDate(new Date());
}
```

### 4. Time Slot Validation

**Problem:** URL time validation would run on every fetch, not just initial load.

**Fix:** Now only validates if selectedTime matches urlTime:

```typescript
if (urlTime && selectedTime === urlTime && !filteredSlots.find((s) => s.time === urlTime)) {
  toast({ title: "Time unavailable", ... })
  setSelectedTime(undefined)
}
```

## Test URLs

### Valid Date Only

```
http://localhost:3000/book/beauty/austin/janes-salon/mens-haircut?date=2025-12-20
http://localhost:3000/book/beauty/austin/janes-salon/mens-haircut?date=2025-06-15
```

### Valid Date + Valid Time

```
http://localhost:3000/book/beauty/austin/janes-salon/mens-haircut?date=2025-12-20&time=09:00
http://localhost:3000/book/beauty/austin/janes-salon/mens-haircut?date=2025-06-15&time=10:30
http://localhost:3000/book/beauty/austin/janes-salon/mens-haircut?date=2025-03-10&time=14:00
http://localhost:3000/book/beauty/austin/janes-salon/mens-haircut?date=2025-08-25&time=15:30
```

### Valid Date + Invalid Time (Should Show Toast)

```
http://localhost:3000/book/beauty/austin/janes-salon/mens-haircut?date=2025-12-20&time=13:00
http://localhost:3000/book/beauty/austin/janes-salon/mens-haircut?date=2025-06-15&time=12:00
```

### Past Date (Should Show Error Toast)

```
http://localhost:3000/book/beauty/austin/janes-salon/mens-haircut?date=2023-01-01
http://localhost:3000/book/beauty/austin/janes-salon/mens-haircut?date=2020-12-25
```

### Invalid Date Format (Should Default to Today)

```
http://localhost:3000/book/beauty/austin/janes-salon/mens-haircut?date=invalid-date
http://localhost:3000/book/beauty/austin/janes-salon/mens-haircut?date=2025-13-45
```

### Today's Date (Should Work)

```
http://localhost:3000/book/beauty/austin/janes-salon/mens-haircut?date=2025-12-16
```

## Available Mock Time Slots

The following times are available in the mock data:

- **09:00** (Sarah)
- **09:45** (Mike)
- **10:30** (Sarah)
- **11:15** (Emily)
- **14:00** (Mike)
- **14:45** (Sarah)
- **15:30** (Emily)
- **16:15** (Mike)

Times outside this list will show "Time unavailable" toast.

## Expected Behaviors

### Scenario 1: Valid Date + Valid Time

1. Page loads
2. Calendar shows selected date
3. Time slots appear (after 500ms mock delay)
4. Selected time is highlighted with gradient background
5. Contact form is visible
6. Footer shows selected date and time

### Scenario 2: Valid Date + Invalid Time

1. Page loads
2. Calendar shows selected date
3. Time slots appear
4. Toast notification: "Time unavailable"
5. No time is pre-selected
6. User must select a valid time

### Scenario 3: Past Date

1. Page loads
2. Toast notification: "Date in the past"
3. Calendar defaults to today's date
4. Time slots appear for today
5. User can proceed with booking

### Scenario 4: Date Only (No Time)

1. Page loads
2. Calendar shows selected date
3. Time slots appear
4. No time is pre-selected
5. User must select a time

### Scenario 5: No Query Params

1. Page loads
2. Calendar defaults to today
3. Time slots appear for today
4. User selects date and time

## Running Unit Tests

The booking page now has comprehensive unit tests covering:

- URL parameter handling (date, time, both)
- Past date handling
- Invalid date format handling
- Date selection resets time
- Provider filtering
- Form validation
- Session storage persistence
- Booking submission

Run tests with:

```bash
npm test -- BookingPage.test.tsx
```

Or run all tests:

```bash
npm test
```

## Manual Testing Checklist

- [ ] Valid date parameter pre-selects date
- [ ] Valid time parameter pre-selects time
- [ ] Both parameters work together
- [ ] Past date shows error and defaults to today
- [ ] Invalid date defaults to today
- [ ] Invalid time shows warning toast
- [ ] Changing date resets time selection
- [ ] Provider filter updates time slots
- [ ] Form data persists in sessionStorage
- [ ] Form validation works correctly
- [ ] Submit button is disabled when form is invalid
- [ ] Successful booking navigates to confirmation page
- [ ] Back button works
- [ ] Calendar navigation arrows have pointer cursor
- [ ] Date cells have pointer cursor
- [ ] Disabled dates have not-allowed cursor
