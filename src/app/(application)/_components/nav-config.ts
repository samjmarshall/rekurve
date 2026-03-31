import { Inbox, type LucideIcon, MapPin, Settings, Users } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { label: "Action Queue", href: "/dashboard", icon: Inbox },
  { label: "Pipeline", href: "/pipeline", icon: Users },
  { label: "Lots", href: "/lots", icon: MapPin },
  { label: "Settings", href: "/settings", icon: Settings },
];
