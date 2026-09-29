import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

import { JWT_SECRET } from '../config/jwt.js';
import { prisma } from '../db.js';

interface JwtCustomPayload {
    id: string;
    role: Role;
}

// Расширяем тип Request Express, чтобы TS не ругался на req.user
declare global {
    namespace Express {
        interface Request {
            user?: JwtCustomPayload;
        }
    }
}

export const authenticateJwt = async (req: Request, res: Response, next: NextFunction) => {
    let token: string | undefined;

    // 1. Проверяем наличие токена в HttpOnly Cookie
    const cookieName = process.env.AUTH_COOKIE_NAME || 'token';
    if (req.cookies && req.cookies[cookieName]) {
        token = req.cookies[cookieName];
    } 
    // 2. Фолбэк: если куки нет, проверяем заголовок Authorization: Bearer <token>
    else if (req.headers.authorization?.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ error: 'Токен авторизации не предоставлен' });
    }

    try {
        const secret = JWT_SECRET;
        const decoded = jwt.verify(token, secret) as JwtCustomPayload;

        const user = await prisma.user.findUnique({ where: { id: decoded.id }, select: { id: true, role: true } });
        if (!user) return res.status(401).json({ error: 'Пользователь не найден' });
        req.user = user;
        next();
    } catch (err: any) {
    console.error('Ошибка верификации токена:', err.message);
    return res.status(401).json({ error: 'Недействительный или истекший токен' });
    }
};

export const requireRoles = (...allowedRoles: Role[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Пользователь не авторизован' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Доступ запрещен: недостаточно прав' });
        }

        next();
    };
};
