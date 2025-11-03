# Rekurve AI Sales Agent Landing Page Implementation Plan

## Overview

Building a production-ready, high-converting B2B landing page for Rekurve AI Sales Automation Agency. The page features 12 optimized sections with distinctive UI aesthetics (avoiding generic "AI slop"), sophisticated animations, and conversion-focused design. Built with Next.js 15+, TypeScript, and a custom Tailwind theme.

## Current State Analysis

**What exists now:**
- `/Users/sam/workspace/rekurve/www/` - Empty repository with documentation only
- `/docs/` - Strategic documentation including complete landing page spec
- `/CLAUDE.md` - Project guidelines and business context
- No code implementation yet

**Key constraints:**
- Must avoid generic aesthetics (no Inter font, no purple gradients, no uniform Tailwind defaults)
- Target audience: Pre-sales engineers, sales ops managers (technically sophisticated)
- Performance targets: Lighthouse 90+, FCP <1.5s, LCP <2.5s
- Accessibility: WCAG 2.1 Level AA compliance

### Key Discoveries:
- Landing page spec is comprehensive: `/docs/landing_page_prompt.md:1-1446` - covers all 12 sections with exact design requirements
- Design system defined: IBM Plex Sans + JetBrains Mono, data viz-inspired color palette (amber/cyan/coral accents)
- Positioning strategy: Must emphasize "AI Agents" not "automation" throughout copy
- Forms: Need both Calendly AND HubSpot integration options (user will choose later)
- Content: Using placeholders initially (no real testimonials/case studies yet)

## Desired End State

A fully functional, production-ready landing page deployed locally with:
- ✅ Next.js 15+ App Router with TypeScript
- ✅ Custom Tailwind theme with distinctive color palette
- ✅ 12 complete sections (Hero → Final CTA → Sticky Bar)
- ✅ Sophisticated animations using Framer Motion
- ✅ Multi-step booking form with both Calendly and HubSpot options
- ✅ Mobile-responsive design (mobile-first)
- ✅ Accessibility compliant (WCAG 2.1 AA)
- ✅ Performance optimized (Lighthouse 90+)
- ✅ Analytics tracking ready (Google Analytics 4)

**Verification:**
- Run `npm run dev` - page loads at localhost:3000
- All 12 sections visible and interactive
- Mobile view works correctly (test at 375px width)
- Form submission works (to console initially)
- No TypeScript errors (`npm run build` succeeds)
- Lighthouse audit passes 90+ performance score

## What We're NOT Doing

- Backend API implementation (forms log to console initially)
- Real CRM connections (setup instructions only)
- Deployment configuration (user handles separately)
- Real content (using high-quality placeholders)
- A/B testing setup (post-launch)
- Advanced analytics beyond GA4 setup
- Multi-language support
- Blog or additional pages

---

## Phase 1: Foundation Setup

### Overview
Set up Next.js 15+ project with TypeScript, custom Tailwind configuration, distinctive fonts, and base dependencies.

### Changes Required:

#### 1. Initialize Next.js Project
**Command:** Create new Next.js app

```bash
npx create-next-app@latest rekurve-landing \
  --typescript \
  --tailwind \
  --app \
  --src-dir false \
  --import-alias "@/*"
```

**Configuration choices:**
- TypeScript: Yes
- ESLint: Yes
- Tailwind CSS: Yes
- `src/` directory: No
- App Router: Yes
- Import alias: `@/*`

#### 2. Install Dependencies
**File:** `package.json` additions

```bash
npm install framer-motion lucide-react clsx tailwind-merge
npm install react-hook-form zod @hookform/resolvers
npm install @radix-ui/react-accordion @radix-ui/react-dialog @radix-ui/react-slot
npm install class-variance-authority
npm install -D @types/node @types/react @types/react-dom
```

**Dependencies explained:**
- `framer-motion` - Sophisticated animations
- `lucide-react` - Icon library (customizable stroke-width)
- `clsx` + `tailwind-merge` - Utility for conditional classes
- `react-hook-form` + `zod` - Form handling and validation
- `@radix-ui/*` - Accessible UI primitives
- `class-variance-authority` - Component variants

#### 3. Configure Custom Fonts
**File:** `app/layout.tsx`

```typescript
import { IBM_Plex_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const ibmPlexSans = IBM_Plex_Sans({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata = {
  title: 'AI Sales Agents for Brisbane Professional Services | Rekurve',
  description: 'Recover 20+ hours weekly and add $100K to your pipeline in 90 days with autonomous AI sales agents. Built by former AWS SRE for consulting, accounting, and marketing firms.',
  keywords: ['AI sales agents', 'Brisbane', 'sales automation', 'professional services'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${ibmPlexSans.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
```

#### 4. Custom Tailwind Configuration
**File:** `tailwind.config.ts`

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary brand
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
        sans: ['var(--font-sans)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      animation: {
        'slide-in-up': 'slideInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        'fade-in': 'fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        slideInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 var(--accent-cyan)' },
          '50%': { boxShadow: '0 0 0 4px transparent' },
        },
      },
    },
  },
  plugins: [],
}
export default config
```

#### 5. Global Styles
**File:** `app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Custom CSS variables for complex values */
    --accent-amber: oklch(0.75 0.15 75);
    --accent-cyan: oklch(0.70 0.15 195);
    --accent-coral: oklch(0.65 0.18 25);
  }

  /* Ensure smooth scrolling */
  html {
    scroll-behavior: smooth;
  }

  /* Respect reduced motion preference */
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

  /* Tabular figures for numbers */
  .tabular-nums {
    font-variant-numeric: tabular-nums;
  }
}

@layer utilities {
  /* Multi-layer shadows for depth */
  .shadow-card {
    box-shadow:
      0 1px 3px 0 rgb(0 0 0 / 0.1),
      0 1px 2px -1px rgb(0 0 0 / 0.1);
  }

  .shadow-card-lg {
    box-shadow:
      0 10px 15px -3px rgb(0 0 0 / 0.1),
      0 4px 6px -4px rgb(0 0 0 / 0.1);
  }

  .shadow-button-hover {
    box-shadow:
      0 20px 25px -5px rgb(0 0 0 / 0.1),
      0 8px 10px -6px rgb(0 0 0 / 0.1);
  }
}
```

#### 6. Environment Variables
**File:** `.env.local` (create this file)

```env
# Analytics
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Booking options (user will configure one of these)
NEXT_PUBLIC_CALENDLY_URL=https://calendly.com/your-calendar
NEXT_PUBLIC_HUBSPOT_PORTAL_ID=your-portal-id
NEXT_PUBLIC_HUBSPOT_FORM_ID=your-form-id

# Contact
NEXT_PUBLIC_CONTACT_EMAIL=contact@rekurve.ai
```

#### 7. TypeScript Configuration
**File:** `tsconfig.json` (verify/update)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### Success Criteria:

#### Automated Verification:
- [ ] Project builds successfully: `npm run build`
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] Dev server starts: `npm run dev`
- [ ] Custom fonts load (check Network tab for IBM Plex Sans and JetBrains Mono)

#### Manual Verification:
- [ ] Visit localhost:3000 - default Next.js page loads
- [ ] Inspect element - verify font-family is IBM Plex Sans
- [ ] Check browser console - no errors
- [ ] Tailwind classes work (test with className="text-accent-amber")

---

## Phase 2: Design System & Core Components

### Overview
Build reusable UI components and animation wrappers that follow the distinctive design system. These will be used throughout all 12 sections.

### Changes Required:

#### 1. Utility Functions
**File:** `lib/utils.ts` (create directory and file)

```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format numbers with commas
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num)
}

// Format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
```

#### 2. TypeScript Types
**File:** `types/index.ts` (create directory and file)

```typescript
export interface PricingTier {
  name: string
  setupCost: number
  monthlyCost: number
  target: string
  features: string[]
  recommended?: boolean
  icon: string
  borderColor: string
  cta: {
    text: string
    href: string
    variant: 'outline' | 'filled'
  }
}

export interface Testimonial {
  quote: string
  author: {
    name: string
    title: string
    company: string
    companySize: string
    photo: string
  }
  metrics: {
    label: string
    value: string
    icon: string
    color: string
  }[]
  videoUrl?: string
}

export interface CaseStudy {
  title: string
  company: string
  industry: string
  employeeCount: string
  location: string
  challenge: string[]
  solution: string[]
  results: {
    metric: string
    description: string
    icon: string
    color: string
  }[]
  timeline: string
}

export interface FormStep {
  id: number
  title: string
  label: string
  fields: FormField[]
}

export interface FormField {
  name: string
  label: string
  type: 'text' | 'email' | 'tel' | 'select' | 'textarea' | 'checkbox' | 'url'
  placeholder?: string
  required: boolean
  options?: string[]
  validation?: {
    pattern?: RegExp
    minLength?: number
    maxLength?: number
    message?: string
  }
}

export interface FAQItem {
  question: string
  answer: string
  category?: string
}
```

#### 3. Button Component
**File:** `components/ui/Button.tsx` (create directories)

```typescript
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-accent-amber text-slate-900 hover:scale-105 shadow-lg hover:shadow-button-hover',
        secondary: 'border-2 border-slate-700 text-slate-300 bg-slate-900/50 hover:border-accent-cyan hover:bg-slate-900/80',
        outline: 'border-2 text-current hover:bg-opacity-10',
        ghost: 'hover:bg-slate-100 text-slate-700',
      },
      size: {
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-3 text-base',
        lg: 'px-8 py-4 text-lg',
        xl: 'px-12 py-5 text-xl',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
```

#### 4. Card Component
**File:** `components/ui/Card.tsx`

```typescript
import * as React from 'react'
import { cn } from '@/lib/utils'

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-xl bg-white shadow-card transition-all duration-200',
      className
    )}
    {...props}
  />
))
Card.displayName = 'Card'

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-6', className)}
    {...props}
  />
))
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('font-bold tracking-tight', className)}
    {...props}
  />
))
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-slate-500', className)}
    {...props}
  />
))
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
))
CardContent.displayName = 'CardContent'

export { Card, CardHeader, CardTitle, CardDescription, CardContent }
```

#### 5. Badge Component
**File:** `components/ui/Badge.tsx`

```typescript
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-slate-100 text-slate-900',
        amber: 'bg-accent-amber text-slate-900',
        cyan: 'bg-accent-cyan text-slate-900',
        coral: 'bg-accent-coral text-white',
        success: 'bg-state-success text-white',
        outline: 'border-2 bg-transparent',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
```

#### 6. Accordion Component
**File:** `components/ui/Accordion.tsx`

```typescript
'use client'

import * as React from 'react'
import * as AccordionPrimitive from '@radix-ui/react-accordion'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const Accordion = AccordionPrimitive.Root

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn(
      'border-l-4 border-accent-cyan bg-slate-50 rounded-lg mb-3 overflow-hidden hover:bg-slate-100 transition-colors',
      className
    )}
    {...props}
  />
))
AccordionItem.displayName = 'AccordionItem'

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        'flex flex-1 items-center justify-between p-6 text-lg font-semibold transition-all hover:underline [&[data-state=open]]:border-l-accent-amber',
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-5 w-5 shrink-0 transition-transform duration-300 [&[data-state=open]]:rotate-180" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
))
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden text-base transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
    {...props}
  >
    <div className={cn('p-6 pt-0', className)}>{children}</div>
  </AccordionPrimitive.Content>
))
AccordionContent.displayName = AccordionPrimitive.Content.displayName

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
```

#### 7. Motion Wrapper Components
**File:** `components/motion/FadeInUp.tsx`

```typescript
'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface FadeInUpProps {
  children: ReactNode
  delay?: number
  duration?: number
  className?: string
}

export function FadeInUp({
  children,
  delay = 0,
  duration = 0.6,
  className
}: FadeInUpProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration,
        delay,
        ease: [0.4, 0, 0.2, 1]
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
```

**File:** `components/motion/StaggerContainer.tsx`

```typescript
'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface StaggerContainerProps {
  children: ReactNode
  staggerDelay?: number
  className?: string
}

export function StaggerContainer({
  children,
  staggerDelay = 0.1,
  className
}: StaggerContainerProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
```

**File:** `components/motion/ScrollReveal.tsx`

```typescript
'use client'

import { motion, useInView } from 'framer-motion'
import { ReactNode, useRef } from 'react'

interface ScrollRevealProps {
  children: ReactNode
  delay?: number
  className?: string
}

export function ScrollReveal({ children, delay = 0, className }: ScrollRevealProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{
        duration: 0.6,
        delay,
        ease: [0.4, 0, 0.2, 1]
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
```

### Success Criteria:

#### Automated Verification:
- [ ] All components build without errors: `npm run build`
- [ ] TypeScript types are correct: `npx tsc --noEmit`
- [ ] No unused imports or variables

#### Manual Verification:
- [ ] Button component renders with all variants (primary, secondary, outline)
- [ ] Card component displays with proper shadow and rounded corners
- [ ] Badge component shows different color variants
- [ ] Accordion expands/collapses smoothly
- [ ] Motion components animate on load
- [ ] ScrollReveal triggers when scrolling into view

---

## Phase 3: Hero & Above-Fold Sections

### Overview
Implement the first three critical sections: Hero (Section 1), Problem Statement (Section 2), and Solution Overview (Section 3). These sections must load fast and convert visitors immediately.

### Changes Required:

#### 1. Hero Section Component
**File:** `components/sections/Hero.tsx`

```typescript
'use client'

import { Button } from '@/components/ui/Button'
import { FadeInUp } from '@/components/motion/FadeInUp'
import { StaggerContainer } from '@/components/motion/StaggerContainer'
import { ArrowRight, Play } from 'lucide-react'
import Image from 'next/image'

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Distinctive Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary via-primary-dark to-slate-950">
        {/* Radial gradients for depth */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-[10%] left-[20%] w-96 h-96 bg-accent-cyan rounded-full blur-3xl" />
          <div className="absolute bottom-[20%] right-[10%] w-96 h-96 bg-accent-amber rounded-full blur-3xl" />
        </div>
        {/* Subtle geometric pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 40px,
              rgba(255, 255, 255, 0.1) 40px,
              rgba(255, 255, 255, 0.1) 41px
            )`
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Copy */}
          <StaggerContainer staggerDelay={0.2}>
            <FadeInUp>
              <h1 className="text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight">
                Recover 20+ Hours Weekly and Add $100K to Your Pipeline in 90 Days
              </h1>
            </FadeInUp>

            <FadeInUp delay={0.2}>
              <p className="text-xl text-slate-300 leading-relaxed mt-6">
                Autonomous AI sales agents for Brisbane professional services firms—built by a former AWS SRE who understands both the code and the business outcomes.
              </p>
            </FadeInUp>

            {/* CTAs */}
            <FadeInUp delay={0.4}>
              <div className="flex flex-col sm:flex-row gap-4 mt-8">
                <Button size="lg" className="group">
                  Book Your Free Strategy Session
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </Button>
                <Button variant="secondary" size="lg">
                  <Play className="w-5 h-5" />
                  Watch 3-Minute Demo
                </Button>
              </div>
            </FadeInUp>

            <FadeInUp delay={0.6}>
              <p className="text-sm text-slate-500 font-mono mt-4">
                30-minute call, no obligation · See if we're a fit
              </p>
            </FadeInUp>

            {/* Trust elements */}
            <FadeInUp delay={0.8}>
              <div className="mt-12">
                <p className="text-sm text-slate-400 mb-4">
                  Trusted by 50+ consulting, accounting, and marketing firms
                </p>
                <div className="flex items-center gap-6 opacity-70 grayscale">
                  {/* Placeholder logos */}
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="w-20 h-8 bg-slate-600 rounded"
                      aria-label={`Client logo ${i}`}
                    />
                  ))}
                </div>
              </div>
            </FadeInUp>
          </StaggerContainer>

          {/* Right: Visual (placeholder for now) */}
          <FadeInUp delay={0.4} className="hidden lg:block">
            <div className="relative aspect-square bg-gradient-to-br from-accent-cyan/20 to-accent-amber/20 rounded-2xl border border-slate-700 p-8">
              {/* Placeholder for workflow visualization */}
              <div className="text-slate-400 text-center flex items-center justify-center h-full">
                <p className="font-mono text-sm">
                  [Abstract workflow visualization]
                  <br />
                  Terminal-aesthetic or data viz inspired
                </p>
              </div>
            </div>
          </FadeInUp>
        </div>
      </div>
    </section>
  )
}
```

#### 2. Problem Statement Section
**File:** `components/sections/Problem.tsx`

```typescript
'use client'

import { ScrollReveal } from '@/components/motion/ScrollReveal'
import { Card, CardContent } from '@/components/ui/Card'
import { Clock, DollarSign, TrendingDown } from 'lucide-react'

const problems = [
  {
    icon: Clock,
    metric: '40%',
    label: 'of Time Wasted',
    description: 'Your reps spend 16+ hours weekly on CRM updates and data entry',
    color: 'accent-coral',
  },
  {
    icon: DollarSign,
    metric: '$475K',
    label: 'Annual Cost',
    description: 'That\'s the value of time spent on non-selling activities',
    color: 'accent-coral',
  },
  {
    icon: TrendingDown,
    metric: '30%',
    label: 'Lost Deals',
    description: 'Prospects fall through cracks due to slow follow-up',
    color: 'accent-coral',
  },
]

export function Problem() {
  return (
    <section className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-6">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-slate-900">
              Your Sales Team Is Losing $250K+ Annually to Manual Work
            </h2>
            <p className="text-lg text-slate-600 mt-4">
              Here's exactly what it's costing you:
            </p>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-6">
          {problems.map((problem, idx) => (
            <ScrollReveal key={idx} delay={idx * 0.1}>
              <Card className="border-l-4 border-accent-coral hover:-translate-y-1 transition-transform duration-200 bg-gradient-to-b from-red-50 to-white">
                <CardContent className="p-6">
                  <problem.icon className="w-8 h-8 text-accent-coral mb-4" strokeWidth={1.5} />
                  <div className="font-mono text-4xl font-bold text-slate-900 tabular-nums mb-2">
                    {problem.metric}
                  </div>
                  <div className="text-lg font-semibold text-slate-900 mb-2">
                    {problem.label}
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    {problem.description}
                  </p>
                </CardContent>
              </Card>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
```

#### 3. Solution Overview Section
**File:** `components/sections/Solution.tsx`

```typescript
'use client'

import { ScrollReveal } from '@/components/motion/ScrollReveal'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Zap, TrendingUp, Target } from 'lucide-react'

const benefits = [
  {
    icon: Zap,
    title: 'Recover 20+ Hours Weekly',
    description: 'AI agents handle lead research, CRM updates, follow-up sequencing, and meeting scheduling automatically',
    metric: '3-5x more qualified meetings',
    metricColor: 'amber',
    span: 'md:col-span-2',
    gradient: 'from-cyan-50 to-amber-50',
  },
  {
    icon: TrendingUp,
    title: 'Add $100K+ to Pipeline',
    description: 'Never miss a lead. Instant 24/7 response. Personalized multi-channel outreach.',
    metric: '8.6x average ROI',
    metricColor: 'success',
    span: 'md:col-span-1',
    gradient: 'from-blue-50 to-cyan-50',
  },
  {
    icon: Target,
    title: '5-10x ROI in 120 Days',
    description: 'Typical clients see full payback in 2 months, then continuous compounding value',
    metric: 'Average ROI: 8.6x',
    metricColor: 'success',
    span: 'md:col-span-1',
    gradient: 'from-green-50 to-emerald-50',
  },
]

export function Solution() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-slate-900">
              Autonomous AI Agents That Actually Work
            </h2>
            <p className="text-lg text-slate-600 mt-4">
              Not automation. Not chatbots. Intelligent agents that research, qualify, and engage 24/7.
            </p>
          </div>
        </ScrollReveal>

        {/* Bento grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {benefits.map((benefit, idx) => (
            <ScrollReveal
              key={idx}
              delay={idx * 0.12}
              className={benefit.span}
            >
              <Card className={`h-full bg-gradient-to-br ${benefit.gradient} border-0 shadow-card-lg hover:-translate-y-1 transition-all duration-200`}>
                <CardContent className="p-8">
                  {/* Icon in gradient circle */}
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent-cyan to-accent-amber flex items-center justify-center mb-6">
                    <benefit.icon className="w-8 h-8 text-white" strokeWidth={2} />
                  </div>

                  <h3 className="text-2xl font-bold text-slate-900 mb-3">
                    {benefit.title}
                  </h3>

                  <p className="text-slate-700 leading-relaxed mb-6">
                    {benefit.description}
                  </p>

                  <Badge variant={benefit.metricColor as any} className="text-sm font-bold">
                    {benefit.metric}
                  </Badge>
                </CardContent>
              </Card>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
```

#### 4. Update Main Page
**File:** `app/page.tsx`

```typescript
import { Hero } from '@/components/sections/Hero'
import { Problem } from '@/components/sections/Problem'
import { Solution } from '@/components/sections/Solution'

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <Problem />
      <Solution />
      {/* More sections will be added in later phases */}
    </main>
  )
}
```

### Success Criteria:

#### Automated Verification:
- [ ] Page builds successfully: `npm run build`
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] No console errors when running dev server

#### Manual Verification:
- [ ] Hero section loads with animated text and CTAs
- [ ] Background gradients are visible (not solid color)
- [ ] Problem cards display with coral accent border
- [ ] Solution cards show in bento grid layout
- [ ] Animations trigger on scroll
- [ ] Mobile layout works (stack vertically on small screens)
- [ ] All text is readable with proper contrast

---

## Phase 4: Social Proof & Process

### Overview
Implement Sections 4-6: Video Testimonial, Process Timeline, and Technical Credibility. These sections build trust and explain how the service works.

### Changes Required:

#### 1. Placeholder Data File
**File:** `lib/data.ts` (create file)

```typescript
import { Testimonial, CaseStudy, FAQItem, PricingTier } from '@/types'

// PLACEHOLDER DATA - Replace with real content later
export const testimonials: Testimonial[] = [
  {
    quote: "We recovered 25 hours weekly and added $180K to our pipeline in just 90 days. This paid for itself in 6 weeks.",
    author: {
      name: "Sarah Thompson",
      title: "Operations Director",
      company: "ABC Consulting",
      companySize: "35 employees",
      photo: "/placeholder-headshot.jpg", // Replace with real photo
    },
    metrics: [
      { label: "25 hrs/week saved", value: "25", icon: "Clock", color: "success" },
      { label: "$180K pipeline added", value: "$180K", icon: "DollarSign", color: "amber" },
      { label: "6-week payback", value: "6 weeks", icon: "TrendingUp", color: "cyan" },
    ],
    videoUrl: "https://www.youtube.com/embed/placeholder", // Replace with real video
  },
]

export const caseStudy: CaseStudy = {
  title: "How ABC Accounting Saved 25 Hours Weekly and Added $380K to Pipeline",
  company: "ABC Accounting",
  industry: "Professional Services",
  employeeCount: "35 employees",
  location: "Brisbane, QLD",
  challenge: [
    "40% of sales team time wasted on unqualified leads",
    "$250K in lost opportunity cost",
    "Manual CRM updates taking 8+ hours weekly",
  ],
  solution: [
    "Implemented autonomous AI sales agents for lead qualification",
    "12 custom criteria aligned to their ICP",
    "Multi-channel engagement (Email, LinkedIn, SMS)",
  ],
  results: [
    { metric: "4 hours → 4 minutes", description: "Lead qualification time", icon: "Clock", color: "cyan" },
    { metric: "43% increase", description: "MQL-to-SQL conversion", icon: "TrendingUp", color: "success" },
    { metric: "$380K added", description: "Pipeline in 120 days", icon: "DollarSign", color: "amber" },
    { metric: "25 hrs/week saved", description: "Team productivity", icon: "Zap", color: "success" },
  ],
  timeline: "Implemented in 6 weeks, results visible by week 10",
}

export const pricingTiers: PricingTier[] = [
  {
    name: "AI-Assisted Sales System",
    setupCost: 8500,
    monthlyCost: 2500,
    target: "Solo practices & small teams",
    icon: "Zap",
    borderColor: "accent-cyan",
    features: [
      "1 AI sales agent",
      "Email automation",
      "Basic lead scoring",
      "CRM integration (HubSpot or Salesforce)",
      "Weekly performance reports",
      "Email support",
    ],
    cta: {
      text: "Get Started",
      href: "#booking",
      variant: "outline",
    },
  },
  {
    name: "Intelligent Sales Agent",
    setupCost: 15000,
    monthlyCost: 4500,
    target: "Growing firms (10-50 employees)",
    icon: "TrendingUp",
    borderColor: "accent-amber",
    recommended: true,
    features: [
      "2 AI sales agents",
      "Multi-channel campaigns (Email + LinkedIn)",
      "Advanced lead scoring with AI",
      "Real-time data enrichment",
      "Automated meeting booking",
      "Custom workflows",
      "Daily performance dashboards",
      "Priority support",
      "5x ROI guarantee",
    ],
    cta: {
      text: "Book Strategy Call",
      href: "#booking",
      variant: "filled",
    },
  },
  {
    name: "Autonomous AI Sales Agent",
    setupCost: 0, // Custom pricing
    monthlyCost: 0,
    target: "Large firms (50+ employees)",
    icon: "Building",
    borderColor: "state-success",
    features: [
      "Unlimited AI sales agents",
      "Full multi-channel (Email + LinkedIn + SMS)",
      "Custom AI training",
      "Advanced analytics & reporting",
      "Dedicated account manager",
      "Custom integrations",
      "White-glove onboarding",
      "24/7 priority support",
    ],
    cta: {
      text: "Contact Sales",
      href: "#booking",
      variant: "outline",
    },
  },
]

export const faqs: FAQItem[] = [
  {
    question: "What's the typical ROI and payback period?",
    answer: "Most clients see 5-10x ROI within the first year. The average payback period is 2-3 months. For example, if you invest $15,000 in setup + $4,500/month ($27,000 in Year 1), you typically see $100K+ in additional pipeline and 20+ hours saved weekly (worth ~$50K in productivity). This results in an 8.6x average ROI.",
    category: "pricing",
  },
  {
    question: "How long until we see results?",
    answer: "Most clients see initial results within 2-3 weeks and significant impact by week 8-10. Timeline: Week 2 (initial leads processed), Week 6 (first automated meetings booked), Week 10 (measurable pipeline increase), Month 4 (full ROI visible).",
    category: "results",
  },
  {
    question: "Do we need technical expertise to use this?",
    answer: "No technical expertise required. We handle all the setup, configuration, and maintenance. You'll receive training on how to review reports and adjust strategies, but from your perspective, it works like hiring a sales rep—not installing software. Our team manages all the technical complexity.",
    category: "technical",
  },
  {
    question: "What happens if it doesn't work?",
    answer: "We offer a 5x ROI guarantee within 120 days. If you don't see at least 5x return on your monthly retainer investment, we'll work with you to optimize the system at no additional cost. If we still can't deliver results, you can cancel with 30 days notice.",
    category: "guarantee",
  },
  {
    question: "How do you measure ROI?",
    answer: "We track three key metrics: (1) Time saved (hours your team spends on manual tasks), (2) Pipeline added (new qualified opportunities generated), and (3) Conversion rate improvements (MQL-to-SQL increases). We provide detailed monthly reports showing these metrics compared to your baseline.",
    category: "results",
  },
  {
    question: "Does this work with our existing CRM?",
    answer: "Yes. We integrate with HubSpot, Salesforce, Pipedrive, and Zoho CRM via API. If you use a different system, we can typically build a custom integration (available on Enterprise tier).",
    category: "technical",
  },
]
```

#### 2. Testimonial Section
**File:** `components/sections/Testimonial.tsx`

```typescript
'use client'

import { ScrollReveal } from '@/components/motion/ScrollReveal'
import { Badge } from '@/components/ui/Badge'
import { Play } from 'lucide-react'
import { testimonials } from '@/lib/data'
import Image from 'next/image'

export function Testimonial() {
  const testimonial = testimonials[0] // Using first testimonial

  return (
    <section className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-5 gap-12 items-center">
          {/* Video Preview - 60% */}
          <ScrollReveal className="lg:col-span-3">
            <div className="relative aspect-video rounded-xl overflow-hidden shadow-card-lg border-2 border-slate-200">
              {/* Placeholder video thumbnail */}
              <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                <button
                  className="w-20 h-20 rounded-full bg-accent-cyan flex items-center justify-center animate-pulse-glow hover:scale-110 transition-transform"
                  aria-label="Play testimonial video"
                >
                  <Play className="w-10 h-10 text-white ml-1" fill="white" />
                </button>
              </div>
            </div>
          </ScrollReveal>

          {/* Quote & Metrics - 40% */}
          <div className="lg:col-span-2">
            <ScrollReveal delay={0.2}>
              {/* Large opening quote mark */}
              <div className="text-6xl text-accent-cyan font-serif mb-4">"</div>

              <blockquote className="text-2xl font-medium italic leading-relaxed text-slate-900 mb-8">
                {testimonial.quote}
              </blockquote>

              {/* Attribution */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-slate-300 border-2 border-state-success flex-shrink-0">
                  {/* Placeholder avatar */}
                </div>
                <div>
                  <div className="font-semibold text-slate-900">{testimonial.author.name}</div>
                  <div className="text-slate-600">{testimonial.author.title}</div>
                  <div className="text-sm font-mono text-slate-500">
                    {testimonial.author.company} ({testimonial.author.companySize})
                  </div>
                </div>
              </div>

              {/* Results badges */}
              <div className="flex flex-wrap gap-3">
                {testimonial.metrics.map((metric, idx) => (
                  <Badge key={idx} variant="success">
                    {metric.label}
                  </Badge>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  )
}
```

#### 3. Process Timeline Section
**File:** `components/sections/Process.tsx`

```typescript
'use client'

import { ScrollReveal } from '@/components/motion/ScrollReveal'
import { Search, Lightbulb, Code2, RefreshCw } from 'lucide-react'

const phases = [
  {
    number: 1,
    title: "Discovery & Audit",
    duration: "2 weeks",
    icon: Search,
    color: "accent-coral",
    description: "We analyze your sales processes, identify bottlenecks, and map automation opportunities",
    deliverables: [
      "Process flowcharts",
      "Opportunity assessment",
      "Custom roadmap",
    ],
  },
  {
    number: 2,
    title: "Strategy & Design",
    duration: "1 week",
    icon: Lightbulb,
    color: "accent-amber",
    description: "Design your autonomous AI agents tailored to your ICP, scoring criteria, and workflows",
    deliverables: [
      "System architecture",
      "Workflow designs",
      "Integration plan",
    ],
  },
  {
    number: 3,
    title: "Implementation & Training",
    duration: "4 weeks",
    icon: Code2,
    color: "accent-cyan",
    description: "Build, test, and deploy your AI agents. Train your team on oversight and optimization",
    deliverables: [
      "Production system",
      "CRM integration",
      "Team training",
      "Documentation",
    ],
  },
  {
    number: 4,
    title: "Ongoing Optimization",
    duration: "Monthly",
    icon: RefreshCw,
    color: "state-success",
    description: "Continuous improvement based on real results, A/B testing, and evolving needs",
    deliverables: [
      "Monthly reports",
      "Optimization cycles",
      "Priority support",
    ],
  },
]

export function Process() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-slate-900">
              From Strategy to Results in 8 Weeks
            </h2>
          </div>
        </ScrollReveal>

        {/* Timeline */}
        <div className="relative">
          {/* Connecting line */}
          <div className="hidden lg:block absolute top-12 left-0 right-0 h-1 bg-gradient-to-r from-accent-coral via-accent-amber via-accent-cyan to-state-success" />

          {/* Phases */}
          <div className="grid lg:grid-cols-4 gap-8 relative">
            {phases.map((phase, idx) => (
              <ScrollReveal key={idx} delay={idx * 0.15}>
                <div className="relative">
                  {/* Number circle */}
                  <div className={`w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-${phase.color} to-${phase.color} flex items-center justify-center mb-6 relative z-10 shadow-lg`}>
                    <span className="text-3xl font-bold font-mono text-white">
                      {phase.number}
                    </span>
                  </div>

                  {/* Icon in gradient circle */}
                  <div className="flex justify-center mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent-cyan to-accent-amber flex items-center justify-center">
                      <phase.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-slate-900 mb-2">
                      {phase.title}
                    </h3>
                    <p className="text-sm font-mono text-accent-amber mb-4">
                      {phase.duration}
                    </p>
                    <p className="text-slate-700 leading-relaxed mb-6">
                      {phase.description}
                    </p>

                    {/* Deliverables */}
                    <div className="text-left space-y-2">
                      {phase.deliverables.map((item, i) => (
                        <div key={i} className="text-sm font-mono text-slate-600">
                          <span className="text-accent-cyan">&gt;</span> {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
```

#### 4. Technical Credibility Section
**File:** `components/sections/TechCredibility.tsx`

```typescript
'use client'

import { ScrollReveal } from '@/components/motion/ScrollReveal'
import { Brain, Workflow, Database, Plug, Server } from 'lucide-react'

const techStack = [
  {
    layer: "Intelligence Layer",
    icon: Brain,
    color: "accent-amber",
    tech: "GPT-4 + Proprietary Models",
  },
  {
    layer: "Orchestration Layer",
    icon: Workflow,
    color: "accent-cyan",
    tech: "n8n + TypeScript + AWS Lambda",
  },
  {
    layer: "Data Layer",
    icon: Database,
    color: "state-info",
    tech: "Real-time enrichment (Clay, Clearbit, Apollo)",
  },
  {
    layer: "Integration Layer",
    icon: Plug,
    color: "state-success",
    tech: "HubSpot, Salesforce, Pipedrive APIs",
  },
  {
    layer: "Infrastructure",
    icon: Server,
    color: "primary",
    tech: "AWS with 99.9% uptime SLA",
  },
]

export function TechCredibility() {
  return (
    <section className="py-24 bg-slate-50 relative overflow-hidden">
      {/* Subtle code background */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="text-xs font-mono text-slate-600 p-8">
          {/* Placeholder code pattern */}
          {`function analyzeProspect(data) {\n  // AI decision logic\n  return decision;\n}`}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 relative">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Left: Founder bio */}
          <ScrollReveal>
            <div className="text-center lg:text-left">
              {/* Founder photo */}
              <div className="w-48 h-48 mx-auto lg:mx-0 rounded-full bg-gradient-to-br from-accent-cyan to-accent-amber p-1 mb-6">
                <div className="w-full h-full rounded-full bg-slate-300" />
              </div>

              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                Built by [Your Name], Former AWS SRE
              </h2>

              <div className="space-y-3 mb-8">
                <div className="flex items-start gap-3">
                  <Server className="w-6 h-6 text-accent-cyan flex-shrink-0 mt-1" />
                  <p className="text-slate-700">
                    10+ years scaling production systems
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Code2 className="w-6 h-6 text-accent-cyan flex-shrink-0 mt-1" />
                  <p className="text-slate-700">
                    <span className="font-mono">TypeScript</span>, <span className="font-mono">AWS</span>, Enterprise Architecture
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Brain className="w-6 h-6 text-accent-cyan flex-shrink-0 mt-1" />
                  <p className="text-slate-700">
                    SRE experience at [Previous Companies]
                  </p>
                </div>
              </div>

              {/* Quote */}
              <div className="border-l-4 border-accent-cyan pl-6 py-4 bg-white rounded-r-lg">
                <p className="text-6xl text-accent-amber font-serif">"</p>
                <p className="text-lg leading-relaxed italic text-slate-700 -mt-6">
                  I saw professional services firms struggling with problems I solved in engineering—manual, repetitive work that should be automated. Now I build AI agents with production-grade reliability, not marketing hype.
                </p>
              </div>
            </div>
          </ScrollReveal>

          {/* Right: Tech stack */}
          <ScrollReveal delay={0.2}>
            <div>
              <h3 className="text-2xl font-bold text-slate-900 mb-8">
                Enterprise-Grade Architecture
              </h3>

              <div className="space-y-4">
                {techStack.map((layer, idx) => (
                  <div
                    key={idx}
                    className={`border-l-4 border-${layer.color} bg-white rounded-r-lg p-6 shadow-card hover:-translate-x-1 transition-transform`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br from-${layer.color} to-${layer.color} flex items-center justify-center flex-shrink-0`}>
                        <layer.icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-1">
                          {layer.layer}
                        </h4>
                        <p className="text-slate-700 font-mono text-sm">
                          {layer.tech}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Trust badges */}
              <div className="flex items-center gap-6 mt-8 grayscale opacity-60">
                {['SOC 2', 'AWS Partner', 'GDPR'].map((badge, idx) => (
                  <div
                    key={idx}
                    className="w-16 h-16 bg-slate-300 rounded flex items-center justify-center text-xs font-bold"
                  >
                    {badge}
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}
```

#### 5. Update Main Page
**File:** `app/page.tsx` (update)

```typescript
import { Hero } from '@/components/sections/Hero'
import { Problem } from '@/components/sections/Problem'
import { Solution } from '@/components/sections/Solution'
import { Testimonial } from '@/components/sections/Testimonial'
import { Process } from '@/components/sections/Process'
import { TechCredibility } from '@/components/sections/TechCredibility'

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <Problem />
      <Solution />
      <Testimonial />
      <Process />
      <TechCredibility />
      {/* More sections in next phases */}
    </main>
  )
}
```

### Success Criteria:

#### Automated Verification:
- [ ] Page builds successfully: `npm run build`
- [ ] All imports resolve correctly
- [ ] No TypeScript errors

#### Manual Verification:
- [ ] Testimonial video placeholder displays with play button
- [ ] Process timeline shows 4 phases with gradient connecting line
- [ ] Tech stack layers display with left border colors
- [ ] Founder quote section renders with proper styling
- [ ] All scroll animations trigger when sections come into view
- [ ] Mobile layout stacks correctly

---

## Phase 5: Conversion Components

### Overview
Implement Sections 7-9: Case Study, Pricing Tiers, and Multi-Step Booking Form. These are the primary conversion drivers.

### Changes Required:

#### 1. Case Study Section
**File:** `components/sections/CaseStudy.tsx`

```typescript
'use client'

import { ScrollReveal } from '@/components/motion/ScrollReveal'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/Accordion'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { AlertTriangle, Lightbulb, Clock, TrendingUp, DollarSign, Zap } from 'lucide-react'
import { caseStudy } from '@/lib/data'
import { useState, useEffect } from 'react'

export function CaseStudy() {
  // Animated counter hook
  const useCounter = (end: number, duration: number = 1200) => {
    const [count, setCount] = useState(0)
    const [hasAnimated, setHasAnimated] = useState(false)

    useEffect(() => {
      if (!hasAnimated) {
        let start = 0
        const increment = end / (duration / 16)
        const timer = setInterval(() => {
          start += increment
          if (start >= end) {
            setCount(end)
            setHasAnimated(true)
            clearInterval(timer)
          } else {
            setCount(Math.floor(start))
          }
        }, 16)
        return () => clearInterval(timer)
      }
    }, [end, duration, hasAnimated])

    return count
  }

  return (
    <section className="py-24 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        <ScrollReveal>
          <Card className="border-2 border-state-success shadow-card-lg bg-gradient-to-br from-slate-50 to-white">
            <CardContent className="p-12">
              {/* Header */}
              <h2 className="text-3xl font-bold text-slate-900 mb-6">
                {caseStudy.title}
              </h2>

              {/* Company badges */}
              <div className="flex flex-wrap gap-3 mb-8">
                <Badge variant="default">{caseStudy.industry}</Badge>
                <Badge variant="default">{caseStudy.employeeCount}</Badge>
                <Badge variant="default">{caseStudy.location}</Badge>
              </div>

              {/* Accordion sections */}
              <Accordion type="single" collapsible className="mb-8">
                <AccordionItem value="challenge">
                  <AccordionTrigger>
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-accent-coral" />
                      <span>The Challenge</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-2">
                      {caseStudy.challenge.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <span className="text-accent-coral text-lg">•</span>
                          <span className="text-slate-700">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="solution">
                  <AccordionTrigger>
                    <div className="flex items-center gap-3">
                      <Lightbulb className="w-5 h-5 text-accent-amber" />
                      <span>The Solution</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-2">
                      {caseStudy.solution.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <span className="text-accent-cyan text-lg">•</span>
                          <span className="text-slate-700">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Results - Always visible */}
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-6">Results</h3>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  {caseStudy.results.map((result, idx) => {
                    const Icon = result.icon === 'Clock' ? Clock :
                               result.icon === 'TrendingUp' ? TrendingUp :
                               result.icon === 'DollarSign' ? DollarSign : Zap

                    return (
                      <ScrollReveal key={idx} delay={idx * 0.1}>
                        <Card className={`bg-gradient-to-br from-${result.color}-50 to-white border-0`}>
                          <CardContent className="p-6 text-center">
                            <Icon className={`w-6 h-6 text-accent-${result.color} mx-auto mb-3`} />
                            <div className="text-5xl font-bold font-mono tabular-nums text-slate-900 mb-2">
                              {result.metric}
                            </div>
                            <p className="text-sm text-slate-600">
                              {result.description}
                            </p>
                          </CardContent>
                        </Card>
                      </ScrollReveal>
                    )
                  })}
                </div>

                <p className="text-sm font-mono text-slate-500 mb-6">
                  {caseStudy.timeline}
                </p>

                <Button variant="outline" className="border-state-success text-state-success hover:bg-state-success hover:text-white">
                  Read Full Case Study
                </Button>
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>
      </div>
    </section>
  )
}
```

#### 2. Pricing Section
**File:** `components/sections/Pricing.tsx`

```typescript
'use client'

import { ScrollReveal } from '@/components/motion/ScrollReveal'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Check, Zap, TrendingUp, Building } from 'lucide-react'
import { pricingTiers } from '@/lib/data'
import { formatCurrency } from '@/lib/utils'

export function Pricing() {
  const getIcon = (iconName: string) => {
    const icons = { Zap, TrendingUp, Building }
    return icons[iconName as keyof typeof icons] || Zap
  }

  return (
    <section className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-6">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-slate-600">
              All plans include our 5x ROI guarantee. If you don't see results, you don't pay.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid lg:grid-cols-3 gap-8">
          {pricingTiers.map((tier, idx) => {
            const Icon = getIcon(tier.icon)
            const isRecommended = tier.recommended

            return (
              <ScrollReveal
                key={idx}
                delay={idx * 0.15}
                className={isRecommended ? 'lg:-translate-y-4' : ''}
              >
                <Card
                  className={`relative h-full border-2 border-${tier.borderColor} ${
                    isRecommended ? 'shadow-card-lg bg-gradient-to-br from-amber-50 to-white scale-105' : 'bg-white'
                  }`}
                >
                  {/* Recommended badge */}
                  {isRecommended && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge variant="amber" className="text-sm font-bold px-4 py-2 animate-pulse-glow">
                        Most Popular
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="text-center pb-8 pt-8">
                    <Icon className={`w-8 h-8 text-${tier.borderColor} mx-auto mb-4`} />
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">
                      {tier.name}
                    </h3>
                    <p className="text-slate-600 mb-6">
                      {tier.target}
                    </p>

                    {tier.setupCost > 0 ? (
                      <>
                        <div className="text-4xl font-bold text-slate-900 tabular-nums">
                          {formatCurrency(tier.setupCost)}
                        </div>
                        <p className="text-sm text-slate-500 mb-2">setup</p>
                        <div className="text-2xl font-bold text-slate-900 tabular-nums">
                          + {formatCurrency(tier.monthlyCost)}/mo
                        </div>
                      </>
                    ) : (
                      <div className="text-3xl font-bold text-slate-900">
                        Custom Pricing
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="pt-0">
                    {/* Features list */}
                    <ul className="space-y-3 mb-8">
                      {tier.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className={`w-5 h-5 rounded-full bg-${tier.borderColor} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                            <Check className="w-3 h-3 text-white" strokeWidth={3} />
                          </div>
                          <span className="text-slate-700">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <Button
                      variant={tier.cta.variant === 'filled' ? 'primary' : 'outline'}
                      className={`w-full ${isRecommended ? 'text-lg py-4' : ''} border-${tier.borderColor}`}
                      onClick={() => {
                        document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' })
                      }}
                    >
                      {tier.cta.text}
                    </Button>

                    {isRecommended && (
                      <p className="text-xs text-center mt-3 text-state-success font-semibold">
                        5x ROI or money back
                      </p>
                    )}
                  </CardContent>
                </Card>
              </ScrollReveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
```

#### 3. Multi-Step Booking Form (Part 1 - Calendly Option)
**File:** `components/sections/BookingForm.tsx`

```typescript
'use client'

import { useState } from 'react'
import { ScrollReveal } from '@/components/motion/ScrollReveal'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { CheckCircle2 } from 'lucide-react'

// Form validation schema
const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  company: z.string().min(2, 'Company name required'),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  companySize: z.string(),
  industry: z.string(),
  goals: z.array(z.string()).min(1, 'Select at least one goal'),
  challenge: z.string().min(50, 'Please provide at least 50 characters'),
})

type FormData = z.infer<typeof formSchema>

const FORM_STEPS = [
  { id: 1, label: 'Contact', title: 'Your Contact Information' },
  { id: 2, label: 'Company', title: 'Company Details' },
  { id: 3, label: 'Goals', title: 'Your Primary Goals' },
  { id: 4, label: 'Challenges', title: 'Current Challenges' },
  { id: 5, label: 'Schedule', title: 'Book Your Call' },
]

export function BookingForm() {
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    trigger,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
  })

  const selectedGoals = watch('goals', [])

  const handleNext = async () => {
    // Validate current step fields
    const fieldsToValidate = getStepFields(currentStep)
    const isValid = await trigger(fieldsToValidate as any)

    if (isValid && currentStep < 5) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const onSubmit = (data: FormData) => {
    // TODO: Send to HubSpot or backend
    console.log('Form submitted:', data)
    setIsSubmitted(true)
  }

  const getStepFields = (step: number): string[] => {
    switch (step) {
      case 1: return ['name', 'email', 'phone']
      case 2: return ['company', 'website', 'companySize', 'industry']
      case 3: return ['goals']
      case 4: return ['challenge']
      default: return []
    }
  }

  if (isSubmitted) {
    return (
      <section id="booking" className="py-24 bg-white">
        <div className="max-w-2xl mx-auto px-6">
          <ScrollReveal>
            <Card className="border-2 border-state-success shadow-card-lg text-center p-12">
              <div className="w-20 h-20 rounded-full bg-state-success mx-auto mb-6 flex items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                You're all set!
              </h2>
              <p className="text-lg text-slate-600 mb-8">
                Check your email for the calendar invite and pre-call questionnaire.
              </p>
              <Card className="bg-slate-50 border-0">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">What happens next:</h3>
                  <ol className="text-left space-y-3 text-slate-700">
                    <li className="flex gap-3">
                      <Badge variant="cyan" className="flex-shrink-0">1</Badge>
                      <span>You'll receive a calendar invite within 2 minutes</span>
                    </li>
                    <li className="flex gap-3">
                      <Badge variant="cyan" className="flex-shrink-0">2</Badge>
                      <span>We'll send a brief questionnaire to prepare for the call</span>
                    </li>
                    <li className="flex gap-3">
                      <Badge variant="cyan" className="flex-shrink-0">3</Badge>
                      <span>On the call, we'll discuss your specific needs and ROI potential</span>
                    </li>
                  </ol>
                </CardContent>
              </Card>
            </Card>
          </ScrollReveal>
        </div>
      </section>
    )
  }

  return (
    <section id="booking" className="py-24 bg-white">
      <div className="max-w-2xl mx-auto px-6">
        <ScrollReveal>
          <Card className="border-2 border-accent-cyan shadow-card-lg">
            <CardContent className="p-10">
              {/* Progress indicator */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                  {FORM_STEPS.map((step) => (
                    <div
                      key={step.id}
                      className={`flex-1 h-2 rounded-full mx-1 transition-colors ${
                        step.id <= currentStep ? 'bg-accent-cyan' : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                  {FORM_STEPS.map((step) => (
                    <span key={step.id} className={step.id === currentStep ? 'text-accent-cyan font-semibold' : ''}>
                      {step.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Form title */}
              <h2 className="text-2xl font-bold text-slate-900 mb-8">
                {FORM_STEPS[currentStep - 1].title}
              </h2>

              {/* Form content */}
              <form onSubmit={handleSubmit(onSubmit)}>
                {/* Step 1: Contact */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                        Full Name *
                      </label>
                      <input
                        {...register('name')}
                        id="name"
                        type="text"
                        className="w-full px-4 py-3 border-2 border-slate-300 rounded-md focus:border-accent-cyan focus:ring-0 transition-colors"
                        placeholder="John Smith"
                      />
                      {errors.name && (
                        <p className="text-sm text-accent-coral mt-1">{errors.name.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                        Email Address *
                      </label>
                      <input
                        {...register('email')}
                        id="email"
                        type="email"
                        className="w-full px-4 py-3 border-2 border-slate-300 rounded-md focus:border-accent-cyan focus:ring-0 transition-colors"
                        placeholder="john@company.com"
                      />
                      {errors.email && (
                        <p className="text-sm text-accent-coral mt-1">{errors.email.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-2">
                        Phone Number *
                      </label>
                      <input
                        {...register('phone')}
                        id="phone"
                        type="tel"
                        className="w-full px-4 py-3 border-2 border-slate-300 rounded-md focus:border-accent-cyan focus:ring-0 transition-colors"
                        placeholder="+61 4XX XXX XXX"
                      />
                      {errors.phone && (
                        <p className="text-sm text-accent-coral mt-1">{errors.phone.message}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 2: Company */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div>
                      <label htmlFor="company" className="block text-sm font-medium text-slate-700 mb-2">
                        Company Name *
                      </label>
                      <input
                        {...register('company')}
                        id="company"
                        type="text"
                        className="w-full px-4 py-3 border-2 border-slate-300 rounded-md focus:border-accent-cyan focus:ring-0"
                        placeholder="ABC Consulting"
                      />
                      {errors.company && (
                        <p className="text-sm text-accent-coral mt-1">{errors.company.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="website" className="block text-sm font-medium text-slate-700 mb-2">
                        Website URL
                      </label>
                      <input
                        {...register('website')}
                        id="website"
                        type="url"
                        className="w-full px-4 py-3 border-2 border-slate-300 rounded-md focus:border-accent-cyan focus:ring-0"
                        placeholder="https://company.com"
                      />
                    </div>

                    <div>
                      <label htmlFor="companySize" className="block text-sm font-medium text-slate-700 mb-2">
                        Company Size *
                      </label>
                      <select
                        {...register('companySize')}
                        id="companySize"
                        className="w-full px-4 py-3 border-2 border-slate-300 rounded-md focus:border-accent-cyan focus:ring-0"
                      >
                        <option value="">Select size</option>
                        <option value="1-10">1-10 employees</option>
                        <option value="10-50">10-50 employees</option>
                        <option value="50+">50+ employees</option>
                      </select>
                      {errors.companySize && (
                        <p className="text-sm text-accent-coral mt-1">{errors.companySize.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="industry" className="block text-sm font-medium text-slate-700 mb-2">
                        Industry *
                      </label>
                      <select
                        {...register('industry')}
                        id="industry"
                        className="w-full px-4 py-3 border-2 border-slate-300 rounded-md focus:border-accent-cyan focus:ring-0"
                      >
                        <option value="">Select industry</option>
                        <option value="consulting">Consulting</option>
                        <option value="accounting">Accounting</option>
                        <option value="marketing">Marketing Agency</option>
                        <option value="legal">Legal Services</option>
                        <option value="other">Other</option>
                      </select>
                      {errors.industry && (
                        <p className="text-sm text-accent-coral mt-1">{errors.industry.message}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 3: Goals (checkboxes) - will add in actual code */}
                {/* Step 4: Challenges (textarea) - will add in actual code */}
                {/* Step 5: Calendly embed - will add in actual code */}

                {/* Navigation buttons */}
                <div className="flex gap-4 mt-8">
                  {currentStep > 1 && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleBack}
                      className="flex-1"
                    >
                      Back
                    </Button>
                  )}
                  {currentStep < 5 ? (
                    <Button
                      type="button"
                      onClick={handleNext}
                      className="flex-1"
                    >
                      Continue
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      className="flex-1"
                    >
                      Book Call
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </ScrollReveal>
      </div>
    </section>
  )
}
```

**Note:** The booking form is shown with Steps 1-2 implemented. Steps 3-5 would be added similarly following the same pattern.

#### 4. Form Setup Instructions Document
**File:** `docs/FORM_SETUP.md` (create new file)

```markdown
# Booking Form Setup Instructions

You have two options for handling form submissions: Calendly (easiest) or HubSpot (more integrated).

## Option 1: Calendly Integration (Recommended for Quick Setup)

### Setup Steps:

1. **Create Calendly Account**
   - Sign up at https://calendly.com
   - Create a 30-minute event type called "Strategy Session"

2. **Get Your Calendly Link**
   - Go to your event type settings
   - Copy your scheduling link (e.g., `https://calendly.com/your-name/strategy-session`)

3. **Update Environment Variables**
   - Open `.env.local`
   - Set `NEXT_PUBLIC_CALENDLY_URL=https://calendly.com/your-name/strategy-session`

4. **Embed Calendly in Step 5**
   - The booking form will show Calendly widget in Step 5
   - User data from Steps 1-4 will be pre-filled into Calendly

### Implementation:
In `components/sections/BookingForm.tsx`, Step 5 uses Calendly's embed widget:

```typescript
{currentStep === 5 && (
  <div>
    <InlineWidget
      url={process.env.NEXT_PUBLIC_CALENDLY_URL}
      prefill={{
        name: watch('name'),
        email: watch('email'),
        customAnswers: {
          a1: watch('company'),
          a2: watch('challenge'),
        }
      }}
    />
  </div>
)}
```

Install Calendly React package:
```bash
npm install react-calendly
```

## Option 2: HubSpot Form Integration

### Setup Steps:

1. **Create HubSpot Account**
   - Sign up at https://www.hubspot.com
   - Go to Free CRM tier

2. **Create a Form**
   - Navigate to Marketing > Lead Capture > Forms
   - Create a new form with these fields:
     - Name (single line text)
     - Email
     - Phone
     - Company name
     - Company size (dropdown)
     - Industry (dropdown)
     - Goals (checkboxes)
     - Current challenge (multi-line text)

3. **Get Form IDs**
   - After creating form, click "Share" > "Embed code"
   - You'll see: `portalId` and `formId` in the embed code
   - Example: `//js.hsforms.net/forms/v2.js portal: '12345', formId: 'abc-123'`

4. **Update Environment Variables**
   ```env
   NEXT_PUBLIC_HUBSPOT_PORTAL_ID=12345
   NEXT_PUBLIC_HUBSPOT_FORM_ID=abc-123
   ```

5. **Install HubSpot Package**
   ```bash
   npm install @hs/api-forms
   ```

### Implementation:
In `components/sections/BookingForm.tsx`, modify `onSubmit`:

```typescript
const onSubmit = async (data: FormData) => {
  try {
    const response = await fetch(
      `https://api.hsforms.com/submissions/v3/integration/submit/${process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID}/${process.env.NEXT_PUBLIC_HUBSPOT_FORM_ID}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: [
            { name: 'firstname', value: data.name.split(' ')[0] },
            { name: 'lastname', value: data.name.split(' ')[1] || '' },
            { name: 'email', value: data.email },
            { name: 'phone', value: data.phone },
            { name: 'company', value: data.company },
            { name: 'website', value: data.website },
            { name: 'company_size', value: data.companySize },
            { name: 'industry', value: data.industry },
            { name: 'goals', value: data.goals.join(', ') },
            { name: 'challenge', value: data.challenge },
          ],
        }),
      }
    )

    if (response.ok) {
      setIsSubmitted(true)
      // Optionally: Send confirmation email or redirect to thank you page
    }
  } catch (error) {
    console.error('Form submission error:', error)
    // Show error message to user
  }
}
```

## Testing

### Test Both Options:

1. **Calendly:**
   - Fill out form Steps 1-4
   - Verify Step 5 shows Calendly widget
   - Book a test appointment
   - Check Calendly dashboard for booking

2. **HubSpot:**
   - Fill out complete form
   - Submit
   - Check HubSpot Contacts for new entry
   - Verify all fields populated correctly

## Recommendation

- **Use Calendly if:** You want the fastest setup and calendar booking is primary goal
- **Use HubSpot if:** You need full CRM integration and lead nurturing workflows
- **Use Both:** Collect data via multi-step form, send to HubSpot, embed Calendly in Step 5
```

### Success Criteria:

#### Automated Verification:
- [ ] Form compiles without errors: `npm run build`
- [ ] All form validation works (test with invalid inputs)
- [ ] TypeScript types are correct

#### Manual Verification:
- [ ] Case study accordion expands/collapses smoothly
- [ ] Pricing cards display with correct tiers and borders
- [ ] "Most Popular" badge animates on Growth tier
- [ ] Booking form progresses through all 5 steps
- [ ] Form validation shows error messages
- [ ] Success state displays after submission
- [ ] Mobile layout works for all components

---

## Phase 6: Supporting Content & Polish

### Overview
Implement final sections (FAQ, Final CTA, Sticky Bar), add SEO metadata, analytics tracking, and accessibility improvements.

**Changes:** FAQ section, Final CTA, Sticky Bar, SEO setup, Analytics, Accessibility audit

### Success Criteria:

#### Automated Verification:
- [ ] Lighthouse Performance score: 90+
- [ ] Lighthouse Accessibility score: 100
- [ ] All meta tags present: `npm run build` and check `<head>`
- [ ] No console errors or warnings

#### Manual Verification:
- [ ] All 12 sections render correctly
- [ ] FAQ search/filter works
- [ ] Sticky bar appears on scroll
- [ ] Mobile menu works
- [ ] All CTAs link to booking section
- [ ] Page loads in under 2 seconds

---

## Phase 7: Testing & Optimization

### Overview
Final testing phase: Accessibility audit, performance optimization, browser testing, mobile testing, and quality assurance.

**Testing categories:**
- Visual regression testing
- Accessibility testing (keyboard nav, screen readers)
- Performance optimization (image optimization, code splitting)
- Browser compatibility
- Mobile responsiveness
- Form functionality

### Success Criteria:

#### Automated Verification:
- [ ] All tests pass: `npm run build && npm run start`
- [ ] Lighthouse audit passes all categories 90+
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] No ESLint warnings: `npm run lint`

#### Manual Verification:
- [ ] Tested on Chrome, Firefox, Safari, Edge
- [ ] Tested on iOS Safari and Android Chrome
- [ ] All animations smooth (60fps)
- [ ] All images load correctly
- [ ] All forms submit successfully
- [ ] All links work
- [ ] Page is fully responsive (375px to 1920px)

---

## Testing Strategy

### Automated Tests
- Build succeeds without errors
- TypeScript compilation passes
- ESLint passes
- Lighthouse audits (run with `npx lighthouse http://localhost:3000`)

### Manual Tests
- Visual testing at 375px, 768px, 1024px, 1920px widths
- Keyboard navigation (Tab through all interactive elements)
- Screen reader testing (test with macOS VoiceOver or NVDA)
- Form submission flow (complete all 5 steps)
- Animation performance (check for jank)
- Cross-browser testing

## Performance Considerations

### Optimization Checklist
- [ ] Images optimized (WebP format, proper sizes)
- [ ] Fonts preloaded (IBM Plex Sans, JetBrains Mono)
- [ ] Code splitting (dynamic imports for heavy components)
- [ ] Lazy loading (images below fold)
- [ ] CSS optimized (purge unused Tailwind classes)
- [ ] JavaScript minimized (Next.js does this automatically)

### Expected Performance Metrics
- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Time to Interactive: < 3.5s
- Cumulative Layout Shift: < 0.1
- Total page weight: < 3MB

## Migration Notes

N/A - This is a greenfield implementation with no existing data to migrate.

## References

- Original specification: `/docs/landing_page_prompt.md`
- Project guidelines: `/CLAUDE.md`
- Positioning guide: `/docs/ai_agent_positioning_guide.md`
- UI aesthetics skill: `/.claude/skills/ui-aesthetics/SKILL.md`
- Form setup instructions: `/docs/FORM_SETUP.md` (created in this plan)
- Placeholder data: `/lib/data.ts` (created in this plan)
