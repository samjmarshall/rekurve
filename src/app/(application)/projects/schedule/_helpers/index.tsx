import { type Task } from "gantt-task-react";

export function initTasks() {
  const currentDate = new Date();
  const tasks: Task[] = [
    {
      start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
      end: new Date(currentDate.getFullYear(), currentDate.getMonth(), 15),
      name: "Pre-sales",
      id: "stage1",
      progress: 25,
      type: "project",
      hideChildren: false,
      displayOrder: 1,
    },
    {
      start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
      end: new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        2,
        12,
        28,
      ),
      name: "Deposit",
      id: "task0",
      progress: 100,
      type: "task",
      project: "stage1",
      displayOrder: 2,
    },
    {
      start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 2),
      end: new Date(currentDate.getFullYear(), currentDate.getMonth(), 4, 0, 0),
      name: "Drafting",
      id: "task1",
      progress: 25,
      dependencies: [],
      type: "task",
      project: "stage1",
      displayOrder: 3,
    },
    {
      start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 4),
      end: new Date(currentDate.getFullYear(), currentDate.getMonth(), 8, 0, 0),
      name: "Selections",
      id: "task2",
      progress: 10,
      dependencies: ["task1"],
      type: "task",
      project: "stage1",
      displayOrder: 4,
    },
    {
      start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 8),
      end: new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        12,
        0,
        0,
      ),
      name: "Estimation",
      id: "task3",
      progress: 2,
      dependencies: ["task2"],
      type: "task",
      project: "stage1",
      displayOrder: 5,
    },
    {
      start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 13),
      end: new Date(currentDate.getFullYear(), currentDate.getMonth(), 14),
      name: "Contract Proposal",
      id: "task4",
      type: "task",
      progress: 70,
      dependencies: ["task3"],
      project: "stage1",
      displayOrder: 6,
    },
    {
      start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 15),
      end: new Date(currentDate.getFullYear(), currentDate.getMonth(), 15),
      name: "Client Review",
      id: "task5",
      progress: currentDate.getMonth(),
      type: "milestone",
      dependencies: ["task4"],
      project: "stage1",
      displayOrder: 7,
    },
    {
      start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 18),
      end: new Date(currentDate.getFullYear(), currentDate.getMonth(), 26),
      name: "Pre-site",
      id: "stage2",
      progress: 0,
      type: "project",
      dependencies: ["stage1"],
      hideChildren: false,
      displayOrder: 8,
    },
    {
      start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 18),
      end: new Date(currentDate.getFullYear(), currentDate.getMonth(), 22),
      name: "Building Approval",
      id: "task9",
      progress: 0,
      isDisabled: true,
      type: "task",
      project: "stage2",
      displayOrder: 9,
    },
    {
      start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 23),
      end: new Date(currentDate.getFullYear(), currentDate.getMonth(), 26),
      name: "Finance Approval",
      id: "task10",
      progress: 0,
      isDisabled: true,
      type: "task",
      dependencies: ["task9"],
      project: "stage2",
      displayOrder: 10,
    },
  ];
  return tasks;
}

export function getStartEndDateForProject(tasks: Task[], projectId: string) {
  const projectTasks = tasks.filter((t) => t.project === projectId);

  let start = projectTasks[0]?.start;
  let end = projectTasks[0]?.end;

  if (!start || !end) {
    return [undefined, undefined];
  }

  for (const task of projectTasks) {
    if (start.getTime() > task.start.getTime()) {
      start = task.start;
    }
    if (end.getTime() < task.end.getTime()) {
      end = task.end;
    }
  }
  return [start, end];
}
