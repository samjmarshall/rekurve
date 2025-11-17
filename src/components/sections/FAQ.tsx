"use client"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '~/components/ui/Accordion'

import { ScrollReveal } from '~/components/motion/ScrollReveal'
import { Search } from 'lucide-react'
import { useState } from 'react'

interface FAQItem {
  id: string
  question: string
  answer: string
  category: string
}

export const faqData: FAQItem[] = [
  {
    id: "1",
    question: "How quickly will I see ROI from the AI sales agent?",
    answer: "Most clients see measurable results within the first 30 days - qualified leads in your pipeline, meetings booked, and time recovered. Our 5x ROI guarantee ensures you'll see $5 in value for every $1 invested within 120 days, or we'll work for free until you do.",
    category: "ROI & Results"
  },
  {
    id: "2",
    question: "What's the difference between the AI-Assisted and Intelligent packages?",
    answer: "The AI-Assisted package provides semi-automated workflows with manual oversight - you'll review leads before outreach. The Intelligent package deploys a fully autonomous agent that researches, qualifies, and reaches out 24/7 without your input. It's the difference between a helpful tool and a virtual SDR.",
    category: "Pricing"
  },
  {
    id: "3",
    question: "How does the AI agent integrate with our existing CRM?",
    answer: "We integrate seamlessly with HubSpot, Salesforce, Pipedrive, and most major CRMs via API. The agent syncs contacts, updates deal stages, logs activities, and enriches records automatically. Setup takes 2-3 days and includes comprehensive testing before going live.",
    category: "Technical"
  },
  {
    id: "4",
    question: "Will the AI agent sound robotic or spammy?",
    answer: "No. Our agents use GPT-4 to generate personalized, conversational messages based on each prospect's industry, role, and recent activity. Messages are reviewed for quality and tone during setup. Response rates average 15-25% - significantly higher than generic automation.",
    category: "Technical"
  },
  {
    id: "5",
    question: "What happens if the agent makes a mistake?",
    answer: "We build enterprise-grade safeguards: manual approval queues for high-value prospects, quality checks before sending, and idempotent operations to prevent duplicate sends. You'll have a dedicated dashboard to monitor all activity. If issues arise, we fix them immediately - backed by our 99.9% uptime SLA.",
    category: "Technical"
  },
  {
    id: "6",
    question: "Can we cancel or pause the service anytime?",
    answer: "Yes. All packages are month-to-month after the initial 120-day guarantee period. You can pause or cancel with 30 days' notice. If you're not seeing 5x ROI within 120 days, we'll continue working at no additional cost until you do.",
    category: "Pricing"
  },
  {
    id: "7",
    question: "How do you measure the 5x ROI guarantee?",
    answer: "ROI is calculated as: (Time Saved Value + Pipeline Value) ÷ Total Investment. Time saved is measured in hours (tracked via your CRM activity logs). Pipeline value is measured by opportunities created and their expected close value. We provide monthly ROI reports with full transparency.",
    category: "ROI & Results"
  },
  {
    id: "8",
    question: "Is our data secure? What about compliance?",
    answer: "Yes. We're SOC 2 Type II compliant (in progress), encrypt all data in transit and at rest, and follow GDPR/CCPA best practices. Data is stored on AWS with enterprise-grade security. You retain full ownership of your data and can request deletion anytime.",
    category: "Security & Compliance"
  },
  {
    id: "9",
    question: "Do you provide training for our team?",
    answer: "Absolutely. All packages include onboarding training (2-4 hours) and ongoing support. You'll get documentation, video walkthroughs, and access to our team via Slack or email. Enterprise clients receive quarterly optimization sessions and a dedicated account manager.",
    category: "Support & Training"
  },
  {
    id: "10",
    question: "What if our sales process is complex or highly customized?",
    answer: "That's exactly what the Autonomous AI Sales Agent package is designed for. We'll build custom logic, multi-step workflows, and integrations tailored to your process. This typically includes discovery workshops, custom data enrichment, and advanced decision trees. Timeline: 4-6 weeks for custom implementations.",
    category: "Technical"
  },
  {
    id: "11",
    question: "How many leads can the agent handle per month?",
    answer: "The AI-Assisted package handles up to 500 leads/month. Intelligent handles 1,000-2,000 leads/month. Autonomous packages scale to 5,000+ leads/month with custom infrastructure. We'll right-size the system based on your target market and outreach volume during onboarding.",
    category: "ROI & Results"
  },
  {
    id: "12",
    question: "What makes your AI agents different from other automation tools?",
    answer: "Unlike simple workflow automation (Zapier, Make), our agents make intelligent decisions: researching prospects, adapting messaging based on engagement, and learning from patterns. We're not a DIY tool - we build, deploy, and maintain your agent for you. Think virtual SDR, not software license.",
    category: "Technical"
  }
]

export function FAQ() {
  const [searchQuery, setSearchQuery] = useState('')
  const [openItems, setOpenItems] = useState<string[]>([])

  // Filter FAQ items based on search query
  const filteredFAQs = faqData.filter((item) => {
    const query = searchQuery.toLowerCase()
    return (
      item.question.toLowerCase().includes(query) ||
      item.answer.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query)
    )
  })

  // Generate FAQ schema for SEO
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqData.map((item) => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer
      }
    }))
  }

  return (
    <section id="faq" className="relative bg-background py-24">
      {/* FAQ Schema Markup for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className="container relative mx-auto max-w-4xl px-6">
        <ScrollReveal>
          <div className="mb-12 text-center">
            <h2 className="mb-4 font-sans text-4xl font-bold tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="mx-auto max-w-lg text-center text-base text-gray-600">
              We are here to help you with any questions you may have. If you
              don&apos;t find what you need, please contact us at{" "}
              <a
                href="mailto:support@rekurve.ai"
                className="text-primary underline"
              >
                support@rekurve.ai
              </a>
      </p>
          </div>
        </ScrollReveal>

        {/* Search Input */}
        <ScrollReveal delay={0.1}>
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-border py-4 pl-12 pr-4 font-mono text-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/80"
              />
            </div>
          </div>
        </ScrollReveal>

        {/* FAQ Accordion */}
        <ScrollReveal delay={0.2} amount={0.1}>
          {filteredFAQs.length > 0 ? (
            <Accordion
              type="multiple"
              value={openItems}
              onValueChange={setOpenItems}
              className="space-y-4"
            >
              {filteredFAQs.map((item) => (
                <AccordionItem
                  key={item.id}
                  value={item.id}
                  className={`rounded-lg border-l-4 bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-gray-200 dark:hover:bg-neutral-900 ${
                    openItems.includes(item.id)
                      ? 'border-l-primary'
                      : 'border-l-border'
                  }`}
                >
                  <AccordionTrigger className="text-left hover:no-underline">
                    <div>
                      <div className="mb-1 text-xs font-mono text-primary uppercase tracking-wide">
                        {item.category}
                      </div>
                      <div className="text-lg font-semibold text-foreground">
                        {item.question}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pt-4 text-base leading-relaxed text-gray-700 dark:text-gray-300">
                      {item.answer}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="rounded-lg bg-gray-50 dark:bg-neutral-900 p-12 text-center shadow-sm">
              <p className="text-lg">
                No questions found matching &ldquo;{searchQuery}&rdquo;
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 font-mono text-sm text-primary hover:text-primary/70 transition-colors"
              >
                Clear search
              </button>
            </div>
          )}
        </ScrollReveal>

        {/* Still have questions CTA */}
        <ScrollReveal delay={0.3}>
          <div className="mt-12 text-center">
            <p className="mb-4 text-lg text-gray-600">
              Still have questions?
            </p>
            <a
              href="#booking-form"
              className="inline-flex items-center font-mono text-accent-blue hover:text-accent-blue/70 transition-colors underline underline-offset-4"
            >
              Book a free 30-minute call
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
