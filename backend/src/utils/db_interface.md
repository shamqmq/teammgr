# Database Helpers API

All database operations are done through simple, typed helper functions located in `src/utils/db_interface.ts`.  
They wrap Drizzle ORM calls and directly reflect the columns defined in your schema models.

## General notes

- All functions return plain JavaScript objects (the actual rows).
- Functions that modify data **do not** handle authentication/authorization – that’s the job of your route middleware.
- When inserting or updating a user, the `password_hash` field must be provided **already hashed** (e.g., using `bcryptjs`).
- All deletions are **hard deletes** (rows are permanently removed from the database).
- Column names in the JavaScript/TypeScript code match the property names in your Drizzle models (e.g., `password_hash`, `created_by`, `due_to`).

## Import

```ts
import {
  insertUser,
  getUserByEmail,
  getUserById,
  getAllUsers,
  updateUser,
  deleteUser,
  insertTask,
  getTaskById,
  getTasksByUser,
  getAllTasks,
  updateTask,
  deleteTask,
  assignUserToTask,
  getAssignmentsForTask,
  getAssignmentsForUser,
  removeAssignment,
  addDependency,
  getDependenciesForTask,
  getTasksThatDependOn,
  removeDependency,
} from './utils/db_helpers';
```

---

## Users

### `insertUser(data)`
| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | Full name |
| `email` | `string` | Unique email address |
| `password_hash` | `string` | Already‑hashed password |
| `role?` | `'admin' \| 'employee'` | Defaults to `'employee'` |

Returns the created user object (including `id`, `created_at`, etc.).

**Example**
```ts
import { hash } from 'bcryptjs';
const pwHash = await hash('secret123', 10);
const newUser = await insertUser({
  name: 'Alice',
  email: 'alice@example.com',
  password_hash: pwHash,
  role: 'employee',
});
```

### `getUserByEmail(email)`
Returns the user object or `null`.

### `getUserById(id)`
Returns the user object or `null`.

### `getAllUsers()`
Returns an array of all users.

### `updateUser(id, data)`
Accepts a **partial** object – only provide the fields you want to change.  
`updated_at` is set automatically to the current time.

**Example**
```ts
await updateUser('some-uuid', { role: 'admin' });
```

### `deleteUser(id)`
Permanently removes the user. Use with caution.

---

## Tasks

### `insertTask(data)`
| Parameter | Type | Description |
|-----------|------|-------------|
| `title` | `string` | Task title |
| `description` | `string` | Detailed description |
| `status` | `'requested' \| 'todo' \| 'in_progress' \| 'done'` | Current status |
| `priority` | `'low' \| 'medium' \| 'high'` | Priority level |
| `created_by` | `string \| null` | UUID of the user who created the task |
| `due_to` | `Date` | Deadline |

Returns the created task object.

### `getTaskById(id)`
Returns the task or `null`.

### `getTasksByUser(userId)`
Returns all tasks where `created_by` equals the given user ID.

### `getAllTasks()`
Returns an array of all tasks.

### `updateTask(id, data)`
Accepts a **partial** task object. `updated_at` is automatically refreshed.

### `deleteTask(id)`
Permanently removes the task.

---

## Task Assignments

### `assignUserToTask(task_id, employee_id)`
Creates an assignment. Both parameters are UUIDs. Returns the assignment record.

### `getAssignmentsForTask(task_id)`
Returns all assignments for a given task.

### `getAssignmentsForUser(employee_id)`
Returns all assignments for a given user.

### `removeAssignment(task_id, employee_id)`
Deletes the assignment record (does not delete the task or user).

---

## Task Dependencies

### `addDependency(required_task_id, dependent_task_id)`
Makes `dependent_task_id` depend on `required_task_id` (i.e., the dependent task can’t start until the required one is done). Both are UUIDs. Returns the dependency record.

### `getDependenciesForTask(task_id)`
Returns all dependencies where `task_id` is the **dependent** task (the one that is blocked).

### `getTasksThatDependOn(task_id)`
Returns all dependencies where `task_id` is the **required** task (the one that is blocking others).

### `removeDependency(id)`
Deletes a dependency by its own `id` (the UUID of the dependency row, not the task IDs).

---

## Quick reference

| Table | Insert | Read | Update | Delete |
|-------|--------|------|--------|--------|
| Users | `insertUser` | `getUserByEmail`, `getUserById`, `getAllUsers` | `updateUser` | `deleteUser` |
| Tasks | `insertTask` | `getTaskById`, `getTasksByUser`, `getAllTasks` | `updateTask` | `deleteTask` |
| Assignments | `assignUserToTask` | `getAssignmentsForTask`, `getAssignmentsForUser` | – | `removeAssignment` |
| Dependencies | `addDependency` | `getDependenciesForTask`, `getTasksThatDependOn` | – | `removeDependency` |
