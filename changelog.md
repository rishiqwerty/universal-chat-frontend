# Changelog

All notable changes to the **Neural Architect** frontend will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased] - 2026-08-21

### Added
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
