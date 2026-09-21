import { prisma } from '../db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/jwt.js';

export interface LoginParams {
    email: string;
    password: string;
}

export async function login({ email, password }: LoginParams) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        throw new Error('INVALID_CREDENTIALS');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
        throw new Error('INVALID_CREDENTIALS');
    }

    const token = jwt.sign(
        { id: user.id, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
    );

    const { password: _, ...safeUser } = user;
    return { user: safeUser, token };
}

export async function getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        },
    });

    if (!user) {
        throw new Error('USER_NOT_FOUND');
    }

    return user;
}