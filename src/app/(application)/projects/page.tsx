import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table"

import { Button } from "~/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import { ScrollArea } from "~/components/ui/scroll-area"

export default function Projects() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1">
        <div className="flex w-3/4 flex-col space-y-4 px-4 py-5">
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Financial Chart</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center p-4">
              Pie chart here
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
                <Image
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
                <Image
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
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
