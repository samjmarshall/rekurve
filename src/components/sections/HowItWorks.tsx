"use client"

import { Search, Lightbulb, Code2, RefreshCw } from "lucide-react"
import { Timeline } from "~/components/ui/timeline"

const phases = [
  {
    number: 1,
    title: "Discovery & Audit",
    duration: "2 weeks",
    icon: Search,
    color: "accent-coral",
    description:
      "We analyze your sales processes, identify bottlenecks, and map automation opportunities",
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
    description:
      "Design your autonomous AI agents tailored to your ICP, scoring criteria, and workflows",
    deliverables: ["System architecture", "Workflow designs", "Integration plan"],
  },
  {
    number: 3,
    title: "Implementation & Training",
    duration: "4 weeks",
    icon: Code2,
    color: "accent-cyan",
    description:
      "Build, test, and deploy your AI agents. Train your team on oversight and optimization",
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
    description:
      "Continuous improvement based on real results, A/B testing, and evolving needs",
    deliverables: [
      "Monthly reports",
      "Optimization cycles",
      "Priority support",
    ],
  },
]

// Map phase colors to actual Tailwind classes
const getPhaseGradient = (color: string) => {
  switch (color) {
    case "accent-coral":
      return "bg-gradient-to-br from-accent-coral to-accent-coral/60"
    case "accent-amber":
      return "bg-gradient-to-br from-accent-amber to-accent-amber/60"
    case "accent-cyan":
      return "bg-gradient-to-br from-accent-cyan to-accent-cyan/60"
    case "state-success":
      return "bg-gradient-to-br from-state-success to-state-success/60"
    default:
      return "bg-gradient-to-br from-primary to-primary/60"
  }
}

// Transform phases data to Timeline format
const timelineData = phases.map((phase) => {
  const Icon = phase.icon
  return {
    title: phase.title,
    content: (
      <div className="space-y-4">
        {/* Icon and phase number */}
        <div className="flex items-center gap-4">
          <div className={`flex h-16 w-16 items-center justify-center rounded-full shadow-md ${getPhaseGradient(phase.color)}`}>
            <Icon className="h-8 w-8 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-xs text-slate-500">Phase {phase.number}</span>
            <span className="font-mono text-sm font-medium text-slate-600">{phase.duration}</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-base leading-relaxed text-slate-700">{phase.description}</p>

        {/* Deliverables */}
        <div className="space-y-1.5 rounded-lg bg-slate-50 p-4">
          <div className="font-mono text-xs font-medium text-slate-500">DELIVERABLES:</div>
          {phase.deliverables.map((deliverable, idx) => (
            <div key={idx} className="font-mono text-sm text-slate-600">
              &gt; {deliverable}
            </div>
          ))}
        </div>
      </div>
    ),
  }
})

export function HowItWorks() {
  return <Timeline data={timelineData} />
}
