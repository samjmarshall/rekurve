# Feature documentation

Living, present-tense docs for shipped features. Each file answers "what does this thing do today, and where does it live in code?" for an engineer reading the codebase cold.

Adjacent doc types serve different purposes:

- `thoughts/designs/` — forward-looking proposals (past-tense once shipped)
- `thoughts/epics/` — scope and milestone planning
- `thoughts/plans/` — the build roadmap for an epic
- `docs/adr/` — point-in-time decisions

To add or update a feature doc, run `/document-feature {slug}` from the repo root.

## Index

- [Action queue](action-queue.md) — The consultant's home screen at `/dashboard` — a priority-sorted list of AI-drafted follow-ups to approve, edit, snooze, or dismiss in one tap.
- [AI message drafting](ai-message-drafting.md) — Server-side helper that asks Claude to write one follow-up SMS or email per lead. Returns a row ready for the action queue.
- [AI qualification scoring](ai-qualification-scoring.md) — Every lead gets a 0-100 score, a stage (unqualified/nurture/warm/hot), a per-factor breakdown, a list of missing data, and the next question to ask — calculated the moment the lead is saved.
- [Dashboard app shell](dashboard-app-shell.md) — The signed-in chrome — sidebar on desktop, bottom tab bar on phones — that wraps every consultant-facing page.
- [Email OTP login](auth-email-otp.md) — A no-password sign-in: type your email, get a 6-digit code, type the code, you're in.
- [Full lead enquiry form](full-lead-enquiry-form.md) — A 4-step mobile form at `/leads/new` that captures everything from the Creation Homes Display Client Enquiry Form in under 3 minutes after a display home walk-in.
- [HubSpot contact sync](hubspot-contact-sync.md) — Keeps every lead in the app and every contact in HubSpot the same record. Writes go out on create and update; HubSpot's webhook brings changes back in.
- [HubSpot email dispatch](hubspot-email-dispatch.md) — When the consultant approves an email draft on `/dashboard`, the email goes out from their own Outlook mailbox, HubSpot gets a BCC copy so the lead's timeline shows the activity, and the local conversation log links back to that timeline entry once HubSpot acknowledges it.
- [Lead conversation history](lead-conversation-history.md) — A chronological message log on the lead profile so the consultant sees every SMS and email ever sent — and one day, every reply — for one lead, in one place.
- [Lead profile](lead-profile.md) — The single screen at `/leads/[id]` that shows the consultant everything known about one lead — score, ranked gaps, the next question to ask — and lets them edit in place without leaving the page.
- [Nurture scheduler](nurture-scheduler.md) — A daily cron that drafts the next follow-up for stale leads — so the action queue fills itself even on days the consultant captures nothing new.
- [Pipeline board](pipeline-board.md) — A four-column Kanban view at `/pipeline` that groups leads by stage (unqualified · nurture · warm · hot) so the consultant can see at a glance who to chase next.
- [PostHog analytics](posthog-analytics.md) — The marketing site's measurement layer — every CTA click, FAQ toggle, form step, login, and server error flows to PostHog so we can see who's interested, where they drop off, and what's broken.
- [Quick capture form](quick-capture-form.md) — A floating "+" button on the dashboard that opens a one-screen form to log a new lead in under 60 seconds.
