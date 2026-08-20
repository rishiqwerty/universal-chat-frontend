# Changelog

All notable changes to the **Neural Architect** frontend will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased] - 2026-08-21

### Added
- **Electric Spark Logo in Refuel Modal**: Added animated energy spark particles, neon pulsing halo, and ambient lighting around the lightning icon in `TopupModal.tsx`.
- **Three-Dots Action Menu in Topbar**: Consolidated Star/Unstar, Archive/Unarchive, and Delete Conversation options into a sleek single `•••` dropdown button in `Topbar.tsx`.
- **Training Purpose Disclaimer**: Added AI model training and data usage disclaimer under the input field on the initial empty chat screen in `MessageInput.tsx` and `Chat.tsx`.
- **Architecture and Maintenance Documentation**: Created `architecture.md` and added mandatory changelog and architecture maintenance rules in `rules.md`.

### Changed
- **Mobile Refuel Modal Redesign**: Redesigned `TopupModal.tsx` with a modern dark glassmorphism card, touch-friendly top-right close (`✕`) button, and responsive layout.
- **Unified Unauthenticated CTA**: Replaced "Join / Sign In" button with a rounded-full neon **"Join"** pill in `Topbar.tsx` and removed the redundant "Guest Mode" toggle for unauthenticated users.
- **Top Brand Logo**: Added a refined 4-point neon spark accent to the `LogoMark` in `Sidebar.tsx`, `WelcomeScreen.tsx`, `Login.tsx`, and `SignupForm.tsx`.

### Fixed
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
