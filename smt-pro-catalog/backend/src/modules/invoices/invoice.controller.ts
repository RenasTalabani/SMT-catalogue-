import { Request, Response } from 'express';
import * as invoiceService from './invoice.service';
import { success, error } from '../../shared/utils/response.util';
import { AuthRequest } from '../../types';

const ERR: Record<string, { s: number; m: string }> = {
  ORDER_NOT_FOUND:         { s: 404, m: 'Order not found' },
  INVOICE_NOT_FOUND:       { s: 404, m: 'Invoice not found' },
  INVOICE_ALREADY_EXISTS:  { s: 409, m: 'Invoice already exists for this order' },
  NOT_A_LOAN:              { s: 400, m: 'This invoice is not a loan/installment invoice' },
  ALREADY_FULLY_PAID:      { s: 400, m: 'This invoice has already been fully paid' },
};

const resolve = (e: Error, res: Response): Response => {
  const m = ERR[e.message];
  return error(res, m?.m ?? e.message, m?.s ?? 500);
};

// POST /api/invoices/order/:orderId
export const createFromOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orderId = parseInt(req.params['orderId']!);
    const { invoice } = await invoiceService.createFromOrder(orderId, req.user.id, req.body as Record<string, unknown> as Parameters<typeof invoiceService.createFromOrder>[2]);
    success(res, invoice, 'Invoice created', 201);
  } catch (e) { resolve(e as Error, res); }
};

// GET /api/invoices/loans
export const getOutstandingLoans = async (_req: Request, res: Response): Promise<void> => {
  try {
    success(res, await invoiceService.getOutstandingLoans());
  } catch (e) { resolve(e as Error, res); }
};

// GET /api/invoices
export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const page   = parseInt(String(req.query['page']  ?? 1));
    const limit  = parseInt(String(req.query['limit'] ?? 20));
    const search = req.query['search'] as string | undefined;
    success(res, await invoiceService.getAll(page, limit, search));
  } catch (e) { resolve(e as Error, res); }
};

// GET /api/invoices/:id
export const getById = async (req: Request, res: Response): Promise<void> => {
  try {
    success(res, await invoiceService.getById(parseInt(req.params['id']!)));
  } catch (e) { resolve(e as Error, res); }
};

// GET /api/invoices/:id/pdf  — streams PDF download
export const downloadPDF = async (req: Request, res: Response): Promise<void> => {
  try {
    const inv = await invoiceService.getById(parseInt(req.params['id']!));

    // If PDF stored in Supabase, redirect to it
    if (inv.pdfUrl) {
      res.redirect(inv.pdfUrl);
      return;
    }

    // Otherwise regenerate on the fly
    const buf = await invoiceService.regeneratePDF(parseInt(req.params['id']!));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${inv.invoiceNumber}.pdf"`);
    res.send(buf);
  } catch (e) { resolve(e as Error, res); }
};

// GET /api/invoices/:id/preview  — inline PDF preview
export const previewPDF = async (req: Request, res: Response): Promise<void> => {
  try {
    const inv = await invoiceService.getById(parseInt(req.params['id']!));
    if (inv.pdfUrl) {
      res.redirect(inv.pdfUrl);
      return;
    }
    const buf = await invoiceService.regeneratePDF(parseInt(req.params['id']!));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${inv.invoiceNumber}.pdf"`);
    res.send(buf);
  } catch (e) { resolve(e as Error, res); }
};

// PATCH /api/invoices/:id/paid
export const markPaid = async (req: Request, res: Response): Promise<void> => {
  try {
    success(res, await invoiceService.markPaid(parseInt(req.params['id']!)));
  } catch (e) { resolve(e as Error, res); }
};

// POST /api/invoices/:id/payment
export const addPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id     = parseInt(req.params['id']!);
    const body   = req.body as { amount?: unknown; notes?: unknown };
    const amount = parseFloat(String(body.amount ?? '0'));
    if (!amount || amount <= 0) { error(res, 'amount must be > 0', 400); return; }
    const notes = typeof body.notes === 'string' ? body.notes : undefined;
    const result = await invoiceService.addPayment(id, amount, notes, req.user.id);
    success(res, result, 'Payment recorded');
  } catch (e) { resolve(e as Error, res); }
};
