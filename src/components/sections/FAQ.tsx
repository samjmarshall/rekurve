"use client"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '~/components/ui/Accordion'

import { ScrollReveal } from '~/components/motion/ScrollReveal'
import { Search } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { analytics, type FAQCategory } from '~/lib/posthog'

interface FAQItem {
  id: string
  question: string
  answer: string
  category: string
}

export const faqData: FAQItem[] = [
  {
    id: "1",
    question: "What is the Release Pilot program?",
    answer: "The Release Pilot is a free, limited program where we build and deploy AI sales agents for qualified service businesses. In exchange for free implementation, participants agree to provide feedback, participate in a case study, and share a testimonial if results are positive. It's how we validate our solution before general availability.",
    category: "Pilot Program"
  },
  {
    id: "2",
    question: "Who qualifies for the Release Pilot?",
    answer: "We're looking for service businesses that receive regular inbound leads (10+ per month), have pain around slow response times or manual quoting, and are willing to commit to a case study. The ideal candidate is enthusiastic about AI, responsive, and has realistic expectations about what AI can and can't do.",
    category: "Pilot Program"
  },
  {
    id: "3",
    question: "What's expected of pilot participants?",
    answer: "Three commitments: (1) Participate in a public case study documenting your results, (2) Provide a testimonial if the pilot delivers value, and (3) Give honest, timely feedback throughout the 12-week pilot. We also need access to your CRM and relevant systems to implement the agent.",
    category: "Pilot Program"
  },
  {
    id: "4",
    question: "Is the pilot really free? What's the catch?",
    answer: "Yes, it's free. The 'catch' is we're pre-product-market-fit - we need real-world validation and case studies to prove our solution works. You're essentially trading your time and feedback for free implementation. If the pilot succeeds, you'll have the option to continue on a paid plan once we reach general availability.",
    category: "Pilot Program"
  },
  {
    id: "5",
    question: "How does the AI agent integrate with our existing CRM?",
    answer: "We integrate with HubSpot, Salesforce, Pipedrive, and most major CRMs via API. The agent syncs contacts, updates deal stages, logs activities, and enriches records automatically. Setup takes 2-3 days and includes comprehensive testing before going live.",
    category: "Technical"
  },
  {
    id: "6",
    question: "Will the AI agent sound robotic or spammy?",
    answer: "No. Our agents use advanced language models to generate personalized, conversational messages based on each prospect's context. Messages are reviewed for quality and tone during setup. We optimize for genuine engagement, not mass outreach.",
    category: "Technical"
  },
  {
    id: "7",
    question: "What happens if the agent makes a mistake?",
    answer: "We build enterprise-grade safeguards: manual approval queues for high-value prospects, quality checks before sending, and fail-safes to prevent duplicate actions. You'll have a dashboard to monitor all activity. If issues arise, we fix them immediately.",
    category: "Technical"
  },
  {
    id: "8",
    question: "Is our data secure? What about compliance?",
    answer: "Yes. We encrypt all data in transit and at rest, and follow GDPR/CCPA best practices. Data is stored on AWS with enterprise-grade security. You retain full ownership of your data and can request deletion anytime. SOC 2 certification is in progress.",
    category: "Security & Compliance"
  },
  {
    id: "9",
    question: "How long is the pilot program?",
    answer: "The standard pilot runs 12 weeks: 2 weeks for discovery and setup, 4 weeks to build and test, 4 weeks of live operation with optimization, and 2 weeks to evaluate results and document the case study. Most participants see meaningful results by week 6-8.",
    category: "Pilot Program"
  },
  {
    id: "10",
    question: "What happens after the pilot ends?",
    answer: "If the pilot is successful, you'll have first access to our Beta program with expanded features. Once we reach general availability, pilot graduates will receive preferred pricing. If it doesn't work out, we'll help you transition smoothly with no hard feelings - your honest feedback helps us improve.",
    category: "Pilot Program"
  },
  {
    id: "11",
    question: "What makes your AI agents different from other automation tools?",
    answer: "Unlike simple workflow automation (Zapier, Make), our agents make intelligent decisions: researching prospects, adapting messaging based on engagement, and learning from patterns. We're not a DIY tool - we build, deploy, and maintain your agent for you. Think virtual SDR, not software license.",
    category: "Technical"
  },
  {
    id: "12",
    question: "Can I apply if I'm outside Brisbane/Melbourne?",
    answer: "For the Release Pilot, we're prioritizing businesses in Brisbane and Melbourne so we can provide hands-on support. However, we're open to remote participants if you're a strong fit. Apply and let us know your location - we evaluate each application individually.",
    category: "Pilot Program"
  }
]

export function FAQ() {
  const [searchQuery, setSearchQuery] = useState('')
  const [openItems, setOpenItems] = useState<string[]>([])
  const prevOpenItemsRef = useRef<string[]>([])
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Debounced search tracking
  const trackSearch = useCallback((query: string, resultsCount: number) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    searchTimeoutRef.current = setTimeout(() => {
      if (query.length > 0) {
        analytics.faq.searched(query, resultsCount)
      }
    }, 500) // Debounce 500ms
  }, [])

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
                onChange={(e) => {
                  const query = e.target.value
                  setSearchQuery(query)
                  trackSearch(query, filteredFAQs.length)
                }}
                data-testid="faq-search-input"
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
              onValueChange={(newOpenItems) => {
                // Find newly opened items
                const newlyOpened = newOpenItems.filter(id => !prevOpenItemsRef.current.includes(id))
                newlyOpened.forEach(id => {
                  const item = faqData.find(f => f.id === id)
                  if (item) {
                    analytics.faq.expanded(id, item.question, item.category as FAQCategory)
                  }
                })

                prevOpenItemsRef.current = newOpenItems
                setOpenItems(newOpenItems)
              }}
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
            <div className="rounded-lg bg-gray-50 dark:bg-neutral-900 p-12 text-center shadow-sm" data-testid="faq-no-results">
              <p className="text-lg">
                No questions found matching &ldquo;{searchQuery}&rdquo;
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 font-mono text-sm text-primary hover:text-primary/70 transition-colors"
                data-testid="faq-search-clear"
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
              onClick={() => analytics.cta.click('faq_bottom')}
              data-testid="faq-cta-bottom"
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
