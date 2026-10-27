# Booking Pages

This directory contains the public-facing booking pages for customers to schedule appointments.

## Structure

```
book/
├── [slug]/
│   └── [location]/
│       └── [business_slug]/
│           └── [service_slug]/
│               ├── page.tsx         # Main booking page
│               └── loading.tsx      # Loading skeleton
└── confirm/
    └── [bookingId]/
        └── page.tsx                 # Confirmation page
```

## Required Dependencies

Before using these pages, install the following npm packages:

```bash
npm install react-day-picker@^8.10.0 @radix-ui/react-collapsible@^1.1.0
```

Or if using pnpm:

```bash
pnpm add react-day-picker@^8.10.0 @radix-ui/react-collapsible@^1.1.0
```

## Components Included

The following UI components have been added to support the booking pages:

- `components/ui/calendar.tsx` - Date picker calendar component
- `components/ui/collapsible.tsx` - Collapsible section component
- `components/ui/toast.tsx` - Toast notification component
- `components/ui/toaster.tsx` - Toast container
- `hooks/use-toast.ts` - Toast hook for notifications

## Usage

Navigate to a booking page using this URL structure:

```
/book/[slug]/[location]/[business_slug]/[service_slug]
```

### Examples

```
/book/beauty/austin/janes-salon/mens-haircut
/book/medical/chicago/health-clinic/annual-checkup
/book/fitness/miami/gym-pro/personal-training
```

### Query Parameters

You can pre-select date and time using query parameters:

```
/book/beauty/austin/janes-salon/mens-haircut?date=2025-01-15&time=10:30
```

## Current Implementation Status

**✅ Completed Features:**

- Responsive booking UI with calendar and time slot selection
- Provider/employee filtering
- Contact form with validation
- Session storage for form persistence
- Loading states and animations
- Confirmation page
- URL query parameter support (date, time)

**🚧 Mock Data (TODO for Future):**

- Business information (currently derived from URL slugs)
- Service details (currently derived from URL slugs)
- Provider/employee list (currently static mock data)
- Time slot availability (currently mock data)
- Booking submission (currently simulated)

## Future Database Integration

All sections that use mock data are marked with `TODO` comments explaining:

- What database table to query
- What fields to select
- What conditions to apply
- Error handling for missing data

### Example TODO Locations

**Business Data:**

```typescript
// TODO: Replace with real database query
// Query: supabase.from('businesses').select('*').eq('slug', business_slug)
```

**Service Data:**

```typescript
// TODO: Replace with real service query
// Query: supabase.from('services').select('*, service_cards(*)')
//   .eq('business_id', businessId)
//   .eq('slug', service_slug)
```

**Availability:**

```typescript
// TODO: Replace with Cronofy availability check
// Should call /api/cronofy/freebusy with date range
```

**Booking Creation:**

```typescript
// TODO: Replace with real API call to /api/bookings/create
// Should:
// 1. Create booking record in database
// 2. Create calendar events via Cronofy
// 3. Send confirmation email
// 4. Return real booking ID
```

## Testing

To test the booking flow:

1. Start the development server:

   ```bash
   npm run dev
   ```

2. Navigate to a test booking page:

   ```
   http://localhost:3000/book/beauty/austin/janes-salon/mens-haircut
   ```

3. Test features:
   - ✅ Select a date from the calendar
   - ✅ Choose a time slot
   - ✅ Fill out the contact form
   - ✅ Submit the booking
   - ✅ View confirmation page

4. Test URL parameters:
   ```
   http://localhost:3000/book/beauty/austin/janes-salon/mens-haircut?date=2025-01-20&time=14:00
   ```

## Notes

- All data is currently mocked for UI/UX demonstration
- Database integration will be added after the data layer is updated with slug support
- The slug parsing logic capitalizes words and removes hyphens to create display names
- Form data persists in sessionStorage to survive page refreshes
