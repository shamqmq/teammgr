import express, { type Request, type Response } from "express";
import { adminOnly, authenticate } from "../middleware/auth";
import { applyQueryParams, parseQueryParams, getFullTasks, type Task } from "../services/tasks";
import { validate, createTaskSchema, updateTaskSchema } from "../middleware/validation"
import { getTasksByUser, getUserById, insertTask, updateTask } from "../utils/db_interface";

// ### 3. Tasks
// | Method | Path                           | Access   | Description                                                                                                           |
// |--------|--------------------------------|----------|-----------------------------------------------------------------------------------------------------------------------|
// | GET    | /tasks                         | Auth     | Admins see all; employees see own + dependency tasks. Supports `?page`, `?limit`, `?status`, `?assignedTo`, `?sortBy` |
// | GET    | /tasks/:id                     | Auth     | Get single task (visibility rules apply)                                                                              |
// | POST   | /tasks                         | Admin    | Create a task                                                                                                         |
// | PATCH  | /tasks/:id                     | Auth     | Admin: edit any field; Employee: only update status (with business rules)                                             |
// | DELETE | /tasks/:id                     | Admin    | Delete a task (cascade assignments/requests)                                                                          |
// | POST   | /tasks/:id/assign              | Admin    | Assign employees to a task (body: { userIds: string[] })                                                              |
// | DELETE | /tasks/:id/assign              | Admin    | Remove assignment (body: {userIDs: [])                                                                                |
// | POST   | /tasks/requests                | Employee | Request a task to the Admin                                                                                           |
// | GET    | /tasks/requests                | Admin    | View pending task requests                                                                                            |
// | PATCH  | /tasks/requests/:requestId     | Admin    | Approve or reject a request                                                                                           |
// | GET    | /tasks/:id/dependencies        | Auth     | List all dependencies                                                                                                 |
// | POST   | /tasks/:id/dependencies        | Admin    | Add dependency                                                                                                        |
// | DELETE | /tasks/:id/dependencies/:depId | Admin    | Removes dependency                                                                                                    |

// export interface Task {
//   id: string;
//   title: string;
//   description: string;
//   status: 'requested' | 'todo' | 'in_progress' | 'done';
//   priority: 'low' | 'medium' | 'high';
//   assignedTo?: string[];
//   dependsOn?: string[];
//   created_at:  Date;
//   updated_at:  Date;
//   due_to: Date;
// }


// const statusArr = ['requested', 'todo', 'in_progress', 'done'];
const STATUS_ORDER = ['todo', 'in_progress', 'done'] as const;



const router = express.Router();

router.get("/", authenticate, async (req: Request, res: Response) => {
        const user = res.locals.user;
        const query = parseQueryParams(req);
        let allTasks: Task[];
        try {
                allTasks = await getFullTasks(user)
                const { tasks, meta } = applyQueryParams(allTasks, query);

                res.status(200).json({
                        success: true,
                        data: tasks,
                        meta,
                });
        } catch (err) {
                if (err == "Forbidden")
                        return res.status(403).json({ success: false, error: "Forbidden" });
        }
        // Apply filters, sorting, pagination
});


router.get("/:id", authenticate, async (req: Request, res: Response) => {

        const user = res.locals.user;
        const taskId = req.params.id;
        try {
                const tasks = await getFullTasks(user);
                var task = tasks.find(t => (t.id == taskId));
        } catch (err) {
                if (err == "Forbidden") return res.status(403).json({ success: false, error: "Forbidden" });
                return res.status(500).json({ success: false, error: "Internal Server Error" });
        }
        res.status(200).json({
                success: true,
                data: task,
        });

});

router.post("/", authenticate, adminOnly, validate(createTaskSchema), async (req: Request, res: Response) => {
        let task = req.body;
        if (task.status == 'requested') {
                res.status(404).json({ success: false, error: "admin should not request tasks" });
                return;
        }
        let requester = await getUserById(task.created_by);
        if (!requester) {
                task.created_by = res.locals.user.sub;
        }
        const data = await insertTask(task);
        if (!data) return res.status(500).json({ success: false, erorr: "Fallen Data Base" });

        return res.status(201).json({ success: true, task: data });
});

router.patch('/:id', authenticate, validate(updateTaskSchema), async (req: Request, res: Response) => {
      const taskId = req.params.id;
      const user = res.locals.user;
      const updates = req.body;

      // 1. Nobody can set status to "requested"
      if (updates.status === 'requested') {
        return res.status(400).json({
          success: false,
          error: 'Cannot set status to "requested".',
        });
      }

      // 2. Admin logic – full power
      if (user.role === 'admin') {
        const updated = await updateTask(taskId, updates);
        if (!updated) {
          return res.status(404).json({ success: false, error: 'Task not found.' });
        }
        return res.status(200).json({ success: true, task: updated });
      }

      // 3. Employee logic
      if (user.role === 'employee') {
        // 3a. Employees can ONLY update the status field
        const allowedFields = Object.keys(updates).filter(k => k !== 'status');
        if (allowedFields.length > 0) {
          return res.status(403).json({
            success: false,
            error: 'Employees can only update the task status.',
          });
        }
        if (!updates.status) {
          return res.status(400).json({
            success: false,
            error: 'Status is required for update.',
          });
        }

        // 3b. Fetch the employee's full visible world (assigned + dependencies)
        const fullTasks = await getFullTasks({ sub: user.sub, role: user.role });
        const targetTask = fullTasks.find(t => t.id === taskId);
        if (!targetTask) {
          return res.status(404).json({ success: false, error: 'Task not found or forbidden.' });
        }

        // 3c. Only directly assigned tasks can be updated
        if (!targetTask.assignedTo.includes(user.sub)) {
          return res.status(403).json({
            success: false,
            error: 'You can only update tasks directly assigned to you.',
          });
        }

        // 3d. Linear forward progression only
        const oldIndex = STATUS_ORDER.indexOf(targetTask.status);
        const newIndex = STATUS_ORDER.indexOf(updates.status);
        if (newIndex === -1 || oldIndex === -1) {
          return res.status(400).json({ success: false, error: 'Invalid status value.' });
        }
        if (newIndex !== oldIndex + 1) {
          return res.status(400).json({
            success: false,
            error: 'Status can only move forward one step (todo → in_progress → done).',
          });
        }

        // 3e. Dependency rule – only when moving to in_progress
        if (updates.status === 'in_progress') {
          // All dependency tasks must be done
          const allDone = targetTask.dependsOn.every(depId => {
            const depTask = fullTasks.find(t => t.id === depId);
            return depTask && depTask.status === 'done';
          });
          if (!allDone) {
            return res.status(400).json({
              success: false,
              error: 'All dependency tasks must be completed before starting this one.',
            });
          }
        }

        // 3f. Perform the update
        const updated = await updateTask(taskId, { status: updates.status });
        if (!updated) {
          return res.status(500).json({ success: false, error: 'Database update failed.' });
        }
        return res.status(200).json({ success: true, task: updated });
      }

      // 4. Unknown role
      return res.status(403).json({ success: false, error: 'Forbidden' });
  }
);

export default router;
