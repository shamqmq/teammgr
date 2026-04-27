import { pgEnum, pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
import {users} from "./users"

export const taskStatusEnum = pgEnum('task_status', ['requested','todo', 'in_progress', 'done']); 

export const taskPriorityEnum = pgEnum('task_priority',['low', 'medium', 'high']);

export const tasks = pgTable('tasks',{
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title').notNull(),
  description: text('description').notNull(),
  status: taskStatusEnum('status').notNull(),
  priority: taskPriorityEnum('priority').notNull(),
  created_by: uuid('created_by').references(()=> users.id,{
    onDelete: 'set null'
  }),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
  due_to: timestamp('due_to').notNull(),
});
