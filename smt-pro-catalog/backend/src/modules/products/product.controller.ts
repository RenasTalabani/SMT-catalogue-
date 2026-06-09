import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import * as productService from './product.service';
import { success, error } from '../../shared/utils/response.util';

const ERR_MAP: Record<string, { s: number; m: string }> = {
  PRODUCT_NOT_FOUND:    { s: 404, m: 'Product not found' },
  PRODUCT_NOT_DELETED:  { s: 400, m: 'Product is not in the trash' },
};

const resolve = (e: Error, res: Response): Response => {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
    const fields = (e.meta?.target as string[] | undefined)?.join(', ') ?? 'field';
    return error(res, `A product with this ${fields} already exists`, 409);
  }
  const m = ERR_MAP[e.message];
  return error(res, m?.m ?? e.message, m?.s ?? 500);
};

export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    success(res, await productService.getAll(req.query as Record<string, string>));
  } catch (e) { resolve(e as Error, res); }
};

export const getById = async (req: Request, res: Response): Promise<void> => {
  try {
    success(res, await productService.getById(req.params['id']!));
  } catch (e) { resolve(e as Error, res); }
};

export const getByBarcode = async (req: Request, res: Response): Promise<void> => {
  try {
    success(res, await productService.getByBarcode(req.params['code']!));
  } catch (e) { resolve(e as Error, res); }
};

const getImageFiles = (req: Request) => {
  const files = req.files as Express.Multer.File[] | undefined;
  if (files?.length) return files.map((f) => ({ buffer: f.buffer, mimetype: f.mimetype }));
  if (req.file) return [{ buffer: req.file.buffer, mimetype: req.file.mimetype }];
  return [];
};

export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const b = req.body as Record<string, unknown>;
    const product = await productService.create(
      {
        name:          String(b['name']),
        description:   b['description']   ? String(b['description'])          : undefined,
        price:         Number(b['price']),
        discountPrice: b['discountPrice'] != null && b['discountPrice'] !== '' ? Number(b['discountPrice']) : undefined,
        costPrice:     b['costPrice']      ? Number(b['costPrice'])            : undefined,
        quantity:      Number(b['quantity'] ?? 0),
        lowStockAlert: b['lowStockAlert']  ? Number(b['lowStockAlert'])        : undefined,
        category:      String(b['category'] ?? ''),
        categoryId:    b['categoryId']     ? Number(b['categoryId'])           : undefined,
        sku:           b['sku']            ? String(b['sku'])                  : undefined,
        barcode:       b['barcode']        ? String(b['barcode'])              : undefined,
        unit:          b['unit']           ? String(b['unit'])                 : undefined,
        isActive:      b['isActive'] !== undefined ? b['isActive'] === true || b['isActive'] === 'true' : undefined,
      },
      getImageFiles(req),
    );
    success(res, product, 'Product created', 201);
  } catch (e) { resolve(e as Error, res); }
};

export const update = async (req: Request, res: Response): Promise<void> => {
  try {
    const allowed = [
      'name', 'description', 'price', 'discountPrice', 'costPrice', 'quantity',
      'lowStockAlert', 'category', 'categoryId', 'sku', 'barcode', 'unit', 'isActive',
    ] as const;
    const b = req.body as Record<string, unknown>;
    const updates: Record<string, unknown> = {};
    for (const f of allowed) {
      if (b[f] !== undefined) {
        if (f === 'isActive') updates[f] = b[f] === true || b[f] === 'true';
        else if (['price', 'discountPrice', 'costPrice', 'quantity', 'lowStockAlert', 'categoryId'].includes(f)) updates[f] = Number(b[f]);
        else updates[f] = b[f];
      }
    }
    success(res, await productService.update(req.params['id']!, updates as Parameters<typeof productService.update>[1], getImageFiles(req)));
  } catch (e) { resolve(e as Error, res); }
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    await productService.remove(req.params['id']!);
    success(res, null, 'Product moved to trash');
  } catch (e) { resolve(e as Error, res); }
};

export const restore = async (req: Request, res: Response): Promise<void> => {
  try {
    success(res, await productService.restore(req.params['id']!), 'Product restored');
  } catch (e) { resolve(e as Error, res); }
};

export const getDeleted = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page, limit } = req.query as Record<string, string>;
    success(res, await productService.getDeleted(Number(page ?? 1), Number(limit ?? 20)));
  } catch (e) { resolve(e as Error, res); }
};

export const permanentDelete = async (req: Request, res: Response): Promise<void> => {
  try {
    await productService.permanentDelete(req.params['id']!);
    success(res, null, 'Product permanently deleted');
  } catch (e) { resolve(e as Error, res); }
};
