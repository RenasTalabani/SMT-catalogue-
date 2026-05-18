const prisma = require('../../config/prisma');
const logger  = require('../utils/logger.util');

/**
 * Creates an audit log entry. Non-blocking — errors are swallowed so they
 * never interrupt the main request flow.
 */
const audit = async (userId, action, entity, entityId = null, metadata = null) => {
  try {
    await prisma.auditLog.create({
      data: { userId, action, entity, entityId, metadata: metadata ? JSON.stringify(metadata) : null },
    });
  } catch (err) {
    logger.warn('[audit] Failed to write audit log:', err.message);
  }
};

/**
 * Express middleware factory — automatically logs after successful responses.
 * Usage: router.post('/', protect, auditMiddleware('CREATE', 'Product'), handler)
 */
const auditMiddleware = (action, entity) => (req, res, next) => {
  const original = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode < 400 && req.user?.id) {
      const entityId = body?.data?.id ?? req.params?.id ?? null;
      audit(req.user.id, action, entity, entityId ? parseInt(entityId) : null);
    }
    return original(body);
  };
  next();
};

module.exports = { audit, auditMiddleware };
