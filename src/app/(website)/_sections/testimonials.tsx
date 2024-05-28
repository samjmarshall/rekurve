export default function Testimonials() {
  return (
    <>
      {/* Testimonials - Option 1 */}
      {/* <section
        className="w-full bg-gray-100 py-12 md:py-24 lg:py-32"
        id="testimonials"
      >
        <div className="container px-4 md:px-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_500px] lg:gap-12 xl:grid-cols-[1fr_550px]">
            <Image
              alt="Image"
              className="mx-auto aspect-video overflow-hidden rounded-xl object-cover object-center sm:w-full lg:order-last"
              height="310"
              src="/assets/placeholder.svg"
              width="550"
            />
            <div className="flex flex-col justify-center space-y-4">
              <div className="space-y-2">
                <blockquote className="text-lg font-semibold leading-snug lg:text-xl lg:leading-normal xl:text-2xl">
                  &quot;Using rekurve allowed us to double our business. We can
                  finally see exactly what&apos;s happening in our business, and
                  see what&apos;s coming in the weeks ahead. The planning tools
                  have reduced the time to accurately estimate and present a
                  proposal from weeks to days.&quot;
                </blockquote>
                <div>
                  <div className="font-semibold">
                    Ben Makim
                  </div>
                  <div className="text-sm text-gray-600">
                    Owner, Makim Bulders
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section> */}

      {/* Testimonials - Option 2 */}
      {/* <section className="w-full py-12 md:py-24 lg:py-32" id="testimonials">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-gray-100 px-3 py-1 text-sm">
                  Customer Testimonials
                </div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                  What Our Customers Say
                </h2>
                <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed">
                  Hear from the construction professionals who have streamlined
                  their workflows with Construct Pro.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-2 lg:gap-12">
              <div className="flex flex-col justify-center space-y-4">
                <blockquote className="text-lg font-semibold leading-snug lg:text-xl lg:leading-normal xl:text-2xl">
                  “Construct Pro has been a game-changer for our construction
                  business. The project management tools have streamlined our
                  workflows and helped us deliver projects on time and under
                  budget.”
                </blockquote>
                <div>
                  <div className="font-semibold">John Doe</div>
                  <div className="text-sm text-gray-500">
                    Project Manager, ABC Construction
                  </div>
                </div>
              </div>
              <Image
                alt="Testimonial"
                className="mx-auto aspect-video overflow-hidden rounded-xl object-cover object-center sm:w-full lg:order-last"
                height="310"
                src="/assets/placeholder.svg"
                width="550"
              />
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-2 lg:gap-12">
              <Image
                alt="Testimonial"
                className="mx-auto aspect-video overflow-hidden rounded-xl object-cover object-center sm:w-full"
                height="310"
                src="/assets/placeholder.svg"
                width="550"
              />
              <div className="flex flex-col justify-center space-y-4">
                <blockquote className="text-lg font-semibold leading-snug lg:text-xl lg:leading-normal xl:text-2xl" />
              </div>
            </div>
          </div>
        </section> */}

      {/* Pricing - Option 1 */}
      {/* <section className="w-full py-12 md:py-24 lg:py-32" id="pricing">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-3">
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">Pricing</h2>
                <p className="mx-auto max-w-[600px] text-gray-500 md:text-xl/relaxed">
                  Choose the plan that fits your construction business. No hidden fees, cancel anytime.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Starter</CardTitle>
                  <CardDescription>
                    Perfect for small teams and individual contractors.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-4xl font-bold">$29</p>
                    <p className="text-gray-500">
                      per month
                    </p>
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li>
                      <CheckIcon className="mr-2 inline-block h-4 w-4 text-green-500" />
                      Project management
                    </li>
                    <li>
                      <CheckIcon className="mr-2 inline-block h-4 w-4 text-green-500" />
                      Timesheets
                    </li>
                    <li>
                      <CheckIcon className="mr-2 inline-block h-4 w-4 text-green-500" />
                      Basic reporting
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button title="Get Started">Get Started</Button>
                </CardFooter>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Pro</CardTitle>
                  <CardDescription>
                    Ideal for growing teams and mid-sized projects.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-4xl font-bold">$49</p>
                    <p className="text-gray-500">
                      per month
                    </p>
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li>
                      <CheckIcon className="mr-2 inline-block h-4 w-4 text-green-500" />
                      Project management
                    </li>
                    <li>
                      <CheckIcon className="mr-2 inline-block h-4 w-4 text-green-500" />
                      Timesheets
                    </li>
                    <li>
                      <CheckIcon className="mr-2 inline-block h-4 w-4 text-green-500" />
                      Advanced reporting
                    </li>
                    <li>
                      <CheckIcon className="mr-2 inline-block h-4 w-4 text-green-500" />
                      Financial tracking
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button title="Get Started">Get Started</Button>
                </CardFooter>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Enterprise</CardTitle>
                  <CardDescription>
                    Tailored for large organizations and complex projects.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-4xl font-bold">$99</p>
                    <p className="text-gray-500">
                      per month
                    </p>
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li>
                      <CheckIcon className="mr-2 inline-block h-4 w-4 text-green-500" />
                      Project management
                    </li>
                    <li>
                      <CheckIcon className="mr-2 inline-block h-4 w-4 text-green-500" />
                      Timesheets
                    </li>
                    <li>
                      <CheckIcon className="mr-2 inline-block h-4 w-4 text-green-500" />
                      Advanced reporting
                    </li>
                    <li>
                      <CheckIcon className="mr-2 inline-block h-4 w-4 text-green-500" />
                      Financial tracking
                    </li>
                    <li>
                      <CheckIcon className="mr-2 inline-block h-4 w-4 text-green-500" />
                      Custom integrations
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button title="Get Started">Get Started</Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </section> */}
    </>
  )
}
