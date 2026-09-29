import 'dotenv/config';
const configured = process.env.JWT_SECRET;
if (!configured || configured.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters');
export const JWT_SECRET = configured;
