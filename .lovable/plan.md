

# Plan: URL-to-Demo Automation (ClickCast-style)

## Overview

You're right - DemoFlix already has most of the pieces but they're not connected smoothly. The current flow requires 4 manual steps (upload → style → duration → name). ClickCast's magic is the single-URL-to-video experience.

I'll streamline DemoFlix to match that experience: paste a URL, click one button, and land in the editor with everything ready.

---

## What You'll Get

1. **Single URL Input on Dashboard** - A prominent "Create from URL" button that takes just a website address
2. **Automatic Project Creation** - No 4-step wizard needed; project is created automatically from the website
3. **Smart Defaults** - Style and duration auto-selected based on the scraped content
4. **Instant Editor Launch** - Jump straight into the editor with AI-generated storyboard ready

---

## Implementation Steps

### Step 1: Add "Create from URL" Quick Action to Dashboard

Add a prominent URL input field on the Dashboard that allows instant demo creation:

```text
+------------------------------------------+
|  Create from URL                         |
|  +-----------------------------------+   |
|  | https://your-product.com      [→] |   |
|  +-----------------------------------+   |
|  Paste any website URL to auto-generate  |
+------------------------------------------+
```

**File:** `src/pages/Dashboard.tsx`

### Step 2: Create URL-to-Demo Service Function

Build a new function that combines scraping + project creation + storyboard generation in one flow:

**New File:** `src/lib/createDemoFromUrl.ts`

This will:
- Call `scrape-website` to capture screenshots and branding
- Auto-create project using the website's title as the name
- Upload captured screenshots as assets
- Auto-select style based on detected brand colors (dark site → cyber style, etc.)
- Trigger `generate-storyboard` to create scenes
- Return the project ID for navigation

### Step 3: Add Loading State with Progress Indicator

Show users what's happening during the automated process:

```text
+------------------------------------------+
|  Creating your demo...                   |
|                                          |
|  ✓ Capturing website pages              |
|  ○ Analyzing brand & content            |
|  ○ Generating AI storyboard             |
|  ○ Preparing editor                      |
|                                          |
|  [========================      ] 65%    |
+------------------------------------------+
```

### Step 4: Update NewDemo Page with "Express Mode"

Add an optional "Express" tab/toggle on the existing NewDemo page for users who want the full wizard:

- **Express Mode (default):** URL only → auto-creates everything
- **Custom Mode:** The existing 4-step wizard for full control

---

## Technical Details

### Dashboard Changes (`src/pages/Dashboard.tsx`)

```typescript
// Add state for URL input
const [quickUrl, setQuickUrl] = useState("");
const [isCreatingFromUrl, setIsCreatingFromUrl] = useState(false);
const [creationProgress, setCreationProgress] = useState({ step: 0, message: "" });

// Add handler for quick creation
const handleQuickCreate = async () => {
  setIsCreatingFromUrl(true);
  try {
    // Step 1: Scrape website
    setCreationProgress({ step: 1, message: "Capturing website..." });
    const scrapeResult = await supabase.functions.invoke('scrape-website', { body: { url: quickUrl } });
    
    // Step 2: Create project with auto-detected name
    setCreationProgress({ step: 2, message: "Creating project..." });
    const projectName = scrapeResult.data.metadata?.title || new URL(quickUrl).hostname;
    const project = await createProject(projectName, autoDetectedStyle);
    
    // Step 3: Upload screenshots as assets
    setCreationProgress({ step: 3, message: "Uploading assets..." });
    await uploadScrapedAssets(project.id, scrapeResult.data.pages);
    
    // Step 4: Generate storyboard
    setCreationProgress({ step: 4, message: "Generating storyboard..." });
    await generateStoryboard(project.id);
    
    // Navigate to editor
    navigate(`/editor/${project.id}`);
  } finally {
    setIsCreatingFromUrl(false);
  }
};
```

### New Service File (`src/lib/createDemoFromUrl.ts`)

```typescript
export async function createDemoFromUrl(
  url: string,
  userId: string,
  onProgress: (step: number, message: string) => void
): Promise<string> {
  // 1. Scrape website
  onProgress(1, "Capturing website pages...");
  const scrapeResult = await scrapeWebsite(url);
  
  // 2. Auto-detect style from branding
  const style = detectStyleFromBranding(scrapeResult.branding);
  
  // 3. Create project
  onProgress(2, "Creating your project...");
  const projectName = scrapeResult.metadata?.title || extractDomain(url);
  const project = await createProject(userId, projectName, style);
  
  // 4. Upload screenshots
  onProgress(3, "Processing screenshots...");
  const assetUrls = await uploadScreenshots(userId, project.id, scrapeResult.pages);
  
  // 5. Generate storyboard
  onProgress(4, "AI is crafting your story...");
  await generateStoryboard(project.id, assetUrls);
  
  return project.id;
}

function detectStyleFromBranding(branding?: BrandingData): string {
  // Dark backgrounds → cyber or netflix style
  // Blue primary → startup style
  // Minimal/white → apple style
  // etc.
}
```

### UI Component for Progress Modal

```typescript
// Progress steps display
const steps = [
  { id: 1, label: "Capturing website" },
  { id: 2, label: "Creating project" },
  { id: 3, label: "Processing assets" },
  { id: 4, label: "Generating storyboard" },
];
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/pages/Dashboard.tsx` | Modify | Add URL input and quick-create flow |
| `src/lib/createDemoFromUrl.ts` | Create | Service function for URL-to-demo automation |
| `src/components/CreateFromUrlDialog.tsx` | Create | Modal with progress indicator |

---

## Result

After implementation, users can:
1. Paste a URL on the Dashboard
2. Click "Create Demo"
3. Watch the progress as the system captures screenshots and generates content
4. Land in the editor with a complete AI-generated storyboard ready for refinement

This matches ClickCast's "paste URL → get video" experience while keeping the full wizard available for power users who want manual control.

