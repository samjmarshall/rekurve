"use client";

import { ArrowRight, Code2, Lightbulb, RefreshCw, Search } from "lucide-react";
import { Timeline } from "~/components/ui/timeline";
import { Card } from "../ui/Card";

const phases = [
  {
    number: 1,
    title: "Discovery & Audit",
    duration: "2 weeks",
    icon: Search,
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
    description:
      "Design your autonomous AI agents tailored to your ICP, scoring criteria, and workflows",
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
    description:
      "Continuous improvement based on real results, A/B testing, and evolving needs",
    deliverables: [
      "Monthly reports",
      "Optimization cycles",
      "Priority support",
    ],
  },
];

// Transform phases data to Timeline format
const timelineData = phases.map((phase) => {
  const Icon = phase.icon;
  return {
    title: phase.title,
    content: (
      <div className="space-y-4">
        {/* Icon and phase number */}
        <div className="flex items-center gap-4">
          <Icon className="size-8 text-primary" />
          <div className="flex flex-col">
            <span className="font-mono text-gray-600 text-xs">
              Phase {phase.number}
            </span>
            <span className="font-medium font-mono text-gray-600 text-sm">
              {phase.duration}
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="text-base leading-relaxed">{phase.description}</p>

        {/* Deliverables */}
        <Card className="space-y-1.5 p-4">
          {phase.deliverables.map((deliverable, idx) => (
            <div key={idx} className="font-mono text-gray-600 text-sm">
              <ArrowRight className="mr-2 inline-block h-4 w-4 text-gray-600" />{" "}
              {deliverable}
            </div>
          ))}
        </Card>
      </div>
    ),
  };
});

export function HowItWorks() {
  return <Timeline data={timelineData} />;
}
