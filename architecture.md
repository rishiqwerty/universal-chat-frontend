# Frontend Architecture – Neural Architect

## 1. Overview & Technology Stack

Neural Architect Frontend is a high-performance, responsive AI workspace built for conversational AI, multi-provider model switching, image synthesis, and MCP (Model Context Protocol) tool execution.

- **Core Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS with custom dark cyber-aesthetic tokens
- **Animations**: Framer Motion
- **Icons & Graphics**: Custom inline SVG icons and Lucide icons
- **Payment & Checkout**: Razorpay SDK (On-demand asynchronous injection)
- **Routing**: React Router v6 with dynamic SEO metadata and SSG prerendering (`scripts/prerender.js`)

---

## 2. Directory Structure

```
universal-chat-frontend/
├── index.html                   # HTML entry point with Google SEO & font definitions
├── rules.md                     # Strict development guidelines & styling rules
├── architecture.md              # System design and frontend architecture specification
├── changelog.md                 # Chronological changelog of all codebase updates
├── scripts/
│   └── prerender.js             # Static route prerenderer & sitemap generator
├── src/
│   ├── main.tsx                 # Application bootstrap with AuthProvider & Router
│   ├── App.tsx                  # Root route declarations & layout wrappers
│   ├── config.ts                # Environment and feature flag configuration
│   ├── index.css                # Global styles, scrollbar styling, color variables
│   ├── api/
│   │   └── api.ts               # Centralized Axios API client, SSE streams, payment endpoints
│   ├── context/
│   │   └── AuthContext.tsx       # Global authentication state, session storage, user profile
│   ├── hooks/
│   │   └── useDocumentSEO.ts     # Dynamic document title and meta tag manager
│   ├── components/
│   │   ├── Topbar.tsx           # Header bar (Credits gauge, 3-dots chat actions, Join pill, Profile menu)
│   │   ├── Sidebar.tsx          # Navigation drawer (Chats, Starred, Archived, Image Studio, Library)
│   │   ├── ChatWindow.tsx       # Auto-scrolling chat history stream with viewport keyboard detection
│   │   ├── MessageBubble.tsx    # User and AI markdown message bubble with code copy & delete
│   │   ├── MessageInput.tsx     # Adaptive single/multiline text input with model picker popover
│   │   ├── TopupModal.tsx       # Credit refuel modal with electric spark lightning icon and Razorpay checkout
│   │   ├── PremiumModelModal.tsx# Premium model unlock modal with BYOK suggestions & dummy coming soon upgrade
│   │   ├── WelcomeScreen.tsx    # Empty chat welcome screen with prompt suggestions, Image Studio spotlight & logo
│   │   ├── CodeRunnerModal.tsx  # Interactive live sandbox execution for generated HTML/JS/CSS code
│   │   ├── GoogleAuthButton.tsx # One-tap & popup Google OAuth authentication button
│   │   ├── SignupForm.tsx       # Standard and OTP signup flow
│   │   ├── ImageLightbox.tsx    # Full-screen image preview, details, and authenticated download
│   │   └── HelpModal.tsx        # In-app help and support modal
│   ├── utils/
│   │   ├── modelUtils.ts        # Frontier / Premium model classification & detection rules
│   │   └── codeDetector.ts      # AST async rewriter and code block detection
│   └── pages/
│       ├── Chat.tsx             # Main conversational chat view & temporary guest mode
│       ├── ImageStudio.tsx      # Generative image synthesis workspace with gallery & presets
│       ├── Library.tsx          # User generated image library with filter & deletion controls
│       ├── Settings.tsx         # User preferences, profile editor, and MCP tool testing
│       ├── Documentation.tsx    # Markdown API and architecture documentation viewer
│       ├── Legal.tsx            # Centralized privacy, terms, and refund policy legal pages
│       ├── Login.tsx            # Standalone login view (Password & OTP)
│       └── Signup.tsx           # Standalone user registration view
```

---

## 3. Core Architectural Modules

### 3.1. Authentication & Session Management (`AuthContext.tsx`)
- **JWT Authentication**: Stores JWT tokens in `localStorage` (`auth_token`).
- **Google OAuth**: Supports direct Google Identity Services popup & fallback auth.
- **OTP & Password Authentication**: Controlled via feature flags in `src/config.ts`.
- **Guest / Incognito Mode**: Unauthenticated users operate in a private guest mode with zero chat persistence.

### 3.2. Responsive Input System (`MessageInput.tsx`)
- **Adaptive Single-Line vs. Multi-Line Modes**:
  - *Single-Line Mode*: Inline layout with Model Selector on the left, Input in the middle, and Send button on the right.
  - *Multi-Line Mode*: Stacked layout with full-width top textarea and bottom action bar.
- **Hysteresis-Based Transition**: Uses canvas text measurement with a hysteresis buffer to prevent fluttering or oscillation at the line-wrap boundary.
- **Persistent DOM Textarea**: A single persistent `<textarea>` node preserves user focus, keyboard state, and cursor location during transitions.

### 3.3. Conversational Chat Engine (`Chat.tsx`, `ChatWindow.tsx`)
- **Streaming Responses**: Consumes Server-Sent Events (SSE) from the backend with instant chunk streaming and abort controller cancellation (`onStop`).
- **Mobile Keyboard & Viewport Tracking**: Listens to `window.visualViewport` resize and scroll events to pin active messages comfortably above the mobile virtual keyboard.
- **Dynamic Bottom Alignment**: Uses `min-h-full justify-end` so initial conversation messages stay anchored right above the input box.

### 3.4. Credits & Monetization (`TopupModal.tsx`, `Topbar.tsx`)
- **Refuel Modal**: Dark glassmorphism modal with animated electric spark effects on the lightning logo.
- **Razorpay Checkout**: Dynamically injects the Razorpay checkout script on demand with fallback handling and backend signature verification (`verifyPayment`).
- **Live Credit Sync**: Broadcasts and listens for custom `balance-update` DOM events to refresh balances instantly across Topbar, Studio, and Settings.

### 3.5. Image Synthesis Studio (`ImageStudio.tsx`)
- **Generation & Model Selection**: Supports Flux, Stable Diffusion, and specialized image generation models.
- **Free Queue & Pro Priority**: Dynamically handles queue positioning and status polling.
- **Interactive Lightbox & Comparisons**: Includes before/after image comparison sliders, preset sharing, and direct generation downloads.

---

## 4. Design System & Theme Tokens

| Token | Hex / Value | Purpose |
|---|---|---|
| `background` | `#0E0E0F` | Main app background |
| `sidebar` | `#121213` | Sidebar drawer background |
| `surface` | `#1A1A1C` | Cards, chat bubbles, and modal layers |
| `elevated` | `#202124` | Input bars, buttons, and popovers |
| `primary` | `#D9FF00` | Electric neon accent for CTA buttons, active pills, and glows |
| `primaryHover` | `#C7F000` | Hover state for neon primary elements |
| `textPrimary` | `#E8ECD5` | High-contrast body and title typography |
| `textSecondary` | `#A1A1AA` | Secondary details and subheadings |
| `textMuted` | `#71717A` | Placeholder text, timestamps, and subtle hints |
| `border` | `#2A2A2D` | Subtle surface boundaries and separators |

---

## 5. Routing & SEO Prerendering

- **Client Routes**: Configured in `App.tsx` using `react-router-dom`.
- **SSG Prerendering (`scripts/prerender.js`)**: Executes during `npm run build` to generate static HTML files for all core routes and produce `dist/sitemap.xml`.
