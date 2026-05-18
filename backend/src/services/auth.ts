import { signAccessToken, signRefreshToken } from '../utils/jwt';
import { getUserByEmail, insertUser } from "../utils/db_interface";
import { compare, hash } from "bcryptjs";

interface RegisterInput {
        name: string;
        email: string;
        password: string;
        role?: 'admin' | 'employee';
}



export async function loginUser(data: { email: string; password: string }) {
        const user = await getUserByEmail(data.email);
        if (!user) throw new Error('User is not in db or invalid email');

        const valid = await compare(data.password, user.password_hash);
        if (!valid) throw new Error('Invalid password');

        const payload = { sub: user.id, role: user.role };   // minimal payload
        const accessToken = signAccessToken(payload);
        const refreshToken = signRefreshToken(payload);

        const { password_hash, ...userWithoutHash } = user;
        return { accessToken, refreshToken, user: userWithoutHash };
};

export async function registerUser(input: RegisterInput) {
        const { name, email, password, role } = input;

        // Check if email already taken
        const existing = await getUserByEmail(email);
        if (existing) {
                throw new Error('Email already registered');
        }

        // Hash the password (await it!) so it won't be a promise instead of hashed thing
        const password_hash = await hash(password, 10);
  
        // Insert the user
        const newUser = await insertUser({
                name,
                email,
                password_hash,
                role: role || 'employee',
        });

        // Remove password_hash before returning
        const { password_hash: _, ...userWithoutHash } = newUser;
        return userWithoutHash;
}
