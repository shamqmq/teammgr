import { pgTable, uuid, varchar, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['admin', 'employee']);

export const users = pgTable('users', {
  id : uuid('id').defaultRandom().primaryKey(),
  name: varchar('name').notNull(),
  email: varchar('email').unique().notNull(),
  password_hash: varchar('pasword_hash').notNull(),
  role: userRoleEnum('role').notNull().default('employee'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});
