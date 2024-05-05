import { Card, CardContent } from "~/components/ui/card";

export default function Schedule() {
  return (
    <div className="h-full w-full items-center justify-center px-4 py-5">
      <Card>
        <CardContent className="flex p-4">
          <div className="w-48 overflow-auto border-r border-gray-200">
            <div className="space-y-4 p-4">
              <div>
                <div className="font-medium">Planning</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Drafting, selections & estimating.
                </div>
              </div>
              <div>
                <div className="font-medium">Proposal</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Contract proposal and client review
                </div>
              </div>
              <div>
                <div className="font-medium">Pre-site</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Building and finance approvals
                </div>
              </div>
              <div>
                <div className="font-medium">Site start</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Site set up, demolition & excavation
                </div>
              </div>
            </div>
          </div>
          <div className="w-full overflow-x-auto">
            <div className="grid h-full w-fit grid-cols-[200px_1fr] gap-4 p-4">
              <div className="flex items-center justify-end rounded-lg bg-gray-100 p-2 dark:bg-gray-800">
                <span className="text-sm font-medium">Today</span>
              </div>
              <div className="flex items-center justify-end rounded-lg bg-gray-100 p-2 dark:bg-gray-800">
                <span className="text-sm font-medium">May 1</span>
              </div>
              <div className="flex items-center justify-end rounded-lg bg-gray-100 p-2 dark:bg-gray-800">
                <span className="text-sm font-medium">May 15</span>
              </div>
              <div className="flex items-center justify-end rounded-lg bg-gray-100 p-2 dark:bg-gray-800">
                <span className="text-sm font-medium">June 1</span>
              </div>
              <div className="flex items-center justify-end rounded-lg bg-gray-100 p-2 dark:bg-gray-800">
                <span className="text-sm font-medium">June 15</span>
              </div>
              <div className="flex items-center justify-end rounded-lg bg-gray-100 p-2 dark:bg-gray-800">
                <span className="text-sm font-medium">July 1</span>
              </div>
              <div className="flex items-center justify-end rounded-lg bg-gray-100 p-2 dark:bg-gray-800">
                <span className="text-sm font-medium">July 15</span>
              </div>
              <div className="flex items-center justify-end rounded-lg bg-gray-100 p-2 dark:bg-gray-800">
                <span className="text-sm font-medium">Aug 1</span>
              </div>
              <div className="flex items-center justify-end rounded-lg bg-gray-100 p-2 dark:bg-gray-800">
                <span className="text-sm font-medium">Aug 15</span>
              </div>
              <div className="flex items-center justify-end rounded-lg bg-gray-100 p-2 dark:bg-gray-800">
                <span className="text-sm font-medium">Sep 1</span>
              </div>
              <div className="flex items-center justify-end rounded-lg bg-gray-100 p-2 dark:bg-gray-800">
                <span className="text-sm font-medium">Sep 15</span>
              </div>
              <div className="flex items-center justify-end rounded-lg bg-gray-100 p-2 dark:bg-gray-800">
                <span className="text-sm font-medium">Oct 1</span>
              </div>
              <div className="col-span-12"></div>
              <div className="col-span-6 flex items-center justify-between rounded-lg bg-gray-100 p-2 dark:bg-gray-800">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-primary" />
                  <span className="text-sm font-medium">Pre-sales</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <span className="text-sm font-medium">Deadline</span>
                </div>
              </div>
              <div className="col-span-6 flex items-center justify-between rounded-lg bg-gray-100 p-2 dark:bg-gray-800">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-primary" />
                  <span className="text-sm font-medium">Slab stage</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <span className="text-sm font-medium">Deadline</span>
                </div>
              </div>
              <div className="col-span-2 row-span-2 flex flex-col gap-2 rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
                <div className="font-medium">Planning</div>
                <div className="flex items-center gap-2 rounded-lg bg-primary/20 p-2">
                  <div className="h-3 w-3 rounded-full bg-primary" />
                  <div className="text-sm font-medium">Deposit</div>
                  <div className="ml-auto text-sm text-gray-500 dark:text-gray-400">
                    May 1 - May 2
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-primary/20 p-2">
                  <div className="h-3 w-3 rounded-full bg-primary" />
                  <div className="text-sm font-medium">Drafting</div>
                  <div className="ml-auto text-sm text-gray-500 dark:text-gray-400">
                    May 3 - May 15
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-primary/20 p-2">
                  <div className="h-3 w-3 rounded-full bg-primary" />
                  <div className="text-sm font-medium">Selections</div>
                  <div className="ml-auto text-sm text-gray-500 dark:text-gray-400">
                    May 16 - May 31
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-primary/20 p-2">
                  <div className="h-3 w-3 rounded-full bg-primary" />
                  <div className="text-sm font-medium">Estimation</div>
                  <div className="ml-auto text-sm text-gray-500 dark:text-gray-400">
                    May 16 - May 31
                  </div>
                </div>
              </div>
              <div className="col-span-2 row-span-3 flex flex-col gap-2 rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
                <div className="font-medium">Proposal</div>
                <div className="flex items-center gap-2 rounded-lg bg-primary/20 p-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <div className="text-sm font-medium">Contract Proposal</div>
                  <div className="ml-auto text-sm text-gray-500 dark:text-gray-400">
                    June 1 - July 15
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-primary/20 p-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <div className="text-sm font-medium">Client Review</div>
                  <div className="ml-auto text-sm text-gray-500 dark:text-gray-400">
                    June 15 - Aug 1
                  </div>
                </div>
              </div>
              <div className="col-span-2 row-span-2 flex flex-col gap-2 rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
                <div className="font-medium">Pre-site</div>
                <div className="flex items-center gap-2 rounded-lg bg-primary/20 p-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <div className="text-sm font-medium">Building Approval</div>
                  <div className="ml-auto text-sm text-gray-500 dark:text-gray-400">
                    Aug 15 - Sep 1
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-primary/20 p-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <div className="text-sm font-medium">Finance Approval</div>
                  <div className="ml-auto text-sm text-gray-500 dark:text-gray-400">
                    Sep 1 - Sep 15
                  </div>
                </div>
              </div>
              <div className="col-span-2 row-span-2 flex flex-col gap-2 rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
                <div className="font-medium">Site start</div>
                <div className="flex items-center gap-2 rounded-lg bg-primary/20 p-2">
                  <div className="h-3 w-3 rounded-full bg-primary" />
                  <div className="text-sm font-medium">Site set-up</div>
                  <div className="ml-auto text-sm text-gray-500 dark:text-gray-400">
                    Sep 15 - Oct 1
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-primary/20 p-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <div className="text-sm font-medium">Demolition</div>
                  <div className="ml-auto text-sm text-gray-500 dark:text-gray-400">
                    Oct 1 - Oct 4
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-primary/20 p-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <div className="text-sm font-medium">Excavation</div>
                  <div className="ml-auto text-sm text-gray-500 dark:text-gray-400">
                    Oct 4 - Oct 6
                  </div>
                </div>
              </div>
              <div className="col-span-2 row-span-2 flex flex-col gap-2 rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
                <div className="font-medium">Slab</div>
                <div className="flex items-center gap-2 rounded-lg bg-primary/20 p-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <div className="text-sm font-medium">Slab pour</div>
                  <div className="ml-auto text-sm text-gray-500 dark:text-gray-400">
                    Oct 9 - Oct 13
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-primary/20 p-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <div className="text-sm font-medium">
                    First progress payment
                  </div>
                  <div className="ml-auto text-sm text-gray-500 dark:text-gray-400">
                    Oct 16
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
