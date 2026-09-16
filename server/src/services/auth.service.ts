import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';

interface LoginParams {
    email: string;
    password: string;
}

export class AuthService {
    static async login({ email, password }: LoginParams) {
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            throw new Error('INVALID_CREDENTIALS');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new Error('INVALID_CREDENTIALS');
        }

        const secret = process.env.JWT_SECRET || 'secret-key-change-me';
        const token = jwt.sign(
            {
                userId: user.id,
                role: user.role,
            },
            secret,
            { expiresIn: '24h' }
        );

        return {
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
        };
    }
}