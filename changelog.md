# Changelog

All notable changes to the **Neural Architect** frontend will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased] - 2026-08-21

### Added
- **Studio Dynamic Model Loading States & Skeletons (`ImageStudio.tsx`)**:
  - **Eliminated False "No Models" Flashes**: Replaced premature "No image models found" and "No video models available" fallback messages with animated loading skeletons, pulsing status indicators, and spinning loader badges while API endpoints (`/studio/models` and `/studio/video/models`) are actively in flight.
  - **Eager Video Models Prefetching**: Automatically prefetches video models in the background on initial mount so switching from Image to Video Studio mode is instantaneous with pre-populated providers and models.
  - **Synthesize Button Model-Ready State**: Added dedicated `"Loading models…"` spinner state on the generation button when a user starts composing before models finish resolving, preventing accidental submission and eliminating mystery disabled states.
- **Brand PNG Logo Assets & Web Icon Integration (`public/`, `index.html`)**:
  - **High-Resolution PNG Logos**: Generated pixel-perfect antialiased PNG assets from the brand's neural block geometric mark:
    - Transparent Mark: `logo.png` (1024×1024) and `logo-512.png` (512×512).
    - App Icon Card: `logo-card.png` (1024×1024), `logo-card-512.png` (512×512), and `logo-card-192.png` (192×192) featuring the signature neon `#D9FF00` glyph on dark `#18181b` rounded card surface.
    - Horizontal Brand Banners: `logo-banner.png` and `logo-full-transparent.png` (1200×320) with official "Neural Architect" brand typography.
  - **HTML Favicon & Touch Icon Linkage**: Updated `index.html` to reference `logo-card.svg` and `logo-card.png` for modern browser tabs and Apple mobile home screen bookmarks.
- **AI Provider Speed Tiers & Latency Badges**: Integrated `speed_tier`, `speed_label`, `latency_ms`, and `est_tps` into `ProviderModels` in `src/api/api.ts`, and added real-time latency badges (`{latency_ms}ms`), speed-tier indicator dots, and throughput estimation tooltips in the model picker in `MessageInput.tsx`.
- **Sandbox Safety & Resource Guardrails**: Added output buffer truncation (capped at 1,000 lines / 250 console logs) to prevent DOM memory leaks, log throttling in `CodeRunnerModal.tsx` to maintain 60fps UI, and global unhandled error listeners in `codeDetector.ts` to intercept malformed code gracefully.
- **Client-Side Python WebAssembly Code Runner (Pyodide)**: Integrated Pyodide WebAssembly in `codeDetector.ts` and `MessageBubble.tsx`, allowing users to execute Python code blocks client-side in the browser with `stdout`, `stderr`, interactive in-terminal CLI input (`input()`), execution timers, and live output without requiring any browser popups or backend resources.
- **Silent Background Server Wake-Up & Keep-Alive (`useSilentKeepAlive`)**: Added invisible tab-return wake-up and periodic background heartbeat in `App.tsx` alongside transparent Axios auto-retry on 502/503/504 errors in `api.ts`, keeping the free-tier backend ready with zero UI interruptions or sleep badges.
- **Free Server Cold-Start & Verification Handling**: Added progressive status timers, increased auth timeouts to 45s, and enforced verified session confirmation prior to workspace navigation in `api.ts`, `Login.tsx`, and `SignupForm.tsx`.
- **Google Login Loading & Processing States**: Added real-time authorization indicators, animated spinners, and modern authentication progress overlays during Google OAuth redirect/verification in `GoogleAuthButton.tsx`, `Login.tsx`, and `SignupForm.tsx`.
- **Electric Spark Logo in Refuel Modal**: Added animated energy spark particles, neon pulsing halo, and ambient lighting around the lightning icon in `TopupModal.tsx`.
- **Three-Dots Action Menu in Topbar**: Consolidated Star/Unstar, Archive/Unarchive, and Delete Conversation options into a sleek single `•••` dropdown button in `Topbar.tsx`.
- **Training Purpose Disclaimer**: Added AI model training and data usage disclaimer under the input field on the initial empty chat screen in `MessageInput.tsx` and `Chat.tsx`.
- **Architecture and Maintenance Documentation**: Created `architecture.md` and added mandatory changelog and architecture maintenance rules in `rules.md`.

### Added
- **AI Video Studio & Generation Mode (`ImageStudio.tsx`, `ImageLightbox.tsx`, `api.ts`)**: Added full end-to-end Video Generation mode to the Studio workspace:
  - **Studio Mode Toggle**: Switch between **Image Studio** and **Video Studio** with dedicated animated indicators in the Studio header.
  - **Lazy Loading of Video Data**: Video models (`/studio/video/models`) and video gallery records (`/studio/video/gallery`) are only fetched when the user explicitly switches to Video Studio mode, eliminating unnecessary network overhead on default Image Studio loads.
  - **Video Parameters & Options**: Added video duration selectors (`5s`, `10s`), video-oriented aspect ratios (`16:9 Landscape`, `9:16 Shorts/Reels`, `1:1`, `4:3`), synchronized dynamic credit cost badges (10c for Video, 5c for Image), and dynamically populated video models strictly fetched from `GET /studio/video/models` without hardcoded fallbacks.
  - **Creation Tools & Multi-Part File Uploads**: Video mode includes **Text to Video** and **Animate Image (Image-to-Video)** with initial starting frame upload, ensuring `reference_image` multipart files are reliably transmitted with explicit filenames and automated boundary headers.
  - **Dedicated Video Presets (Coming Soon)**: Completely separated Video Presets from Image Presets; when in Video mode, the Preset Libraries tab renders a sleek, dedicated Coming Soon showcase featuring teaser cards for camera paths, motion FX, and style matrices.
  - **Video Gallery & Lightbox Playback**: Video cards display duration badges (`5s`/`10s`), starting frame (`Frame 1`) reference thumbnails, play button overlays, and hover playback. Clicking opens a full video player in `ImageLightbox` with looping playback, controls, MP4 downloading, and dedicated **Starting Frame Reference** preview badge.
  - **Video API Client Integration**: Added `generateStudioVideo`, `getStudioVideoModels`, `getStudioVideoGallery`, `getVideoStatus`, and `deleteStudioVideo` connecting directly to the `/studio/video/*` backend endpoints.
- **AI Model Data Collection & Privacy Policy Indicator (`MessageInput.tsx`, `modelUtils.ts`, `api.ts`)**: Integrated backend `collects_data` and `data_policy_notice` metadata into the frontend architecture.
  - **Mobile-Responsive Popover & Provider Navigation**: Optimized modal proportions (`max-h-[82vh]`) with responsive provider column scaling (`w-[125px] xs:w-[135px] sm:w-[155px]`) for a clean dual-column experience on mobile screens.
  - **Full Data Notice Visibility**: When `collects_data: true`, the complete `data_policy_notice` text is rendered with auto-scroll containment without truncation across the model selector footer and prompt disclaimer.
  - **Minimal Zero-State**: When `collects_data: false`, all extra collection banners and icons are cleanly omitted.
- **Featured Preset Styles Carousel & Subtle AI Disclaimer (`ImageStudio.tsx`)**: Utilized the space below the Recent Generations slider by adding a curated **Featured Preset Styles (1-Click Try)** carousel allowing users to instantly inject top style matrices and prompts with 1 click. Added a subtle, clean AI accuracy disclaimer footer under the prompt generation box.
- **Responsive 2-Column Mobile Grid for Generations & Presets (`ImageStudio.tsx`)**: Replaced oversized 1-column mobile layouts with an elegant 2-column grid (`grid-cols-2 gap-2.5`) across both Recent Generations (Full Gallery) and Preset Libraries. Carousel card dimensions have also been responsively scaled (`w-[180px] sm:w-[240px]`) on mobile devices to provide a clean browsing experience and visible swipe peek.
- **Mobile Responsive AI Tools Navigation (`ImageStudio.tsx`)**: Optimized the AI tools bar for mobile viewports with compact touch-friendly button sizing, momentum touch scrolling (`touch-pan-x`, `overscroll-x-contain`), and responsive badge layouts so all AI tools (**Generate**, **Expand Canvas**, **Remove BG**, and **AI Upscale**) are fully visible, accessible, and swipable without horizontal clipping.
- **Credit Charge Display on Generate Button (`ImageStudio.tsx`)**: The primary `Generate` / `Request` button in Image Studio now dynamically and persistently shows the exact credit cost that will be billed (`5 Credits` for Instant, `Free` or `2 Credits` for Queue, `BYOK` for Personal Key) across all screen sizes with sleek, native badge styling and zero emojis.
- **Native UI Iconography & Theme Integration (`ImageStudio.tsx`, `ImageEditMenu.tsx`, `ImageExpandModal.tsx`, `ImageLightbox.tsx`, `Library.tsx`)**: Replaced all emojis across the tools, modals, active task banners, preset slots, and action buttons with clean, sleek SVG icons and refined typography that seamlessly match Neural Architect's dark-mode design system.
- **Creation-Time AI Tools Bar for New Generations (`ImageStudio.tsx`)**: Placed an AI Tools & Mode selector directly above the generation prompt bar in Image Studio. Users can switch between **Standard Generation**, **Expand Canvas (Outpaint)**, **Remove Background (Cutout)**, and **AI Upscale ($4\text{K}$)** for new generations. Selecting any tool immediately activates task mode, prefills specialized synthesis prompts, and seamlessly opens the upload/canvas editor when needed.
- **Interactive Canvas Outpainting & Expansion Limit Editor (`ImageExpandModal.tsx`, `ImageEditMenu.tsx`, `ImageStudio.tsx`)**: Built an interactive canvas outpainting modal allowing users to visually configure and control canvas expansion before synthesis:
  - **Live Canvas Visualizer**: Shows the original subject inside an outer dashed boundary frame with real-time scaling and position rendering.
  - **Aspect Ratio Presets**: 1-click presets for `16:9 Landscape`, `9:16 Portrait`, `4:3 Classic`, `3:4 Vertical`, `1:1 Square`, `2:3 Poster`, and `3:2 Photo`.
  - **Expansion Limit Restriction**: Slider allows expanding from $1.0\times$ up to a strict maximum limit of $2.0\times$ ($200\%$ canvas area) to prevent AI distortion and model breakdown.
  - **Subject Placement Control**: Choose subject positioning inside the expanded frame (`Center`, `Left`, `Right`, `Top`, `Bottom`).
  - **100% Uncropped Preservation**: The original generated image is never cropped or trimmed; extra canvas space expands outward around the original subject with customizable padding in the target aspect ratio.
  - **1-Click Instant Auto-Generation**: Clicking **Expand Canvas** immediately initiates synthesis and starts streaming/polling without requiring the user to manually click Generate in the input bar.
  - **Direct Canvas Compositing**: Automatically generates an HTML5 composite frame with exact dimensions, transparency padding, and specialized directional outpaint prompts transmitted directly to [ImageStudio.tsx](file:///Users/rishavsharma/Documents/projects/universal-chat-frontend/src/pages/ImageStudio.tsx).
- **Integrated AI Image Edit Suite (`ImageEditMenu.tsx`, `ImageStudio.tsx`, `ImageLightbox.tsx`, `Library.tsx`, `api.ts`)**: Built a unified multi-task image editing suite allowing users to perform specialized AI operations on generated images from the Library, Lightbox, and Studio:
  - **Expand Image (Outpainting)**: Extends canvas boundaries and seamlessly generates matching surrounding scenery with target aspect ratio adjustments.
  - **Remove Background (Cutout)**: Isolates the primary foreground subject with crisp silhouette edges and transparent/studio backdrop.
  - **AI Upscale & Enhance (Super Resolution)**: Enhances 4K clarity, texture definition, and removes compression noise.
  - 🎨 **Remix with Custom Prompt**: Re-synthesizes images using custom prompt instructions while preserving core reference context.
  - Active tasks display dynamic mode banners with 1-click reset in [ImageStudio.tsx](file:///Users/rishavsharma/Documents/projects/universal-chat-frontend/src/pages/ImageStudio.tsx) and transmit task metadata (`task`, `edit_type`) to the generation API.
- **Local LLM "Coming Soon" Status & Configuration Lock (`Settings.tsx`, `MessageInput.tsx`)**: Marked Local LLM (Ollama / vLLM / LM Studio) as **Coming Soon ⏳** across the settings and model picker interfaces. Disabled local API key configuration in [Settings.tsx](file:///Users/rishavsharma/Documents/projects/universal-chat-frontend/src/pages/Settings.tsx) with a developmental status notice, and added `SOON` badges and an explanatory upcoming integration card in the model selector.
- **Edit & Remix Image with Auto-Selected Reference (`ImageStudio.tsx`, `Library.tsx`, `ImageLightbox.tsx`)**: Choosing **Edit 🎨** or opening an image in Studio from the Library or Lightbox now automatically loads that specific image as the primary **Reference Image** (fetching blob, setting preview thumbnail, and populating generation state), prefills the prompt in the textarea, sets the original aspect ratio/model, and focuses the prompt box so users can easily append instructions and regenerate on top of the original image.
- **Social Sharing Modal for Generated Images (`SocialShareModal.tsx`, `ImageLightbox.tsx`, `Library.tsx`)**: Added a dedicated social sharing modal across Image Studio and Image Library. Users can share their creations directly to **WhatsApp** (with formatted prefilled prompt and image link), **X / Twitter** (with author attribution and URL), **Instagram** (using native mobile Web Share sheet for direct story/feed sharing or 1-click clipboard link copying), and **Direct Link Copy** with feedback animations.
- **Mobile Responsive Input Bar for Image Studio (`ImageStudio.tsx`)**: Rebuilt the mobile viewport layout for Image Studio. Replaced large fixed padding with compact screen margins (`bottom-2 w-[calc(100%-1rem)] p-2.5`), made the options drawer scrollable with a default collapsed state on mobile, added overflow scrolling for upload buttons, and locked the `Generate` action button to the right edge with shrink protection so it never clips on phone screens.
- **Dynamic Multi-Reference Preset Slot Naming (`ImageStudio.tsx`)**: Replaced hardcoded try-on button labels with adaptive preset-aware naming (`getPresetSlotLabels`). The toolbar buttons, preview tags, and guidance banners now dynamically adapt to the active preset's metadata (`main_image_label`, `secondary_image_label`) and category (e.g. `👤 Target Face` / `🎨 Style` for Portrait Blends, `📦 Subject` / `🌄 Background` for Scene Swaps, `👤 Person` / `👗 Outfit` for Try-Ons, or `🖼️ Primary` / `🖼️ Secondary` for General Dual-Ref Presets).
- **Secondary Reference Image Visualization in Generated Output & Lightbox (`ImageStudio.tsx`, `ImageLightbox.tsx`, `Library.tsx`, `api.ts`)**: Integrated multi-reference display across all image cards and lightboxes. Rendered image cards now feature dual preview badges for both `👤 Person / Main Reference` and `👗 Outfit / Secondary Reference` with zoom lightbox inspection and source link actions in the metadata drawer.
- **Dual-Image Preset & Virtual Try-On Uploads (`ImageStudio.tsx`, `api.ts`)**: Added support for multi-image synthesis presets (such as Clothes Try-On). When a try-on preset is active, Image Studio displays dual upload slots (`👤 Person / Model` and `👗 Outfit / Garment`), dual toolbar trigger buttons, custom instructional prompts, independent thumbnail previews with 1-click removal, and transmits both images (`reference_image` and `secondary_image` / `outfit_image`) to the generation API.
- **Mobile Slide-from-Left Edge Gesture for Sidebar (`Sidebar.tsx`)**: Added native mobile swipe gestures enabling users to slide from the left edge ($\le 45\text{px}$) towards the right to open the sidebar navigation drawer, and swipe left anywhere on the drawer/backdrop to dismiss it.
- **Neural Architect Brand Mark Navigation Button (`Topbar.tsx`)**: Replaced the generic 3-line hamburger icon with the glowing Neural Architect emblem badge (`#D9FF00`) with hover/touch micro-scaling to trigger sidebar navigation on mobile.
- **Mobile-Friendly Code Sandbox & Safe-Area Header Support (`CodeRunnerModal.tsx`)**: Replaced inline modal mounting with a root React `createPortal` with `z-[100]`. Added mobile safe-area inset header support (`pt-[max(env(safe-area-inset-top),8px)]`), high-contrast touch-friendly close (`×`) and restart buttons that stay completely visible on all mobile viewports without clipping under browser chrome or navigation headers, and segmented touch tab navigation.
- **Resilient Retry Engine & Mobile Cold-Start Recovery (`api.ts`, `useSilentKeepAlive.ts`)**: Built an automatic exponential-backoff retry engine across both the Axios client and Fetch streaming pipelines (`fetchWithStreamRetry`). Automatically catches and recovers from GCP container cold-starts, mobile socket freezes, `502/503/504` gateway timeouts, and network resets across all operations (including Google OAuth and SSE chat streams). Enhanced `useSilentKeepAlive` with `pageshow`, `online`, and passive touch listeners with a 4.5-minute active heartbeat to prevent scale-to-zero drops while using the app.
- **API `is_free` Flag Prioritization & Suffix Check Removal (`modelUtils.ts`, `ImageStudio.tsx`)**: Removed all string suffix checks (`_free`, `:free`). The frontend now strictly honors the boolean `is_free` and `premium_models` fields directly from the API response to determine whether a model or provider is free.
- **Accurate Model Metadata in Temporary Chat Mode (`Chat.tsx`)**: Resolved a bug where temporary mode messages inherited the persistent chat's `selectedModel` state. Messages in temporary mode now accurately display the actual streaming engine (`gemini-2.0-flash` / metadata payload from `/temporary/stream`).
- **Universal Inline Model Search & ⭐ Pinned Favorites (`MessageInput.tsx`)**: Added a global real-time search input bar at the top of the model selector (with instant local matching & OpenRouter catalog search) and a 1-click **⭐ Favorite / Pin** mechanism that persists chosen models in `localStorage` and pins them into a dedicated top **"Pinned Favorites"** section.
- **Image Studio Free Provider Prioritization & PRO Model Tags (`ImageStudio.tsx`)**: Reordered image generation providers so that free/local engines (Flux, Stable Diffusion, Local) appear first, and tagged premium providers/models with subtle `✦ PRO` indicators in the dropdown selectors.
- **Prioritized Free Providers at Top of Model Picker (`MessageInput.tsx`)**: Maintained a unified provider list while automatically sorting free and active BYOK providers to the top of the column, followed by premium providers tagged with subtle `PRO` badges.
- **Mobile UX Refinements for Settings (`Settings.tsx`)**: Rebuilt mobile responsiveness across all three Settings tabs (`Profile & Account`, `Providers & Theme`, and `MCP Server`). Replaced narrow container squishing with compact mobile padding (`p-4 sm:p-6 pb-24 sm:pb-12`), made the tab bar scrollable horizontally without wrapping, adapted theme accent color swatches for finger-friendly touch targets, full-width touch CTA action buttons, and responsive layouts for API key rows and MCP tool cards.
- **BYOK (Bring Your Own Key) Explainer & Quick-Links (`Settings.tsx`)**: Integrated a comprehensive BYOK informational card into the Settings Providers tab detailing zero platform markup, wholesale provider pricing, AES-256 encryption at rest, and direct 1-click links to obtain API keys across OpenAI, Anthropic, Google AI Studio, DeepSeek, and OpenRouter.
- **Strict Unconfigured Model & Provider Locking (`MessageInput.tsx`, `PremiumModelModal.tsx`)**: Removed all selection bypasses for unconfigured / premium models. Clicking an unconfigured model or provider switches the picker to preview mode and prompts the user via a glassmorphic modal to configure their API key in Settings (BYOK) before the model can be used.
- **Refined Minimalist Landing Screen & Image Studio Spotlight (`WelcomeScreen.tsx`)**: Rebuilt the first-visit screen with a clean, understated aesthetic—featuring subtle monochromatic prompt cards and an integrated **Image Studio** spotlight bar with direct 1-click exploration for visual synthesis.
- **Free Guest Limit Input Lock & Join/Sign-In Dock**: When unauthenticated guests reach their free message limit, the input field is automatically blocked and replaced with a dark glassmorphic CTA dock offering **"Join / Sign Up"** (pops open `SignupModal`) and **"Sign In"** (navigates to `/login`), while suppressing retry buttons and preventing further messaging until an account is created or signed in.
- **Archived Conversation Input Lock & Unarchive Prompt**: Disabled message input for archived conversations and replaced the input area with a dark glassmorphism action dock (`Chat.tsx`) prompting the user to unarchive the conversation to resume sending messages.
- **Archived Chat Confirmation Dialog**: Added a dedicated confirmation modal with a custom glowing archive box hero icon (`ConfirmModal.tsx`) when archiving conversations from either `Topbar.tsx` or `Sidebar.tsx`, preventing accidental archiving while keeping unarchiving instantaneous.
- **Google One Tap & In-Page Card Popup (`GoogleAuthButton.tsx`)**: Replaced browser window popups with Google Identity Services' native card popup overlay and auto One-Tap account prompt (`google.accounts.id.prompt()`), rendering the account chooser inside a seamless card prompt while retaining graceful fallback.
- **Unified Clean Logo Styling**: Removed artificial neon shadow glow from `LogoMark` in `Login.tsx` and `SignupForm.tsx`, aligning logo size, border, typography, and hover animations with the sidebar brand header.
- **Redesigned Confirm & Logout Dialog (`ConfirmModal.tsx`)**: Rebuilt the confirmation modal with a modern dark neon glassmorphism layout, featuring animated ambient radial halos, neon spark accents (`✦`), centered glowing hero badges, and cohesive neon action buttons for account logout and deletion.
- **Production Domain Sitemap & Robots Sync**: Updated `scripts/prerender.js`, `public/sitemap.xml`, and `public/robots.txt` to default to `https://www.neurarch.in`, preventing Vercel build-time prerendering scripts from overwriting `sitemap.xml` with old deployment URLs.
- **Continuous Alpha Mask Dissolve & Floating Input**: Replaced artificial backdrop-blur overlays with native CSS `maskImage` gradient fading in `ChatWindow.tsx`, removing harsh blur boundary lines and allowing chat messages to dissolve seamlessly into 0% opacity as they scroll toward the top bar and floating message input.
- **Mobile-First Code Runner Header Layout**: Redesigned `CodeRunnerModal.tsx` header with a 2-tier responsive layout on mobile, keeping the close button (`✕`) and restart button prominently pinned on the top right while moving the Preview/Console/Code tabs into a full-width touch-friendly segmented pill bar.
- **Mobile Refuel Modal Redesign**: Redesigned `TopupModal.tsx` with a modern dark glassmorphism card, touch-friendly top-right close (`✕`) button, and responsive layout.
- **Unified Unauthenticated CTA**: Replaced "Join / Sign In" button with a rounded-full neon **"Join"** pill in `Topbar.tsx` and removed the redundant "Guest Mode" toggle for unauthenticated users.
- **Top Brand Logo**: Added a refined 4-point neon spark accent to the `LogoMark` in `Sidebar.tsx`, `WelcomeScreen.tsx`, `Login.tsx`, and `SignupForm.tsx`.

### Fixed
- **Google OAuth Ingress Loading Screen & Temp Mode Flicker Fix**: Synchronously detected OAuth redirect hashes (`#id_token=`) upon app mount and introduced `isAuthenticating` state in `AuthContext.tsx`. Built a full-screen Neural Ingress loading screen in `App.tsx` and prevented `Chat.tsx` from momentarily rendering unauthenticated guest/temp mode during OAuth redirects and login transitions.
- **Complete User State & Cache Wipe on Logout/Switch**: Implemented `wipeUserState()` in `AuthContext.tsx` and attached `app:user-logged-out` listeners across `Chat.tsx`, `Library.tsx`, `ImageStudio.tsx`, and `Topbar.tsx`. All cached messages, conversation lists, active chat IDs, image galleries, and credit balances are cleanly wiped from React state, `localStorage`, `sessionStorage`, and memory caches when logging out or switching accounts.
- **Google OAuth Redirect URI Alignment**: Fixed `Error 400: redirect_uri_mismatch` by standardizing the OAuth `redirect_uri` to `window.location.origin` (matching Google Cloud Console authorized origins/URIs) and adding a global `#id_token` listener in `AuthContext.tsx` for seamless returns across all routes.
- **Mobile Google Sign-In & Direct Redirect OAuth Flow**: Fixed mobile Google login failure caused by transparent iframe touch interception and mobile popup blockers. Integrated responsive device detection in `GoogleAuthButton.tsx`, enabling direct tab OAuth redirection on mobile devices and automatic `#id_token` extraction on return across `Login.tsx` and `SignupForm.tsx`.
- **Modal Viewport & Header Stacking Context (`createPortal`)**: Integrated `createPortal(..., document.body)` across `ConfirmModal.tsx`, `TopupModal.tsx`, and `SignupModal.tsx`, preventing fixed-position modal backdrops and dialog cards from being trapped inside `<header>` backdrop-blur stacking contexts which was causing half the screen to black out or clip.
- **Modal & Model Selector Viewport Containment**: Added explicit max-width (`w-[calc(100vw-16px)]`), max-height (`max-h-[80vh]`), and dynamic bottom offset bounds to both `ConfirmModal.tsx` and the Model Picker popover in `MessageInput.tsx`, ensuring dialogs and menus remain 100% visible inside the viewport across all mobile screens without overflowing.
- **Mobile Code Runner Visual Viewport Anchoring**: Fixed modal header disappearing when typing on mobile keyboards by dynamically pinning the modal container overlay directly to `visualViewport.offsetTop` and `visualViewport.height` in `CodeRunnerModal.tsx`, locking document body scroll, and enforcing `window.scrollTo(0,0)` scroll guards inside `codeDetector.ts`.
- **Comprehensive AST Async Transformer for In-Terminal Input**: Updated `codeDetector.ts` with `_FullAsyncRewriter` which rewrites both function definitions (`def get_number()`, `def main()`) and calls into async structures, allowing nested functions to resolve in-terminal interactive console inputs without `TypeError: float() argument must be a string or a real number, not 'coroutine'` or unawaited coroutine warnings.
- **Code Runner & Copy Text Extraction**: Fixed `[object Object]` syntax error caused by stringifying React Markdown AST nodes by implementing recursive `extractTextContent` in `MessageBubble.tsx`.
- **Thinking Animation & Stop Generation Cleanup**: Corrected `isComplete` evaluation in `MessageBubble.tsx` and `Chat.tsx` so the 3-dot bouncing animation reliably displays while awaiting AI stream responses, and cleanly vanishes with zero ghost artifacts when generation is finished or manually stopped.
- **Image Studio Navigation & Route Transition**: Removed blocking root `AnimatePresence mode="wait"` wrapper around `<Routes>` in `App.tsx` that was freezing route transitions, and added resilient fallback studio models in `ImageStudio.tsx`.
- **Input Field Bidirectional Auto-Resize**: Fixed input container not collapsing back into single-line mode when text is deleted or reduced; preserved last measured model selector width across layout switches in `MessageInput.tsx`.
- **Input Field Expansion for Logged-In Users**: Integrated dynamic DOM measurement (`modelSelectorRef`) and `window.getComputedStyle` typography calculation in `MessageInput.tsx` to ensure seamless single-to-multiline expansion regardless of selected model pill width or authentication state.
- **Mobile Textarea Oscillation & Scrolling**: Implemented hysteresis text width measurement with canvas calculation to eliminate flickering/jittering at the multiline transition boundary in `MessageInput.tsx`.
- **Virtual Keyboard Visibility**: Fixed first messages becoming hidden under the topbar when opening the mobile keyboard by integrating `window.visualViewport` resize/scroll listeners and dynamic `min-h-full justify-end` layout in `ChatWindow.tsx`.

---

## [1.0.4] - 2026-08-20

### Added
- **Adaptive MessageInput**: Dynamic toggling between inline horizontal mode (`[Model] [Input] [Send]`) and stacked multi-line mode (`[Full Input]` / `[Toolbar]`).
- **Temporary / Incognito Chat Mode**: Added guest temporary chat session handling with auto-cleanup and visual indicator badges in `Chat.tsx`.
- **Razorpay Credit Checkout**: Integrated Razorpay SDK with on-demand script injection, webhook signature verification, and instant balance synchronization.
- **Image Library Page**: Implemented dedicated `/library` page for viewing, filtering, and deleting user-generated AI images.
- **Granular Auth Configuration**: Added environment-driven toggles in `config.ts` for password, OTP, and social sign-in/up flows.
- **Interactive Code Sandbox (`CodeRunnerModal`)**: Added live code preview and execution sandbox for generated HTML, CSS, and JavaScript.

### Changed
- **SEO & Pre-rendering**: Enhanced `scripts/prerender.js` to pre-render static HTML routes and generate an automatic `sitemap.xml` during build.
- **Centralized Legal Pages**: Unified Privacy Policy, Terms of Service, Refund Policy, and Delivery Policy into structured routes in `Legal.tsx`.
- **Google OAuth Integration**: Replaced GSI button overlay with direct Google popup OAuth flow and iframe fallback handling in `GoogleAuthButton.tsx`.

---

## [1.0.3] - 2026-08-18

### Added
- **Image Studio Enhancements**: Added before/after image comparison slider (`BeforeAfterSlider`), preset creation/loading, and reference image support.
- **MCP Client Integration**: Added Model Context Protocol (MCP) server configuration, OAuth 2.0 connection setup, and live tool testing in `Settings.tsx`.
- **AuthContext**: Introduced centralized React AuthContext for global authentication state, token refresh, and profile management.
- **Loading Skeletons**: Added shimmer animation skeleton states for chat history loading and sidebar recent conversations.

---

## [1.0.2] - 2026-08-15

### Added
- **Image Generation Free Queue**: Implemented queue management for free image syntheses with automatic status polling.
- **Authenticated Proxy Download**: Added secure proxy download mechanism in `ImageLightbox.tsx`.
- **Dynamic Balance Checking**: Configurable intervals for credit balance updates and status polling.

---

## [1.0.1] - 2026-08-10

### Added
- **Initial App Launch**: Core chat application with multi-provider model switching, dark theme aesthetic, and responsive sidebar.
