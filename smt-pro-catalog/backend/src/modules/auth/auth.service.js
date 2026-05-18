const bcrypt        = require('bcryptjs');
const prisma        = require('../../config/prisma');
const { signToken } = require('../../shared/utils/jwt.util');

const register = async ({ name, email, password }) => {
  if (await prisma.user.findUnique({ where: { email } })) throw new Error('EMAIL_TAKEN');
  const hashed = await bcrypt.hash(password, 12);
  const user   = await prisma.user.create({
    data:   { name, email, password: hashed },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  return { user, token: signToken({ id: user.id, role: user.role }) };
};

const login = async ({ email, password }) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('INVALID_CREDENTIALS');
  if (!(await bcrypt.compare(password, user.password))) throw new Error('INVALID_CREDENTIALS');
  const { password: _, ...safeUser } = user;
  return { user: safeUser, token: signToken({ id: user.id, role: user.role }) };
};

module.exports = { register, login };
