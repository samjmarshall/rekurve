# High-Converting Landing Page for AI Automation Agency
## Enhanced with Distinctive UI Aesthetics

Build a modern, high-converting B2B landing page for an AI automation agency targeting professional services firms in Brisbane, Australia. This design avoids generic "AI slop" aesthetics and creates a distinctive, professional interface that reflects sophisticated B2B enterprise software.

## Technical Stack Requirements
- Next.js 15+ App Router with TypeScript
- Tailwind CSS for styling with custom theme configuration
- [shadcn/ui](https://ui.shadcn.com/) and [Aceternity UI](https://ui.aceternity.com/) for base UI components
- Framer Motion and Aceternity UI for animations and micro-interactions. Prefer Aceternity UI animations/components where possible.
- Lucide React for icons (customize stroke-width per context)
- React Hook Form for form handling
- Mobile-first responsive design

## Design Philosophy: Beyond Generic

**Target Audience**: Pre-sales engineers, sales ops managers, sales leadership”technically sophisticated professionals who value precision and intelligence.

**Visual Identity**: Technical precision meets operational confidence. Think: Linear's sophistication + Grafana's data viz aesthetic + Superhuman's speed signals.

**Critical Rules**:
- No purple gradients on white backgrounds
- No Inter/Roboto/default system fonts
- No uniform blue-500/gray-100 Tailwind defaults
- No generic chat bubble interfaces
- Strategic color deployment (not rainbow soup)
- Distinctive typography with purpose
- Layered backgrounds with atmospheric depth
- Context-specific character over generic polish

---

## Typography System

### Font Setup (Next.js)
```typescript
// app/layout.tsx
import { IBM_Plex_Sans, JetBrains_Mono } from 'next/font/google'

const ibmPlexSans = IBM_Plex_Sans({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-sans'
})

const jetbrainsMono = JetBrains_Mono({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-mono'
})

// Apply: className={`${ibmPlexSans.variable} ${jetbrainsMono.variable}`}
```

### Typography Usage
- **Headlines**: IBM Plex Sans Bold (tighter letter-spacing: -0.02em for density)
- **Body**: IBM Plex Sans Regular/Medium
- **Technical elements** (IDs, timestamps, code): JetBrains Mono
- **Numbers**: Use tabular figures (`font-variant-numeric: tabular-nums`)
- **Sizes**: Scale from `text-sm` to `text-5xl`
- **Line height**: `leading-relaxed` for body, `leading-tight` for headlines

---

## Color System: Strategic & Distinctive

### Custom Theme Configuration
```typescript
// tailwind.config.ts - Extend with custom colors
export default {
  theme: {
    extend: {
      colors: {
        // Primary brand (keep existing navy)
        primary: {
          DEFAULT: '#071D33',
          dark: 'oklch(0.12 0.02 250)',
        },
        // Distinctive accents (NOT generic purple)
        accent: {
          amber: 'oklch(0.75 0.15 75)',     // Urgent/highlight
          cyan: 'oklch(0.70 0.15 195)',      // Active/in-progress  
          coral: 'oklch(0.65 0.18 25)',      // Attention states
        },
        // Semantic states (data viz inspired)
        state: {
          success: 'oklch(0.70 0.18 145)',   // Green for completed
          warning: 'oklch(0.75 0.15 75)',    // Amber for warnings
          error: 'oklch(0.58 0.22 25)',      // Coral for errors
          info: 'oklch(0.65 0.20 230)',      // Blue for information
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
    },
  },
}
```

### Color Deployment Strategy
- **Primary Navy** (`#071D33`): Headers, primary CTAs, trust signals
- **Amber accent**: Urgent CTAs, high-value metrics (ROI, time saved)
- **Cyan accent**: Active states, progress indicators, "in action" elements
- **Coral accent**: Problem metrics, warnings, attention grabbers
- **Success green**: Results, testimonials, guarantees
- **Neutrals**: Sophisticated grays with subtle warm undertones (NOT pure gray-500)

**Critical**: Use color strategically. A single amber badge on a neutral card > rainbow chaos.

---

## Page Structure & Sections

### 1. Hero Section (Above Fold)
**Layout**: Full-width, centered content

**Background Treatment** (DISTINCTIVE):
```css
.hero-section {
  background: 
    radial-gradient(circle at 20% 10%, oklch(0.15 0.02 250) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, oklch(0.13 0.02 230) 0%, transparent 50%),
    oklch(0.12 0 0);
  /* Subtle geometric pattern overlay */
  background-image:
    repeating-linear-gradient(
      45deg,
      transparent,
      transparent 40px,
      oklch(0.13 0 0) 40px,
      oklch(0.13 0 0) 41px
    ),
    [gradients above];
}
```

**Content**:
- **Headline** (text-5xl font-bold, tracking-tight, leading-tight): 
  "Recover 20+ Hours Weekly and Add $100K to Your Pipeline in 90 Days"
  - Animate: Fade up + slight blur effect on load (duration: 800ms)
  
- **Subheadline** (text-xl text-slate-300, leading-relaxed): 
  "Autonomous AI sales agents for Brisbane professional services firms”built by a former AWS SRE who understands both the code and the business outcomes"
  - Animate: Fade in after headline (delay: 200ms, duration: 600ms)

- **CTA Buttons** (Stagger animation, delay: 400ms each):
  - **Primary CTA**: NOT generic indigo-600
    - Use: `bg-accent-amber text-slate-900` with `hover:scale-105` transform
    - Shadow: Multi-layer for depth (not single shadow)
    - Text: "Book Your Free Strategy Session" with arrow icon (animate on hover)
    - Size: Large, prominent (`px-8 py-4 text-lg`)
  
  - **Secondary CTA**: 
    - Style: `border-2 border-slate-700 text-slate-300` with glassmorphism
    - Text: "Watch 3-Minute Demo" with play icon
    - Hover: `border-accent-cyan bg-slate-900/50`

- **Trust Elements**:
  - Row of 5-6 **grayscale** client logos (filter: grayscale(100%) opacity(70%))
  - Text: "Trusted by 50+ consulting, accounting, and marketing firms"
  - Animate: Fade in after CTAs (delay: 800ms)

- **Hero Visual** (Desktop right side):
  - NOT a generic screenshot
  - Consider: Abstract data visualization showing automation workflow
  - Style: Terminal-aesthetic or data viz inspired
  - Animate: Stagger reveal of workflow nodes (orchestration effect)

- **Micro-copy** (text-sm text-slate-500, font-mono):
  "30-minute call, no obligation See if we're a fit"

**Motion & Interaction**:
- Hero load orchestration: Headline > Subhead > CTAs > Trust elements (stagger 200ms)
- CTA hover: `transform scale(1.05) + shadow expansion` (200ms cubic-bezier)
- Cursor: Show large interactive zone around CTAs

### 2. Problem Statement Section
**Layout**: Full-width, centered

**Background**:
- Subtle tint shift from hero (barely perceptible wayfinding)
- Light texture: `url('data:image/svg+xml...')` noise pattern at 3% opacity

**Content**:
- **Heading** (text-3xl font-bold, tracking-tight): 
  "Your Sales Team Is Losing $250K+ Annually to Manual Work"
  
- **Subheading** (text-lg text-slate-400): 
  "Here's exactly what it's costing you:"

- **Three Stat Cards** (md:grid-cols-3, gap-6):
  **Card Design** (DISTINCTIVE):
  - NOT white cards with subtle shadow
  - Instead: Cards with **coral/red tinted backgrounds** + stronger borders
  - Vertical colored bar (4px wide, full height, left side) in `accent-coral`
  - Internal shadow for depth
  - Slight gradient top-to-bottom

  **Card 1**: "40% of Time Wasted"
  - Icon: Clock (stroke-width: 1.5, size: 32px, color: accent-coral)
  - Metric: Large, bold, tabular figures, `text-4xl font-bold`
  - Description: "Your reps spend 16+ hours weekly on CRM updates and data entry"
  
  **Card 2**: "$475K Annual Cost"
  - Icon: DollarSign
  - Description: "That's the value of time spent on non-selling activities"
  
  **Card 3**: "30% Lost Deals"
  - Icon: TrendingDown
  - Description: "Prospects fall through cracks due to slow follow-up"

**Motion**:
- Scroll trigger: Cards stagger reveal (delay 100ms each)
- Animation: `slide-in-up + fade` (600ms ease-out)
- Hover: `transform translateY(-4px)` + shadow expansion (NOT scale)
- Numbers: Count-up animation on scroll into view

### 3. Solution Overview / Key Benefits
**Layout**: Bento grid (uneven sizes for visual interest)

**Background**:
- Subtle gradient shift to lighter section
- Grid pattern suggestion: Very faint grid lines (1px, 10% opacity) for "data/structure" feel

**Content**:
- **Heading** (text-3xl font-bold): "Autonomous AI Agents That Actually Work"
- **Subheading**: "Not automation. Not chatbots. Intelligent agents that research, qualify, and engage 24/7."

**Three Benefit Cards** (Bento grid):

**Card Styling** (DISTINCTIVE):
- Tinted backgrounds per card (NOT all white)
- Use subtle gradients: `linear-gradient(135deg, oklch(0.99 0.01 250) 0%, oklch(1 0 0) 100%)`
- Filled badges (NOT outlined): High contrast, colored backgrounds
- Icons: Size 40px, accent-cyan color, contained in gradient circle backgrounds

**Large Card** (col-span-2): "Recover 20+ Hours Weekly"
- Icon: Zap (in gradient circle: cyan > amber)
- Description: "AI agents handle lead research, CRM updates, follow-up sequencing, and meeting scheduling automatically"
- Visual: Simple workflow diagram (NOT generic flowchart)
  - Consider: Horizontal timeline with animated progress indicator
  - Style: Terminal aesthetic or data viz inspired (nodes + connections)

**Medium Card 1**: "Add $100K+ to Pipeline"
- Icon: TrendingUp (in gradient circle)
- Description: "Never miss a lead. Instant 24/7 response. Personalized multi-channel outreach."
- Metric callout: "3-5x more qualified meetings" 
  - Style: Large, bold, font-mono, accent-amber background badge

**Medium Card 2**: "5-10x ROI in 120 Days"
- Icon: Target
- Description: "Typical clients see full payback in 2 months, then continuous compounding value"
- Metric callout: "Average ROI: 8.6x"
  - Style: Large badge, accent-success color

**Motion**:
- Cards: Stagger reveal on scroll (delay 120ms each)
- Hover: Cards lift slightly (`translateY(-2px)`) + shadow expansion
- Workflow visual: Animated progress indicator loops continuously (subtle)
- Icons: Rotate on card hover (subtle 5deg rotation, 300ms)

### 4. Social Proof Section 1: Video Testimonial Preview
**Layout**: Split screen (video 60% left, content 40% right on desktop; stack on mobile)

**Video Container** (DISTINCTIVE):
- NOT plain video player
- Frame style: Sophisticated border + subtle inner glow
- Play button overlay: 
  - Large (80px), accent-cyan background with pulse animation
  - Icon: White play triangle
  - Animation: `pulse-glow` effect (see below)

```css
@keyframes pulse-glow {
  0%, 100% { 
    box-shadow: 0 0 0 0 oklch(0.70 0.15 195 / 0.7);
  }
  50% { 
    box-shadow: 0 0 0 20px oklch(0.70 0.15 195 / 0);
  }
}
```

**Content (Right side)**:
- **Quote** (text-2xl font-medium, italic, leading-relaxed):
  "We recovered 25 hours weekly and added $180K to our pipeline in just 90 days. This paid for itself in 6 weeks."
  - Style: NOT centered, left-aligned
  - Opening quote mark: Large accent-cyan decorative element

- **Attribution**:
  - Professional headshot: 64px circular, subtle border (2px accent-success)
  - Name: "Sarah Thompson" (font-semibold)
  - Title: "Operations Director" (text-slate-400)
  - Company: "ABC Consulting (35 employees)" (text-sm font-mono)

- **Results Badges** (Horizontal row, gap-3):
  - Style: Filled backgrounds, NOT outlined
  - Colors: accent-success background, white text
  - Content: "25 hrs/week saved" | "$180K pipeline added" | "6-week payback"
  - Animation: Fade in + slide up on scroll (stagger 100ms)

**Motion**:
- Entire section: Fade in on scroll
- Quote: Slide in from right (400ms)
- Badges: Stagger reveal (delay 600ms, then 100ms between)

### 5. How It Works / Process Section
**Layout**: Horizontal timeline (desktop), vertical stepper (mobile)

**Background**:
- Paper texture suggestion: Very subtle noise at 5% opacity (suggests documentation/process)

**Content**:
- **Heading** (text-3xl font-bold): "From Strategy to Results in 8 Weeks"

**Timeline Design** (DISTINCTIVE):
- Connected line: NOT a thin gray line
- Instead: 4px gradient line (amber > cyan > success green) showing progression
- Phase indicators: NOT simple dots
- Instead: Large numbered circles (60px) with gradient backgrounds
  - Number: font-mono, bold, white text
  - Gradient: Matches phase color theme

**Four Phases**:

**Phase 1: Discovery & Audit** (2 weeks)
- Icon: Search (40px, in gradient circle)
- Timeline color: accent-coral (early stage)
- Description: "We analyze your sales processes, identify bottlenecks, and map automation opportunities"
- Deliverables: (font-mono, text-sm)
  - "> Process flowcharts"
  - "> Opportunity assessment"
  - "> Custom roadmap"

**Phase 2: Strategy & Design** (1 week)
- Icon: Lightbulb
- Timeline color: accent-amber
- Description: "Design your autonomous AI agents tailored to your ICP, scoring criteria, and workflows"
- Deliverables:
  - "> System architecture"
  - "> Workflow designs"
  - "> Integration plan"

**Phase 3: Implementation & Training** (4 weeks)
- Icon: Code2 (emphasize technical capability)
- Timeline color: accent-cyan
- Description: "Build, test, and deploy your AI agents. Train your team on oversight and optimization"
- Deliverables:
  - "> Production system"
  - "> CRM integration"
  - "> Team training"
  - "> Documentation"

**Phase 4: Ongoing Optimization** (Monthly)
- Icon: RefreshCw
- Timeline color: state-success
- Description: "Continuous improvement based on real results, A/B testing, and evolving needs"
- Deliverables:
  - "> Monthly reports"
  - "> Optimization cycles"
  - "> Priority support"

**Motion & Interaction**:
- Timeline: Animated progress indicator fills on scroll (800ms ease-out)
- Phase circles: Pop in sequence as timeline fills (stagger 200ms)
- Expandable sections: Accordion style with smooth expand/collapse (300ms)
  - Expanded state: Shows detailed breakdown + small architecture diagram
- Hover: Phase containers lift slightly, icon rotates 5deg

### 6. Technical Credibility Section
**Layout**: Split screen (founder 40% left, stack 60% right)

**Background** (CRITICAL for credibility):
- Subtle code snippet background (very low opacity: 8%)
- Consider: Terminal-style grid pattern
- OR: Abstract architecture diagram watermark

**Left Side - Founder Positioning**:

**Founder Photo**:
- Professional but authentic (NOT stiff corporate headshot)
- Size: 200px circular on desktop
- Border: 3px gradient border (cyan > amber)
- Shadow: Multi-layer depth

**Bio Section**:
- **Headline** (text-2xl font-bold): "Built by [Name], Former AWS SRE"
- **Credentials** (Vertical list with icons):
  - Icon + Text layout (icon: 24px accent-cyan)
  - "10+ years scaling production systems"
  - "TypeScript, AWS, Enterprise Architecture"
  - "SRE experience at [Previous Companies]"
  - Style: font-mono for technical terms, font-sans for descriptions

- **Quote Block** (Distinctive styling):
  - Large opening quote mark (accent-amber, 48px)
  - Text: "I saw professional services firms struggling with problems I solved in engineering”manual, repetitive work that should be automated. Now I build AI agents with production-grade reliability, not marketing hype."
  - Style: text-lg, leading-relaxed, italic
  - Border-left: 4px accent-cyan

**Right Side - Technical Stack**:

**Heading** (text-2xl font-bold): "Enterprise-Grade Architecture"

**Stack Visualization** (DISTINCTIVE):
- NOT a boring bulleted list
- Instead: Layered cards showing tech stack (suggests architecture layers)
- Each layer: Card with left border (4px, different color per layer)

**Layers** (Top to bottom):
1. **Intelligence Layer**
   - Border: accent-amber
   - Icon: Brain (from Lucide)
   - Content: "GPT-4 + Proprietary Models"
   - Style: font-mono for "GPT-4"

2. **Orchestration Layer**
   - Border: accent-cyan  
   - Icon: Workflow
   - Content: "n8n + TypeScript + AWS Lambda"

3. **Data Layer**
   - Border: state-info
   - Icon: Database
   - Content: "Real-time enrichment (Clay, Clearbit, Apollo)"

4. **Integration Layer**
   - Border: state-success
   - Icon: Plug
   - Content: "HubSpot, Salesforce, Pipedrive APIs"

5. **Infrastructure**
   - Border: primary
   - Icon: Server
   - Content: "AWS with 99.9% uptime SLA"

**Trust Badges** (Bottom):
- Row of certification badges: SOC 2, AWS Partner, GDPR Compliant
- Style: Grayscale with subtle hover color reveal
- Size: 60px each, consistent aspect ratio

**Motion**:
- Section: Fade in on scroll
- Stack layers: Stagger reveal (slide in from right, delay 100ms each)
- Founder photo: Subtle zoom-in on scroll (scale 1 > 1.05 over 1000ms)
- Quote: Fade in after photo (delay 400ms)

### 7. Detailed Case Study Section
**Layout**: Full-width card with expandable accordion sections

**Card Styling** (DISTINCTIVE):
- NOT white card
- Background: Subtle gradient (warm gray tones)
- Border: 2px accent-success (signals positive outcome)
- Shadow: Multi-layer, significant depth
- Padding: Generous (p-12)

**Content**:
- **Heading** (text-3xl font-bold): "How ABC Accounting Saved 25 Hours Weekly and Added $380K to Pipeline"

- **Company Details Badges** (Horizontal row):
  - "Professional Services" | "35 employees" | "Brisbane, QLD"
  - Style: Small filled badges, neutral gray backgrounds

**Expandable Sections** (Accordion):

**Challenge Section**:
- Header: "The Challenge" (font-semibold, icon: AlertTriangle)
- Content (when expanded):
  - Bullet points with coral accent-colored markers
  - "40% of sales team time wasted on unqualified leads"
  - "$250K in lost opportunity cost"
  - "Manual CRM updates taking 8+ hours weekly"

**Solution Section**:
- Header: "The Solution" (font-semibold, icon: Lightbulb)
- Content (when expanded):
  - "Implemented autonomous AI sales agents for lead qualification"
  - "12 custom criteria aligned to their ICP"
  - "Multi-channel engagement (Email, LinkedIn, SMS)"

**Results Section** (ALWAYS VISIBLE, PROMINENT):

**Metric Cards Grid** (2x2 on desktop, stack on mobile):

**Metric Card Styling** (DISTINCTIVE):
- Large cards with gradient backgrounds
- Top: Small icon (24px, accent color)
- Middle: **Huge metric** (text-5xl font-bold, font-mono, tabular figures)
  - Animated counter on scroll into view
- Bottom: Description (text-sm text-slate-400)

**Card 1**: "4 hours > 4 minutes"
- Description: "Lead qualification time"
- Icon: Clock
- Accent: accent-cyan

**Card 2**: "43% increase"
- Description: "MQL-to-SQL conversion"
- Icon: TrendingUp
- Accent: state-success

**Card 3**: "$380K added"
- Description: "Pipeline in 120 days"
- Icon: DollarSign
- Accent: accent-amber

**Card 4**: "25 hrs/week saved"
- Description: "Team productivity"
- Icon: Zap
- Accent: state-success

**Timeline**: 
- Text: "Implemented in 6 weeks, results visible by week 10"
- Style: font-mono, small, text-slate-400

**CTA**: 
- Button: "Read Full Case Study" (outline style, accent-success border)
- Hover: Fill with accent-success background

**Motion**:
- Accordion: Smooth expand/collapse (300ms cubic-bezier)
- Plus/minus icons: Rotate 180deg on expand
- Metric counters: Animated count-up on scroll (duration: 1200ms, ease-out)
- Cards: Stagger reveal (delay 150ms each)

### 8. Pricing Section - Three-Tier Structure
**Layout**: Three columns (desktop), stack (mobile) with middle tier elevated

**Background**:
- Subtle shift to darker section for visual break
- Grid pattern overlay (very subtle, suggests structure/data)

**Content**:
- **Heading** (text-3xl font-bold): "Simple, Transparent Pricing"
- **Subheading** (text-lg text-slate-400): "All plans include our 5x ROI guarantee. If you don't see results, you don't pay."

**Pricing Card Design** (DISTINCTIVE):
- NOT uniform white cards
- Each tier: Different tint/theme color
- Middle tier (recommended): Elevated, larger, stronger accent
- Border: 2px solid, different color per tier
- Badge: "Most Popular" on middle tier (accent-amber, filled)

**Tier 1: Starter** ($8,500 setup + $2,500/mo)
- Border: accent-cyan
- Icon: Zap (small, top-left)
- Target: "Solo practices & small teams"
- Features list (10-12 items):
  - Checkmark icon: accent-cyan, filled circle backgrounds
  - Font: Regular weight, clear hierarchy
  - Emphasis: Bold key phrases (e.g., "1 AI sales agent")
- CTA: "Get Started" button (outline style, accent-cyan)

**Tier 2: Growth** ($15,000 setup + $4,500/mo) - RECOMMENDED
- Border: accent-amber (thicker: 3px)
- Elevation: `translateY(-20px)` on desktop, larger card
- Badge: "Most Popular" (accent-amber, top-right, animated pulse)
- Background: Subtle gradient (warmer than other tiers)
- Icon: TrendingUp
- Target: "Growing firms (10-50 employees)"
- Features list (12-15 items):
  - ALL features from Starter
  - PLUS advanced features (bold text)
- CTA: "Book Strategy Call" (filled button, accent-amber, larger)
- Guarantee callout: "5x ROI or money back" (text-sm, state-success color)

**Tier 3: Enterprise** (Custom pricing)
- Border: state-success
- Icon: Building
- Target: "Large firms (50+ employees)"
- Features list (15+ items):
  - Everything in Growth
  - Custom integrations
  - Dedicated account manager
  - Priority support
- CTA: "Contact Sales" button (outline style, state-success)

**Pricing Details Below Tiers**:
- **Guarantee explanation** (expandable accordion):
  - "What's included in the 5x ROI guarantee?"
  - Detailed methodology, measurement criteria
- **FAQ links**: "How do we measure ROI?" | "Can we cancel anytime?"

**Motion**:
- Tiers: Stagger reveal on scroll (delay 150ms each)
- Middle tier: Pulse animation on badge (continuous, subtle)
- Hover: Card lifts (`translateY(-8px)`), shadow expands
- Features checkmarks: Animate in sequence when card scrolls into view

### 9. Multi-Step Booking Form
**Layout**: Centered, max-width 600px, progress indicator at top

**Form Container Styling** (DISTINCTIVE):
- NOT plain white form
- Background: Sophisticated gradient with subtle texture
- Border: 2px accent-cyan
- Shadow: Deep, multi-layer
- Padding: Generous (p-10)

**Progress Indicator** (Top of form):
- Style: NOT simple circles
- Instead: Horizontal bar with fill animation
- Segments: 5 equal parts, filled in accent-cyan as user progresses
- Numbers: font-mono, bold, inside segments
- Labels: Small text below segments (e.g., "Contact" | "Company" | "Goals" | "Challenges" | "Schedule")

**Form Steps** (One question per step):

**Step 1: Contact Information**
- Fields: Name, Email, Phone
- Field styling:
  - Floating labels (animate up on focus)
  - Border: 2px slate-700, focus: accent-cyan
  - Background: transparent with subtle gradient on focus
  - Font: font-sans for inputs
- Button: "Continue" (accent-cyan, full-width, large)

**Step 2: Company Information**
- Fields: Company name, Website URL, Company size (dropdown: 1-10, 10-50, 50+)
- Industry (dropdown with common options + "Other")

**Step 3: Current Goals**
- Checkboxes: "What are your primary goals?" (multi-select)
  - "Increase qualified leads"
  - "Reduce manual sales work"
  - "Improve follow-up speed"
  - "Scale sales operations"
  - "Other" (with text input reveal)
- Checkbox styling:
  - Custom design (NOT default browser checkboxes)
  - Size: 28px square, rounded corners (6px)
  - Checked: Filled accent-cyan with white checkmark
  - Unchecked: Border only, slate-700

**Step 4: Current Challenges**
- Textarea: "What's your biggest sales challenge right now?"
- Styling: 
  - Large textarea (6 rows)
  - Character count indicator (bottom-right, font-mono, text-sm)
  - Minimum 50 characters (subtle validation)

**Step 5: Schedule Call**
- Calendly embed OR custom calendar UI
- Available times: 30-minute slots
- Timezone: Auto-detect, allow change
- Display: Calendar view (NOT just a list)
- Selected slot: Highlighted in accent-cyan

**Form Validation**:
- Real-time, inline validation
- Error messages: 
  - Color: accent-coral
  - Icon: AlertCircle (16px)
  - Style: Friendly, helpful (NOT harsh)
  - Example: "We'll need your email to send the calendar invite"

**Success State** (After submission):
- Confetti animation (subtle, accent-cyan and amber colors)
- Success icon: Large checkmark (80px) in state-success circle
- Message: "You're all set! Check your email for the calendar invite."
- Next steps: Small card with "What happens next" timeline

**Motion & Interaction**:
- Step transitions: Slide animation (slide out left, slide in right) 400ms
- Progress bar: Smooth fill animation (300ms ease-out)
- Field focus: Border glow effect (200ms)
- Button hover: Scale 1.05 + shadow expansion
- Validation: Shake animation on error (300ms)
- Success: Confetti burst + fade in checkmark (800ms)
- Auto-focus: First field of each step

### 10. FAQ Section
**Layout**: Two-column accordion (desktop), single column (mobile)

**Background**:
- Paper texture: Subtle noise pattern (3% opacity)
- Slight tint: Warmer gray tone

**Content**:
- **Heading** (text-3xl font-bold): "Frequently Asked Questions"

**Search/Filter** (Top of section):
- Search input: "Search questions..." placeholder
- Icon: Search (left side, 20px)
- Styling: Large input, subtle border, font-mono
- Behavior: Live filter as user types

**Accordion Items** (8-12 questions):

**Accordion Styling** (DISTINCTIVE):
- NOT simple bordered items
- Each item: Card with subtle background
- Border-left: 4px accent-cyan (indicates expandable)
- Hover: Background lightens slightly
- Expanded: Border-left changes to accent-amber

**Question Header**:
- Layout: Flexbox, space-between
- Left: Question text (font-semibold, text-lg)
- Right: Plus/Minus icon (24px)
  - Closed: Plus icon
  - Open: Minus icon (OR rotate Plus 45deg)
  - Animation: Rotate 180deg on toggle (300ms)

**Answer Content**:
- Padding: Generous (p-6)
- Typography: Leading-relaxed, clear hierarchy
- Bold key points: font-semibold
- Lists: Custom bullets (accent-cyan diamonds/arrows)
- Font: font-sans, slightly smaller than question

**Questions** (Examples with specific answer guidance):

1. **"What's the typical ROI and payback period?"**
   - Specific example with numbers
   - Include: formula for ROI calculation
   - Metric callout: "Average: 8.6x ROI in Year 1"

2. **"How long until we see results?"**
   - Timeline visual (mini version)
   - Milestones: Week 2, Week 6, Week 10, Month 4

3. **"Do we need technical expertise to use this?"**
   - Emphasize turnkey nature
   - Mention training provided
   - Analogy: "Like hiring a sales rep, not installing software"

4. **"What happens if it doesn't work?"**
   - Explain 5x ROI guarantee in detail
   - Methodology for measurement
   - Refund/credit policy

5. **"How do you measure ROI?"**
   - Detailed methodology
   - Metrics tracked: Time saved, pipeline added, conversion rates
   - Reporting cadence

6. **"Does this work with our existing CRM?"**
   - List integrations: HubSpot, Salesforce, Pipedrive, Zoho
   - Mention: API-based, works with most systems
   - Custom integration available (Enterprise tier)

7. **"What's included in the monthly retainer?"**
   - Breakdown by tier
   - Ongoing services: Monitoring, optimization, support
   - Response times

8. **"How is this different from Zapier or Make?"**
   - Technical differentiation (WITHOUT jargon):
     - "Zapier connects apps. We build intelligent agents."
     - Autonomous decision-making vs. simple triggers
     - Custom logic, learning, adaptation

9. **"Can we cancel anytime?"**
   - Clear policy: 30-day notice
   - No long-term contracts
   - Migration support if needed

10. **"Will this feel impersonal to our prospects?"**
    - Address personalization
    - Examples of dynamic content
    - Human review options
    - Emphasize: "Augmentation, not replacement"

**Motion**:
- Accordion: Smooth expand/collapse (300ms cubic-bezier)
- Content: Fade in as accordion opens
- Icon: Rotate animation (300ms)
- Search filter: Items fade out/in smoothly (200ms)

### 11. Final CTA Section
**Layout**: Full-width, centered content

**Background** (DISTINCTIVE - NOT generic purple gradient):
- Base: Dark navy (primary color)
- Overlay: Radial gradients (amber and cyan at corners, low opacity)
- Pattern: Subtle geometric grid (very faint, adds texture)
- Result: Sophisticated dark background with accent hints (NOT bright gradient)

```css
.final-cta {
  background: 
    radial-gradient(circle at 10% 20%, oklch(0.75 0.15 75 / 0.1) 0%, transparent 50%),
    radial-gradient(circle at 90% 80%, oklch(0.70 0.15 195 / 0.1) 0%, transparent 50%),
    oklch(0.12 0.02 250);
}
```

**Content**:
- **Heading** (text-4xl font-bold text-white, tracking-tight): 
  "Ready to Eliminate Sales Busywork and Add $100K+ to Your Pipeline?"
  
- **Subheading** (text-xl text-white/80, leading-relaxed): 
  "Join 50+ professional services firms that have automated their sales processes"

- **Large CTA Button**:
  - Style: accent-amber background, slate-900 text (high contrast)
  - Size: Extra large (`px-12 py-5 text-xl`)
  - Text: "Book Your Free Strategy Session"
  - Icon: Arrow right (animates on hover: slide right 4px)
  - Shadow: Multi-layer, glowing effect
  - Hover: Scale 1.08 + shadow expansion + arrow animation

- **Secondary Link**:
  - Text: "Or email us: contact@youragency.com"
  - Style: text-white underline-offset-4 font-mono
  - Hover: text-accent-cyan (color transition)

- **Trust Element**:
  - Small row of 3-4 client logos (grayscale, 40px height)
  - OR testimonial count: "Trusted by 50+ firms" (font-mono, text-white/60)

- **Guarantee Reminder** (text-sm text-white/70, font-mono):
  "30-minute call, no obligation 5x ROI guarantee"

**Motion**:
- Section: Fade in + slide up on scroll (800ms)
- Heading: Stagger words (subtle) (100ms delay between)
- CTA button: Continuous subtle pulse animation (2s infinite)
- Background: Very slow animated gradient shift (30s cycle)

### 12. Sticky CTA Bar (Mobile & Desktop)
**Behavior**: Appears when hero scrolls out of view, hides on scroll up, shows on scroll down

**Positioning**:
- Desktop: Fixed top, z-index 50
- Mobile: Fixed bottom, z-index 50

**Styling** (DISTINCTIVE):
- Background: Glassmorphism effect
  - `bg-slate-900/80 backdrop-blur-lg`
  - Border-bottom (desktop): 1px accent-cyan/20
  - Border-top (mobile): 1px accent-cyan/20
- Shadow: Significant depth

**Content**:
- **Left side**: 
  - Text: "Get 20+ Hours Back Every Week" (font-semibold)
  - Style: text-white, truncate on small screens
  
- **Right side**: 
  - Button: "Book Strategy Session"
  - Style: accent-amber background, slate-900 text, medium size
  - Hover: Scale 1.05

- **Close icon** (Far right):
  - Icon: X (20px)
  - Style: text-white/60, hover: text-white
  - Behavior: Dismisses bar (stores in localStorage to not re-show)

**Motion**:
- Entrance: Slide in from top (desktop) or bottom (mobile) 300ms ease-out
- Exit: Slide out 200ms ease-in
- Scroll behavior: Show/hide based on scroll direction (NOT always visible)

---

## Global Design System

### Color Palette Reference
```css
/* Custom colors defined in tailwind.config.ts */
--primary: #071D33
--accent-amber: oklch(0.75 0.15 75)
--accent-cyan: oklch(0.70 0.15 195)
--accent-coral: oklch(0.65 0.18 25)
--state-success: oklch(0.70 0.18 145)
--state-warning: oklch(0.75 0.15 75)
--state-error: oklch(0.58 0.22 25)
--state-info: oklch(0.65 0.20 230)
```

### Typography Scale
- **Display**: text-5xl (3rem/48px) - Heroes only
- **H1**: text-4xl (2.25rem/36px) - Section headings
- **H2**: text-3xl (1.875rem/30px) - Subsections
- **H3**: text-2xl (1.5rem/24px) - Card headings
- **Body Large**: text-xl (1.25rem/20px) - Subheadlines
- **Body**: text-base (1rem/16px) - Default
- **Body Small**: text-sm (0.875rem/14px) - Supporting text
- **Caption**: text-xs (0.75rem/12px) - Captions, labels

### Spacing System
- **Section padding**: 
  - Mobile: `py-16` (4rem/64px)
  - Desktop: `py-24` (6rem/96px)
- **Container**: `max-w-7xl mx-auto px-6`
- **Element gaps**: 
  - Small: `gap-4` (1rem/16px)
  - Medium: `gap-8` (2rem/32px)
  - Large: `gap-12` (3rem/48px)

### Border Radius
- **Cards**: `rounded-xl` (12px)
- **Buttons**: `rounded-lg` (8px)
- **Badges**: `rounded-full` (pill shape)
- **Images**: `rounded-lg` (8px)
- **Inputs**: `rounded-md` (6px)

### Shadows (Multi-layer for depth)
```css
/* Subtle card shadow */
.card-shadow {
  box-shadow: 
    0 1px 3px 0 rgb(0 0 0 / 0.1),
    0 1px 2px -1px rgb(0 0 0 / 0.1);
}

/* Elevated card shadow */
.card-shadow-lg {
  box-shadow:
    0 10px 15px -3px rgb(0 0 0 / 0.1),
    0 4px 6px -4px rgb(0 0 0 / 0.1);
}

/* Button hover shadow */
.button-shadow-hover {
  box-shadow:
    0 20px 25px -5px rgb(0 0 0 / 0.1),
    0 8px 10px -6px rgb(0 0 0 / 0.1);
}
```

### Animation Configurations
```typescript
// Framer Motion variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] }
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

const scaleOnHover = {
  rest: { scale: 1 },
  hover: { scale: 1.05, transition: { duration: 0.2 } }
}
```

### Motion Principles
1. **Duration**: 
   - Micro-interactions: 200-300ms
   - Scroll animations: 600-800ms
   - Page loads: 800-1200ms
2. **Easing**: `cubic-bezier(0.4, 0, 0.2, 1)` (ease-in-out)
3. **Properties**: Prefer `transform` and `opacity` (GPU-accelerated)
4. **Reduced motion**: Always respect `prefers-reduced-motion`

### Icon System (Lucide React)
- **Sizes**:
  - Small: 16px (navigation, inline)
  - Medium: 24px (buttons, list items)
  - Large: 32px (feature cards)
  - XL: 40px+ (hero section, major features)
- **Stroke width**: 
  - Regular: 2 (default)
  - Bold: 2.5 (emphasis)
  - Light: 1.5 (subtle)
- **Colors**: Match section accent colors (NOT uniform gray)

---

## Mobile Optimization

### Responsive Breakpoints
- **Mobile**: < 768px (1 column, stack everything)
- **Tablet**: 768px - 1024px (2 columns where appropriate)
- **Desktop**: > 1024px (3+ columns, full layouts)

### Mobile-Specific Behaviors
1. **Navigation**: 
   - Hamburger menu (animate to X on open)
   - Full-screen overlay menu (NOT slide-in drawer)
   - Large tap targets (min 44px)

2. **Hero Section**:
   - Stack content vertically
   - Reduce headline size (text-4xl > text-3xl)
   - Single CTA button (primary only)
   - Simplified background (remove complex patterns)

3. **Sticky CTA Bar**:
   - Fixed bottom position
   - Full width
   - Single line (truncate text if needed)
   - Swipe down to dismiss

4. **Forms**:
   - One question per screen
   - Large inputs (min 44px height)
   - Clear "Next" / "Back" buttons
   - Progress indicator always visible at top

5. **Pricing Cards**:
   - Stack vertically (no horizontal scroll)
   - Equal height cards
   - Simplified feature lists (top 5-7 features)
   - "View all features" expandable section

6. **Images/Videos**:
   - Full-width (except small inline images)
   - Aspect ratio locked
   - Lazy load below fold

### Touch Interactions
- **Tap targets**: Minimum 44px
- **Swipe**: Support swipe gestures for carousels/galleries
- **Pinch**: Allow pinch-to-zoom on images (where appropriate)
- **Double tap**: Avoid (conflicts with zoom)

### Performance (Mobile-First)
- **Images**: 
  - WebP format with fallbacks
  - Responsive sizes (`sizes` attribute)
  - Lazy loading (`loading="lazy"`)
- **JavaScript**: 
  - Code splitting per route
  - Dynamic imports for heavy components
  - Defer non-critical scripts
- **CSS**: 
  - Critical CSS inline
  - Non-critical CSS loaded async
- **Fonts**:
  - `font-display: swap`
  - Preload key fonts
  - Subset fonts (Latin only)

**Lighthouse Targets**:
- Performance: 90+
- Accessibility: 100
- Best Practices: 95+
- SEO: 100

---

## Accessibility (WCAG 2.1 AA)

### Color Contrast
- **Text on backgrounds**: Minimum 4.5:1 ratio
- **Large text** (18pt+): Minimum 3:1 ratio
- **Interactive elements**: 3:1 for focus indicators

**Test all color combinations**:
- White text on accent-amber: (7.2:1)
- White text on accent-cyan: (5.8:1)
- White text on accent-coral: (5.1:1)
- Dark text on white: (13.5:1)

### Semantic HTML
```html
<!-- Proper heading hierarchy -->
<h1>Page title</h1>
  <h2>Section title</h2>
    <h3>Subsection</h3>

<!-- Landmark regions -->
<header>...</header>
<nav aria-label="Main navigation">...</nav>
<main>...</main>
<aside aria-label="Related content">...</aside>
<footer>...</footer>
```

### Keyboard Navigation
- **Tab order**: Logical, follows visual layout
- **Focus indicators**: Visible, high contrast (accent-cyan ring)
- **Skip links**: "Skip to main content" (visible on focus)
- **Modals**: Trap focus, close on Esc key
- **Accordions**: Toggle with Enter/Space, arrow keys optional

### ARIA Labels
```html
<!-- Buttons with icon-only -->
<button aria-label="Close dialog">
  <X className="w-6 h-6" />
</button>

<!-- Form inputs -->
<label for="email">Email address</label>
<input 
  id="email" 
  type="email" 
  aria-required="true"
  aria-invalid="false"
  aria-describedby="email-error"
/>
<span id="email-error" role="alert">...</span>

<!-- Loading states -->
<div role="status" aria-live="polite">
  Loading content...
</div>
```

### Screen Reader Considerations
- **Alt text**: Descriptive, concise (no "image of")
- **Link text**: Descriptive ("Book strategy session" NOT "Click here")
- **Form errors**: Announced with `role="alert"`
- **Dynamic content**: Use `aria-live` regions

### Motion Preferences
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## Technical Implementation

### Next.js 15+ Structure
```
app/
  layout.tsx          # Root layout with fonts
  page.tsx            # Landing page (Server Component)
  globals.css         # Custom theme, Tailwind imports
components/
  sections/       # Section components
    Hero.tsx
    Problem.tsx
    Solution.tsx
    Testimonial.tsx
    Process.tsx
    TechCredibility.tsx
    CaseStudy.tsx
    Pricing.tsx
    BookingForm.tsx
    FAQ.tsx
  FinalCTA.tsx
  ui/             # Reusable UI components
    Button.tsx
    Card.tsx
    Badge.tsx
    Accordion.tsx
...
  motion/         # Framer Motion wrappers
    FadeInUp.tsx
    StaggerContainer.tsx
    ScrollReveal.tsx
```

### TypeScript Types
```typescript
// types/index.ts
export interface PricingTier {
  name: string
  setupCost: number
  monthlyCost: number
  target: string
  features: string[]
  recommended?: boolean
  cta: {
    text: string
    href: string
  }
}

export interface Testimonial {
  quote: string
  author: {
    name: string
    title: string
    company: string
    photo: string
  }
  metrics: {
    label: string
    value: string
  }[]
}

export interface FormStep {
  id: number
  title: string
  fields: FormField[]
}

export interface FormField {
  name: string
  label: string
  type: 'text' | 'email' | 'tel' | 'select' | 'textarea' | 'checkbox'
  required: boolean
  options?: string[]
  validation?: (value: string) => string | null
}
```

### Environment Variables
```env
# .env.local
NEXT_PUBLIC_CALENDLY_URL=https://calendly.com/your-calendar
NEXT_PUBLIC_CONTACT_EMAIL=contact@youragency.com
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

### SEO Metadata
```typescript
// app/page.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Sales Agents for Brisbane Professional Services | [Your Agency]',
  description: 'Recover 20+ hours weekly and add $100K to your pipeline in 90 days with autonomous AI sales agents. Built by former AWS SRE for consulting, accounting, and marketing firms.',
  keywords: ['AI sales agents', 'Brisbane', 'sales automation', 'professional services'],
  openGraph: {
    title: 'AI Sales Agents for Professional Services',
    description: '5x ROI guarantee. Autonomous AI that handles lead research, qualification, and follow-up 24/7.',
    images: ['/og-image.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Sales Agents for Professional Services',
    description: 'Recover 20+ hours weekly. Add $100K to pipeline.',
    images: ['/og-image.png'],
  },
}
```

### Performance Optimization
```typescript
// next.config.js
const nextConfig = {
  images: {
    formats: ['image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  },
  experimental: {
    optimizeCss: true,
  },
}
```

---

## Analytics & Tracking

### Event Tracking Strategy
```typescript
// lib/analytics.ts
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, properties)
  }
}

// Usage examples
trackEvent('cta_click', { 
  location: 'hero',
  cta_text: 'Book Your Free Strategy Session'
})

trackEvent('form_step_complete', {
  step: 3,
  step_name: 'Goals'
})
```

### Data Attributes for Tracking
- CTAs: `data-cta="hero-primary"` | `data-cta="pricing-growth"`
- Form steps: `data-step="1"` through `data-step="5"`
- Sections: `data-section="testimonial"` | `data-section="pricing"`
- Links: `data-link="demo-video"` | `data-link="case-study"`

### Conversion Funnel
1. Page view
2. Scroll depth (25%, 50%, 75%, 100%)
3. CTA click
4. Form start
5. Form step completion (1-5)
6. Form submission
7. Calendar booking

---

## Testing Checklist

### Visual Testing
- [ ] All sections render correctly on mobile (375px width)
- [ ] All sections render correctly on tablet (768px)
- [ ] All sections render correctly on desktop (1920px)
- [ ] All images have correct aspect ratios
- [ ] No horizontal scroll on any viewport
- [ ] All text is readable (contrast, size)
- [ ] All interactive elements have visible hover states
- [ ] All focus indicators are visible

### Functionality Testing
- [ ] All CTAs link to correct destinations
- [ ] Multi-step form progresses through all steps
- [ ] Form validation works correctly
- [ ] Form submission succeeds
- [ ] Calendly embed loads and functions
- [ ] Accordion sections expand/collapse
- [ ] Sticky CTA bar appears on scroll
- [ ] Sticky CTA bar dismisses and stays dismissed
- [ ] Mobile menu opens and closes
- [ ] All animations play correctly

### Performance Testing
- [ ] Lighthouse score: Performance 90+
- [ ] First Contentful Paint < 1.5s
- [ ] Largest Contentful Paint < 2.5s
- [ ] Total page weight < 3MB
- [ ] Images are lazy loaded
- [ ] Fonts are preloaded
- [ ] No layout shifts (CLS < 0.1)

### Accessibility Testing
- [ ] All images have alt text
- [ ] All form inputs have labels
- [ ] All interactive elements are keyboard accessible
- [ ] Focus order is logical
- [ ] Color contrast meets WCAG AA
- [ ] Screen reader announces all content correctly
- [ ] Reduced motion preference is respected

### Browser Testing
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## Content Guidelines

### Tone of Voice
- **Professional but approachable**: Not stiff, not overly casual
- **Technical credibility**: Show expertise without jargon
- **Results-focused**: Always tie features to outcomes
- **Confident**: No hedge words ("try", "might", "could")
- **Specific**: Use exact numbers, not ranges (unless presenting options)

### Writing Patterns
**Good**:
- "Recover 20+ hours weekly"
- "Add $100K to your pipeline in 90 days"
- "8.6x average ROI in Year 1"

**Avoid**:
- "Save time" (too vague)
- "Increase revenue" (no specifics)
- "Great ROI" (not quantified)

### Social Proof Elements
- Specific numbers (hours saved, revenue added)
- Company details (size, industry, location)
- Before/after comparisons
- Timeline (results visible by week X)
- Attribution (name, title, photo)

---

## Launch Checklist

### Pre-Launch
- [ ] All content finalized and proofread
- [ ] All images optimized (WebP format)
- [ ] All links tested
- [ ] Forms connected to backend/CRM
- [ ] Analytics configured (Google Analytics, etc.)
- [ ] Meta tags and OG images set
- [ ] Favicon and app icons added
- [ ] 404 page created
- [ ] Loading states implemented
- [ ] Error boundaries added

### Launch
- [ ] DNS configured
- [ ] SSL certificate active
- [ ] CDN configured (if using)
- [ ] Monitoring set up (Sentry, etc.)
- [ ] Uptime monitoring configured
- [ ] Backup strategy in place

### Post-Launch
- [ ] Submit sitemap to Google Search Console
- [ ] Test on real devices (not just simulators)
- [ ] Monitor Core Web Vitals
- [ ] Track conversion rates
- [ ] A/B test CTAs (after initial data)
- [ ] Review analytics weekly

---

## Success Metrics

### Primary KPIs
- **Conversion rate**: Visitors > Form submissions (Target: 10-15%)
- **Booking rate**: Form submissions > Booked calls (Target: 60-80%)
- **Time on page**: Average (Target: 3+ minutes)
- **Bounce rate**: (Target: < 40%)

### Secondary Metrics
- Scroll depth (Track 25%, 50%, 75%, 100%)
- CTA click rate by position
- Form drop-off by step
- Mobile vs desktop conversion rates
- Traffic sources performance
- Page load speed (Core Web Vitals)

### A/B Testing Opportunities (Post-launch)
1. Hero headline variations
2. CTA button text/color
3. Pricing tier order
4. Testimonial placement
5. Video vs static hero image
6. Form length (steps)
7. Guarantee prominence
8. Social proof elements

---

## Final Notes

This enhanced landing page prompt incorporates distinctive design principles that avoid generic "AI slop" aesthetics while maintaining high conversion potential. Key differentiators:

1. **Distinctive Typography**: IBM Plex Sans + JetBrains Mono (not Inter/Roboto)
2. **Strategic Color**: Data viz-inspired palette (not purple gradients)
3. **Layered Backgrounds**: Depth and atmosphere (not solid colors)
4. **Purposeful Motion**: Orchestrated animations (not uniform transitions)
5. **Context-Specific Design**: Built for B2B professionals (not consumer apps)

**Remember**: Every design decision should serve the target audience (pre-sales engineers, sales ops managers) with **technical precision, operational confidence, and intelligent automation** as core principles.

Generate the complete landing page with all sections implemented, using Next.js 15+ best practices, distinctive UI aesthetics, and production-ready TypeScript code.