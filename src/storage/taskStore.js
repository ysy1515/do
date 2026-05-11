const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const DATA_DIR = path.join(process.cwd(), "data");
const TASKS_FILE = path.join(DATA_DIR, "tasks.json");

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(TASKS_FILE);
  } catch {
    await fs.writeFile(TASKS_FILE, "[]\n", "utf8");
  }
}

async function readTasks() {
  await ensureStore();
  const raw = await fs.readFile(TASKS_FILE, "utf8");
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeTasks(tasks) {
  await ensureStore();
  const tempFile = `${TASKS_FILE}.tmp`;
  await fs.writeFile(tempFile, `${JSON.stringify(tasks, null, 2)}\n`, "utf8");
  await fs.rename(tempFile, TASKS_FILE);
}

function normalizePriority(priority) {
  return ["high", "medium", "low"].includes(priority) ? priority : "medium";
}

function sortTasks(tasks) {
  const priorityWeight = { high: 0, medium: 1, low: 2 };
  return [...tasks].sort((a, b) => {
    const byPriority = priorityWeight[a.priority] - priorityWeight[b.priority];
    if (byPriority !== 0) return byPriority;

    const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
    const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
    if (aDue !== bDue) return aDue - bDue;

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

async function listTasks() {
  return sortTasks(await readTasks());
}

async function addTask(input) {
  const tasks = await readTasks();
  const now = new Date().toISOString();
  const task = {
    id: crypto.randomUUID(),
    title: String(input.title || "").trim(),
    description: String(input.description || "").trim(),
    priority: normalizePriority(input.priority),
    dueDate: input.dueDate || "",
    status: "active",
    createdAt: now,
    completedAt: ""
  };

  if (!task.title) {
    const error = new Error("Task title is required.");
    error.statusCode = 400;
    throw error;
  }

  tasks.push(task);
  await writeTasks(tasks);
  return task;
}

async function updateTask(id, input) {
  const tasks = await readTasks();
  const index = tasks.findIndex((task) => task.id === id);
  if (index === -1) return null;

  const existing = tasks[index];
  const nextTitle = String(input.title || "").trim();
  if (!nextTitle) {
    const error = new Error("Task title is required.");
    error.statusCode = 400;
    throw error;
  }

  tasks[index] = {
    ...existing,
    title: nextTitle,
    description: String(input.description || "").trim(),
    priority: normalizePriority(input.priority),
    dueDate: input.dueDate || ""
  };
  await writeTasks(tasks);
  return tasks[index];
}

async function completeTask(id) {
  const tasks = await readTasks();
  const index = tasks.findIndex((task) => task.id === id);
  if (index === -1) return null;

  tasks[index] = {
    ...tasks[index],
    status: "completed",
    completedAt: tasks[index].completedAt || new Date().toISOString()
  };
  await writeTasks(tasks);
  return tasks[index];
}

async function deleteTask(id) {
  const tasks = await readTasks();
  const nextTasks = tasks.filter((task) => task.id !== id);
  if (nextTasks.length === tasks.length) return false;
  await writeTasks(nextTasks);
  return true;
}

module.exports = {
  addTask,
  completeTask,
  deleteTask,
  listTasks,
  readTasks,
  sortTasks,
  updateTask
};
