import { type Request, type Response, type NextFunction } from 'express';
import { verifyAccessToken, verifyRefreshToken } from "../utils/jwt";


export function authenticate(req: Request, res: Response, next: NextFunction) {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
                return res.status(401).json({ error: 'Access token required' });
        }

        const token = authHeader.split(' ')[1];
        try {
                let decoded = verifyAccessToken(token);
                if (!decoded) {
                        decoded = verifyRefreshToken(req.body.refreshToken)
                  if(!decoded){
                        throw new Error("token expired");
                  }
                }
                res.locals.user = decoded;   // { sub: userId, role: 'admin'|'employee' }

                next();
        } catch (err) {
                return res.status(401).json({ error: 'Invalid or expired token' });
        }
}

export function adminOnly(_req: Request, res: Response, next: NextFunction) {
        const user = res.locals.user;
        if (!user) {
                return res.status(401).json({ error: 'Authentication required' });
        }

        if (user.role === 'admin') {
                return next();
        }
        return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
};
