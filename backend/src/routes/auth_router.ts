import express, { type Request, type Response } from "express"
import { registerSchema, loginSchema, validate } from "../middleware/validation"
import { loginUser, registerUser } from '../services/auth';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";

//| Method | Path           | Access | Description                                     |
//|--------|----------------|--------|-------------------------------------------------|
//| POST   | /auth/register | Public | Register new user (optional admin flag)         |
//| POST   | /auth/login    | Public | Returns access + refresh tokens                 |
//| POST   | /auth/refresh  | Public | Accepts refresh token, returns new access token |

const router = express.Router();

router.post("/register", validate(registerSchema), async (req: Request, res: Response) => {
        try {
                const newUser = await registerUser(req.body);
                res.status(201).json({
                        success: true,
                        data: newUser,

                });
        } catch (error: any) {
                if (error.message === 'Email already registered') {
                        res.status(409).json({ success: false, message: error.message });
                } else {
                        console.error('Register error:', error);
                        res.status(500).json({ success: false, message: 'Internal server error' });
                }
        }
});

router.post("/login", validate(loginSchema), async (req: Request, res: Response) => {
        try {
                const { accessToken, refreshToken, user } = await loginUser(req.body);
                // Set refresh token as cookie
                res.cookie('refreshToken', refreshToken, {
                        httpOnly: true,          // not accessible via JavaScript
                        // secure: process.env.NODE_ENV === 'production',  // send only over HTTPS in prod
                        sameSite: 'lax',
                        maxAge: 7 * 24 * 60 * 60 * 1000,   // 7 days (match the token expiry)
                        path: '/',
                });

                // Return access token in the body (for the client to use immediately)
                res.status(200).json({
                        success: true,
                        data: {
                                accessToken,
                                user: { id: user.id, email: user.email, role: user.role },
                        },
                });
        } catch (error: any) {
                // Service throws 'Invalid email or password' for bad credentials
                if (error.message === 'Invalid password' || 'User is not in db or invalid email') {
                        res.status(401).json({ success: false, message: error.message });
                } else {
                        // Unexpected errors (DB down, config missing)
                        console.error('Login error:', error);
                        res.status(500).json({ success: false, message: 'Internal server error' });
                }
        }
})

router.post('/refresh', async (req: Request, res: Response) => {
        const refreshToken = req.cookies?.refreshToken;
        if (!refreshToken) {
                return res.status(400).json({ success: false, message: 'Refresh token not found in cookie' });
        }
        try {
                // Verify and GUARD against null

                const decoded = verifyRefreshToken(refreshToken) as {
                        sub: string;
                        role: 'admin' | 'employee';
                };

                // Now it's safe to use decoded.sub etc.
                const newAccessToken = signAccessToken({ sub: decoded.sub, role: decoded.role });
                const newRefreshToken = signRefreshToken({ sub: decoded.sub, role: decoded.role });

                // Rotate the refresh token – set the *new* one in the cookie
                res.cookie('refreshToken', newRefreshToken, {
                        httpOnly: true,
                        // secure: process.env.NODE_ENV === 'production',
                        sameSite: 'strict',
                        maxAge: 7 * 24 * 60 * 60 * 1000,
                        path: '/',
                });

                res.status(200).json({
                        success: true,
                        data: {
                                accessToken: newAccessToken,
                                refreshToken: newRefreshToken,   // also return in body if client wants to use it
                        },
                });

        } catch (err) {

                // Token invalid or expired – clear the cookie and fail gracefully
                res.clearCookie('refreshToken', { path: '/' });
                return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
        }
});
export default router;
