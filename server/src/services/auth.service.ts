import { prisma } from '../db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/jwt.js';
import { Client } from 'ldapts';

export interface LoginParams {
    email: string;
    password: string;
}

export async function login({ email, password }: LoginParams) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        throw new Error('INVALID_CREDENTIALS');
    }

    let isValidPassword = false;
    if (process.env.LDAP_URL) {
        // Bind-only corporate authentication; authorization stays in the local approved registry.
        if (!process.env.LDAP_URL.startsWith('ldaps://')) throw new Error('LDAPS_REQUIRED');
        const client = new Client({ url: process.env.LDAP_URL, timeout: 10000,
            connectTimeout: 10000, tlsOptions: { minVersion: 'TLSv1.2' } });
        try { await client.bind(email, password); isValidPassword = true; }
        catch { throw new Error('INVALID_CREDENTIALS'); }
        finally { await client.unbind().catch(() => {}); }
    } else {
        isValidPassword = await bcrypt.compare(password, user.password);
    }
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
