
# Fix Video Preview Layout Issue

## Problem Analysis

The Remotion preview player is expanding to fill all available horizontal space without any constraint, pushing the sidebars out of view. This happens because:

1. **RemotionPreview.tsx** uses `w-full aspect-video` which takes 100% width of its parent
2. **Editor.tsx** center area uses `flex-1` without `min-w-0` or `overflow-hidden`, allowing flex items to grow beyond their container
3. No `max-width` constraint is applied to the preview container

## Solution

Apply CSS constraints to both the center container and the preview component:

### File: `src/pages/Editor.tsx`

**Change 1 - Line 1072:** Add `min-w-0` and `overflow-hidden` to the main preview container:
```tsx
// Before:
<div className="flex-1 flex flex-col">

// After:
<div className="flex-1 flex flex-col min-w-0 overflow-hidden">
```

**Change 2 - Line 1074:** Add `overflow-hidden` and constrain the preview wrapper:
```tsx
// Before:
<div className="flex-1 flex flex-col items-center justify-center p-8">

// After:
<div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 overflow-hidden">
```

**Change 3 - Around lines 1101-1119:** Wrap the RemotionPreview in a constrained container:
```tsx
// Before:
{useRemotionPreview ? (
  <RemotionPreview ... />
) : ( ... )}

// After:
<div className="w-full max-w-4xl">
  {useRemotionPreview ? (
    <RemotionPreview ... />
  ) : ( ... )}
</div>
```

### File: `src/components/editor/RemotionPreview.tsx`

**Change - Line 300:** Ensure the container doesn't overflow:
```tsx
// Before:
className={cn(
  "relative w-full bg-black rounded-lg overflow-hidden group",
  isFullscreen ? "fixed inset-0 z-50" : "aspect-video"
)}

// After:
className={cn(
  "relative w-full max-w-full bg-black rounded-lg overflow-hidden group",
  isFullscreen ? "fixed inset-0 z-50" : "aspect-video"
)}
```

## Technical Details

| Property | Purpose |
|----------|---------|
| `min-w-0` | Allows flex items to shrink below their content size (prevents overflow in flex containers) |
| `overflow-hidden` | Clips content that exceeds container bounds |
| `max-w-4xl` (896px) | Constrains preview to a reasonable size that fits between sidebars |

## Result

The preview will:
- Stay within the center column bounds
- Maintain 16:9 aspect ratio
- Not push sidebars off-screen
- Still support fullscreen mode (which uses `fixed inset-0`)

## Files to Modify

1. `src/pages/Editor.tsx` - Add flex constraints and wrapper div
2. `src/components/editor/RemotionPreview.tsx` - Add `max-w-full` safety
