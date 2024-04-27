import { Card, CardContent } from "~/components/ui/card";

import { DataTable } from "~/components/data-table";
import { columns } from "~/components/data-table/columns";
import { promises as fs } from "fs";
import path from "path";
import { taskSchema } from "~/server/data/schema";
import { z } from "zod";

// Simulate a database read for tasks.
async function getTasks() {
  const data = await fs.readFile(
    path.join(process.cwd(), "src/server/data/tasks.json"),
  );

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const tasks = JSON.parse(data.toString());

  return z.array(taskSchema).parse(tasks);
}

export default async function Projects() {
  const tasks = await getTasks();

  return (
    <div className="h-full w-full items-center justify-center px-4 py-5">
      <Card>
        <CardContent className="flex justify-center p-4">
          <DataTable data={tasks} columns={columns} />
        </CardContent>
      </Card>
    </div>
  );
}
