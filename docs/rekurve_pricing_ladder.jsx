import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export default function PricingLadder() {
  const tiers = [
    {
      name: "Foundation Package",
      price: "$7,500",
      payPlan: "or 3 payments of $2,750",
      highlight: false,
      description: "Get your sales automation foundation set up fast.",
      features: [
        "CRM setup & optimization",
        "3–5 email automation sequences",
        "Basic lead scoring",
        "30‑day support",
        "Delivered in 3 weeks",
      ],
    },
    {
      name: "Growth Package",
      price: "$15,000",
      payPlan: "or 6 payments of $2,800",
      highlight: true,
      description: "The most popular option—full sales system transformation.",
      features: [
        "Everything in Foundation",
        "Cold email + LinkedIn automation",
        "Sales dashboard with live reporting",
        "Lead enrichment workflows",
        "90‑day optimization support",
      ],
    },
    {
      name: "Scale Package",
      price: "$30,000",
      payPlan: "or 12 payments of $2,900 (save $3,000 PIF)",
      highlight: false,
      description: "Enterprise‑level automation & AI sales infrastructure.",
      features: [
        "Everything in Growth",
        "Multi‑channel automation (Email, LinkedIn, SMS)",
        "AI‑powered lead qualification (LLMs)",
        "Custom CRM integrations",
        "Team training + 6‑month managed service",
      ],
    },
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-white to-slate-50">
      <div className="max-w-6xl mx-auto px-6 text-center">
        <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl font-bold mb-4">
          Pricing Plans for Brisbane Firms
        </motion.h2>
        <p className="text-slate-600 mb-12 text-lg">
          Transform your sales process and unlock 5× ROI—guaranteed.
        </p>

        <div className="grid md:grid-cols-3 gap-8">
          {tiers.map((tier, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
            >
              <Card
                className={`flex flex-col h-full border-2 ${
                  tier.highlight ? "border-indigo-600 shadow-xl" : "border-slate-200"
                } rounded-2xl`}
              >
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl font-bold text-slate-900">
                    {tier.name}
                  </CardTitle>
                  <p className="text-slate-600 mt-2 text-sm">{tier.description}</p>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="text-4xl font-bold text-indigo-600 mb-1">{tier.price}</div>
                  <div className="text-slate-500 text-sm mb-6">{tier.payPlan}</div>
                  <ul className="space-y-3 text-left">
                    {tier.features.map((f, j) => (
                      <li key={j} className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-indigo-500 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="pt-6">
                  <Button className={`w-full text-white font-semibold py-2 rounded-xl ${tier.highlight ? "bg-indigo-600 hover:bg-indigo-700" : "bg-slate-700 hover:bg-slate-800"}`}>
                    Book Strategy Call
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="mt-16 max-w-3xl mx-auto text-center">
          <h3 className="text-2xl font-semibold mb-3">Our 5× ROI Guarantee</h3>
          <p className="text-slate-600 mb-6">
            If your automation system doesn’t deliver at least <strong>5× ROI within 6 months</strong>, Rekurve.co refunds the difference. Simple, transparent, no excuses.
          </p>
          <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 py-3 text-lg">
            Schedule Your Discovery Call
          </Button>
        </div>
      </div>
    </section>
  );
}
