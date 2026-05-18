import { type Request } from "express";
import { getAllTasks, getAssignmentsForTask, getDependenciesForTask, getTasksByUser } from "../utils/db_interface"

export interface Task {
        id: string;
        title: string;
        description: string;
        status: 'requested' | 'todo' | 'in_progress' | 'done';
        priority: 'low' | 'medium' | 'high';
        assignedTo?: string[];
        dependsOn?: string[];
        created_at: Date;
        updated_at: Date;
        due_to: Date;
}

export interface QueryParams {
        page: number;
        limit: number;
        status?: string;
        assignedTo?: string;        // admin filter by employee ID
        sortBy?: string;
        sortDir?: 'asc' | 'desc';
}

export function applyQueryParams(allTasks: Task[], params: QueryParams) {
        let filtered = [...allTasks];

        // ---- filter by status ----
        if (params.status) {
                filtered = filtered.filter(task => task.status === params.status);
        }

        // ---- filter by assignedTo (admin only, but we apply if present) ----
        if (params.assignedTo) {
                // Assuming tasks have an array of assigned user IDs (task_assignees)
                filtered = filtered.filter(task =>
                        task.assignedTo?.includes(params.assignedTo!)
                );
        }

        // ---- sort ----
        const sortField = params.sortBy || 'created_at';
        const sortDir = params.sortDir === 'desc' ? -1 : 1;

        filtered.sort((a, b) => {
                let valA: any = a[sortField as keyof Task];
                let valB: any = b[sortField as keyof Task];
                // Convert dates to timestamps if needed
                if (sortField === 'created_at' || sortField === 'updated_at') {
                        valA = new Date(valA).getTime();
                        valB = new Date(valB).getTime();
                }
                return (valA > valB ? 1 : valA < valB ? -1 : 0) * sortDir;
        });

        // ---- paginate ----
        const total = filtered.length;
        const totalPages = Math.ceil(total / params.limit);
        const start = (params.page - 1) * params.limit;
        const paginated = filtered.slice(start, start + params.limit);

        return {
                tasks: paginated,
                meta: {
                        page: params.page,
                        limit: params.limit,
                        total,
                        totalPages,
                },
        };
}


export function parseQueryParams(req: Request): QueryParams {
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
        return {
                page: page > 0 ? page : 1,
                limit: limit > 0 ? limit : 10,
                status: req.query.status as string | undefined,
                assignedTo: req.query.assignedTo as string | undefined,
                sortBy: req.query.sortBy as string | undefined,
                sortDir: (req.query.sortDir as string) === 'asc' ? 'asc' : 'desc',
        };
}

export async function getFullTasks(user: {sub: string, role: 'admin' | 'employee',}): Promise<Task[]> {
        // Role-based data fetching
        let allTasks: Task[];
        if (user.role === "admin") {
                allTasks = await getAllTasks();
        } else if (user.role === "employee") {
                allTasks = await getTasksByUser(user.sub);
        } else {
                throw new Error("Forbidden");
        }

        // Enrich each task with assignments AND dependencies in parallel
        await Promise.all(
                allTasks.map(async (task) => {
                        const [assignments, dependencies] = await Promise.all([
                                getAssignmentsForTask(task.id),
                                getDependenciesForTask(task.id),
                        ]);
                        task.assignedTo = assignments.map((a) => a.employee_id);
                        task.dependsOn = dependencies.map((d) => d.required_task_id);
                })
        );
        return allTasks;
}
