import express, { type Request, type Response } from "express";
import { adminOnly, authenticate } from "../middleware/auth";
import { applyQueryParams, parseQueryParams, getFullTasks, type Task } from "../services/tasks";
import {validate, createTaskSchema, updateTaskSchema} from "../middleware/validation"
import { getUserById, insertTask } from "../utils/db_interface";

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
// | POST   | /tasks/request                 | Employee | Request a task to the Admin                                                                                           |
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
  let task  = req.body;
  if (task.status == 'requested'){
    res.status(404).json({success: false, error: "admin should not request tasks"});
  }
  let requester = await getUserById(task.created_by); 
  if (!requester){
    task.created_by = res.locals.user.sub; 
  }
  const data = await insertTask(task);
  if (!data) res.status(500).json({success: false, erorr: "Fallen Data Base"});
  res.status(201).json({success: true, task: data});
});

export default router;
