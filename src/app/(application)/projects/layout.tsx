import { ScrollArea } from "~/components/ui/scroll-area";
import { SidebarNav } from "~/components/sidebar-nav";

const sidebarNavItems = [
  {
    title: "Overview",
    href: "/projects",
  },
  {
    title: "Plans",
  },
  {
    title: "Estimate",
    href: "/projects/estimate",
  },
  {
    title: "Proposal",
  },
  {
    title: "Schedule",
    href: "/projects/schedule",
  },
  {
    title: "Request for Quotes",
  },
  {
    title: "Selections and Allowances",
  },
  {
    title: "Purchase Orders",
  },
  {
    title: "Bills",
  },
  {
    title: "Budget",
  },
  {
    title: "Client Invoices",
  },
  {
    title: "Tasks",
    href: "/projects/tasks",
  },
  {
    title: "Files",
  },
];

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col lg:flex-row">
      <aside className="w-64 min-w-full px-4 py-5 lg:min-w-fit lg:bg-white">
        <SidebarNav items={sidebarNavItems} />
      </aside>
      <ScrollArea className="w-full rounded-tl-lg border-t bg-gray-100 shadow-inner">
        {children}
      </ScrollArea>
    </div>
  );
}
