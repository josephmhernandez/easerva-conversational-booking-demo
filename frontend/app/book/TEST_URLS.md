# Booking Page Test URLs

## Quick Test Links

Copy and paste these URLs into your browser to test different scenarios.

### Basic Test (No Query Params)

```
http://localhost:3000/book/beauty/austin/janes-salon/mens-haircut
```

### Valid Date Only

```
http://localhost:3000/book/beauty/austin/janes-salon/mens-haircut?date=2025-12-20
```

### Valid Date + Valid Time (09:00)

```
http://localhost:3000/book/beauty/austin/janes-salon/mens-haircut?date=2025-12-20&time=09:00
```

### Valid Date + Valid Time (10:30)

```
http://localhost:3000/book/beauty/austin/janes-salon/mens-haircut?date=2025-12-20&time=10:30
```

### Valid Date + Valid Time (14:00)

```
http://localhost:3000/book/beauty/austin/janes-salon/mens-haircut?date=2025-12-20&time=14:00
```

### Valid Date + Valid Time (15:30)

```
http://localhost:3000/book/beauty/austin/janes-salon/mens-haircut?date=2025-12-20&time=15:30
```

### Valid Date + INVALID Time (Should Show Toast)

```
http://localhost:3000/book/beauty/austin/janes-salon/mens-haircut?date=2025-12-20&time=13:00
```

### Past Date (Should Show Error Toast)

```
http://localhost:3000/book/beauty/austin/janes-salon/mens-haircut?date=2023-01-01
```

### Invalid Date Format (Should Default to Today)

```
http://localhost:3000/book/beauty/austin/janes-salon/mens-haircut?date=invalid
```

### Different Service Examples

```
http://localhost:3000/book/fitness/miami/peak-gym/personal-training?date=2025-12-25&time=09:00
http://localhost:3000/book/medical/chicago/wellness-clinic/annual-checkup?date=2026-01-15&time=10:30
http://localhost:3000/book/home-services/dallas/fix-it-pros/plumbing?date=2025-12-18&time=14:00
```

## What to Look For

### ✅ Success Indicators

1. **Valid Date:**
   - Calendar should navigate to the correct month
   - Selected date should be highlighted with orange/pink gradient
   - Console should show: `✅ Setting date to: [correct date]`

2. **Valid Time:**
   - Time slot button should be highlighted with orange/pink gradient
   - Time should appear in the footer summary
   - Console should show: `✅ URL time is available`

3. **Invalid Time:**
   - Toast notification should appear saying "Time unavailable"
   - No time slot should be highlighted
   - Console should show: `❌ URL time not available`

4. **Past Date:**
   - Toast notification should appear saying "Date in the past"
   - Calendar should default to today's date
   - Console should show: `⚠️ Date is in the past`

### 🐛 Debug Console Logs

Open browser console (F12) to see detailed logs:

- `🔧 Initializing booking page` - Component mounting
- `📅 URL Date: [date]` - Date parameter received
- `⏰ URL Time: [time]` - Time parameter received
- `📆 Parsed date: [date]` - Date parsing result
- `✅ Setting date to: [date]` - Date being set
- `🔍 Fetching time slots for: [date]` - Time slots being loaded
- `✅ Time slots loaded: X slots` - Time slots received
- `🔍 Checking URL time availability: [time]` - Time validation
- `✅ URL time is available` OR `❌ URL time not available`

### ❌ Common Issues

If something doesn't work:

1. Check browser console for error messages
2. Verify the URL is copied correctly (no extra spaces)
3. Make sure dev server is running (`npm run dev`)
4. Check that date is in YYYY-MM-DD format
5. Check that time is in HH:MM format (24-hour)
6. Verify time is in the available slots list (see below)

## Available Time Slots

These are the mock time slots available:

- **09:00** - Sarah (Provider ID: 1)
- **09:45** - Mike (Provider ID: 2)
- **10:30** - Sarah (Provider ID: 1)
- **11:15** - Emily (Provider ID: 3)
- **14:00** - Mike (Provider ID: 2)
- **14:45** - Sarah (Provider ID: 1)
- **15:30** - Emily (Provider ID: 3)
- **16:15** - Mike (Provider ID: 2)

Any time NOT in this list will trigger the "Time unavailable" toast.

## Testing Checklist

- [ ] Basic URL loads correctly
- [ ] Date parameter works
- [ ] Time parameter works
- [ ] Date + Time together works
- [ ] Invalid time shows toast
- [ ] Past date shows toast and defaults to today
- [ ] Calendar navigates to correct month
- [ ] Selected date is highlighted
- [ ] Selected time is highlighted
- [ ] Footer shows correct date and time
- [ ] Changing date resets time selection
- [ ] Provider filter works
- [ ] Form validation works
- [ ] Toaster component shows notifications

## Notes

- Toaster component has been added to root layout
- All query param handling has been fixed
- Date parsing now handles local timezone correctly
- Debug logging added for troubleshooting
- Time validation only runs once on initial load
