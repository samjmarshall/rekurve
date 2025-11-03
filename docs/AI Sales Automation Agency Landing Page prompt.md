# AI Sales Automation Agency Landing Page

Build a high-converting, long-form landing page for an AI automation agency targeting professional services firms in Brisbane, Australia. The page should be built with Next.js, TypeScript, and shadcn/ui components.

## Design System & Aesthetic

**Style**: Minimalist with bold typography, strategic color pops, ample whitespace
**Colors**: Deep blue primary (#0F172A), teal accent (#06B6D4), white/slate backgrounds
**Typography**: Bold, typography-first hero section with large headings (4rem+)
**Layout**: Single-column mobile-first, expanding to standard desktop widths
**Components**: Use shadcn/ui components throughout (buttons, cards, accordions, badges)

## Page Structure (Sections in Order)

### 1. Hero Section (Above Fold)
**Headline**: "Add $100K+ to Your Pipeline in 90 Days Without Hiring More Sales Staff"
**Subheadline**: "Built for Brisbane professional services firms. Works like a full-time SDR, costs like software."
**Elements**:
- Two CTAs: Primary "Book Your Free Strategy Session" (teal, prominent), Secondary "Watch 3-Min Demo" (outline style)
- 6-8 client logos in grayscale below CTAs (placeholder logos with labels like "ABC Consulting", "XYZ Accounting")
- Trust badge row: "SOC 2 Certified" | "78+ Firms Trust Us" | "5-10x ROI Average"
- Hero visual: Either animated product demo preview OR founder video placeholder (autoplay muted)

### 2. Problem Statement Section
**Headline**: "Your Sales Team Wastes $250K+ Annually on Manual Work"
**Content**: 3-column grid with icons showing:
- Column 1: "40% of time on unqualified leads" (icon: target with X)
- Column 2: "20+ hours weekly on CRM data entry" (icon: clock)
- Column 3: "Deals lost to 48-hour response delays" (icon: pipeline leak)
**Visual**: Include a simple before/after diagram showing manual vs automated workflow

### 3. Key Benefits Section
**Headline**: "What You Get: Results That Matter"
**Layout**: 3 large benefit cards with icons
- Card 1: "Recover 20+ Hours Weekly" - "Your team sells instead of doing admin"
- Card 2: "Add $100K+ Pipeline" - "AI agents qualify and nurture 24/7"
- Card 3: "Achieve 5-10x ROI" - "Typical payback in 60-90 days"

### 4. First Social Proof Section
**Layout**: 3 testimonial cards with:
- Client photo placeholder (circular)
- Quote: "We recovered 25 hours weekly and added $180K to pipeline in 90 days"
- Name, Title, Company
- Specific metric badges below each: "25 hrs saved/week", "$180K pipeline"

### 5. How It Works Section
**Headline**: "Your AI Sales Agent: From Setup to Scale in 90 Days"
**Layout**: Horizontal timeline/stepper with 4 phases:
1. "Discovery & Audit (2 weeks)" - Visual: magnifying glass icon
2. "Strategy & Design (1 week)" - Visual: blueprint icon
3. "Implementation (4 weeks)" - Visual: robot/gear icon
4. "Ongoing Optimization (monthly)" - Visual: growth chart icon

Include a workflow diagram showing: Lead Capture → AI Qualification → Scoring → CRM Update → Sales Notification

### 6. Features/Capabilities Section (Bento Grid Layout)
**Headline**: "Capabilities That Set Us Apart"
**Layout**: 6-8 cards in bento grid showing:
- "Multi-Channel Outreach" (email, LinkedIn, SMS icons)
- "GPT-4 Lead Qualification" (AI chip icon)
- "Real-Time Enrichment" (data flow icon)
- "CRM Integration" (HubSpot/Salesforce logos)
- "24/7 Autonomous Operation" (clock icon)
- "Continuous Learning" (ascending graph icon)

Each card: Icon + headline + 2-sentence description

### 7. Detailed Case Study Section
**Layout**: Full-width card with before/after split
**Left Side - Before**:
- Company: "ABC Accounting (35 people, Brisbane)"
- Problem bullets with red X icons
**Right Side - After**:
- Solution implemented
- Results with green checkmarks:
  - "4 hours → 4 minutes qualification time"
  - "43% increase in MQL-to-SQL conversion"
  - "$380K added to pipeline in 120 days"
- Video testimonial placeholder

### 8. Three-Tier Pricing Section
**Headline**: "Pricing Plans for Brisbane Firms"
**Subheadline**: "Transform your sales process and unlock 5× ROI—guaranteed"

**Layout**: 3 pricing cards (Good/Better/Best) with middle tier highlighted

**Foundation Package** ($7,500):
- "or 3 payments of $2,750"
- Feature list (5-6 items with checkmarks)
- "Delivered in 3 weeks"
- CTA: "Book Strategy Call"

**Growth Package** ($15,000) - HIGHLIGHTED:
- "Most Popular" badge at top
- "or 6 payments of $2,800"
- Includes "Everything in Foundation" plus
- Feature list (5-6 additional items)
- "90-day optimization"
- CTA: "Book Strategy Call" (teal, larger)

**Scale Package** ($30,000):
- "or 12 payments of $2,900"
- Includes "Everything in Growth" plus
- Feature list (5-6 enterprise items)
- "6-month managed service"
- CTA: "Book Strategy Call"

Below pricing: "Our 5× ROI Guarantee" section with shield icon and explanation

### 9. Multi-Step Form Section
**Headline**: "Start Your Free Strategy Session"
**Form Type**: Interactive multi-step with progress bar

**Step 1**: "What's your primary challenge?" (image selector buttons):
- "Wasting time on unqualified leads"
- "Manual CRM updates eating sales time"
- "Inconsistent follow-up losing deals"

**Step 2**: "Company size?" (dropdown)
- 10-20 employees
- 20-50 employees
- 50-100 employees

**Step 3**: "Timeline?" (radio buttons)
- Immediate
- 1-3 months
- 3-6 months

**Step 4**: Contact info (name, email, company, optional phone)

**Step 5**: Calendar integration placeholder with text "Choose your preferred time" and sample calendar grid

Include progress bar showing completion percentage

### 10. FAQ Section
**Headline**: "Common Questions"
**Layout**: Accordion component with 8-10 questions:
- "What's the typical ROI?"
- "How long until we see results?"
- "Does this work with our existing CRM?"
- "What if it doesn't work for us?" (guarantee details)
- "Do we need technical expertise?"
- "What industries do you serve?"
- "How is this different from Zapier?"
- "What happens after implementation?"

### 11. Founder/Company Section
**Headline**: "Built by Engineers Who Understand Scale"
**Layout**: Side-by-side with photo placeholder and bio
**Copy**: "I'm [Your Name], former SRE who specialized in scaling production systems at [Companies]. Unlike agencies that discovered 'AI' six months ago, I've been building production-grade systems for years. I understand both the technical implementation AND the business outcomes that matter to professional services firms."

Include credential badges: "AWS Certified", "TypeScript Expert", "Production SRE", "10+ Years Experience"

### 12. Final CTA Section
**Headline**: "Ready to Eliminate Sales Busywork?"
**Subheadline**: "Let's start with a free 30-minute strategy session to see if we're a fit"
**Elements**:
- Large primary CTA: "Schedule Your Strategy Session"
- Alternative options row: "Call: 0400 XXX XXX" | "Email: hello@agency.com" | "Live Chat"
- Social proof summary: "Trusted by 78+ professional services firms"

### 13. Footer
**Layout**: Multi-column footer with:
- Logo and tagline
- Links: About, Services, Case Studies, Blog, Contact
- Trust elements: Privacy Policy, Terms, Security
- Social links: LinkedIn, YouTube, Twitter
- Copyright notice

## Technical Requirements

**Framework**: Next.js 14+ with App Router
**Language**: TypeScript
**Styling**: Tailwind CSS + shadcn/ui components
**Fonts**: Inter or similar modern sans-serif
**Animations**: Framer Motion for scroll animations, micro-interactions
**Responsive**: Mobile-first, fully responsive across all breakpoints
**Performance**: Lazy loading for images, optimized for Core Web Vitals

## Interactive Elements

1. **Sticky CTA**: Floating CTA button that appears after scrolling past hero
2. **Scroll animations**: Fade-in/slide-up animations for sections as they enter viewport
3. **Hover effects**: Subtle scale/shadow changes on cards and buttons
4. **Progress bar**: For multi-step form showing completion percentage
5. **Accordion**: Smooth open/close for FAQ items
6. **Video player**: Modal or embedded player for demo videos

## Mobile Optimization

- Single column layout
- Larger touch targets (min 44px height)
- Simplified navigation (hamburger menu)
- Condensed content while maintaining all information
- Full-width CTAs
- Optimized form with larger input fields

## Conversion Optimization Features

- Multiple CTAs throughout page (every 2-3 scrolls)
- Social proof placed near decision points
- Specific, benefit-oriented CTA copy
- Risk reversal language (guarantee)
- Pricing transparency
- Trust badges and certifications
- Client logos for credibility
- Video testimonials for 80% conversion boost

## Additional Notes

- Use placeholder content where specific client information would go
- Include comments in code explaining conversion optimization reasoning
- Make it easy to swap placeholder content with real data
- Ensure all interactive elements are keyboard accessible
- Include proper semantic HTML and ARIA labels
- Add microcopy near forms explaining what happens next

Build this as a complete, production-ready landing page with clean, maintainable TypeScript code.

---

This prompt gives v0.dev everything it needs to generate a comprehensive landing page following all the conversion optimization principles from the playbook. You can then enhance it with your SRE expertise for performance optimization, add real integration with calendar booking APIs, implement proper analytics, and connect it to your actual CRM.