import { Response } from 'express';
import { AuthRequest } from '../../types';
import { success, error } from '../../shared/utils/response.util';
import * as importService from './product-import.service';

export const getTemplate = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const buf = await importService.generateTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="product-import-template.xlsx"');
    res.send(buf);
  } catch (e) {
    error(res, (e as Error).message, 500);
  }
};

export const importProducts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) { error(res, 'A CSV or XLSX file is required', 400); return; }

    const allowed = [
      'text/csv', 'application/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (!allowed.includes(req.file.mimetype)) {
      error(res, 'Only CSV and XLSX files are supported', 400); return;
    }

    const mode = (req.body as { mode?: string }).mode === 'CREATE_ONLY' ? 'CREATE_ONLY' : 'UPSERT';
    const rows = await importService.parseBuffer(req.file.buffer, req.file.mimetype);

    if (!rows.length) { error(res, 'No data rows found in the file', 400); return; }

    const result = await importService.importProducts(rows, mode);
    const statusCode = result.errors.length > 0 && result.created === 0 && result.updated === 0 ? 422 : 200;
    success(res, result, `Import complete: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped`, statusCode);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === 'EMPTY_FILE') { error(res, 'The uploaded file has no worksheets', 400); return; }
    error(res, msg, 500);
  }
};
