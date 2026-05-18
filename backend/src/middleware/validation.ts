import { z } from 'zod';
import { type Request, type Response, type NextFunction } from 'express';

export const registerSchema = z.object({
        name: z.string().min(1, 'Name is required').max(100),
        email: z.string().email('Invalid email address'),
        password: z.string().min(6, 'Password must be at least 6 characters').max(128),
        role: z.enum(['admin', 'employee']).optional(),
});

export const loginSchema = z.object({
        email: z.string().email('Invalid email address'),
        password: z.string().min(6, 'Password is required'),
})

export const updateUserSchema = z.object({
        name: z.string().min(1).max(100).optional(),
        email: z.string().email().optional(),
        password: z.string().min(6).max(128).optional(),
        role: z.enum(['admin', 'employee']).optional(),
});

export function validate(schema: z.ZodTypeAny) {
        return (req: Request, res: Response, next: NextFunction) => {
                const result = schema.safeParse(req.body);
                if (!result.success) {
                        const errors: Record<string, string[]> = {};
                        for (const issue of result.error.issues) {
                                const path = issue.path.join('.');
                                if (!errors[path]) errors[path] = [];
                                errors[path].push(issue.message);
                        }
                        res.status(400).json({
                                success: false,
                                message: 'Validation failed',
                                errors,
                        });
                        return;
                }
                req.body = result.data;
                next();
        };
}

export function isValidUUID(uuid: string): boolean {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
}
// Base schema for shared fields
const taskBase = {
        title: z
                .string()
                .trim()
                .min(3, 'Title must be at least 3 characters')
                .max(100, 'Title cannot exceed 100 characters'),
        description: z
                .string()
                .trim()
                .min(10, 'Description must be at least 10 characters')
                .max(2000, 'Description too long'),
        status: z.enum(['requested', 'todo', 'in_progress', 'done']),
        priority: z.enum(['low', 'medium', 'high']),
        due_to: z
                .string()
                .datetime({ message: 'Invalid ISO date string' })
                .or(z.date())
                .transform((val) => (val instanceof Date ? val : new Date(val)))
};

// Schema for creating a task (all required)
export const createTaskSchema = z.object({
        title: taskBase.title,
        description: taskBase.description,
        priority: taskBase.priority,
        status: taskBase.status,
        due_to: taskBase.due_to,
});

// Schema for updating a task (all fields optional, but at least one required)
export const updateTaskSchema = z.object({
        title: taskBase.title.optional(),
        description: taskBase.description.optional(),
        status: taskBase.status.optional(),
        priority: taskBase.priority.optional(),
        due_to: taskBase.due_to.optional(),
}).refine(data => Object.keys(data).length > 0, {
        message: 'At least one field must be provided for update',
});

// Type inference for TypeScript usage
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
