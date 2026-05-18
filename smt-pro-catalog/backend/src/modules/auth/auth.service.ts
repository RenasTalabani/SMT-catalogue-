import bcrypt from 'bcryptjs';
import prisma from '../../config/prisma';
import { signToken } from '../../shared/utils/jwt.util';

interface RegisterInput { name: string; email: string; password: string; }
interface LoginInput    { email: string; password: string; }

export interface SafeUser {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
}

export interface AuthResult {
  user: SafeUser;
  token: string;
}

export const register = async ({ name, email, password }: RegisterInput): Promise<AuthResult> => {
  if (await prisma.user.findUnique({ where: { email } })) throw new Error('EMAIL_TAKEN');
  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data:   { name, email, password: hashed },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  return { user, token: signToken({ id: user.id, role: user.role }) };
};

export const login = async ({ email, password }: LoginInput): Promise<AuthResult> => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('INVALID_CREDENTIALS');
  if (!(await bcrypt.compare(password, user.password))) throw new Error('INVALID_CREDENTIALS');
  const { password: _, ...safeUser } = user;
  return { user: safeUser, token: signToken({ id: safeUser.id, role: safeUser.role }) };
};
