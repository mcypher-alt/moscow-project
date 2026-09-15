import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
    origin: ['http://localhost:3000'], // Добавь сюда порты своего фронтенда
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(helmet());

app.listen(PORT, () => {
    console.log(`Бэкенд запущен на http://localhost:${PORT}`);
});

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};