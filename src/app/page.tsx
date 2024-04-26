"use client";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

import { Button } from "~/components/ui/button";
// import { CreatePost } from "~/components/create-post";
// import { DataTable } from "~/components/data-table";
import Link from "next/link";
// import { columns } from "~/components/data-table/columns";
import { ResponsivePie } from "@nivo/pie";
import { ScrollArea } from "~/components/ui/scroll-area";
import { SidebarNav } from "~/components/sidebar-nav";
// import { api } from "~/trpc/server";
// import { promises as fs } from "fs";
// import { getServerAuthSession } from "~/server/auth";
// import path from "path";
// import { taskSchema } from "~/server/data/schema";
import { z } from "zod";

// Simulate a database read for tasks.
// async function getTasks() {
//   const data = await fs.readFile(
//     path.join(process.cwd(), "src/server/data/tasks.json"),
//   );

//   // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
//   const tasks = JSON.parse(data.toString());

//   return z.array(taskSchema).parse(tasks);
// }

// Overview
// Takeoff
// Estimate
// Proposal
// Schedule
// Request for Quotes
// Selections and Allowances
// Purchase Orders
// Bills
// Variations
// Budget
// Client Invoices
// Site Diary
// Timesheets
// Tasks
// RFI's
// Files
// Team

const sidebarNavItems = [
  {
    title: "Overview",
    href: "/",
  },
  {
    title: "Estimate",
    href: "/estimate",
  },
  {
    title: "Schedule",
    href: "/schedule",
  },
  {
    title: "Purchase Orders",
    href: "/purchase-orders",
  },
  {
    title: "Bills",
    href: "/bills",
  },
  {
    title: "Budget",
    href: "/budget",
  },
  {
    title: "Client Invoices",
    href: "/client-invoices",
  },
  {
    title: "Tasks",
    href: "/tasks",
  },
  {
    title: "Files",
    href: "/files",
  },
];

export default function Home() {
  // const session = await getServerAuthSession();
  // const tasks = await getTasks();

  return (
    // <div className="flex h-full w-full flex-col items-center justify-center gap-12 px-4 py-16">
    //   <p className="text-center text-2xl">
    //     {session && <span>Logged in as {session.user?.name}</span>}
    //   </p>

    //   <CrudShowcase />

    //   <div className="h-full space-y-8 p-8">
    //     <DataTable data={tasks} columns={columns} />
    //   </div>
    // </div>
    
      <div className="flex flex-1 flex-col overflow-hidden bg-[#edf2f7]">
        <div className="flex flex-1 overflow-hidden">
          <div className="flex w-3/4 flex-col space-y-4 px-4 py-5">
            <Card className="flex-1">
              <CardHeader>
                <CardTitle>Financial Chart</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center p-4">
                <LabelledpieChart className="h-[300px] w-1/2" />
              </CardContent>
            </Card>
            <Card className="flex-1">
              <CardHeader>
                <CardTitle>Action Items</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <p>There are no overdue items to show</p>
              </CardContent>
            </Card>
            <Card className="flex-1">
              <CardHeader>
                <CardTitle>Schedule Progress</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Completion %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>1st Frame Delivery (am)</TableCell>
                      <TableCell>21/06/2024</TableCell>
                      <TableCell>21/06/2024</TableCell>
                      <TableCell>0%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Lower Frame</TableCell>
                      <TableCell>21/06/2024</TableCell>
                      <TableCell>27/06/2024</TableCell>
                      <TableCell>40%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Floor Joists</TableCell>
                      <TableCell>28/06/2024</TableCell>
                      <TableCell>02/07/2024</TableCell>
                      <TableCell>0%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Structure Floor</TableCell>
                      <TableCell>03/07/2024</TableCell>
                      <TableCell>04/07/2024</TableCell>
                      <TableCell>0%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Upper Frame</TableCell>
                      <TableCell>05/07/2024</TableCell>
                      <TableCell>11/07/2024</TableCell>
                      <TableCell>0%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
          <div className="flex w-1/4 flex-col space-y-4 px-4 py-5">
            <Card className="flex-1">
              <CardHeader>
                <CardTitle>Finance</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client invoices</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell />
                      <TableCell>$0.00</TableCell>
                      <TableCell>$0.00</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bills</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell />
                      <TableCell>$16758.00</TableCell>
                      <TableCell>$16758.00</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Variations</TableHead>
                      <TableHead>Approved</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell />
                      <TableCell>$0.00</TableCell>
                      <TableCell>$0.00</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Purchase orders</TableHead>
                      <TableHead>Approved</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell />
                      <TableCell>$94058.00</TableCell>
                      <TableCell>$94058.00</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                <Link className="mt-2 block text-blue-600" href="#">
                  See more
                </Link>
              </CardContent>
            </Card>
            <Card className="flex-1">
              <CardHeader>
                <CardTitle>Tasks</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <p>There are no tasks to show</p>
                <Button className="mt-4" variant="outline">
                  Add Task
                </Button>
              </CardContent>
            </Card>
            <Card className="flex-1">
              <CardHeader>
                <CardTitle>Recent Files</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <ScrollArea className="space-y-2">
                  <img
                    alt="File 1"
                    className="h-24 w-24"
                    height="100"
                    src="/placeholder.svg"
                    style={{
                      aspectRatio: "100/100",
                      objectFit: "cover",
                    }}
                    width="100"
                  />
                  <img
                    alt="File 2"
                    className="h-24 w-24"
                    height="100"
                    src="/placeholder.svg"
                    style={{
                      aspectRatio: "100/100",
                      objectFit: "cover",
                    }}
                    width="100"
                  />
                  <img
                    alt="File 3"
                    className="h-24 w-24"
                    height="100"
                    src="/placeholder.svg"
                    style={{
                      aspectRatio: "100/100",
                      objectFit: "cover",
                    }}
                    width="100"
                  />
                  <img
                    alt="File 4"
                    className="h-24 w-24"
                    height="100"
                    src="/placeholder.svg"
                    style={{
                      aspectRatio: "100/100",
                      objectFit: "cover",
                    }}
                    width="100"
                  />
                  <img
                    alt="File 5"
                    className="h-24 w-24"
                    height="100"
                    src="/placeholder.svg"
                    style={{
                      aspectRatio: "100/100",
                      objectFit: "cover",
                    }}
                    width="100"
                  />
                  <img
                    alt="File 6"
                    className="h-24 w-24"
                    height="100"
                    src="/placeholder.svg"
                    style={{
                      aspectRatio: "100/100",
                      objectFit: "cover",
                    }}
                    width="100"
                  />
                  <img
                    alt="File 7"
                    className="h-24 w-24"
                    height="100"
                    src="/placeholder.svg"
                    style={{
                      aspectRatio: "100/100",
                      objectFit: "cover",
                    }}
                    width="100"
                  />
                  <img
                    alt="File 8"
                    className="h-24 w-24"
                    height="100"
                    src="/placeholder.svg"
                    style={{
                      aspectRatio: "100/100",
                      objectFit: "cover",
                    }}
                    width="100"
                  />
                  <img
                    alt="File 9"
                    className="h-24 w-24"
                    height="100"
                    src="/placeholder.svg"
                    style={{
                      aspectRatio: "100/100",
                      objectFit: "cover",
                    }}
                    width="100"
                  />
                  <img
                    alt="File 10"
                    className="h-24 w-24"
                    height="100"
                    src="/placeholder.svg"
                    style={{
                      aspectRatio: "100/100",
                      objectFit: "cover",
                    }}
                    width="100"
                  />
                  <img
                    alt="File 11"
                    className="h-24 w-24"
                    height="100"
                    src="/placeholder.svg"
                    style={{
                      aspectRatio: "100/100",
                      objectFit: "cover",
                    }}
                    width="100"
                  />
                  <img
                    alt="File 12"
                    className="h-24 w-24"
                    height="100"
                    src="/placeholder.svg"
                    style={{
                      aspectRatio: "100/100",
                      objectFit: "cover",
                    }}
                    width="100"
                  />
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// async function CrudShowcase() {
//   const session = await getServerAuthSession();
//   if (!session?.user) return null;

//   const latestPost = await api.post.getLatest();

//   return (
//     <div className="w-full max-w-xs">
//       {latestPost ? (
//         <p className="truncate">Your most recent message: {latestPost.name}</p>
//       ) : (
//         <p>You have no messages yet.</p>
//       )}

//       <CreatePost />
//     </div>
//   );
// }

function LabelledpieChart(props) {
  return (
    <div {...props}>
      <ResponsivePie
        data={[
          { id: "Jan", value: 111 },
          { id: "Feb", value: 157 },
          { id: "Mar", value: 129 },
          { id: "Apr", value: 150 },
          { id: "May", value: 119 },
          { id: "Jun", value: 72 },
        ]}
        sortByValue
        margin={{ top: 30, right: 50, bottom: 30, left: 50 }}
        innerRadius={0.5}
        padAngle={1}
        cornerRadius={3}
        activeOuterRadiusOffset={2}
        borderWidth={1}
        arcLinkLabelsThickness={1}
        enableArcLabels={false}
        colors={["#2563eb"]}
        theme={{
          tooltip: {
            chip: {
              borderRadius: "9999px",
            },
            container: {
              fontSize: "12px",
              textTransform: "capitalize",
              borderRadius: "6px",
            },
          },
        }}
        role="application"
      />
    </div>
  );
}
