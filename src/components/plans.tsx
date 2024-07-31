import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card"

import { Check } from "lucide-react"

export function PlanPrice({
  ammout,
  interval,
}: {
  ammout: number
  interval: string
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-2xl font-bold">${ammout}</span>
      <span className="text-sm text-gray-500">/{interval}</span>
    </div>
  )
}

export function PlanBasic({ children }: { children?: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Basic</CardTitle>
        <CardDescription>For small projects and teams</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            <span>Basic Scheduling</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            <span>Task Management</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            <span>Project Estimation</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            <span>Client Collaboration</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            <span>Basic Reporting</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            <span>Email Support</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <PlanPrice ammout={49} interval="month" />
        {children}
      </CardFooter>
    </Card>
  )
}

export function PlanPro({ children }: { children?: React.ReactNode }) {
  return (
    <Card className="bg-gray-900 text-gray-50">
      <CardHeader>
        <CardTitle>Pro</CardTitle>
        <CardDescription>For medium-sized projects and teams</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            <span>Smart Scheduling</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            <span>Financial Tracking</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            <span>Task Management</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            <span>Project Estimation</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            <span>Client Collaboration</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            <span>Advanced Reporting</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            <span>Priority Email Support</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <PlanPrice ammout={99} interval="month" />
        {children}
      </CardFooter>
    </Card>
  )
}

export function PlanEnterprise({ children }: { children?: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Enterprise</CardTitle>
        <CardDescription>For large projects and teams</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            <span>Smart Scheduling</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            <span>Financial Tracking</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            <span>Task Management</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            <span>Project Estimation</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            <span>Client Collaboration</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            <span>Advanced Reporting</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            <span>Dedicated Support</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            <span>Custom Feature Development</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <PlanPrice ammout={199} interval="month" />
        {children}
      </CardFooter>
    </Card>
  )
}
