import { pgTable,  uuid, timestamp} from "drizzle-orm/pg-core";
import {tasks} from "./tasks"
import {users} from "./users"

export const tasks_assignment = pgTable('tasks_assignment',{
  id : uuid('id').defaultRandom().primaryKey(),
  task_id: uuid('task_id').references(()=> tasks.id, {
    onDelete: 'cascade'
  }).notNull(),
  employee_id: uuid('employee_id').references(()=> users.id, {
    onDelete: 'cascade'
  }).notNull(),
  created_at: timestamp('created_at').defaultNow()
});
