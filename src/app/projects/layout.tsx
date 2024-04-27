import { ScrollArea } from "~/components/ui/scroll-area";
import { SidebarNav } from "~/components/sidebar-nav";

const sidebarNavItems = [
  {
    title: "Overview",
    href: "/projects",
  },
  {
    title: "Estimate",
  },
  {
    title: "Schedule",
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
      <SidebarNav
        className="w-64 min-w-full overflow-x-scroll px-4 py-5 drop-shadow lg:min-w-fit lg:bg-white"
        items={sidebarNavItems}
      />
      <ScrollArea className="w-full bg-[#edf2f7]">{children}</ScrollArea>
    </div>
  );
}
