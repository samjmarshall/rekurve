# Phase 5: Conversion Components

**Status:** ⏳ **PENDING**
**Estimated Duration:** 3-4 hours
**Previous Phase:** [Phase 4: Social Proof ⏳](./phase-4-social-proof.md)
**Next Phase:** [Phase 6: Supporting Content](./phase-6-supporting-content.md)

---

## Overview

Implement the conversion-focused sections: pricing, guarantee, and multi-step booking form. These are critical for lead generation.

---

## Sections to Implement

### 1. **Pricing Section**
**File:** `src/components/sections/Pricing.tsx`

Three-tier structure:
- **AI-Assisted Sales System** (Foundation): $9,500 + $2,500/mo
- **Intelligent Sales Agent** (Growth): $20,000 + $4,500/mo - **RECOMMENDED**
- **Autonomous AI Sales Agent** (Enterprise): Custom pricing

Each tier includes:
- Setup cost + monthly cost
- Target customer
- Feature list
- CTA button

**Design:** Growth tier has accent cyan border + "Most Popular" badge

### 2. **Guarantee Section**
**File:** `src/components/sections/Guarantee.tsx`

5× ROI guarantee in 120 days:
- Risk reversal messaging
- Confidence signal
- Clear terms

### 3. **Booking Form Section**
**File:** `src/components/sections/BookingForm.tsx`

Multi-step form (5 steps):
1. Basic Info (name, email, company)
2. Company Details (size, industry, location)
3. Current Challenges (checkboxes)
4. Goals & Timeline
5. Booking Preference (Calendly OR HubSpot)

**Features:**
- Progress indicator
- Form validation (react-hook-form + zod)
- Error messages
- Success state
- Mobile-optimized

---

## Success Criteria

- [ ] All 3 pricing tiers display correctly
- [ ] "Most Popular" badge animates on Growth tier
- [ ] Form progresses through all 5 steps
- [ ] Validation shows error messages
- [ ] Success state displays after submission
- [ ] Mobile layout works for all components

---

**Detailed Reference:** [`../2025-11-03-landing-page-implementation.md`](../2025-11-03-landing-page-implementation.md) (Lines 1705-2490)

**Next Phase:** [Phase 6: Supporting Content](./phase-6-supporting-content.md)
