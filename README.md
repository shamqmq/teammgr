# Teammgr

A team task management system built with **Bun + Express + Drizzle ORM** on the backend and **Svelte 5 + Vite** on the frontend. Runs in Docker with PostgreSQL and Nginx reverse proxy.

---

## Features

- **Role-based access**: Admins create/assign/edit/delete tasks and manage users. Employees request tasks, update their own status, and view assigned work.
- **Task dependencies**: Block tasks until prerequisites are completed.
- **Multi-assign**: Assign multiple employees to a single task.
- **Request workflow**: Employees request tasks, admins approve or reject.
- **Gruvbox UI**: Warm, solid retro theme with zero glassmorphism.
- **JWT auth**: Access tokens + HTTP-only refresh cookies with auto-refresh.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Bun, Express, Drizzle ORM, PostgreSQL, Zod |
| Frontend | Svelte 5 (runes), Vite, vanilla CSS |
| Infra | Docker, Nginx, docker-compose |

---

## Project Structure

```
teammgr/
├── backend/
│   ├── src/
│   │   ├── db/           # Drizzle schema & migrations
│   │   ├── middleware/   # auth, validation
│   │   ├── routes/       # API routers (auth, tasks, users)
│   │   ├── services/     # business logic
│   │   ├── utils/        # db_interface, jwt
│   │   └── index.ts      # entry point
│   ├── Dockerfile
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── pages/        # Svelte pages (Login, Dashboard, etc.)
│   │   ├── components/   # Navbar, TaskForm, SearchBox
│   │   ├── lib/          # api.ts, stores/auth.ts
│   │   ├── app.css       # single global Gruvbox stylesheet
│   │   └── main.ts
│   ├── public/           # favicon.svg, favicon.ico
│   ├── index.html
│   ├── Dockerfile
│   └── vite.config.ts
├── nginx/
│   └── nginx.conf
├── docker-compose.yml
└── README.md
```

---

## Quick Start

### 1. Clone & configure

```bash
git clone https://github.com/shamqmq/teammgr
cd teammgr
```

Create `backend/.env`:

```env
# Database
DATABASE_URL=postgresql://teammgr:teammgr@db:5432/teammgr

# JWT
JWT_ACCESS_SECRET=your-access-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here
ACCESS_EXP=15m
REFRESH_EXP=7d

# Server
PORT=3000
```

### 2. Start everything

```bash
docker-compose up --build
```

| Service | URL |
|---------|-----|
| Frontend (Vite dev) | http://localhost:5173 |
| API (via Nginx) | http://localhost/api |
| Nginx proxy | http://localhost |

### 3. Database setup (first run)

```bash
# Generate migrations
docker exec teammgr-api bunx drizzle-kit generate

# Run migrations
docker exec teammgr-api bunx drizzle-kit migrate
```

### 4. Create first admin

```bash
# Register via API or use the frontend
curl -X POST http://localhost/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@teammgr.com","password":"password123","role":"admin"}'
```

---

## Development

### Backend (hot reload)

```bash
docker-compose up app
# Or attach to container
docker exec -it teammgr-api bun run dev
```

### Frontend (hot reload)

```bash
docker-compose up frontend
# Vite dev server with HMR at localhost:5173
```

### Database

```bash
# Access psql
docker exec -it teammgr-db psql -U teammgr -d teammgr

# Run migrations
docker exec teammgr-api bunx drizzle-kit migrate
```

---

## API Endpoints

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | /api/auth/register | Public | Register user |
| POST | /api/auth/login | Public | Login, sets refresh cookie |
| POST | /api/auth/refresh | Public | New access token from cookie |
| POST | /api/auth/logout | Public | Clear refresh cookie |
| GET | /api/users | Admin | List users |
| GET | /api/users/me | Auth | Get own profile |
| PATCH | /api/users/me | Auth | Update profile |
| DELETE | /api/users/:id | Admin | Delete user |
| GET | /api/tasks | Auth | List tasks (role-filtered) |
| GET | /api/tasks/:id | Auth | Get single task |
| POST | /api/tasks | Auth | Create/request task |
| PATCH | /api/tasks/:id | Auth | Update task |
| DELETE | /api/tasks/:id | Admin | Delete task |
| POST | /api/tasks/:id/assign | Admin | Assign employees |
| DELETE | /api/tasks/:id/assign/:userId | Admin | Remove assignment |
| POST | /api/tasks/:id/dependencies | Admin | Add dependency |
| DELETE | /api/tasks/:id/dependencies/:depId | Admin | Remove dependency |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Yes | Secret for access tokens |
| `JWT_REFRESH_SECRET` | Yes | Secret for refresh tokens |
| `ACCESS_EXP` | No | Access token expiry (default: 15m) |
| `REFRESH_EXP` | No | Refresh token expiry (default: 7d) |
| `PORT` | No | API port (default: 3000) |

---

