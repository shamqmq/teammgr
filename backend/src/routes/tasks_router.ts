import express, { type Request, type Response } from "express";
import { adminOnly, authenticate } from "../middleware/auth";
import { applyQueryParams, parseQueryParams, getFullTasks, type Task } from "../services/tasks";
import { validate, createTaskSchema, updateTaskSchema } from "../middleware/validation"
import {
        addDependency,
        assignUserToTask,
        deleteTask,
        getAllUsers,
        getAssignmentsForTask,
        getDependenciesForTask,
        getTaskById,
        getUserById,
        insertTask,
        removeAssignment,
        removeDependency,
        updateTask
} from "../utils/db_interface";

// ### 3. Tasks
// | Method | Path                           | Access   | Description                                                                                                           |
// |--------|--------------------------------|----------|-----------------------------------------------------------------------------------------------------------------------|
// | GET    | /tasks                         | Auth     | Admins see all; employees see own + dependency tasks. Supports `?page`, `?limit`, `?status`, `?assignedTo`, `?sortBy` |
// | GET    | /tasks/:id                     | Auth     | Get single task (visibility rules apply)                                                                              |
// | POST   | /tasks                         | Auth     | Create a task or a request for regular user                                                                           |
// | PATCH  | /tasks/:id                     | Auth     | Admin: edit any field; Employee: only update status (with business rules)                                             |
// | DELETE | /tasks/:id                     | Admin    | Delete a task (cascade assignments/dependence)                                                                        |

// | POST   | /tasks/:id/assign              | Admin    | Assign employees to a task (body: { userIds: string[] })                                                              |
// | DELETE | /tasks/:id/assign/userId       | Admin    | Remove assignment                                                                                                     |

// | GET    | /tasks/:id/dependencies        | Auth     | List all dependencies                                                                                                 |
// | POST   | /tasks/:id/dependencies        | Admin    | Add dependency                                                                                                        |
// | DELETE | /tasks/:id/dependencies/:depId | Admin    | Removes dependency                                                                                                    |


const STATUS_ORDER = ['requested', 'todo', 'in_progress', 'done'] as const;



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

router.post("/", authenticate, validate(createTaskSchema), async (req: Request, res: Response) => {
        let task = req.body;
        let user = res.locals.user;
        if (task.status == 'requested' && user.role == "admin") {
                return res.status(400).json({ success: false, error: "admin should not request tasks" });
        } else if (task.status != 'requested' && user.role == "employee") {
                return res.status(400).json({ success: false, error: "employees should only post request tasks" });
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
        const taskId = req.params.id as string;
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
                const fullTasks = await getFullTasks(user);
                const targetTask = fullTasks.find(t => t.id === taskId);
                if (!targetTask) {
                        return res.status(404).json({ success: false, error: 'Task not found or forbidden.' });
                }

                // 3c. Only directly assigned tasks can be updated
                if (!targetTask.assignedTo?.includes(user.sub)) {
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
                        const allDone = targetTask.dependsOn?.every(depId => {
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

router.delete("/:id", authenticate, adminOnly, async (req: Request, res: Response) => {

        const taskId = req.params.id as string;
        const existing = await getTaskById(taskId);   // you may have this helper; if not, skip
        if (!existing) {
                return res.status(404).json({ success: false, error: 'Task not found' });
        }

        // Delete the task itself
        await deleteTask(taskId);

        return res.status(200).json({
                success: true,
                data: { message: 'Task deleted successfully', deletedTaskId: taskId },
        });
});


// =================================== tasks assigenment ================================= //

// | POST   | /tasks/:id/assign              | Admin    | Assign employees to a task (body: { userIds: string[] })                                                              |
// | DELETE | /tasks/:id/assign/userId       | Admin    | Remove assignment                                                                                                     |


router.post("/:id/assign", authenticate, adminOnly, async (req: Request, res: Response) => {
        try {
                const taskId = req.params.id as string;
                const userIds: string[] = req.body.userIDs;  // expecting array of UUIDs

                // 1. Validate input
                if (!Array.isArray(userIds) || userIds.length === 0) {
                        return res.status(400).json({
                                success: false,
                                error: 'userIds must be a non-empty array of user IDs',
                        });
                }

                // 2. Check if the task exists
                const task = await getTaskById(taskId);
                if (!task) {
                        return res.status(404).json({ success: false, error: 'Task not found' });
                }

                // 3. Verify that all provided user IDs correspond to actual employees
                const employees = await getAllUsers();

                // Not all IDs could be employees? Return which ones are bad.
                const foundIds = employees
                        .filter(user => user.role === "employee")
                        .map(user => user.id);

                const invalidIds = userIds.filter(id => !foundIds.includes(id));
                if (invalidIds.length > 0) {
                        return res.status(400).json({
                                success: false,
                                error: 'Some user IDs are not valid employees',
                                invalidIds,
                        });
                }

                // 4. Fetch existing assignments for the task (to avoid duplicates)
                const existingAssignments = await getAssignmentsForTask(taskId);
                const alreadyAssignedIds = existingAssignments.map(a => a.employee_id);
                const newIds = userIds.filter(id => !alreadyAssignedIds.includes(id));

                if (newIds.length === 0) {
                        return res.status(200).json({
                                success: true,
                                message: 'All users are already assigned to this task',
                        });
                }

                // 5. Assign new employees 
                for (let i = 0; i < newIds.length; i++) {
                        const record = await assignUserToTask(taskId, newIds[i] as string);
                        if (!record) return res.status(500).json({ success: false, error: 'Internal server error' });
                }

                return res.status(200).json({
                        success: true,
                        data: {
                                taskId,
                                newlyAssigned: newIds,
                                alreadyAssigned: alreadyAssignedIds,
                        },
                });

        } catch (err) {
                return res.status(500);
        };
});

router.delete("/:id/assign/:userId", authenticate, adminOnly, async (req: Request, res: Response) => {

        try {
                const taskId = req.params.id as string;
                const employeeId = req.params.userId as string;

                // 1. Verify the task exists
                const task = await getTaskById(taskId);
                if (!task) {
                        return res.status(404).json({ success: false, error: 'Task not found' });
                }

                // 2. Check if the assignment exists
                const existingAssignments = await getAssignmentsForTask(taskId);
                const assignment = existingAssignments.find(a => a.employee_id === employeeId);
                if (!assignment) {
                        return res.status(404).json({
                                success: false,
                                error: 'User is not assigned to this task',
                        });
                }

                // 3. Remove the assignment
                await removeAssignment(taskId, employeeId);  // you already have this helper

                return res.status(200).json({
                        success: true,
                        data: { message: 'Assignment removed', taskId, employeeId },
                });
        } catch (error) {
                return res.status(500);
        }

});


// =================================== tasks dependencies ================================= //

// | GET    | /tasks/:id/dependencies        | Auth     | List all dependencies                                                                                                 |
// | POST   | /tasks/:id/dependencies        | Admin    | Add dependency                                                                                                        |
// | DELETE | /tasks/:id/dependencies/:depId | Admin    | Removes dependency                                                                                                    |

router.get('/:id/dependencies', authenticate, async (req: Request, res: Response) => {
        try {
                const taskId = req.params.id as string;
                const user = res.locals.user;
                // Verify the task exists
                let userTasks = await getFullTasks(user);
                const task = userTasks.find(t => t.id == taskId);
                if (!task) {
                        return res.status(404).json({ success: false, error: 'Task not found' });
                }

                // (Optional) Check that the user has access to this task.
                // For now, we allow any authenticated user to see dependencies.

                const dependencies = await getDependenciesForTask(taskId);
                // dependencies is an array of { id, required_task_id, dependent_task_id, created_at }

                return res.status(200).json({ success: true, data: dependencies });
        } catch (error) {
                return res.status(500);
        }
}
);


router.post('/:id/dependencies', authenticate, adminOnly, async (req: Request, res: Response) => {

        try {
                const taskId = req.params.id as string;               // the dependent task
                const { requiredTaskId } = req.body;                  // the blocker task

                // 1. Validate input
                if (!requiredTaskId || typeof requiredTaskId !== 'string') {
                        return res.status(400).json({
                                success: false,
                                error: 'requiredTaskId (UUID) is required',
                        });
                }

                // 2. Prevent self-dependency
                if (taskId === requiredTaskId) {
                        return res.status(400).json({
                                success: false,
                                error: 'A task cannot depend on itself',
                        });
                }

                // 3. Both tasks must exist
                const [task, requiredTask] = await Promise.all([
                        getTaskById(taskId),
                        getTaskById(requiredTaskId),
                ]);

                if (!task) {
                        return res.status(404).json({ success: false, error: 'Task not found' });
                }
                if (!requiredTask) {
                        return res.status(404).json({
                                success: false,
                                error: 'Required task not found',
                        });
                }

                // 4. Check for duplicate
                const existing = await getDependenciesForTask(taskId);
                const duplicate = existing.find(
                        (d) => d.required_task_id === requiredTaskId
                );
                if (duplicate) {
                        return res.status(409).json({
                                success: false,
                                error: 'This dependency already exists',
                        });
                }

                // 5. Detect circular dependency (quick check)
                // If requiredTaskId already depends on taskId, adding this would create a cycle.
                const reverseDependencies = await getDependenciesForTask(requiredTaskId);
                const wouldCycle = reverseDependencies.some(
                        (d) => d.required_task_id === taskId
                );
                if (wouldCycle) {
                        return res.status(400).json({
                                success: false,
                                error: 'Adding this dependency would create a circular chain',
                        });
                }

                // 6. Create the dependency
                const record = await addDependency(taskId, requiredTaskId);
                return res.status(201).json({ success: true, data: record });
        } catch (error) {
                return res.status(500);
        }
});

router.delete('/:id/dependencies/:depId', authenticate, adminOnly, async (req: Request, res: Response) => {
        try {
                const taskId = req.params.id as string;
                const requiredTaskId = req.params.depId as string;

                // 1. Verify both tasks exist (optional, but good for error messages)
                const [task, requiredTask] = await Promise.all([
                        getTaskById(taskId),
                        getTaskById(requiredTaskId),
                ]);

                if (!task) {
                        return res.status(404).json({ success: false, error: 'Task not found' });
                }
                // If requiredTask doesn't exist, the dependency is already broken; still delete the link.

                // 2. Check if the dependency exists
                const dependencies = await getDependenciesForTask(taskId);
                const dep = dependencies.find(
                        (d) => d.required_task_id === requiredTaskId
                );
                if (!dep) {
                        return res.status(404).json({
                                success: false,
                                error: 'Dependency not found',
                        });
                }

                // 3. Remove the dependency
                await removeDependency(dep.id);

                return res.status(200).json({
                        success: true,
                        data: { message: 'Dependency removed' },
                });
        } catch (error) {
                return res.status(500);
        }
}
);

export default router;
