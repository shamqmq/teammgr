import { db } from '../config/database';
import { users, tasks, tasks_assignment, tasks_dependence } from '../db/schema';
import { eq, and } from 'drizzle-orm';

// ─── Testing ─────────────────────────────────────────────────
export async function testDB() {
 const [record] =  await db.select().from(tasks).limit(0);
  return record;
}

// ─── Users ─────────────────────────────────────────────────
export async function insertUser(data: {
  name: string;
  email: string;
  password_hash: string;   // matches the property name in the model
  role?: 'admin' | 'employee';
}) {
  const [record] = await db.insert(users).values(data).returning();
  return record;
}

export async function getUserByEmail(email: string) {
  const [record] = await db
    .select()
    .from(users)
    .where(eq(users.email, email));
  return record || null;
}

export async function getUserById(id: string) {
  const [record] = await db
    .select()
    .from(users)
    .where(eq(users.id, id));
  return record || null;
}

export async function getAllUsers() {
  return db.select().from(users);
}

export async function updateUser(
  id: string,
  data: Partial<{
    name: string;
    email: string;
    password_hash: string;
    role: 'admin' | 'employee';
    updated_at: Date;
  }>
) {
  const [record] = await db
    .update(users)
    .set({ ...data, updated_at: new Date() })
    .where(eq(users.id, id))
    .returning();
  return record;
}

export async function deleteUser(id: string) {
  await db.delete(users).where(eq(users.id, id));
}

// ─── Tasks ─────────────────────────────────────────────────
export async function insertTask(data: {
  title: string;
  description: string;
  status: 'requested' | 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  created_by?: string | null;   // matches model: uuid, references users.id
  due_to: Date;
}) {
  const [record] = await db.insert(tasks).values(data).returning();
  return record;
}

export async function getTaskById(id: string) {
  const [record] = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, id));
  return record || null;
}

export async function getTasksByUser(userId: string) {
  return db.select().from(tasks).where(eq(tasks.created_by, userId));
}

export async function getAllTasks() {
  return db.select().from(tasks);
}

export async function updateTask(
  id: string,
  data: Partial<{
    title: string;
    description: string;
    status: 'requested' | 'todo' | 'in_progress' | 'done';
    priority: 'low' | 'medium' | 'high';
    created_by: string | null;
    due_to: Date;
  }>
) {
  const [record] = await db
    .update(tasks)
    .set({ ...data, updated_at: new Date() })
    .where(eq(tasks.id, id))
    .returning();
  return record;
}

export async function deleteTask(id: string) {
  await db.delete(tasks).where(eq(tasks.id, id));
}

// ─── Task Assignments ──────────────────────────────────────
export async function assignUserToTask(task_id: string, employee_id: string) {
  const [record] = await db
    .insert(tasks_assignment)
    .values({ task_id, employee_id })
    .returning();
  return record;
}

export async function getAssignmentsForTask(task_id: string) {
  return db
    .select()
    .from(tasks_assignment)
    .where(eq(tasks_assignment.task_id, task_id));
}

export async function getAssignmentsForUser(employee_id: string) {
  return db
    .select()
    .from(tasks_assignment)
    .where(eq(tasks_assignment.employee_id, employee_id));
}

export async function removeAssignment(task_id: string, employee_id: string) {
  await db
    .delete(tasks_assignment)
    .where(
      and(
        eq(tasks_assignment.task_id, task_id),
        eq(tasks_assignment.employee_id, employee_id)
      )
    );
}

// ─── Task Dependencies ─────────────────────────────────────
// Note: the table name is 'tasks_dependece' (typo), but the model variable is tasks_dependence
export async function addDependency(required_task_id: string, dependent_task_id: string) {
  const [record] = await db
    .insert(tasks_dependence)
    .values({ required_task_id, dependent_task_id })
    .returning();
  return record;
}

export async function getDependenciesForTask(task_id: string) {
  return db
    .select()
    .from(tasks_dependence)
    .where(eq(tasks_dependence.dependent_task_id, task_id));
}

export async function getTasksThatDependOn(task_id: string) {
  return db
    .select()
    .from(tasks_dependence)
    .where(eq(tasks_dependence.required_task_id, task_id));
}

export async function removeDependency(id: string) {
  await db.delete(tasks_dependence).where(eq(tasks_dependence.id, id));
}
