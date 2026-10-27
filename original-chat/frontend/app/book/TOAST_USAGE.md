# Toast Notifications - Quick Reference

## Installation

First, install the package:

```bash
npm install react-hot-toast
```

## Import

```typescript
import toast from "react-hot-toast";
```

## Basic Usage

### Error/Destructive Toast

```typescript
toast.error("Something went wrong");
```

### Success Toast

```typescript
toast.success("Operation completed successfully");
```

### Info/Default Toast

```typescript
toast("Here's some information");
```

### Loading Toast

```typescript
const toastId = toast.loading("Processing...");

// Later, dismiss and show success
toast.dismiss(toastId);
toast.success("Complete!");
```

## Promise-Based (Recommended for Async Operations)

```typescript
const myAsyncOperation = async () => {
  // Your async code
  const result = await fetch("/api/endpoint");
  return result.json();
};

toast.promise(myAsyncOperation(), {
  loading: "Processing...",
  success: "Done!",
  error: "Failed!",
});
```

## Custom Duration

```typescript
// Show for 2 seconds
toast.success("Quick message", { duration: 2000 });

// Show for 10 seconds
toast.error("Important error", { duration: 10000 });
```

## Custom Styling (Per Toast)

```typescript
toast.success("Custom styled toast", {
  style: {
    background: "#f0fdf4",
    color: "#166534",
    border: "1px solid #22c55e",
  },
});
```

## Custom Icons

```typescript
// Emoji icon
toast("Great job!", { icon: "🎉" });

// No icon
toast.success("Done", { icon: null });
```

## Dismiss Toasts

```typescript
// Dismiss all toasts
toast.dismiss();

// Dismiss specific toast
const id = toast.loading("Loading...");
toast.dismiss(id);
```

## Current Settings (Configured)

Our app has these global settings:

- **Position:** Top right
- **Duration:** 4 seconds (default), 5 seconds (errors)
- **Style:** Matches shadcn UI components
- **Colors:**
  - Success: Green border
  - Error: Red background + red border
  - Default: White with gray border

## Examples from Booking Page

```typescript
// Past date
toast.error("The selected date has passed. Showing today's availability.");

// Time unavailable
toast.error("The requested time is no longer available. Please select another time.");

// Booking conflict
toast.error("This time was just booked by someone else. Please select another time.");

// Generic error
toast.error("Something went wrong. Please try again.");
```

## When to Use Each Type

### `toast.error()` - Use for:

- Failed validations
- API errors
- User mistakes
- Conflicts or race conditions
- Past dates or unavailable times

### `toast.success()` - Use for:

- Successful operations
- Confirmations
- Completed actions

### `toast()` (default) - Use for:

- Informational messages
- Neutral notifications
- General updates

### `toast.loading()` - Use for:

- Long-running operations
- File uploads
- API calls
- Background processing

### `toast.promise()` - Use for:

- Async operations with feedback
- Form submissions
- Data fetching
- Any operation with clear success/failure

## Visual Appearance

### Success Toast

```
┌─────────────────────────────────┐
│ ✓ Operation completed           │ Green checkmark icon
│   successfully                   │ Green border
└─────────────────────────────────┘
```

### Error Toast

```
┌─────────────────────────────────┐
│ ✕ Something went wrong          │ Red X icon
│                                  │ Red border
└─────────────────────────────────┘ Light red background
```

### Loading Toast

```
┌─────────────────────────────────┐
│ ◷ Processing...                 │ Spinner icon
│                                  │ Default styling
└─────────────────────────────────┘ Doesn't auto-dismiss
```

## Configuration File

The toast configuration is in:

```
components/ui/hot-toast-config.tsx
```

You can modify global settings there.

## Tips

1. **Keep messages concise** - Toasts auto-dismiss, so keep text short
2. **Use promises** - For async operations, `toast.promise()` is cleaner
3. **Don't overuse** - Too many toasts can be annoying
4. **Be specific** - "Booking failed" is better than just "Error"
5. **No titles needed** - Unlike shadcn toasts, just use the message

## Migration from Old System

Old (shadcn):

```typescript
toast({
  title: "Error",
  description: "Something went wrong",
  variant: "destructive",
});
```

New (react-hot-toast):

```typescript
toast.error("Something went wrong");
```

Much simpler! 🎉
