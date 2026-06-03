import prisma from '../../config/prisma';

export type NoteType = 'NOTE' | 'CALL' | 'EMAIL' | 'MEETING' | 'FOLLOW_UP';

export interface CreateNoteInput {
  type?:       NoteType;
  content:     string;
  followUpAt?: string;
}

const NOTE_SELECT = {
  id: true, type: true, content: true, followUpAt: true, isResolved: true,
  createdAt: true, updatedAt: true,
  author: { select: { id: true, name: true } },
} as const;

// ── Get all notes for a customer ──────────────────────────────────────────────
export const getByCustomer = async (customerId: number, page = 1, limit = 30) => {
  const customer = await prisma.customer.findFirst({ where: { id: customerId, deletedAt: null } });
  if (!customer) throw new Error('CUSTOMER_NOT_FOUND');

  const skip = (page - 1) * limit;
  const [notes, total] = await Promise.all([
    prisma.customerNote.findMany({
      where:   { customerId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: NOTE_SELECT,
    }),
    prisma.customerNote.count({ where: { customerId } }),
  ]);

  return { notes, total, page, limit };
};

// ── Get overdue follow-ups across all customers ───────────────────────────────
export const getOverdueFollowUps = async (page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const where = {
    type:       'FOLLOW_UP' as NoteType,
    isResolved: false,
    followUpAt: { lt: new Date() },
  };

  const [notes, total] = await Promise.all([
    prisma.customerNote.findMany({
      where,
      orderBy: { followUpAt: 'asc' },
      skip,
      take: limit,
      select: {
        ...NOTE_SELECT,
        customer: { select: { id: true, name: true, phone: true } },
      },
    }),
    prisma.customerNote.count({ where }),
  ]);

  return { notes, total, page, limit };
};

// ── Create note ───────────────────────────────────────────────────────────────
export const create = async (customerId: number, createdBy: number, input: CreateNoteInput) => {
  const customer = await prisma.customer.findFirst({ where: { id: customerId, deletedAt: null } });
  if (!customer) throw new Error('CUSTOMER_NOT_FOUND');

  return prisma.customerNote.create({
    data: {
      customerId,
      createdBy,
      type:       input.type    ?? 'NOTE',
      content:    input.content,
      followUpAt: input.followUpAt ? new Date(input.followUpAt) : null,
    },
    select: NOTE_SELECT,
  });
};

// ── Update note ───────────────────────────────────────────────────────────────
export const update = async (id: number, authorId: number, data: {
  content?:     string;
  followUpAt?:  string | null;
  isResolved?:  boolean;
}) => {
  const note = await prisma.customerNote.findUnique({ where: { id } });
  if (!note)                    throw new Error('NOTE_NOT_FOUND');
  if (note.createdBy !== authorId) throw new Error('NOTE_UNAUTHORIZED');

  return prisma.customerNote.update({
    where: { id },
    data:  {
      content:    data.content    ?? undefined,
      isResolved: data.isResolved ?? undefined,
      followUpAt: data.followUpAt === null
        ? null
        : data.followUpAt
          ? new Date(data.followUpAt)
          : undefined,
    },
    select: NOTE_SELECT,
  });
};

// ── Resolve a follow-up ───────────────────────────────────────────────────────
export const resolve = async (id: number) => {
  const note = await prisma.customerNote.findUnique({ where: { id } });
  if (!note) throw new Error('NOTE_NOT_FOUND');

  return prisma.customerNote.update({
    where: { id },
    data:  { isResolved: true },
    select: NOTE_SELECT,
  });
};

// ── Delete note ───────────────────────────────────────────────────────────────
export const remove = async (id: number, authorId: number, isAdmin: boolean): Promise<void> => {
  const note = await prisma.customerNote.findUnique({ where: { id } });
  if (!note)                              throw new Error('NOTE_NOT_FOUND');
  if (!isAdmin && note.createdBy !== authorId) throw new Error('NOTE_UNAUTHORIZED');
  await prisma.customerNote.delete({ where: { id } });
};

// ── Stats for a customer ──────────────────────────────────────────────────────
export const getCustomerStats = async (customerId: number) => {
  const [byType, pendingFollowUps] = await Promise.all([
    prisma.customerNote.groupBy({
      by:     ['type'],
      where:  { customerId },
      _count: { id: true },
    }),
    prisma.customerNote.count({
      where: { customerId, type: 'FOLLOW_UP', isResolved: false },
    }),
  ]);

  return {
    byType: byType.map((t) => ({ type: t.type, count: t._count.id })),
    pendingFollowUps,
  };
};
