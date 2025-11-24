# Bug Report Template

Use this template for defects, unexpected behavior, regressions, and production issues.

## Template Structure

```markdown
Title: [Specific issue] [location/component] [platform if relevant]
Example: Login button unresponsive after autofill on Safari iOS 17

## Impact Assessment
**Severity**: [L1: App crash | L2: Core feature blocked | L3: Minor issue | L4: Cosmetic]
**Affected users**: [Quantity and description]
**Business impact**: [Revenue, reputation, blocking work]

Example:
Severity: L2 (Login blocked for Safari users)
Affected users: ~50 reports in 72 hours, Safari iOS 17.1 specifically
Business impact: Blocking new user registrations from iOS Safari users (~15% of mobile traffic)

## Description
Clear summary of what's broken and the user impact.

Example:
Users on Safari iOS 17.1 report that the login Submit button becomes unresponsive after password managers (1Password, LastPass) autofill credentials. Button appears greyed out and does not respond to taps.

## Steps to Reproduce
[Detailed, chronological, numbered steps that reliably reproduce the issue]

1. Open Safari on iOS 17.1
2. Navigate to login page (https://app.example.com/login)
3. Tap on username field
4. Allow password manager to autofill credentials
5. Observe: Submit button appears greyed out
6. Tap Submit button
7. **Expected**: Login proceeds to dashboard
8. **Actual**: Nothing happens; button does not respond

## Environment
**Required details**:
- Device: [iPhone 13, iPad Pro, etc.]
- OS: [iOS 17.1, macOS Ventura 13.5, Windows 11]
- Browser: [Safari 17.0, Chrome 118, etc.]
- App version: [3.2.1]
- Network: [WiFi, cellular, VPN]

**Additional context**:
- First observed: [Date/time]
- Frequency: [Always, 80% of time, once]
- User actions before bug: [Relevant history]

## Expected vs. Actual Behavior
**Expected**: [What should happen]
**Actual**: [What actually happens]

Example:
Expected: Submit button remains active and clickable after autofill
Actual: Submit button becomes greyed out and unresponsive after autofill

## Workaround (if any)
[Temporary solution users can use]

Example:
Manually delete and re-type last character of password before clicking Submit.

## Visual Evidence
[Screenshots, annotated images, Loom video, GIF]
- Attach: Screenshot of greyed-out button
- Attach: Console logs showing errors
- Attach: Network request showing failed API call

## Related Information
- Similar bugs: [Ticket references]
- When introduced: [Recent deploy, specific commit]
- Related Slack discussion: [Link]
- Support tickets: [Reference numbers]

## Root Cause Analysis (After Investigation)
[To be filled by developer during investigation]
- Technical cause
- Why it wasn't caught in testing
- How to prevent similar issues

## Resolution (After Fix)
[To be filled after fix is deployed]
- What was changed
- Where the fix was applied
- How it was tested

## GitHub Issues Formatting

When using GitHub Issues, format as:
```yaml
---
labels: [bug, high-priority, mobile, safari]
assignees: [developer-username]
milestone: v3.2.2
---
```

**Markdown tips:**
- Use task lists for reproduction steps: `- [ ] Open Safari on iOS 17.1`
- Embed images directly: `![Screenshot](url)` or drag-and-drop into issue
- Use collapsible sections for long logs:
  ```markdown
  <details>
  <summary>Console logs</summary>

  ```
  [logs here]
  ```

  </details>
  ```
- Add severity alerts: `> [!WARNING] Blocking production users`
- Link to related PRs: `Fixed by #789`
```

## Guidelines

**Title best practices:**
- Start with the defect (Fix, Resolve, Correct)
- Be specific about what and where
- Include platform if bug is platform-specific
- Bad: "Login broken"
- Good: "Fix login button unresponsive after autofill on Safari iOS 17"

**Severity levels:**
- **L1 (Critical)**: App crash, data loss, security breach, complete feature failure
- **L2 (High)**: Core feature blocked, major functionality unavailable
- **L3 (Medium)**: Minor feature broken, workaround exists
- **L4 (Low)**: Cosmetic issue, typo, minor UI glitch

**Reproduction steps:**
- Must be detailed enough for developer to reproduce
- Number each step
- Be chronological and specific
- Include URLs, button names, exact inputs
- Specify what to observe at each step
- End with Expected vs. Actual

**Environment details:**
- Always include: device, OS, browser, app version
- Include network if relevant (slow connection, VPN)
- Include user state (logged in, new user, etc.)
- For mobile: Include device model, not just OS

**Visual evidence:**
- Screenshots are mandatory for UI bugs
- Videos for complex interactions or timing issues
- Annotate screenshots with arrows/highlights
- Include console logs if technical
- Network tab screenshots if API-related

**Red flags to avoid:**
- Vague title ("Something is broken")
- No reproduction steps
- No environment details
- No visual evidence
- Unclear expected behavior
- Mixing multiple bugs in one ticket
