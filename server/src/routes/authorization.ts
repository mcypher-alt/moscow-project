import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';

const router = Router();

router.post('/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Заполните email и пароль' });
    }

    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        return res.status(401).json({ error: 'Неверные учетные данные' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        return res.status(401).json({ error: 'Неверные учетные данные' });
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

    return res.json({
        token,
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
        },
    });
});

export default router;