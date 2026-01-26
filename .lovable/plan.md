

# DemoFlix - Cinematic SaaS Demo Trailer Generator

## 🎯 Vision
Transform boring SaaS screenshots and screen recordings into Netflix-style product trailers with no editing skills required.

---

## 🎨 Design Direction
**Dark cinematic theme** with:
- Deep dark backgrounds with subtle gradients
- Neon accent glows (purple, cyan, red)
- Netflix-inspired typography and animations
- Dramatic hover effects and transitions
- Futuristic UI elements

---

## 📱 Pages & Features

### 1. Landing Page
- Hero section with dramatic video preview/animation
- "Create Your Trailer" CTA button
- Feature highlights with cinematic icons
- Style showcase gallery (Netflix, Apple, Startup, etc.)
- Social proof section
- Footer with links

### 2. Authentication
- Login/Signup with email and password
- Dark themed auth forms with glowing accents
- Smooth transitions between login/signup

### 3. Dashboard
- Projects grid with thumbnail previews
- "New Demo" creation button
- Project cards showing: thumbnail, name, date, status
- Quick actions: edit, duplicate, delete
- Empty state for new users

### 4. New Demo Generator (Multi-step wizard)
**Step 1 - Upload Assets**
- Drag & drop zone for images and videos
- Support for PNG, JPG, MP4, MOV
- Upload progress indicators
- Preview uploaded files in a grid

**Step 2 - Choose Style**
- 6 trailer style cards:
  - Netflix Series Intro
  - Startup Launch Trailer
  - AI / Futuristic
  - Clean Apple-style
  - Dark SaaS / Cyber
  - Bold Growth / Sales-Driven
- Visual preview of each style

**Step 3 - Select Duration**
- Duration options: 15s, 30s, 45s, 60s
- Preview what fits in each duration

**Step 4 - AI Storyboard Generation**
- AI analyzes uploaded visuals
- Generates trailer structure:
  - Hook (problem/bold statement)
  - Feature reveals
  - Benefits
  - Momentum build
  - Closing CTA
- Auto-generated text headlines
- Scene order preview

### 5. Trailer Editor
- Timeline view at bottom
- Scene cards that can be reordered (drag & drop)
- Per-scene controls:
  - Edit text overlays
  - Adjust timing
  - Zoom/pan settings
- Music selector panel:
  - Pre-loaded royalty-free tracks
  - Categories: Cinematic, Tech, Hype, Ambient
  - Preview playback
  - Mute option
- Brand customization:
  - Primary/accent color picker
  - Logo upload
- Live preview window

### 6. Render/Processing Screen
- Cinematic loading animation
- Progress bar with percentage
- Queue position indicator
- Estimated time remaining
- "Your trailer is being crafted..." messaging

### 7. Final Preview & Download
- Full video player with controls
- Download buttons:
  - Horizontal (16:9)
  - Vertical (9:16)
  - Square (1:1)
- Shareable link with copy button
- "Create Another" button
- Save to project history

---

## 🧠 AI Features (Lovable AI)

1. **Visual Analysis**
   - Identify UI sections, dashboards, charts, flows
   - Auto-detect key screens to highlight
   - Suggest scene ordering

2. **Storyboard Generation**
   - Create structured trailer flow
   - Generate punchy headlines and CTAs
   - Match text tone to selected style

3. **Text Generation**
   - Auto-generate: hooks, feature callouts, CTAs
   - Examples: "Built for scale.", "Your workflow. Supercharged."

---

## 🎥 Video Generation

**Architecture preparation for video API integration:**
- Modular video service layer (ready for Creatomate, Shotstack, or similar)
- Template system for each trailer style
- Asset management for uploaded files
- Render job queue system
- Progress tracking via webhooks

---

## 🎵 Audio System

- Pre-loaded royalty-free music library
- Categorized by mood (Cinematic, Tech, Hype, Ambient)
- Music metadata storage
- Preview playback in editor
- Mute/no music option

---

## 🔐 Backend & Infrastructure

**Authentication:**
- User accounts with email/password
- Session management

**Database (Supabase):**
- Users table
- Projects table (user's demo projects)
- Assets table (uploaded files per project)
- Renders table (completed videos)
- Music library table

**Storage:**
- Secure file uploads to Supabase Storage
- Cloud storage for rendered videos
- CDN delivery for final outputs

**Processing:**
- Edge functions for AI analysis
- Render queue management
- Webhook handlers for video completion

---

## 📱 Responsive Design
- Full desktop experience
- Tablet-optimized layout
- Mobile-friendly (viewing/downloading)
- Touch-friendly controls

---

## 🚀 Implementation Phases

**Phase 1: Foundation**
- Dark theme design system
- Landing page
- Authentication flow
- Dashboard shell

**Phase 2: Upload & Configuration**
- Media upload system
- Style selection
- Duration picker
- Project creation flow

**Phase 3: AI Integration**
- Lovable AI setup
- Visual analysis edge function
- Storyboard generation
- Text generation

**Phase 4: Editor**
- Timeline interface
- Scene reordering
- Text editing
- Music library & player
- Brand customization

**Phase 5: Video Generation**
- Video API integration architecture
- Render queue system
- Processing screen
- Preview & download page

**Phase 6: Polish**
- Animations & transitions
- Error handling
- Loading states
- Mobile optimization

