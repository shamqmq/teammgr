import express, { type Request, type Response } from "express"
import { registerSchema, loginSchema, validate } from "../middleware/validation"
import { insertUser, getUserByEmail } from '../utils/db_interface';
import { hash, compare } from 'bcryptjs';

//| Method | Path           | Access | Description                                     |
//|--------|----------------|--------|-------------------------------------------------|
//| POST   | /auth/register | Public | Register new user (optional admin flag)         |
//| POST   | /auth/login    | Public | Returns access + refresh tokens                 |
//| POST   | /auth/refresh  | Public | Accepts refresh token, returns new access token |
//| POST   | /auth/logout   | Auth   | Invalidate refresh token                        |

const auth_router = express.Router();

auth_router.post("/auth/register", validate(registerSchema), async (req: Request, res: Response) => {

        try {
                const { name, email, password, role } = req.body;

                // checking if email already taken
                const existing = await getUserByEmail(email);
                if (existing) {
                        res.status(409).json({
                                success: false,
                                message: 'Email already registered',
                        });
                        return;
                }

                // Hash the password
                const password_hash = await hash(password, 10);

                // Insert the new user
                const newUser: any = await insertUser({
                        name,
                        email,
                        password_hash,
                        role: role || 'employee',      // defaults to employee if not provided
                });

                // Remove sensitive field before responding
                const { password_hash: _, ...userWithoutHash } = newUser;
                res.status(201).json({ success: true, data: userWithoutHash });
        } catch (error: any) {
                res.status(500).json({ success: false, message: 'Server error, please try again' });
        }
}
)

auth_router.post("/auth/login", validate(loginSchema), async (req: Request, res: Response) => {
        try {
                const { email, password } = req.body;

                // Find user
                const user = await getUserByEmail(email);
                if (!user) {
                        res.status(401).json({ success: false, message: 'Invalid email or password' });
                        return;
                }

                // Compare password
                const valid = await compare(password, user.password_hash);
                if (!valid) {
                        res.status(401).json({ success: false, message: 'Invalid email or password' });
                        return;
                }

                // return user data (JWT will be added later)
                const { password_hash: _, ...userWithoutHash } = user;
                res.json({
                        success: true,
                        data: {
                                user: userWithoutHash,
                                // TODO: JWT access/refresh tokens will be implemented later
                                accessToken: null,   // placeholder
                                refreshToken: null,
                        },
                });
        } catch (error: any) {
                res.status(500).json({ success: false, message: 'Server error, please try again' });
        }
})

// TODO: after JWT and auth thing

auth_router.post("/auth/refresh", (req: Request, res: Response) => {
        var user = req.body;
        res.status(200).json({ usr: user, msg: "implement the refresh" });
})

auth_router.post("/auth/logout", (req: Request, res: Response) => {
        var user = req.body;
        res.status(200).json({ usr: user, msg: "implement the logout" });
})

export default auth_router;
