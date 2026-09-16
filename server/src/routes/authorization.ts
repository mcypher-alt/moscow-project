import { Router, Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';

const router = Router();

router.post('/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Заполните email и пароль' });
    }

    try {
        const result = await AuthService.login({ email, password });
        return res.json(result);
    } catch (error: any) {
        if (error.message === 'INVALID_CREDENTIALS') {
            return res.status(401).json({ error: 'Неверные учетные данные' });
        }
        return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

export default router;