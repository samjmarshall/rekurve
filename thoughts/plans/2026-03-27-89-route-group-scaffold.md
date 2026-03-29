# Route Group Scaffold — 3 Independent Route Groups

## Overview

Restructure `src/app/` from a flat structure into 3 independent route groups — `(website)`, `(login)`, `(application)` — each with its own `<html>` and `<body>`. No shared root layout. Move the existing marketing landing page into `(website)` and create placeholder pages for login and dashboard.

**GitHub Issue:** #89
**Parent Epic:** #85 (Epic 1: MVP Foundation)
**Reference Pattern:** `rekurve/rekurve/src/app/` (4 route groups, same architecture)

## Current State Analysis

```
src/app/
├── layout.tsx          # Single root layout: <html>, fonts, metadata, JSON-LD,
│                       #   ThemeProvider, AnalyticsProvider, Navbar, Footer
├── page.tsx            # Landing page (10 section components)
├── global-error.tsx    # PostHog error capture, own <html>/<body>
├── robots.ts           # Currently disallow: '/'
├── sitemap.ts          # / and /privacy entries
├── favicon.ico
├── api/
│   └── health/
│       └── route.ts    # GET → { status: 'ok', timestamp }
└── privacy/
    └── page.tsx        # Privacy policy with own metadata
```

**Root layout** (`layout.tsx:80-135`) currently owns:
- Font loading: IBM Plex Sans (400/500/600/700) + JetBrains Mono (400/500)
- Full SEO metadata with OpenGraph, Twitter cards, robots directives
- JSON-LD structured data (ProfessionalService schema)
- Provider nesting: ThemeProvider → AnalyticsProvider → Navbar → children → Footer
- CSS: imports `~/styles/globals.css`

### Key Discoveries:
- No `middleware.ts` exists — CSP headers are configured in `next.config.ts:10-58` via the `headers()` function
- `global-error.tsx` already renders its own `<html>`/`<body>` (Next.js requirement) — no changes needed
- Navbar (`src/components/navbar.tsx`) and Footer (`src/components/footer.tsx`) are website-specific — only `(website)` needs them
- `robots.ts` and `sitemap.ts` are app-level metadata routes — must stay at app root (confirmed by reference project pattern)
- `api/health/route.ts` stays at app root outside route groups

## Desired End State

```
src/app/
├── global-error.tsx        # Unchanged — stays at app root
├── robots.ts               # Unchanged — stays at app root
├── sitemap.ts              # Unchanged — stays at app root
├── favicon.ico             # Unchanged — stays at app root
├── api/
│   └── health/
│       └── route.ts        # Unchanged — stays at app root
│
├── (website)/
│   ├── layout.tsx          # Own <html>/<body>, fonts, SEO metadata, JSON-LD,
│   │                       #   ThemeProvider, AnalyticsProvider, Navbar, Footer
│   │                       #   export const runtime = "edge"
│   ├── page.tsx            # Existing landing page (moved as-is)
│   └── privacy/
│       └── page.tsx        # Existing privacy page (moved as-is)
│
├── (login)/
│   ├── layout.tsx          # Own <html>/<body>, fonts, robots: noindex,
│   │                       #   ThemeProvider, AnalyticsProvider, no nav/footer
│   └── login/
│       └── page.tsx        # Placeholder — "Login coming soon"
│
└── (application)/
    ├── layout.tsx          # Own <html>/<body>, fonts, auth gate stub,
    │                       #   ThemeProvider, AnalyticsProvider, app shell
    └── dashboard/
        └── page.tsx        # Placeholder empty state
```

### Verification:
- `npm run build` succeeds
- `npm run lint` passes
- TypeScript compilation passes
- Landing page renders at `/` (unchanged URL)
- Privacy page renders at `/privacy` (unchanged URL)
- `/login` renders placeholder
- `/dashboard` renders placeholder
- Each route group has independent `<html>` (inspect source)
- Existing E2E tests still pass

## What We're NOT Doing

- `(onboarding)` route group — deferred, not needed for pilot
- Auth logic implementation (separate issue)
- tRPC provider setup (separate issue — TRPCReactProvider will wrap `(application)` when added)
- Dashboard UI beyond placeholder (separate issue)
- Login UI beyond placeholder (separate issue)
- Middleware changes — no middleware needed for this ticket

## Implementation Approach

Follow the reference project pattern exactly: each route group is a fully self-contained app with its own `<html>`, `<body>`, font loading, and providers. The root `layout.tsx` is deleted — there is no shared root layout. Each group imports `~/styles/globals.css` independently.

---

## Phase 1: Create `(website)` Route Group

### Overview
Move the existing marketing site files into `(website)/` and create its layout. This is the critical path — the marketing site must continue working at the same URLs.

### Changes Required:

#### 1. Create `(website)/layout.tsx`
**File**: `src/app/(website)/layout.tsx`
**Changes**: New file — essentially the current root `layout.tsx` with `export const runtime = "edge"` added.

```tsx
import "~/styles/globals.css";

import { type Metadata } from "next";
import { IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";
import { AnalyticsProvider } from "~/providers/AnalyticsProvider";
import { ThemeProvider } from "~/providers/ThemeProvider";
import { Navbar } from "~/components/navbar";
import { canonicalUrl } from "~/lib/canonical-url";
import { Footer } from "~/components/footer";
import openGraph from "~/lib/open-graph";

export const runtime = "edge";

const canonical = canonicalUrl("/");

export const metadata: Metadata = {
  title: "AI Quote Generation & Speed to Lead for Service Businesses | Rekurve",
  description:
    "Customer Enquiry → Quote Generated → Job Booked. AI agents for service businesses spending 20+ hours weekly quoting or missing leads due to slow response times.",
  keywords: [
    "AI quote generation",
    "speed to lead",
    "service quote automation",
    "Brisbane",
    "Sydney",
    "Melbourne",
    "Perth",
    "Australia",
    "service businesses",
    "AI sales agents",
    "lead response automation",
    "quote automation",
    "B2B sales automation",
    "autonomous AI",
  ],
  authors: [{ name: "Rekurve AI" }],
  creator: "Rekurve AI",
  publisher: "Rekurve AI",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    ...openGraph,
    url: canonical,
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Quote Generation & Speed to Lead | Rekurve",
    description:
      "Customer Enquiry → Quote Generated → Job Booked. AI agents for service businesses spending 20+ hours weekly quoting or missing leads.",
    images: ["/og-image.png"],
    creator: "@rekurve_ai",
  },
  metadataBase: new URL(canonical),
  alternates: {
    canonical,
  },
};

const ibmPlexSans = IBM_Plex_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export default function WebsiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "Rekurve AI",
    description:
      "AI quote generation and speed to lead automation for service businesses in Australia.",
    url: "https://rekurve.ai",
    logo: "https://rekurve.ai/logo.png",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Brisbane",
      addressRegion: "QLD",
      addressCountry: "AU",
    },
    areaServed: ["Brisbane", "Sydney", "Melbourne", "Perth", "Australia"],
    serviceType: "AI Quote Generation & Speed to Lead",
    priceRange: "$$$",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      reviewCount: "12",
    },
  };

  return (
    <html
      lang="en"
      className={`${ibmPlexSans.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className="font-sans antialiased bg-background">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AnalyticsProvider>
            <Navbar />
            {children}
            <Footer />
          </AnalyticsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

#### 2. Move `page.tsx` into `(website)/`
**File**: `src/app/page.tsx` → `src/app/(website)/page.tsx`
**Changes**: Move file as-is — no code changes needed. URL stays `/`.

#### 3. Move `privacy/` into `(website)/`
**File**: `src/app/privacy/` → `src/app/(website)/privacy/`
**Changes**: Move directory as-is — no code changes needed. URL stays `/privacy`.

### Success Criteria:

#### Automated Verification:
- [x] `npm run build` succeeds
- [x] `npm run lint` passes
- [x] TypeScript compiles cleanly

#### Manual Verification:
- [ ] `/` renders the landing page identical to current
- [ ] `/privacy` renders the privacy policy
- [ ] View source shows `(website)` layout's `<html>` with font variables

---

## Phase 2: Create `(login)` Route Group

### Overview
Create the login route group with minimal chrome — no navbar/footer, `robots: noindex` meta tag. Placeholder login page.

### Changes Required:

#### 1. Create `(login)/layout.tsx`
**File**: `src/app/(login)/layout.tsx`
**Changes**: New file — own `<html>`, fonts, ThemeProvider, AnalyticsProvider, no nav/footer, noindex robots.

```tsx
import "~/styles/globals.css";

import { type Metadata } from "next";
import { IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";
import { AnalyticsProvider } from "~/providers/AnalyticsProvider";
import { ThemeProvider } from "~/providers/ThemeProvider";

export const metadata: Metadata = {
  title: "Login | Rekurve",
  robots: {
    index: false,
    follow: false,
  },
};

const ibmPlexSans = IBM_Plex_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export default function LoginLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${ibmPlexSans.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased bg-background">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AnalyticsProvider>
            {children}
          </AnalyticsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

#### 2. Create `(login)/login/page.tsx`
**File**: `src/app/(login)/login/page.tsx`
**Changes**: New placeholder page.

```tsx
export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Login</h1>
        <p className="mt-2 text-muted-foreground">Coming soon</p>
      </div>
    </main>
  );
}
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run build` succeeds
- [x] `npm run lint` passes

#### Manual Verification:
- [ ] `/login` renders the placeholder page
- [ ] View source shows `(login)` layout's `<html>` — no navbar/footer in markup
- [ ] Page source includes `noindex` robots meta tag

---

## Phase 3: Create `(application)` Route Group

### Overview
Create the application route group with auth gate stub and app shell structure. Placeholder dashboard page with empty state.

### Changes Required:

#### 1. Create `(application)/layout.tsx`
**File**: `src/app/(application)/layout.tsx`
**Changes**: New file — own `<html>`, fonts, ThemeProvider, AnalyticsProvider, auth stub comment, app shell structure.

```tsx
import "~/styles/globals.css";

import { type Metadata } from "next";
import { IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";
import { AnalyticsProvider } from "~/providers/AnalyticsProvider";
import { ThemeProvider } from "~/providers/ThemeProvider";

export const metadata: Metadata = {
  title: "Dashboard | Rekurve",
  robots: {
    index: false,
    follow: false,
  },
};

const ibmPlexSans = IBM_Plex_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export default function ApplicationLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // TODO: Auth gate — redirect to /login if no session
  // const session = await getSession()
  // if (!session?.user) redirect("/login")

  // TODO: Wrap with TRPCReactProvider when tRPC is set up

  return (
    <html
      lang="en"
      className={`${ibmPlexSans.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased bg-background">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AnalyticsProvider>
            <div className="flex min-h-screen">
              {/* TODO: App sidebar/nav */}
              <main className="flex-1">{children}</main>
            </div>
          </AnalyticsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

#### 2. Create `(application)/dashboard/page.tsx`
**File**: `src/app/(application)/dashboard/page.tsx`
**Changes**: New placeholder page with empty state.

```tsx
export default function DashboardPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">Nothing here yet</p>
      </div>
    </div>
  );
}
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run build` succeeds
- [x] `npm run lint` passes

#### Manual Verification:
- [ ] `/dashboard` renders the placeholder page
- [ ] View source shows `(application)` layout's `<html>` — no website navbar/footer
- [ ] Page source includes `noindex` robots meta tag

---

## Phase 4: Clean Up and Verify

### Overview
Delete the old root `layout.tsx` and run full verification — build, lint, typecheck, E2E tests.

### Changes Required:

#### 1. Delete root `layout.tsx`
**File**: `src/app/layout.tsx`
**Changes**: Delete entirely. Each route group now has its own layout. No shared root layout.

#### 2. Verify app root still contains only shared files
After cleanup, `src/app/` root should contain:
- `global-error.tsx` (unchanged)
- `robots.ts` (unchanged)
- `sitemap.ts` (unchanged)
- `favicon.ico` (unchanged)
- `api/health/route.ts` (unchanged)
- `(website)/` (new)
- `(login)/` (new)
- `(application)/` (new)

### Success Criteria:

#### Automated Verification:
- [x] `npm run build` succeeds with no errors
- [x] `npm run lint` passes
- [x] TypeScript compilation passes (`npx tsc --noEmit`)
- [x] Existing E2E tests pass (`npx playwright test`)

#### Manual Verification:
- [ ] `/` renders the landing page (identical to before)
- [ ] `/privacy` renders the privacy policy
- [ ] `/login` renders the placeholder login page
- [ ] `/dashboard` renders the placeholder dashboard page
- [ ] `/api/health` returns `{ status: 'ok', timestamp: ... }`
- [ ] Each route group has independent `<html>` (inspect source on each)
- [ ] No visual regressions on the marketing site

---

## Testing Strategy

### Automated:
- `npm run build` — catches any broken imports, missing files, route conflicts
- `npm run lint` — ESLint passes
- `npx tsc --noEmit` — TypeScript type checking
- `npx playwright test` — existing E2E tests (landing page assertions should still pass since URL is unchanged)

### Manual Testing Steps:
1. Visit `/` — landing page renders with all sections, navbar, footer
2. Visit `/privacy` — privacy policy renders with navbar/footer
3. Visit `/login` — placeholder page, no navbar/footer
4. Visit `/dashboard` — placeholder page, no navbar/footer
5. Visit `/api/health` — JSON response
6. Right-click → View Source on each page — verify independent `<html>` tags
7. Check `/login` page source for `noindex` meta tag
8. Check `/dashboard` page source for `noindex` meta tag

## Performance Considerations

- `(website)` gets `export const runtime = "edge"` for SEO performance — edge-rendered, fast TTFB
- `(login)` and `(application)` use default Node.js runtime (needed for future auth/tRPC server-side logic)
- Font loading is duplicated across layouts — this is expected with independent route groups. Next.js deduplicates at the CDN level.

## References

- GitHub Issue: #89
- Parent Epic: #85
- Design doc: `thoughts/designs/2026-03-27-ai-sales-assistant-new-home-builders.md` (Route Group Structure section)
- Reference implementation: `rekurve/rekurve/src/app/` (4 route groups, same pattern)
- Preferred stack memory: route groups with no shared root layout, auth at layout level
