Frontend Development Rules – Neural Architect
1. Core Principle
This project prioritizes:
- Simplicity over abstraction
- Readability over cleverness
- UI fidelity over creativity
- This is a UI replication project, not a design exercise.
2. Design Fidelity Rules (STRICT)
- The UI must match the provided screenshots as closely as possible
- Do NOT redesign layouts
- Do NOT introduce new UI patterns
- Do NOT change spacing, alignment, or hierarchy unnecessarily
- Do NOT replace colors with alternatives
- If unsure → follow screenshot, not assumptions
3. Color Rules (MANDATORY)
Use ONLY these colors:
background: #0E0E0F
sidebar: #121213
surface: #1A1A1C
elevated: #202124

primary: #D9FF00
primaryHover: #C7F000

textPrimary: #e8ecd5ff
textSecondary: #A1A1AA
textMuted: #71717A

border: #2A2A2D

Usage Rules
Neon (#D9FF00) is ONLY for:
buttons
active states
highlights

NEVER:
use neon for large backgrounds
use bright colors for long text

4. Layout Rules
- No heavy borders
- Use contrast between surfaces instead
- Use subtle rounded corners (6–8px)
- Maintain consistent spacing

Sidebar
Fixed width
Darker than main content
Minimal icons + labels
Topbar
Search centered or slightly left
Actions on right

5. Component Rules
Components must be small and focused
Avoid deeply nested components
No over-engineering
Naming
Use clear names:
Sidebar
Topbar
ChatWindow
MessageBubble

6. Styling Rules
Use Tailwind ONLY
Do NOT use inline styles
Do NOT use external CSS libraries
Visual Style
Minimal shadows
No glassmorphism unless explicitly needed
Clean dark surfaces

7. Code Rules
Keep files short and readable
Avoid unnecessary abstractions
No premature optimization
DO
Use simple React state
Keep logic inside components (for now)
DON'T
Introduce global state libraries yet
Create complex folder structures
Add unused utilities

8. State Management Rules
Use local state (useState)
No Zustand / Redux yet
No context unless absolutely required

9. API Rules
Use mock data initially
No real backend integration yet
Once i start asking you to start integrating apis, then you can start integrating apis only the one which i ask you to integrate

10. Chat UI Rules
Messages
User message:
Right aligned
Background: #D9FF0020

AI message:
Left aligned
Background: #1A1A1C

11. Interaction Rules
Buttons:
Neon background
Subtle hover (slightly darker)
Inputs:
Dark background
Subtle focus glow (neon)

12. What to Avoid (CRITICAL)

- Over-complicated folder structures
- Fancy animations
- Random colors
- UI redesign
- Overuse of neon
- Generic component libraries look

13. Goal
The final UI should:
- Match the screenshots closely
- Feel like a premium AI tool
- Be clean, minimal, and developer-friendly
- Be easy to understand in minutes

14. Future Flexibility
- This structure is intentionally simple.
- We will scale later by:
Extracting logic into hooks/services
Introducing state management
Adding more pages
15. Final Rule
When in doubt:
Follow screenshot > follow rules > avoid complexity
