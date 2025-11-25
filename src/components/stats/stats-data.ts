import {
  Zap,
  Trophy,
  Clock,
  TrendingDown,
  Calendar,
  MessageCircle,
  Medal,
  Target,
  Bot,
  Rocket,
  DollarSign,
  type LucideIcon,
} from "lucide-react";

export interface Stat {
  id: string;
  headline: string;
  subtext: string;
  citation: {
    name: string;
    year: string;
    url: string;
  };
  icon: LucideIcon;
}

export const stats: Stat[] = [
  {
    id: "immediate-response",
    headline: "391% higher conversion",
    subtext: "Responding within one minute increases conversion rates dramatically",
    citation: {
      name: "Velocify",
      year: "2016",
      url: "https://www.prnewswire.com/news-releases/velocify-research-shows-time-of-day-has-minimal-impact-on-sales-effectiveness-consider-quick-and-strategic-follow-up-instead-300275320.html",
    },
    icon: Zap,
  },
  {
    id: "one-hour-window",
    headline: "7x more likely to qualify",
    subtext: "Companies responding within one hour qualify leads 7x more often",
    citation: {
      name: "HBR",
      year: "2011",
      url: "https://hbr.org/2011/03/the-short-life-of-online-sales-leads",
    },
    icon: Trophy,
  },
  {
    id: "five-minute-urgency",
    headline: "80% drop after 5 minutes",
    subtext: "Lead qualification odds drop 80% after just 5 minutes",
    citation: {
      name: "MIT/InsideSales.com",
      year: "",
      url: "https://www.leadresponsemanagement.org/lrm_study/",
    },
    icon: Clock,
  },
  {
    id: "ten-minute-threshold",
    headline: "400% decrease in 10 min",
    subtext: "Qualification odds plummet 400% at 10 minutes vs 5 minutes",
    citation: {
      name: "MIT/InsideSales.com",
      year: "",
      url: "https://www.leadresponsemanagement.org/lrm_study/",
    },
    icon: TrendingDown,
  },
  {
    id: "24-hour-penalty",
    headline: "60x less likely after 24h",
    subtext: "Responding in 1 hour vs 24+ hours: 60x qualification difference",
    citation: {
      name: "HBR",
      year: "2011",
      url: "https://hbr.org/2011/03/the-short-life-of-online-sales-leads",
    },
    icon: Calendar,
  },
  {
    id: "consumer-expectations",
    headline: "82% expect 10-min response",
    subtext: "Immediate response is important or very important to 82% of buyers",
    citation: {
      name: "HubSpot",
      year: "2018",
      url: "https://blog.hubspot.com/sales/live-chat-go-to-market-flaw",
    },
    icon: MessageCircle,
  },
  {
    id: "first-responder",
    headline: "35-50% win rate for first",
    subtext: "35-50% of sales go to the vendor that responds first",
    citation: {
      name: "Google/CEB",
      year: "2012",
      url: "https://www.thinkwithgoogle.com/_qs/documents/677/the-digital-evolution-in-b2b-marketing_research-studies.pdf",
    },
    icon: Medal,
  },
  {
    id: "speed-wins",
    headline: "78% buy from first responder",
    subtext: "Most customers buy from whoever responds to their inquiry first",
    citation: {
      name: "Lead Connect",
      year: "",
      url: "https://www.vendasta.com/blog/lead-response-time/",
    },
    icon: Target,
  },
  {
    id: "ai-impact",
    headline: "20-30% conversion boost",
    subtext: "AI and automation boost conversion rates by 20-30% on average",
    citation: {
      name: "Gartner/McKinsey",
      year: "2024",
      url: "https://superagi.com/how-ai-powered-speed-to-lead-automation-boosts-conversion-rates-by-21-a-step-by-step-guide/",
    },
    icon: Bot,
  },
  {
    id: "response-time-reduction",
    headline: "82% faster with AI",
    subtext: "AI-powered automation reduces lead response times by up to 82%",
    citation: {
      name: "Industry Studies",
      year: "2024",
      url: "https://superagi.com/how-ai-powered-speed-to-lead-automation-boosts-conversion-rates-by-21-a-step-by-step-guide/",
    },
    icon: Rocket,
  },
  {
    id: "cost-reduction",
    headline: "50% lower acquisition costs",
    subtext: "AI speed-to-lead optimization can halve customer acquisition costs",
    citation: {
      name: "Forrester/McKinsey",
      year: "",
      url: "https://www.forrester.com/",
    },
    icon: DollarSign,
  },
];

// Row distribution: Row 1 gets stats 1-6, Row 2 gets stats 6-11 (stat 6 overlaps)
export const firstRowStats = stats.slice(0, 6);
export const secondRowStats = stats.slice(5, 11);
