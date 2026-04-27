import { pgTable,  uuid, timestamp} from "drizzle-orm/pg-core";
import {tasks} from "./tasks"

export const tasks_dependence = pgTable('tasks_dependece',{
  id : uuid('id').defaultRandom().primaryKey(),
  required_task_id: uuid('required_task_id').references(()=> tasks.id, {
    onDelete: 'cascade'
  }).notNull(),
  dependent_task_id: uuid('dependent_task_id').references(()=> tasks.id, {
    onDelete: 'cascade'
  }).notNull(),
  created_at: timestamp('created_at').defaultNow()
});
