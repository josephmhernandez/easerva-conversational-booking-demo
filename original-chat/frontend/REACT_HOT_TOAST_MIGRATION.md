# React Hot Toast Migration Guide

## Overview

Successfully migrated from shadcn/ui toast system to react-hot-toast for better performance, easier API, and cleaner implementation.

## Installation

Install react-hot-toast:

```bash
npm install react-hot-toast
```

## Changes Made

### 1. Created Custom Toast Configuration

**File:** `components/ui/hot-toast-config.tsx`

This file configures react-hot-toast with styling that matches our shadcn UI components:

- **Position:** Top right of screen
- **Auto-dismiss:** 4 seconds (default), 5 seconds (errors)
- **Styling:** Matches shadcn card styling with rounded corners, shadows, and borders
- **Colors:**
  - Success: Green border (#22c55e)
  - Error: Red border with light red background (#ef4444, #fef2f2)
  - Default: White with gray border
  - Loading: Blue icon theme

### 2. Updated Root Layout

**File:** `app/layout.tsx`

Replaced shadcn Toaster with HotToaster:

```typescript
import { HotToaster } from "@/components/ui/hot-toast-config"

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <HotToaster />  // ← Renders toast container
      </body>
    </html>
  )
}
```

### 3. Updated Booking Page

**File:** `app/book/[category]/[location]/[business_slug]/[service_slug]/page.tsx`

Changed from:

```typescript
import { useToast } from "@/hooks/use-toast";
const { toast } = useToast();

toast({
  title: "Error",
  description: "Something went wrong",
  variant: "destructive",
});
```

To:

```typescript
import toast from "react-hot-toast";

toast.error("Something went wrong");
```

## API Changes

### Old (shadcn/ui toast):

```typescript
// Error/Destructive
toast({
  title: "Error title",
  description: "Error description",
  variant: "destructive",
});

// Success
toast({
  title: "Success",
  description: "Operation completed",
});

// Default
toast({
  title: "Info",
  description: "Some information",
});
```

### New (react-hot-toast):

```typescript
// Error
toast.error("Error message");

// Success
toast.success("Success message");

// Default/Info
toast("Info message");

// Loading (with promise)
toast.promise(myAsyncFunction(), {
  loading: "Processing...",
  success: "Done!",
  error: "Failed!",
});

// Custom duration
toast.success("Message", { duration: 3000 });

// Dismiss programmatically
const toastId = toast.loading("Processing...");
toast.dismiss(toastId);
toast.success("Complete!");
```

## Styling Details

The toast styling matches shadcn UI components:

### Colors & Borders

- **Background:** `#ffffff` (white)
- **Text:** `#09090b` (near black)
- **Border:** `#e4e4e7` (gray-200)
- **Border Radius:** `0.75rem` (12px)
- **Shadow:** `0 4px 6px -1px rgb(0 0 0 / 0.1)`

### Success Toast

- **Border:** `#22c55e` (green-500)
- **Icon:** Green checkmark

### Error Toast

- **Background:** `#fef2f2` (red-50)
- **Text:** `#991b1b` (red-800)
- **Border:** `#ef4444` (red-500)
- **Icon:** Red X

### Loading Toast

- **Icon:** Blue spinner (#3b82f6)
- **Duration:** Infinite (manual dismiss)

## Positioning & Behavior

- **Position:** Top right corner
- **Gutter:** 8px spacing between toasts
- **Max Width:** 420px
- **Animation:** Smooth slide-in from right
- **Stack:** Multiple toasts stack vertically
- **Auto-dismiss:** Yes (except loading toasts)

## Migration Checklist

- [x] Install react-hot-toast package
- [x] Create hot-toast-config.tsx with custom styling
- [x] Update root layout.tsx to use HotToaster
- [x] Update booking page to use toast from react-hot-toast
- [x] Remove useToast hook usage
- [x] Update all toast calls to new API
- [x] Remove old toast/toaster components (optional)
- [x] Test all toast notifications
- [x] Verify styling matches design system
- [x] Verify positioning (top-right)
- [x] Verify auto-dismiss works

## Files That Can Be Removed (Optional)

These files are no longer needed:

- `components/ui/toast.tsx`
- `components/ui/toaster.tsx`
- `hooks/use-toast.ts`

**Note:** Keep them for now if other parts of the app still use them. Remove once fully migrated.

## Benefits of React Hot Toast

1. **Simpler API:** No need for complex hook management
2. **Better Performance:** Lightweight and optimized
3. **Easier Testing:** Direct function calls instead of hook dependencies
4. **More Features:** Promise support, custom render, etc.
5. **Smaller Bundle:** Less code than shadcn implementation
6. **Better TypeScript:** Full type support out of the box

## Usage Examples for Booking Page

```typescript
// Past date error
toast.error("The selected date has passed. Showing today's availability.");

// Time unavailable
toast.error("The requested time is no longer available.");

// Booking conflict
toast.error("This time was just booked by someone else.");

// Booking failure
toast.error("Something went wrong. Please try again.");

// Success (if needed)
toast.success("Booking confirmed!");

// Loading with promise
const bookingPromise = createBooking();
toast.promise(bookingPromise, {
  loading: "Creating booking...",
  success: "Booking confirmed!",
  error: "Booking failed. Please try again.",
});
```

## Testing

Test all toast scenarios in the booking page:

1. **Past Date:**

   ```
   http://localhost:3000/book/beauty/austin/janes-salon/mens-haircut?date=2023-01-01
   ```

   ✅ Should show error toast top-right: "The selected date has passed..."

2. **Invalid Time:**

   ```
   http://localhost:3000/book/beauty/austin/janes-salon/mens-haircut?date=2025-12-20&time=13:00
   ```

   ✅ Should show error toast: "The requested time is no longer available..."

3. **Booking Conflict (10% random):**
   - Fill form and submit multiple times
     ✅ Should occasionally show: "This time was just booked by someone else..."

4. **Multiple Toasts:**
   - Trigger multiple errors quickly
     ✅ Should stack nicely in top-right corner

## Custom Toast Options

You can override global config per toast:

```typescript
// Custom duration
toast.error("Quick message", { duration: 2000 });

// Custom styling
toast.success("Custom style", {
  style: {
    background: "#f0fdf4",
    color: "#166534",
  },
});

// Custom icon
toast("Custom icon", {
  icon: "👏",
});

// No icon
toast.success("No icon", {
  icon: null,
});
```

## Dark Mode Support (Future)

To add dark mode support later:

```typescript
// In hot-toast-config.tsx
toastOptions: {
  style: {
    background: 'hsl(var(--background))',
    color: 'hsl(var(--foreground))',
    border: '1px solid hsl(var(--border))',
    // ... use CSS variables
  }
}
```

## Documentation

- **Official Docs:** https://react-hot-toast.com/
- **GitHub:** https://github.com/timolins/react-hot-toast
- **Examples:** https://react-hot-toast.com/docs/examples
