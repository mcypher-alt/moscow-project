import { Router, Request, Response } from 'express';
import { login, getCurrentUser } from '../services/auth.service.js';
import { authenticateJwt } from '../middlewares/auth.js';

const router = Router();

const COOKIE_NAME = 'token';
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 дней
};

router.post('/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password || email.length > 254 || password.length > 1024) {
        return res.status(400).json({ error: 'Заполните email и пароль' });
    }

    try {
        const { user, token } = await login({ email, password });

        req.user = { id: user.id, role: user.role };
        res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
        return res.json({ user });
    } catch (error: any) {
        if (error.message === 'INVALID_CREDENTIALS') {
            return res.status(401).json({ error: 'Неверные учетные данные' });
        }
        return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

router.post('/logout', authenticateJwt, (_req: Request, res: Response) => {
    res.clearCookie(COOKIE_NAME, {
        httpOnly: true,
        sameSite: 'lax',
    });
    return res.json({ success: true });
});

router.get('/me', authenticateJwt, async (req: Request, res: Response) => {
    try {
        const user = await getCurrentUser(req.user!.id);
        return res.json(user);
    } catch (error: any) {
        if (error.message === 'USER_NOT_FOUND') {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        return res.status(500).json({ error: 'Ошибка получения профиля' });
    }
});

export default router;
