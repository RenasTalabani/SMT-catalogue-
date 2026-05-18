const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { signToken } = require('../utils/jwt.util');

const register = async ({ name, email, password }) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error('EMAIL_TAKEN');

  const hashed = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { name, email, password: hashed },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  const token = signToken({ id: user.id, role: user.role });
  return { user, token };
};

const login = async ({ email, password }) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('INVALID_CREDENTIALS');

  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new Error('INVALID_CREDENTIALS');

  const token = signToken({ id: user.id, role: user.role });

  const { password: _pw, ...safeUser } = user;
  return { user: safeUser, token };
};

module.exports = { register, login };
