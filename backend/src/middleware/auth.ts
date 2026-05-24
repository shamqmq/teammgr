import { type Request, type Response, type NextFunction } from 'express';
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from "../utils/jwt";


export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let accessToken: string | undefined;
  if (authHeader?.startsWith('Bearer ')) {
    accessToken = authHeader.split(' ')[1];
  }

  // If access token is present and valid, use it
  if (accessToken) {
    const decoded = verifyAccessToken(accessToken);
    if (decoded) {
      res.locals.user = decoded;   // { sub, role }
      return next();
    }
    // Access token invalid/expired → fall through to try refresh
  }

  // No valid access token → try refresh token from cookie
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = verifyRefreshToken(refreshToken) as { sub: string; role: string };
    if (!decoded) {
      throw new Error('Invalid refresh token');
    }

    // Mint fresh tokens
    const newAccessToken = signAccessToken({ sub: decoded.sub, role: decoded.role });
    const newRefreshToken = signRefreshToken({ sub: decoded.sub, role: decoded.role });

    // Update refresh cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    // Expose new access token
    res.setHeader('X-New-Access-Token', newAccessToken);

    // Attach user and continue
    res.locals.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
}

export function adminOnly(_req: Request, res: Response, next: NextFunction) {
        const user = res.locals.user;
        if (!user) {
                return res.status(401).json({ error: 'Authentication required' });
        }

        if (user.role === 'admin') {
                next();
        }
        return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
};
