import { CreatePost } from "~/components/create-post";
import { DataTable } from "~/components/data-table";
import { api } from "~/trpc/server";
import { columns } from "~/components/data-table/columns";
import { promises as fs } from "fs";
import { getServerAuthSession } from "~/server/auth";
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

export default async function Home() {
  const session = await getServerAuthSession();
  const tasks = await getTasks();

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-12 overflow-y-auto px-4 py-16">
      <p className="text-center text-2xl">
        {session && <span>Logged in as {session.user?.name}</span>}
      </p>

      <CrudShowcase />

      <div className="h-full space-y-8 p-8">
        <DataTable data={tasks} columns={columns} />
      </div>
    </div>
  );
}

async function CrudShowcase() {
  const session = await getServerAuthSession();
  if (!session?.user) return null;

  const latestPost = await api.post.getLatest();

  return (
    <div className="w-full max-w-xs">
      {latestPost ? (
        <p className="truncate">Your most recent message: {latestPost.name}</p>
      ) : (
        <p>You have no messages yet.</p>
      )}

      <CreatePost />
    </div>
  );
}
