---
name: ui-aesthetics
description: Design beautiful, distinctive UX for AI Sales Agent UI that avoids generic AI aesthetics
allowed-tools: mcp__shadcn__list_items_in_registries mcp__shadcn__get_item_examples_from_registries mcp__shadcn__view_items_in_registries mcp__shadcn__get_add_command_for_items
---

You tend to converge toward generic, "on distribution" outputs. In frontend design, this creates what users call the "AI slop" aesthetic. Avoid this: make creative, distinctive frontends that surprise and delight. Focus on:

Typography: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics.

Color & Theme: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes. Draw from IDE themes and cultural aesthetics for inspiration.

Motion: Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Use Motion library for React when available. Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions. Use scroll-triggering (Intersection Observer) for section reveals, parallax depth, and progress indicators. Hover states should surprise - subtle transforms, color shifts, or shadow changes that reward exploration. 

Backgrounds: Create atmosphere and depth rather than defaulting to solid colors. Layer CSS gradients, use geometric patterns, or add contextual effects that match the overall aesthetic. Consider gradient meshes (multi-point color blends), grain overlays (SVG noise filters for texture), and custom cursors (cursor: url(...)) for branded interactions.

Avoid generic AI-generated aesthetics:
- Overused font families (Inter, Roboto, Arial, system fonts)
- Clichéd color schemes (particularly purple gradients on white backgrounds)
- Predictable layouts and component patterns
- Cookie-cutter design that lacks context-specific character

Interpret creatively and make unexpected choices that feel genuinely designed for the context. Vary between light and dark themes, different fonts, different aesthetics. You still tend to converge on common choices (Space Grotesk, for example) across generations. Avoid this: it is critical that you think outside the box!

# AI Sales Agent UI Design Aesthetics

When working on the AI Sales Agent UI, create a distinctive, professional interface that reflects the sophisticated nature of B2B enterprise software while avoiding generic "AI slop" aesthetics. This is a tool for sales teams and business owners managing service quotes - it should feel powerful, trustworthy, and efficient.

## Context: The Product

This is an AI-powered quote management platform for professional services teams. Users are:
- Pre-sales engineers (primary) - technically sophisticated, detail-oriented
- Sales operations managers - data-driven, efficiency-focused
- Sales leadership - strategic overview needs

The UI must convey: **Technical precision, operational confidence, and intelligent automation**

## Typography: Distinctive & Purposeful

Refer to the brand-guidelines skill.

## Color & Theme: Beyond the Basics

**Critical rule:** Use color strategically, not uniformly. A single color badge on a neutral card is more powerful than rainbow soup.

Refer to the brand-guidelines skill.

## Motion: High-Impact Moments

**Available tools:**
- tw-animate-css (already installed)
- CSS animations
- Consider adding framer-motion for complex orchestrations

**Performance:**
- Prefer `transform` and `opacity` only - these don't trigger layout/paint
- Avoid animating `width`, `height`, `margin`, `padding`, or `color`
- Animation duration: 150-300ms for micro-interactions, 300-500ms for page transitions
- Debounce scroll/resize handlers (100ms)
- Use `requestAnimationFrame` for JS animations
- Respect `prefers-reduced-motion`: disable non-essential animations

## Backgrounds: Depth & Atmosphere

**Distinctive approaches:**

### 1. Subtle Geometric Patterns
```css
.dashboard-bg {
  background-image:
    repeating-linear-gradient(
      45deg,
      transparent,
      transparent 10px,
      oklch(0.98 0 0) 10px,
      oklch(0.98 0 0) 11px
    );
}
```

### 2. Layered Gradient Depth
```css
.card-bg {
  background:
    radial-gradient(circle at 20% 10%, oklch(0.99 0.01 250) 0%, transparent 50%),
    radial-gradient(circle at 80% 90%, oklch(0.99 0.01 200) 0%, transparent 50%),
    oklch(1 0 0);
}
```

### 3. Contextual Effects
- Email conversation panel: Paper texture (subtle noise)
- Quote details panel: Subtle grid suggesting data/structure
- Dashboard swimlanes: Different tint per column (barely perceptible, aids wayfinding)

### 4. Dark Mode Sophistication
For dark mode, go beyond just inverting:
```css
.dark .dashboard-bg {
  background:
    linear-gradient(180deg, oklch(0.15 0 0) 0%, oklch(0.12 0 0) 100%),
    url('data:image/svg+xml,...'); /* Subtle noise texture */
}
```

## Spatial Composition: Break the Grid

Don't default to symmetric, predictable layouts:

- **Asymmetry**: Off-center hero content, unequal column splits (60/40, 70/30)
- **Overlap**: Cards that break container boundaries, elements that cross section dividers
- **Diagonal flow**: Angled section dividers, diagonal background gradients that guide the eye
- **Grid-breaking**: Featured elements that span unexpected column counts, full-bleed moments
- **Density contrast**: Dense data areas (tables, lists) vs. generous breathing room for CTAs and key messages

Match layout complexity to content purpose: data-heavy views benefit from structured grids, while marketing moments can break free.

## Technical Implementation Checklist

When implementing UI components, follow this comprehensive design checklist: [design-checklist](./design-checklist.md)

## Anti-Patterns to Avoid

1. **Generic Tailwind Defaults:** Don't use blue-500, gray-100 directly without customization
2. **Uniform Roundness:** Vary border-radius (sharp data tables, rounded cards, pill badges)
3. **Single Shadow Depth:** Use multiple shadow layers for depth
4. **Color Overload:** Restrain palette, deploy color strategically
5. **Same Font Everywhere:** Mix sans for UI, mono for data/code
6. **Static Everything:** Add subtle motion to guide attention
7. **White Backgrounds:** Layer gradients, textures, or tints
8. **Default Icons:** Customize icon stroke-width and sizes per context
9. **Emoji Icons:** Never use 🎨 🚀 ⚙️ as UI icons - always use SVG (Lucide, Heroicons)
10. **Layout-shifting Hovers:** Use color/opacity transitions, not scale transforms that shift layout

### Common Professional UI Mistakes

| Category | Do | Don't |
|----------|----|----- |
| **Icons** | Use consistent SVG set (Lucide/Heroicons) | Mix icon sets or use emojis |
| **Hover states** | `transition-colors duration-200` | `hover:scale-105` that shifts layout |
| **Clickable elements** | Add `cursor-pointer` to all interactive items | Leave default cursor on cards/buttons |
| **Transitions** | 150-300ms for micro-interactions | Instant changes or >500ms (sluggish) |
| **Icon sizing** | Fixed viewBox (24x24) with consistent w-6 h-6 | Mix different icon sizes randomly |

### Light/Dark Mode Contrast Rules

These specific values prevent the "washed out" look in light mode:

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| **Glass/transparent cards** | `bg-white/80` minimum | `bg-white/10` works |
| **Body text** | `text-slate-900` (#0F172A) | `text-slate-100` |
| **Muted/secondary text** | `text-slate-600` minimum | `text-slate-400` |
| **Borders** | `border-gray-200` | `border-white/10` |
| **Floating navbar** | Add `top-4 left-4 right-4` spacing | Same |

**Common mistake:** Using `bg-white/10` for glass cards in light mode - this is invisible. Light mode needs higher opacity.

## Inspiration Sources (Specific to This Project)

Look to these for reference (but don't copy):
- **Linear** - Sophisticated B2B SaaS, excellent use of grays
- **Grafana** - Data visualization, dark themes, status colors
- **Superhuman** - Email interface, keyboard shortcuts, speed
- **Observable** - Data notebooks, code + visualization aesthetics
- **Railway** - Developer tools, terminal aesthetic, motion design
- **Stripe Dashboard** - Enterprise SaaS, trust signals, clean data presentation

## Measuring Success

You've achieved distinctive design when:
- A pre-sales engineer says "this feels purpose-built for us"
- The UI is recognizable from a screenshot (not generic)
- Color is used strategically, not uniformly
- Motion guides attention without distracting
- Typography creates clear hierarchy and rhythm
- The product feels intelligent and trustworthy
- **Critical:** It doesn't look like every other Next.js + Tailwind + shadcn project

## Final Principles

**Context-specific character over generic polish.** This is not a consumer app, not a marketing site, not a dashboard for everyone. It's a specialized tool for professionals managing service quotes. Every design decision should serve that purpose with distinction and personality.

**Match complexity to vision.** Maximalist designs need elaborate code with extensive animations and layered effects. Minimalist or refined designs need restraint, precision, and careful attention to spacing, typography, and subtle details. Elegance comes from executing the chosen direction with full commitment—not from hedging between approaches.

