# Technical Task Template

Use this template for infrastructure work, refactoring, technical debt, non-user-facing improvements, and engineering improvements.

## Template Structure

```markdown
Title: [Action verb] [technical component] [purpose]
Example: Add database index on orders.created_at for reporting performance

## Purpose
[Why this technical work is needed]

Example:
Monthly reporting queries are timing out (45+ seconds) due to missing database index on orders.created_at column. This work adds the index to reduce query time to <5 seconds.

## Context
**Current situation**: [What's the problem?]
**Proposed solution**: [What are we doing?]
**Why now**: [Why is this a priority?]
**Impact**: [Performance, reliability, scalability benefit]

Example:
Current: Full table scan on 2.5M order records
Proposed: Add composite B-tree index on (created_at DESC, customer_id)
Why now: Report generation is blocking monthly executive reviews
Impact: Estimated 90% reduction in query time; unblocks critical reporting

## Technical Approach
[High-level plan—enough guidance without over-prescribing]

Example:
1. Create index using CONCURRENTLY to avoid locking table
2. Monitor index creation progress (estimated 10-15 minutes)
3. Run ANALYZE to update query planner statistics
4. Test reporting queries on staging
5. If successful, deploy to production during off-peak hours

## Acceptance Criteria
- [ ] Index created on orders.created_at with customer_id composite
- [ ] Migration script tested successfully on staging
- [ ] Existing queries continue to work correctly
- [ ] Report generation completes in <5 seconds (currently 45s)
- [ ] No downtime during migration
- [ ] Rollback script prepared and tested
- [ ] Database size increase documented (estimated ~50MB)
- [ ] Query execution plans verified using EXPLAIN

## Technical Specifications
**Database**: PostgreSQL 14.5
**Table size**: 2.5M rows, ~500MB
**Index type**: B-tree
**Estimated index size**: ~50MB
**Migration strategy**: CREATE INDEX CONCURRENTLY
**Deployment window**: Off-peak (2-4am EST)

## Migration Scripts

**Forward migration:**
```sql
CREATE INDEX CONCURRENTLY idx_orders_created_customer 
ON orders (created_at DESC, customer_id);
ANALYZE orders;
```

**Rollback script:**
```sql
DROP INDEX CONCURRENTLY IF EXISTS idx_orders_created_customer;
```

## Testing Plan
1. Apply migration on staging environment
2. Run full regression test suite on reporting queries
3. Benchmark report generation (before: 45s, target: <5s)
4. Monitor database performance for 24 hours on staging
5. If metrics acceptable, schedule production deployment
6. Post-deployment: Monitor query performance and database metrics

## Dependencies
- [ ] DBA approval for production index creation
- [ ] Staging environment available for testing
- [ ] Deployment window scheduled

## Resources
- PostgreSQL indexing docs: [link]
- Query performance baseline: [dashboard link]
- Related performance work: [ticket references]

## GitHub Issues Formatting

When using GitHub Issues, format as:
```yaml
---
labels: [technical-debt, performance, database]
assignees: [developer-username]
milestone: Sprint 23
project: Infrastructure Improvements
---
```

**Markdown tips:**
- Use task lists for technical steps: `- [ ] Create index using CONCURRENTLY`
- Use code blocks for scripts (with language highlighting): ` ```sql `
- Reference related technical issues: `Prerequisite for #234`
- Add technical alerts: `> [!IMPORTANT] Requires DBA approval`
- Include mermaid diagrams for architecture changes
- Use tables for performance benchmarks
```

## Guidelines

**Title best practices:**
- Start with technical action verb (Add, Refactor, Migrate, Upgrade, Optimize)
- Include specific component and purpose
- Be precise about what's being changed
- Bad: "Fix database"
- Good: "Add database index on orders.created_at for reporting performance"

**Purpose section:**
- Explain WHY this work matters
- Include measurable impact
- Connect to business value when possible
- Not all technical work needs user-facing justification, but it needs engineering justification

**Technical approach:**
- High-level steps, not line-by-line instructions
- Enough guidance for team consistency
- Leave room for developer judgment
- Include rollback strategy
- Mention testing approach

**Acceptance criteria:**
- Must be technically measurable
- Include performance targets with numbers
- Specify what won't break
- Include rollback verification
- Cover impact on related systems

**When to include:**
- **Migration scripts**: For database changes, always
- **Testing plan**: For risky changes, always
- **Technical specs**: When precision matters
- **Dependencies**: When blockers exist

**Common technical task types:**
- **Performance**: Optimize query, add caching, improve load time
- **Infrastructure**: Setup monitoring, configure deployment, add logging
- **Refactoring**: Extract service, simplify logic, reduce complexity
- **Upgrades**: Update dependency, migrate framework, upgrade infrastructure
- **Technical debt**: Remove deprecated code, fix warnings, improve test coverage
- **Security**: Patch vulnerability, implement auth, add encryption

**Red flags to avoid:**
- No explanation of why this matters
- Vague acceptance criteria ("make it better")
- No rollback plan for risky changes
- Missing performance baselines and targets
- Unclear what "done" means
- No testing strategy
