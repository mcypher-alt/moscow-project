import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

interface JwtPayload {
  userId: string;
  role: Role;
}

// 1. Проверка валидности Bearer-токена
export const authenticateJwt = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Токен авторизации не предоставлен' });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Неверный формат токена' });
    }

    try {
        const secret = process.env.JWT_SECRET || 'secret-key-change-me';
        
        const decoded = jwt.verify(token, secret) as unknown as {
            id: string;
            role: Role;
        };

        req.user = decoded;
        next();
    } catch {
        return res.status(401).json({ error: 'Недействительный токен' });
    }
    };

// 2. Проверка прав по ролям из enum Role (DISPATCHER, ANALYST, ADMIN)
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