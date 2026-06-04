import ExcelJS from 'exceljs';
import prisma from '../../config/prisma';
import { invalidate } from '../../shared/utils/cache.util';

export type ImportMode = 'CREATE_ONLY' | 'UPSERT';

export interface ImportRow {
  name?:         string;
  sku?:          string;
  barcode?:      string;
  price?:        string | number;
  costprice?:    string | number;
  costPrice?:    string | number;
  quantity?:     string | number;
  lowstockalert?: string | number;
  lowStockAlert?: string | number;
  category?:     string;
  description?:  string;
  unit?:         string;
  isactive?:     string | boolean;
  isActive?:     string | boolean;
}

export interface ImportResult {
  created:  number;
  updated:  number;
  skipped:  number;
  errors:   Array<{ row: number; sku?: string; reason: string }>;
  total:    number;
}

// ── Parse CSV or XLSX buffer into rows ────────────────────────────────────────
export async function parseBuffer(buffer: Buffer, mimetype: string): Promise<ImportRow[]> {
  const wb = new ExcelJS.Workbook();

  if (mimetype === 'text/csv' || mimetype === 'application/csv') {
    // Use Readable.from so the consumer is attached before data flows, avoiding
    // a race where PassThrough emits 'end' before csv-parse attaches its listener
    const { Readable } = await import('stream');
    await wb.csv.read(Readable.from(buffer));
  } else {
    await wb.xlsx.load(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer);
  }

  const ws = wb.worksheets[0];
  if (!ws) throw new Error('EMPTY_FILE');

  const rows: ImportRow[] = [];
  let headers: string[] = [];

  ws.eachRow((row, rowNum) => {
    const values = (row.values as (string | number | null | undefined)[]).slice(1);

    if (rowNum === 1) {
      headers = values.map((v) => String(v ?? '').toLowerCase().trim());
      return;
    }

    const obj: Record<string, string | number | undefined> = {};
    headers.forEach((h, i) => {
      const val = values[i];
      if (val !== null && val !== undefined) obj[h] = val as string | number;
    });
    if (Object.keys(obj).length > 0) rows.push(obj as ImportRow);
  });

  return rows;
}

// ── Generate a CSV template ───────────────────────────────────────────────────
export async function generateTemplate(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Products');

  ws.columns = [
    { header: 'name',          key: 'name',          width: 30 },
    { header: 'sku',           key: 'sku',            width: 15 },
    { header: 'barcode',       key: 'barcode',        width: 15 },
    { header: 'price',         key: 'price',          width: 10 },
    { header: 'costprice',     key: 'costprice',      width: 10 },
    { header: 'quantity',      key: 'quantity',       width: 10 },
    { header: 'lowstockalert', key: 'lowstockalert',  width: 14 },
    { header: 'category',      key: 'category',       width: 20 },
    { header: 'unit',          key: 'unit',           width: 10 },
    { header: 'description',   key: 'description',    width: 40 },
    { header: 'isactive',      key: 'isactive',       width: 10 },
  ];

  // Bold header row
  ws.getRow(1).font = { bold: true };

  // Example row
  ws.addRow({
    name: 'Resistor 10kΩ', sku: 'RES-10K', barcode: '123456789',
    price: 0.15, costprice: 0.05, quantity: 1000, lowstockalert: 50,
    category: 'Resistors', unit: 'piece', description: '10kΩ 0.25W 5%', isactive: 'true',
  });

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

// ── Import products from parsed rows ──────────────────────────────────────────
export async function importProducts(
  rows:   ImportRow[],
  mode:   ImportMode = 'UPSERT',
): Promise<ImportResult> {
  const result: ImportResult = { created: 0, updated: 0, skipped: 0, errors: [], total: rows.length };

  for (let i = 0; i < rows.length; i++) {
    const row   = rows[i]!;
    const rowNum = i + 2; // account for header row

    try {
      const name  = String(row.name ?? '').trim();
      const sku   = row.sku ? String(row.sku).trim() : undefined;
      const price = parseFloat(String(row.price ?? '0'));

      if (!name)         { result.errors.push({ row: rowNum, sku, reason: 'name is required' }); result.skipped++; continue; }
      if (isNaN(price))  { result.errors.push({ row: rowNum, sku, reason: 'price is not a valid number' }); result.skipped++; continue; }
      if (price < 0)     { result.errors.push({ row: rowNum, sku, reason: 'price must be >= 0' }); result.skipped++; continue; }

      const data = {
        name,
        price,
        costPrice:     parseFloat(String(row.costPrice ?? row['costprice'] ?? 0)) || 0,
        quantity:      parseInt(String(row.quantity  ?? 0)) || 0,
        lowStockAlert: parseInt(String(row.lowStockAlert ?? row['lowstockalert'] ?? 5)) || 5,
        category:      String(row.category ?? '').trim() || 'Uncategorized',
        description:   row.description ? String(row.description).trim() : null,
        unit:          String(row.unit ?? 'piece').trim() || 'piece',
        barcode:       row.barcode ? String(row.barcode).trim() : null,
        isActive:      String(row.isActive ?? row['isactive'] ?? 'true').toLowerCase() !== 'false',
      };

      if (sku) {
        const existing = await prisma.product.findFirst({ where: { sku, deletedAt: null } });

        if (existing) {
          if (mode === 'CREATE_ONLY') {
            result.errors.push({ row: rowNum, sku, reason: 'SKU already exists (CREATE_ONLY mode)' });
            result.skipped++;
            continue;
          }
          await prisma.product.update({ where: { id: existing.id }, data: { ...data, sku } });
          result.updated++;
        } else {
          await prisma.product.create({ data: { ...data, sku } });
          result.created++;
        }
      } else {
        await prisma.product.create({ data });
        result.created++;
      }
    } catch (err: unknown) {
      const msg = (err as Error).message ?? 'Unknown error';
      result.errors.push({ row: rowNum, sku: row.sku ? String(row.sku) : undefined, reason: msg });
      result.skipped++;
    }
  }

  if (result.created > 0 || result.updated > 0) {
    await invalidate('products:');
  }

  return result;
}
