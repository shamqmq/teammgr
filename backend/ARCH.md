# Teammgr Architecture

## Overview
Teammgr is a **team task‑management REST API**. It simulates a real‑world backend with
role‑based access, task dependencies, and containerised
deployment.

**Core roles:**

1- **admins**
    - CRUD operations
      - Creating tasks
      - Reading (Querying) tasks
      - Updating (Editing) tasks
      - Deleting tasks
    - Assigning tasks for a employee or more
    - Requested task approval
2- **Employees**
    - Reading his tasks and tasks that his tasks depend on
    - Mark task as In Progress or DONE 
    - Request a task for admin to accept

---

## Tech Stack
| Layer            | Technology                    |
|------------------|-------------------------------|
| Language         | TypeScript (strict mode)      |
| Runtime          | Bun                           |
| Framework        | Express.js                    |
| Database         | PostgreSQL                    |
| ORM              | Drizzle                       |
| Authentication   | JWT (access + refresh tokens) |
| Validatation     | Zod                           |
| Containerisation | Docker, Docker Compose        |
| Reverse Proxy    | Nginx                         |

---
 
## Database Model
**PostgreSQL** with the following tables. All primary keys are UUIDv4.

### 1. `users`
| Column        | Type      | Constraints                                     |
|---------------|-----------|-------------------------------------------------|
| id            | UUID      | PK, default uuid_generate_v4()                  |
| name          | VARCHAR   | NOT NULL                                        |
| email         | VARCHAR   | UNIQUE, NOT NULL                                |
| password_hash | VARCHAR   | NOT NULL                                        |
| role          | ENUM      | 'admin', 'employee' NOT NULL default 'employee' |
| created_at    | TIMESTAMP | DEFAULT now()                                   |
| updated_at    | TIMESTAMP | DEFAULT now()                                   |

### 2. `tasks`
| Column      | Type      | Constraints                               |
|-------------|-----------|-------------------------------------------|
| id          | UUID      | PK   default uuid_generate_v4()           |
| title       | VARCHAR   | NOT NULL                                  |
| description | TEXT      | NOT NULL                                  |
| status      | ENUM      | 'requested','todo', 'in_progress', 'done' |
| priority    | ENUM      | 'low', 'medium', 'high'                   |
| created_by  | UUID      | FK → users.id                             |
| created_at  | TIMESTAMP | DEFAULT now()                             |
| updated_at  | TIMESTAMP | DEFAULT now()                             |
| due_to      | TIMESTAMP | NOT NULL                                  |

### 3. `tasks_assignment`
| Column      | Type      | Constraints                       |
|-------------|-----------|-----------------------------------|
| id          | UUID      | PK                                |
| task_id     | UUID      | FK → tasks.id                     |
| employee_id | UUID      | FK → users.id (employee)          |
| created_at  | TIMESTAMP | DEFAULT now()                     |

### 4. `tasks_dependence`
| Column           | Type      | Constraints   |
|------------------|-----------|---------------|
| id               | UUID      | PK            |
| required_task_id | UUID      | FK → tasks.id |
| depedent_task_id | UUID      | FK → tasks.id |
| created_at       | TIMESTAMP | DEFAULT now() |

---

## API Routes
All endpoints prefixed with `/api/`. It redirects automatically to auth

### 1. Auth
| Method | Path           | Access | Description                                     |
|--------|----------------|--------|-------------------------------------------------|
| POST   | /auth/register | Public | Register new user (optional admin flag)         |
| POST   | /auth/login    | Public | Returns access + refresh tokens                 |
| POST   | /auth/refresh  | Public | Accepts refresh token, returns new access token |

### 2. Users
| Method | Path          | Access     | Description                |
|--------|---------------|------------|----------------------------|
| GET    | /users        | Admin      | List all users (paginated) |
| GET    | /users/:id    | Admin/Self | Get user details           |
| PATCH  | /users/:id    | Admin/Self | Update profile             |
| DELETE | /users/:id    | Admin      | Delete user                |

### 3. Tasks
| Method | Path                           | Access   | Description                                                                                                           |
|--------|--------------------------------|----------|-----------------------------------------------------------------------------------------------------------------------|
| GET    | /tasks                         | Auth     | Admins see all; employees see own + dependency tasks. Supports `?page`, `?limit`, `?status`, `?assignedTo`, `?sortBy` |
| GET    | /tasks/:id                     | Auth     | Get single task (visibility rules apply)                                                                              |
| POST   | /tasks                         | Admin    | Create a task                                                                                                         |
| PATCH  | /tasks/:id                     | Auth     | Admin: edit any field; Employee: only update status (with business rules)                                             |
| DELETE | /tasks/:id                     | Admin    | Delete a task (cascade assignments/requests)                                                                          |
| POST   | /tasks/:id/assign              | Admin    | Assign employees to a task (body: { userIds: string[] })                                                              |
| DELETE | /tasks/:id/assign              | Admin    | Remove assignment (body: {userIDs: [])                                                                                |
| POST   | /tasks/request                 | Employee | Request a task to the Admin                                                                                           |
| GET    | /tasks/requests                | Admin    | View pending task requests                                                                                            |
| PATCH  | /tasks/requests/:requestId     | Admin    | Approve or reject a request                                                                                           |
| GET    | /tasks/:id/dependencies        | Auth     | List all dependencies                                                                                                 |
| POST   | /tasks/:id/dependencies        | Admin    | Add dependency                                                                                                        |
| DELETE | /tasks/:id/dependencies/:depId | Admin    | Removes dependency                                                                                                    |

### 4. Health & Meta
| Method | Path      | Access | Description          |
|--------|-----------|--------|----------------------|
| GET    | /health   | Public | Service status       |

---

## Business Logic & Constraints
- **Task status transitions** (employee):
  - `todo` → `in_progress` → `done` (only linear).
  - Cannot move back unless admin does it.
  - **Dependency rule**: an employee cannot mark a task as `in_progress` if its parent task is not `done`. For complex DAGs, all direct ancestors must be completed.
- **Task creation**: admins create. employees request tasks.
- **Assignments**: only employees can be assigned. Admins cannot be assigned tasks.
- **Deletion**: deleting a task removes all its assignments, requests, and child tasks’ parent reference (or cascade‑delete children – design decision: we will set child `parent_task_id` to null).
- **Pagination**: all list endpoints return `{ data: [...], page, limit, total }`.

---

## Authentication & Authorisation
- **JWT‑based** with two tokens:
  - **Access token** (short lifespan, e.g. 15 min) – sent in `Authorization: Bearer <token>` header.
  - **Refresh token** (long lifespan, e.g. 7 days) – stored in HTTP‑only cookie or secure storage; used to obtain new access tokens.
- Password hashing: **bcrypt** (10 salt rounds).
- RBAC middleware:
  - `authenticate` – verifies JWT, attaches user to `req.user`.
  - `authorize(...roles)` – checks `req.user.role` against allowed roles.

---

## Deployment & Infrastructure
- **Docker Compose** runs three services:
 1. `app`   – Bun Express server (built from Dockerfile).
 2. `db`    – PostgreSQL.
 3. `nginx` – Reverse proxy (port  80/443).
- **Nginx** routes `/api/` to the app, and optionally serves static frontend (if any). Config includes rate limiting, headers, and gzip.
- **Multi‑stage Dockerfile**: builder stage runs `tsc`, final stage runs the compiled JavaScript with only production dependencies.

---
