import { CreatePost } from "~/components/create-post";
import { DataTable } from "~/components/data-table";
import Link from "next/link";
import { UserNav } from "~/components/user-nav";
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

  const tasks = JSON.parse(data.toString());

  return z.array(taskSchema).parse(tasks);
}

export default async function Home() {
  const session = await getServerAuthSession();
  const tasks = await getTasks();

  return (
    <main className="flex h-screen w-screen flex-col items-center justify-center">
      <div className="flex h-16 w-full bg-gradient-to-r from-blue-400 to-[#2e026d] text-white">
        <h1 className="p-2 text-5xl font-extrabold tracking-tight">rekurve</h1>
        <div className="my-auto ml-auto mr-2">
          <Link
            href={session ? "/api/auth/signout" : "/api/auth/signin"}
            className="rounded bg-white/10 px-10 py-3 font-semibold no-underline transition hover:bg-white/20"
          >
            {session ? "Sign out" : "Sign in"}
          </Link>
        </div>
      </div>
      <div className="flex h-full max-h-full w-screen flex-col items-center justify-center gap-12 overflow-y-auto px-4 py-16">
        <p className="text-center text-2xl">
          {session && <span>Logged in as {session.user?.name}</span>}
        </p>

        <CrudShowcase />

        <div className="hidden h-full flex-1 flex-col space-y-8 p-8 md:flex">
          <div className="flex items-center justify-between space-y-2">
            <div>
              <p className="text-muted-foreground">
                Here&apos;s a list of your tasks for this month!
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <UserNav />
            </div>
          </div>
          <DataTable data={tasks} columns={columns} />
        </div>
      </div>
    </main>
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
