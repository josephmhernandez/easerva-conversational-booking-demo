# CardPreview Component

A highly performant, reusable React component for displaying business cards with support for both live preview and interactive modes.

## Features

- **Performance Optimized**: Uses `memo`, `useMemo`, and `useCallback` for minimal re-renders
- **Dual Usage**: Supports both editable live preview and interactive card library modes
- **Accessibility**: Keyboard navigation support for interactive elements
- **Customizable**: Optional props for service details (duration, price, distance)
- **Type Safe**: Full TypeScript support with proper interfaces

## Usage

### Live Preview Mode (Editable)

```tsx
import CardPreview from "@/app/components/cards/CardPreview";

function LivePreview() {
  const [expandedDescription, setExpandedDescription] = useState(false);

  return (
    <CardPreview
      card={cardDesign}
      isEditable={true}
      onExpandDescription={setExpandedDescription}
      expandedDescription={expandedDescription}
      // No onCardClick - arrow is not clickable in this mode
    />
  );
}
```

### Library/Gallery Mode (Interactive)

```tsx
import CardPreview from "@/app/components/cards/CardPreview";

function CardLibrary() {
  const handleCardClick = (cardId: string) => {
    // Navigate to card detail or booking page
    router.push(`/cards/${cardId}`);
  };

  const handleExpandDescription = (expanded: boolean) => {
    // Handle description expansion if needed
  };

  return (
    <CardPreview
      card={cardDesign}
      isEditable={false}
      onCardClick={handleCardClick}
      onExpandDescription={handleExpandDescription}
      expandedDescription={false}
      duration="2 hrs"
      priceRange="$100-300"
      distance="1.2 mi"
    />
  );
}
```

## Props

| Prop                  | Type                          | Default     | Description                              |
| --------------------- | ----------------------------- | ----------- | ---------------------------------------- |
| `card`                | `CardDesign`                  | Required    | The card data to display                 |
| `isEditable`          | `boolean`                     | `false`     | Whether this is an editable live preview |
| `onExpandDescription` | `(expanded: boolean) => void` | `undefined` | Handler for description expand/collapse  |
| `expandedDescription` | `boolean`                     | `false`     | Whether description is expanded          |
| `onCardClick`         | `(cardId: string) => void`    | `undefined` | Handler for arrow button clicks          |
| `className`           | `string`                      | `""`        | Additional CSS classes                   |
| `duration`            | `string`                      | `"90 min"`  | Service duration display text            |
| `priceRange`          | `string`                      | `"50-200"`  | Price range display text                 |
| `distance`            | `string`                      | `"0.5 mi"`  | Distance display text                    |

## Performance Features

1. **Memoized Styles**: Background and overlay styles are memoized to prevent recalculation
2. **Memoized Content**: Description logic and badges are computed once per relevant prop change
3. **Optimized Handlers**: Event handlers use `useCallback` to prevent child re-renders
4. **Conditional Rendering**: Only renders interactive elements when needed

## Accessibility

- Keyboard navigation support for clickable arrows
- Proper ARIA roles and attributes
- Screen reader friendly button labels
- Focus management for interactive elements

## CardDesign Interface

The component expects a `CardDesign` object with the following structure:

```typescript
interface CardDesign {
  id: string;
  name: string;
  mediaType: MediaType;
  mediaUrl?: string;
  mediaSettings: MediaSettings;
  profileImage?: string;
  showProfileImage?: boolean;
  backgroundColor: string;
  backgroundGradient?: string;
  pattern?: string;
  headline: string;
  tagline: string;
  bulletPoints: string[];
  ctaText: string;
  badges: BadgeSettings;
  serviceIds: string;
}
```
