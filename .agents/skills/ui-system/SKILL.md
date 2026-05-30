---
name: ui-system
description: Glassmorphism UI design system and Tailwind patterns. Use when building UI components, styling the app shell, creating modals, navigation, cards, feed layouts, or any visual component that is NOT part of the infographic DNA renderer.
---

# UI System — Monochrome Glassmorphism

## Core Principle

The app shell is STRICTLY monochrome dark mode. All color comes ONLY from the infographic content rendered by the DNA engine. The shell exists to frame the data, not compete with it.

## Design Tokens (Tailwind Classes)

### Glass Panels (Cards, Modals, Sidebars)
```
bg-neutral-900/40 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-2xl
```

### Glass Buttons
```
hover:bg-white/10 active:bg-white/5 transition-all duration-200 rounded-xl
text-neutral-300 hover:text-white
```

### Primary Action Button (Generate, Publish)
```
bg-white text-black font-bold rounded-xl hover:bg-neutral-200 transition-colors
shadow-[0_0_20px_rgba(255,255,255,0.2)]
```

### Iterate Button (Special — appears on every post)
```
flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white
rounded-xl transition-all border border-white/10
```

### Backgrounds
```
Page:           bg-neutral-950
Panel:          bg-neutral-900/40
Input fields:   bg-black/30 border border-white/10
Active nav:     bg-white/10
```

### Text Hierarchy
```
Heading:        text-white font-bold
Body:           text-neutral-300
Secondary:      text-neutral-400
Muted/Meta:     text-neutral-500
```

### Ambient Depth (Background Blurs)
Place these as fixed, pointer-events-none elements behind the content:
```html
<div class="fixed inset-0 pointer-events-none overflow-hidden z-0">
  <div class="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-white/5 rounded-full blur-[150px]"></div>
  <div class="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-white/5 rounded-full blur-[150px]"></div>
</div>
```

## Layout Patterns

### Responsive Shell
- **Desktop** (`hidden md:flex`): Left sidebar, 64-72px wide, sticky, full height
- **Mobile** (`md:hidden`): Bottom floating nav bar with glass panel, `rounded-2xl`
- **Feed**: `max-w-xl mx-auto` centered, full-width on mobile

### Feed Cards
```
Infographic area:  aspect-[4/5] rounded-2xl overflow-hidden border border-white/5
Action toolbar:    Glass panel below the image with like, comment, share, iterate, save
```

### Modals
```
Overlay:           fixed inset-0 bg-black/60 backdrop-blur-sm z-50
Modal panel:       Glass panel, max-w-2xl, rounded-3xl, p-6
Close button:      Top-right, p-2 hover:bg-white/10 rounded-full
```

### Toast Notifications
```
Position:          fixed bottom-24 md:bottom-10 left-1/2 -translate-x-1/2 z-50
Style:             Glass panel, rounded-full, px-4 py-3, flex items-center gap-2
Icon:              Check icon in text-green-400
Auto-dismiss:      3 seconds
```

## Component Patterns

### Post Header
- Avatar with gradient ring (`bg-gradient-to-tr from-neutral-600 to-neutral-300`)
- Username (bold, white) + iteration attribution if applicable
- Timestamp in `text-neutral-500`
- Three-dot menu

### Watermark Badge (on infographic)
```
absolute bottom-4 right-4 px-3 py-1.5 rounded-lg
Glass panel with Sparkles icon + "INFOGRAPHEDIA" in uppercase tracking-widest text-[10px]
```

### Source Badge (inside infographic content)
```
Small clickable link at bottom of rendered infographic
text-xs text-neutral-400 hover:text-white underline
Opens source URL in new tab
```

## Rules

1. **Never add color to the shell**. No colored backgrounds, no colored buttons, no colored borders on the app frame. Only neutral/white/black.
2. **Mobile-first always**. Write mobile styles first, use `md:` and `lg:` for desktop overrides.
3. **No Emotion, no styled-components**. Tailwind classes only for the shell. CSS custom properties only for dynamic DNA theming.
4. **All interactive elements need transition**. Use `transition-all duration-200` or `transition-colors`.
5. **Glassmorphism requires backdrop-blur**. Every panel must have `backdrop-blur-2xl` or it looks flat.
