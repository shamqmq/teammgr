import jwt from 'jsonwebtoken';
import {ACCESS_EXP, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, REFRESH_EXP} from '../consts';


export function signAccessToken(payload: object) {
  return jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: ACCESS_EXP });
}

export function signRefreshToken(payload: object) {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_EXP});
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, JWT_ACCESS_SECRET);
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, JWT_REFRESH_SECRET);
}
