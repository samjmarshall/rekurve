import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import { type JSX, type SVGProps } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table"

import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { Checkbox } from "~/components/ui/checkbox"
import { MaterialFormDrawer } from "./_components/forms"

export default function Estimate() {
  return (
    <div className="px-4 py-5">
      <Card>
        <CardHeader>
          <CardTitle>Estimate</CardTitle>
          <div className="flex pt-2">
            <div className="ml-0 mr-auto flex space-x-2">
              <Select>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="inactive">Complete</SelectItem>
                  <SelectItem value="inactive">Incomplete</SelectItem>
                  <SelectItem value="active">Not Relevant</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="material">Material</SelectItem>
                  <SelectItem value="labor">Labor</SelectItem>
                  <SelectItem value="labor">Equipment</SelectItem>
                  <SelectItem value="labor">Subcontractor</SelectItem>
                  <SelectItem value="fee">Fee</SelectItem>
                  <SelectItem value="labor">Allowance</SelectItem>
                  <SelectItem value="labor">Assembly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="ml-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>Add Item</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <MaterialFormDrawer />
                  <DropdownMenuItem data-disabled>Labour</DropdownMenuItem>
                  <DropdownMenuItem data-disabled>Equipment</DropdownMenuItem>
                  <DropdownMenuItem data-disabled>
                    Subcontractor
                  </DropdownMenuItem>
                  <DropdownMenuItem data-disabled>Fee</DropdownMenuItem>
                  <DropdownMenuItem data-disabled>Allowance</DropdownMenuItem>
                  <DropdownMenuItem data-disabled>Assembly</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12" />
                  <TableHead>Name</TableHead>
                  <TableHead>Cost Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit Cost inc. tax</TableHead>
                  <TableHead>Builder Cost</TableHead>
                  <TableHead>Markup</TableHead>
                  <TableHead>Client Price</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <Checkbox id="item1" />
                  </TableCell>
                  <TableCell className="font-medium">
                    BCC - Work Zone Permit
                  </TableCell>
                  <TableCell>Fee</TableCell>
                  <TableCell>
                    <Badge variant="secondary">•</Badge>
                  </TableCell>
                  <TableCell>0 m2</TableCell>
                  <TableCell>$5.01</TableCell>
                  <TableCell>$0.00</TableCell>
                  <TableCell>20.00 %</TableCell>
                  <TableCell>$0.00</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <Checkbox id="item2" />
                  </TableCell>
                  <TableCell className="font-medium">
                    BCC - Driveway Permit
                  </TableCell>
                  <TableCell>Fee</TableCell>
                  <TableCell>
                    <Badge variant="secondary">•</Badge>
                  </TableCell>
                  <TableCell>1 each</TableCell>
                  <TableCell>$143.00</TableCell>
                  <TableCell>$130.00</TableCell>
                  <TableCell>20.00 %</TableCell>
                  <TableCell>$171.60</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <div className="mt-4 flex items-center justify-between">
              <Button variant="ghost">Summary</Button>
              <div className="flex space-x-4">
                <div className="flex items-center space-x-1">
                  <CalculatorIcon className="h-5 w-5" />
                  <div className="text-sm">Builder Fixed Cost</div>
                  <div className="font-semibold">$716,489.30</div>
                </div>
                <div className="flex items-center space-x-1">
                  <TagIcon className="h-5 w-5" />
                  <div className="text-sm">Allowances</div>
                  <div className="font-semibold">$530,690.39</div>
                </div>
                <div className="flex items-center space-x-1">
                  <BarChartIcon className="h-5 w-5" />
                  <div className="text-sm">Markup</div>
                  <div className="font-semibold">$247,950.81</div>
                </div>
                <div className="flex items-center space-x-1">
                  <CurrencyIcon className="h-5 w-5" />
                  <div className="text-sm">Client Price</div>
                  <div className="text-lg font-bold text-blue-600">
                    $1,644,643.55
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function BarChartIcon(
  props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>,
) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" x2="12" y1="20" y2="10" />
      <line x1="18" x2="18" y1="20" y2="4" />
      <line x1="6" x2="6" y1="20" y2="16" />
    </svg>
  )
}

function CalculatorIcon(
  props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>,
) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="16" height="20" x="4" y="2" rx="2" />
      <line x1="8" x2="16" y1="6" y2="6" />
      <line x1="16" x2="16" y1="14" y2="18" />
      <path d="M16 10h.01" />
      <path d="M12 10h.01" />
      <path d="M8 10h.01" />
      <path d="M12 14h.01" />
      <path d="M8 14h.01" />
      <path d="M12 18h.01" />
      <path d="M8 18h.01" />
    </svg>
  )
}

function CurrencyIcon(
  props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>,
) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="8" />
      <line x1="3" x2="6" y1="3" y2="6" />
      <line x1="21" x2="18" y1="3" y2="6" />
      <line x1="3" x2="6" y1="21" y2="18" />
      <line x1="21" x2="18" y1="21" y2="18" />
    </svg>
  )
}

function TagIcon(props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
      <path d="M7 7h.01" />
    </svg>
  )
}
