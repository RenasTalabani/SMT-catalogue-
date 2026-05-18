import { body, query } from 'express-validator';

export const createRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('nameAr').optional().trim(),
  body('nameKu').optional().trim(),
  body('slug').trim().notEmpty().withMessage('Slug is required')
    .matches(/^[a-z0-9-]+$/).withMessage('Slug must be lowercase letters, numbers, or hyphens'),
  body('description').optional().trim(),
  body('imageUrl').optional().isURL().withMessage('imageUrl must be a valid URL'),
  body('order').optional().isInt({ min: 0 }).toInt(),
  body('parentId').optional({ nullable: true }).isInt({ min: 1 }).toInt(),
];

export const updateRules = [
  body('name').optional().trim().notEmpty(),
  body('nameAr').optional().trim(),
  body('nameKu').optional().trim(),
  body('slug').optional().trim()
    .matches(/^[a-z0-9-]+$/).withMessage('Slug must be lowercase letters, numbers, or hyphens'),
  body('description').optional().trim(),
  body('imageUrl').optional({ nullable: true }).isURL().withMessage('imageUrl must be a valid URL'),
  body('order').optional().isInt({ min: 0 }).toInt(),
  body('parentId').optional({ nullable: true }).isInt({ min: 1 }).toInt(),
  body('isActive').optional().isBoolean().toBoolean(),
];

export const listRules = [
  query('parentId').optional({ nullable: true }).isInt({ min: 1 }).toInt(),
  query('tree').optional().isBoolean().toBoolean(),
  query('includeInactive').optional().isBoolean().toBoolean(),
];
