/**
 * PostHog Dashboard, Cohort, and Alert Setup Script
 *
 * This script automates the creation and updates of:
 * - 3 dashboards with insights (Lead Generation, CTA Performance, FAQ Engagement)
 * - 6 cohorts for lead segmentation
 *
 * The script is idempotent - running it multiple times will:
 * - Create new resources if they don't exist
 * - Update existing resources if they do exist
 * - Ensure insights are properly linked to their dashboards
 *
 * Prerequisites:
 * - PostHog Personal API Key (create at: My Settings > Personal API Keys)
 * - Project ID: 254485
 *
 * Usage:
 *   POSTHOG_PERSONAL_API_KEY=phx_xxx yarn posthog:setup
 *
 * Reference: thoughts/plans/2025-11-27-posthog-manual-testing-setup-guide.md
 */

const POSTHOG_API_BASE = "https://us.posthog.com";
const PROJECT_ID = "254485";

interface PostHogResponse {
  id: number;
  name?: string;
  short_id?: string;
  dashboards?: number[];
  [key: string]: unknown;
}

interface InsightFilters {
  events?: Array<{
    id: string;
    name?: string;
    type?: string;
    order?: number;
    properties?: Array<{
      key: string;
      value: string | number | boolean;
      operator?: string;
      type?: string;
    }>;
    math?: string;
    math_property?: string;
  }>;
  actions?: Array<{
    id: number;
    name?: string;
    type?: string;
    order?: number;
  }>;
  display?: string;
  insight?: string;
  interval?: string;
  date_from?: string;
  date_to?: string;
  compare?: boolean;
  breakdown?: string;
  breakdown_type?: string;
  funnel_viz_type?: string;
  funnel_order_type?: string;
  exclusions?: unknown[];
  filter_test_accounts?: boolean;
}

interface InsightDefinition {
  name: string;
  description?: string;
  filters: InsightFilters;
}

interface DashboardDefinition {
  name: string;
  description: string;
  insights: InsightDefinition[];
}

interface CohortDefinition {
  name: string;
  description: string;
  groups: Array<{
    properties?: Array<{
      key: string;
      value: string | number | boolean | string[];
      operator?: string;
      type: string;
    }>;
    rollout_percentage?: number | null;
  }>;
  is_static?: boolean;
}

// ============================================================================
// API Client
// ============================================================================

class PostHogAPI {
  private apiKey: string;
  private projectId: string;

  constructor(apiKey: string, projectId: string) {
    this.apiKey = apiKey;
    this.projectId = projectId;
  }

  private async request<T>(
    endpoint: string,
    method: "GET" | "POST" | "PATCH" = "GET",
    body?: unknown
  ): Promise<T> {
    const url = `${POSTHOG_API_BASE}/api/projects/${this.projectId}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `PostHog API error (${response.status}): ${errorText.slice(0, 500)}`
      );
    }

    return response.json() as Promise<T>;
  }

  // Dashboard operations
  async listDashboards(): Promise<{ results: PostHogResponse[] }> {
    return this.request<{ results: PostHogResponse[] }>("/dashboards/");
  }

  async createDashboard(
    name: string,
    description: string
  ): Promise<PostHogResponse> {
    return this.request<PostHogResponse>("/dashboards/", "POST", {
      name,
      description,
      pinned: false,
    });
  }

  async updateDashboard(
    id: number,
    data: { name?: string; description?: string }
  ): Promise<PostHogResponse> {
    return this.request<PostHogResponse>(`/dashboards/${id}/`, "PATCH", data);
  }

  // Insight operations
  async listInsights(limit = 100): Promise<{ results: PostHogResponse[] }> {
    return this.request<{ results: PostHogResponse[] }>(
      `/insights/?limit=${limit}`
    );
  }

  async createInsight(
    name: string,
    filters: InsightFilters,
    description?: string
  ): Promise<PostHogResponse> {
    return this.request<PostHogResponse>("/insights/", "POST", {
      name,
      description,
      filters,
    });
  }

  async updateInsight(
    id: number,
    data: {
      name?: string;
      description?: string;
      filters?: InsightFilters;
      dashboards?: number[];
    }
  ): Promise<PostHogResponse> {
    return this.request<PostHogResponse>(`/insights/${id}/`, "PATCH", data);
  }

  // Cohort operations
  async listCohorts(): Promise<{ results: PostHogResponse[] }> {
    return this.request<{ results: PostHogResponse[] }>("/cohorts/");
  }

  async createCohort(cohort: CohortDefinition): Promise<PostHogResponse> {
    return this.request<PostHogResponse>("/cohorts/", "POST", cohort);
  }

  async updateCohort(
    id: number,
    cohort: CohortDefinition
  ): Promise<PostHogResponse> {
    return this.request<PostHogResponse>(`/cohorts/${id}/`, "PATCH", cohort);
  }
}

// ============================================================================
// Dashboard Definitions (from Part 2 of the plan)
// ============================================================================

const DASHBOARDS: DashboardDefinition[] = [
  {
    name: "Lead Generation Overview",
    description:
      "Track lead volume, conversion funnel, and traffic sources. Created via API script.",
    insights: [
      {
        name: "Leads Today",
        description: "Number of form submissions today vs previous period",
        filters: {
          events: [
            { id: "booking_form_submitted", name: "Booking Form Submitted" },
          ],
          display: "BoldNumber",
          insight: "TRENDS",
          date_from: "dStart",
          date_to: null as unknown as string,
          compare: true,
          filter_test_accounts: true,
        },
      },
      {
        name: "Leads This Week",
        description: "Daily lead submissions over the past 7 days",
        filters: {
          events: [
            { id: "booking_form_submitted", name: "Booking Form Submitted" },
          ],
          display: "ActionsLineGraph",
          insight: "TRENDS",
          interval: "day",
          date_from: "-7d",
          filter_test_accounts: true,
        },
      },
      {
        name: "Form Conversion Funnel",
        description: "Step-by-step conversion from form start to submission",
        filters: {
          events: [
            {
              id: "booking_form_started",
              name: "Form Started",
              order: 0,
            },
            {
              id: "form_step_completed",
              name: "Step 1 Completed",
              order: 1,
              properties: [
                { key: "step", value: 1, operator: "exact", type: "event" },
              ],
            },
            {
              id: "form_step_completed",
              name: "Step 2 Completed",
              order: 2,
              properties: [
                { key: "step", value: 2, operator: "exact", type: "event" },
              ],
            },
            {
              id: "form_step_completed",
              name: "Step 3 Completed",
              order: 3,
              properties: [
                { key: "step", value: 3, operator: "exact", type: "event" },
              ],
            },
            {
              id: "form_step_completed",
              name: "Step 4 Completed",
              order: 4,
              properties: [
                { key: "step", value: 4, operator: "exact", type: "event" },
              ],
            },
            {
              id: "booking_form_submitted",
              name: "Form Submitted",
              order: 5,
            },
          ],
          insight: "FUNNELS",
          funnel_viz_type: "steps",
          funnel_order_type: "ordered",
          date_from: "-30d",
          exclusions: [],
          filter_test_accounts: true,
        },
      },
      {
        name: "Lead Quality (Avg Score)",
        description: "Average lead score of submitted forms",
        filters: {
          events: [
            {
              id: "booking_form_submitted",
              name: "Booking Form Submitted",
              math: "avg",
              math_property: "lead_score",
            },
          ],
          display: "ActionsLineGraph",
          insight: "TRENDS",
          interval: "day",
          date_from: "-30d",
          filter_test_accounts: true,
        },
      },
      {
        name: "Traffic Sources Breakdown",
        description: "Lead submissions broken down by UTM source",
        filters: {
          events: [
            { id: "booking_form_submitted", name: "Booking Form Submitted" },
          ],
          display: "ActionsTable",
          insight: "TRENDS",
          date_from: "-30d",
          breakdown: "utm_source",
          breakdown_type: "event",
          filter_test_accounts: true,
        },
      },
    ],
  },
  {
    name: "CTA Performance",
    description:
      "Analyze CTA click performance by location and device. Created via API script.",
    insights: [
      {
        name: "CTA Clicks by Location",
        description: "Which CTAs are getting the most clicks",
        filters: {
          events: [{ id: "cta_clicked", name: "CTA Clicked" }],
          display: "ActionsBarValue",
          insight: "TRENDS",
          date_from: "-30d",
          breakdown: "location",
          breakdown_type: "event",
          filter_test_accounts: true,
        },
      },
      {
        name: "CTA to Form Conversion",
        description: "Conversion funnel from CTA click to form submission",
        filters: {
          events: [
            { id: "cta_clicked", name: "CTA Clicked", order: 0 },
            { id: "booking_form_started", name: "Form Started", order: 1 },
            { id: "booking_form_submitted", name: "Form Submitted", order: 2 },
          ],
          insight: "FUNNELS",
          funnel_viz_type: "steps",
          funnel_order_type: "ordered",
          date_from: "-30d",
          breakdown: "location",
          breakdown_type: "event",
          exclusions: [],
          filter_test_accounts: true,
        },
      },
      {
        name: "Mobile vs Desktop CTAs",
        description: "CTA clicks broken down by device type",
        filters: {
          events: [{ id: "cta_clicked", name: "CTA Clicked" }],
          display: "ActionsBarValue",
          insight: "TRENDS",
          date_from: "-30d",
          breakdown: "device_type",
          breakdown_type: "event",
          filter_test_accounts: true,
        },
      },
    ],
  },
  {
    name: "FAQ Engagement",
    description:
      "Track which FAQ questions are most viewed and searched. Created via API script.",
    insights: [
      {
        name: "FAQ Expansions by Category",
        description: "Which FAQ categories get the most engagement",
        filters: {
          events: [{ id: "faq_expanded", name: "FAQ Expanded" }],
          display: "ActionsBarValue",
          insight: "TRENDS",
          date_from: "-30d",
          breakdown: "category",
          breakdown_type: "event",
          filter_test_accounts: true,
        },
      },
      {
        name: "FAQ Search Terms",
        description: "What users are searching for in the FAQ",
        filters: {
          events: [
            {
              id: "faq_searched",
              name: "FAQ Searched",
            },
          ],
          display: "ActionsTable",
          insight: "TRENDS",
          date_from: "-30d",
          breakdown: "query",
          breakdown_type: "event",
          filter_test_accounts: true,
        },
      },
      {
        name: "Most Viewed Questions",
        description: "Top questions users expand",
        filters: {
          events: [{ id: "faq_expanded", name: "FAQ Expanded" }],
          display: "ActionsTable",
          insight: "TRENDS",
          date_from: "-30d",
          breakdown: "question",
          breakdown_type: "event",
          filter_test_accounts: true,
        },
      },
    ],
  },
];

// ============================================================================
// Cohort Definitions (from Part 3 of the plan)
// ============================================================================

const COHORTS: CohortDefinition[] = [
  {
    name: "Form Starters",
    description: "Users who have started the booking form",
    groups: [
      {
        properties: [
          {
            key: "form_started",
            value: true,
            operator: "exact",
            type: "person",
          },
        ],
      },
    ],
  },
  {
    name: "Form Completers",
    description: "Users who have completed and submitted the booking form",
    groups: [
      {
        properties: [
          {
            key: "form_completed",
            value: true,
            operator: "exact",
            type: "person",
          },
        ],
      },
    ],
  },
  {
    name: "Form Abandoners",
    description: "Users who started but did not complete the form",
    groups: [
      {
        properties: [
          {
            key: "form_started",
            value: true,
            operator: "exact",
            type: "person",
          },
          {
            key: "form_completed",
            value: true,
            operator: "is_not",
            type: "person",
          },
        ],
      },
    ],
  },
  {
    name: "High-Intent Leads",
    description: "Leads with a score of 70 or higher",
    groups: [
      {
        properties: [
          {
            key: "lead_score",
            value: 70,
            operator: "gte",
            type: "person",
          },
        ],
      },
    ],
  },
  {
    name: "Pricing Researchers",
    description: "Users who have viewed pricing tiers",
    groups: [
      {
        properties: [
          {
            key: "$event",
            value: "pricing_tier_viewed",
            operator: "exact",
            type: "behavioral",
          },
        ],
      },
    ],
  },
  {
    name: "FAQ Researchers",
    description: "Users who have expanded 3+ FAQ questions",
    groups: [
      {
        properties: [
          {
            key: "$event",
            value: "faq_expanded",
            operator: "exact",
            type: "behavioral",
          },
        ],
      },
    ],
  },
];

// ============================================================================
// Sync Logic
// ============================================================================

interface SyncResult {
  created: string[];
  updated: string[];
  unchanged: string[];
  errors: string[];
}

async function syncDashboardsAndInsights(
  api: PostHogAPI
): Promise<{ dashboards: SyncResult; insights: SyncResult }> {
  const dashboardResult: SyncResult = {
    created: [],
    updated: [],
    unchanged: [],
    errors: [],
  };
  const insightResult: SyncResult = {
    created: [],
    updated: [],
    unchanged: [],
    errors: [],
  };

  // Fetch existing resources
  const existingDashboards = await api.listDashboards();
  const existingInsights = await api.listInsights(200);

  // Build lookup maps
  const dashboardByName = new Map<string, PostHogResponse>();
  for (const d of existingDashboards.results) {
    if (d.name) dashboardByName.set(d.name, d);
  }

  const insightByName = new Map<string, PostHogResponse>();
  for (const i of existingInsights.results) {
    if (i.name) insightByName.set(i.name, i);
  }

  // Process each dashboard definition
  for (const dashboardDef of DASHBOARDS) {
    let dashboardId: number;
    const existingDashboard = dashboardByName.get(dashboardDef.name);

    if (existingDashboard) {
      // Update existing dashboard
      console.log(`  Updating dashboard: ${dashboardDef.name}`);
      await api.updateDashboard(existingDashboard.id, {
        description: dashboardDef.description,
      });
      dashboardId = existingDashboard.id;
      dashboardResult.updated.push(dashboardDef.name);
    } else {
      // Create new dashboard
      console.log(`  Creating dashboard: ${dashboardDef.name}`);
      const newDashboard = await api.createDashboard(
        dashboardDef.name,
        dashboardDef.description
      );
      dashboardId = newDashboard.id;
      dashboardResult.created.push(dashboardDef.name);
    }

    // Process insights for this dashboard
    for (const insightDef of dashboardDef.insights) {
      const existingInsight = insightByName.get(insightDef.name);

      if (existingInsight) {
        // Check if insight needs updating (filters or dashboard link)
        const currentDashboards = existingInsight.dashboards ?? [];
        const needsDashboardLink = !currentDashboards.includes(dashboardId);

        if (needsDashboardLink) {
          console.log(
            `    Linking insight to dashboard: ${insightDef.name}`
          );
          const updatedDashboards = [...currentDashboards, dashboardId];
          await api.updateInsight(existingInsight.id, {
            description: insightDef.description,
            filters: insightDef.filters,
            dashboards: updatedDashboards,
          });
          insightResult.updated.push(insightDef.name);
        } else {
          // Update filters and description anyway to ensure config is current
          console.log(`    Updating insight: ${insightDef.name}`);
          await api.updateInsight(existingInsight.id, {
            description: insightDef.description,
            filters: insightDef.filters,
          });
          insightResult.updated.push(insightDef.name);
        }
      } else {
        // Create new insight and link to dashboard
        console.log(`    Creating insight: ${insightDef.name}`);
        const newInsight = await api.createInsight(
          insightDef.name,
          insightDef.filters,
          insightDef.description
        );

        // Link to dashboard via PATCH (more reliable than dashboard_tiles in POST)
        await api.updateInsight(newInsight.id, {
          dashboards: [dashboardId],
        });
        insightResult.created.push(insightDef.name);

        // Add to lookup map for potential reuse
        insightByName.set(insightDef.name, { ...newInsight, dashboards: [dashboardId] });
      }
    }
  }

  return { dashboards: dashboardResult, insights: insightResult };
}

async function syncCohorts(api: PostHogAPI): Promise<SyncResult> {
  const result: SyncResult = {
    created: [],
    updated: [],
    unchanged: [],
    errors: [],
  };

  const existingCohorts = await api.listCohorts();
  const cohortByName = new Map<string, PostHogResponse>();
  for (const c of existingCohorts.results) {
    if (c.name) cohortByName.set(c.name, c);
  }

  for (const cohortDef of COHORTS) {
    const existing = cohortByName.get(cohortDef.name);

    try {
      if (existing) {
        console.log(`  Updating cohort: ${cohortDef.name}`);
        await api.updateCohort(existing.id, cohortDef);
        result.updated.push(cohortDef.name);
      } else {
        console.log(`  Creating cohort: ${cohortDef.name}`);
        await api.createCohort(cohortDef);
        result.created.push(cohortDef.name);
      }
    } catch (error) {
      const errorMsg = `${cohortDef.name}: ${error instanceof Error ? error.message : String(error)}`;
      console.log(`  Error with cohort "${cohortDef.name}": ${errorMsg}`);
      result.errors.push(errorMsg);
    }
  }

  return result;
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;

  if (!apiKey) {
    console.error(
      "Error: POSTHOG_PERSONAL_API_KEY environment variable is required"
    );
    console.error("");
    console.error("To create a Personal API Key:");
    console.error("  1. Go to https://us.posthog.com/settings/user-api-keys");
    console.error("  2. Click 'Create personal API key'");
    console.error("  3. Copy the key (it's only shown once)");
    console.error("");
    console.error("Then run:");
    console.error("  POSTHOG_PERSONAL_API_KEY=phx_xxx yarn posthog:setup");
    process.exit(1);
  }

  const api = new PostHogAPI(apiKey, PROJECT_ID);

  console.log("PostHog Setup Script (Idempotent)");
  console.log("=================================");
  console.log(`Project ID: ${PROJECT_ID}`);
  console.log("");
  console.log("This script will create or update PostHog resources.");
  console.log("");

  // Sync dashboards and insights
  console.log("Syncing Dashboards & Insights");
  console.log("-----------------------------");
  const { dashboards, insights } = await syncDashboardsAndInsights(api);
  console.log("");

  // Sync cohorts
  console.log("Syncing Cohorts");
  console.log("---------------");
  const cohorts = await syncCohorts(api);
  console.log("");

  // Summary
  console.log("Summary");
  console.log("-------");
  console.log(
    `Dashboards: ${dashboards.created.length} created, ${dashboards.updated.length} updated`
  );
  console.log(
    `Insights: ${insights.created.length} created, ${insights.updated.length} updated`
  );
  console.log(
    `Cohorts: ${cohorts.created.length} created, ${cohorts.updated.length} updated, ${cohorts.errors.length} errors`
  );
  console.log("");

  // Dashboard links
  console.log("Dashboard Links");
  console.log("---------------");
  const allDashboards = await api.listDashboards();
  for (const dashDef of DASHBOARDS) {
    const dash = allDashboards.results.find((d) => d.name === dashDef.name);
    if (dash) {
      console.log(
        `  ${dashDef.name}: https://us.posthog.com/project/${PROJECT_ID}/dashboard/${dash.id}`
      );
    }
  }
  console.log("");

  // Manual steps reminder
  console.log("Manual Steps Required");
  console.log("---------------------");
  console.log(
    "The following must be configured in the PostHog UI (not available via API):"
  );
  console.log("");
  console.log("1. Threshold Alerts (Part 4):");
  console.log("   - Go to each dashboard insight > Alerts > New Alert");
  console.log('   - Lead Volume Spike: "Leads Today" > Greater than 5/day');
  console.log('   - Lead Drought: "Leads Today" > Less than 1 for 48 hours');
  console.log(
    "   - Conversion Drop: Form Funnel > Rate drops >20% vs prior week"
  );
  console.log("");
  console.log("2. Lead Notification Workflow (Part 5):");
  console.log("   - Go to Data Pipeline > Destinations > New Destination");
  console.log('   - Select "Webhook" or "Email" destination');
  console.log("   - Trigger: booking_form_submitted event");
  console.log("   - Configure email template (see plan for template)");
  console.log("");
  console.log("3. Dashboard Digest Subscription (Part 7):");
  console.log('   - Go to "Lead Generation Overview" dashboard');
  console.log("   - Click More (...) > Subscribe");
  console.log("   - Set daily digest at 8:00 AM to sales@rekurve.ai");
  console.log("");
  console.log("4. Session Recordings (Part 8):");
  console.log("   - Go to Session Recordings > Settings");
  console.log("   - Enable recording");
  console.log("   - Set minimum duration: 10 seconds");
  console.log("   - Enable high-intent trigger: booking_form_started");
  console.log("");
  console.log("Done!");
}

main().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});
