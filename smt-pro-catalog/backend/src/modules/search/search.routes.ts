import { Router, Request, Response, RequestHandler } from 'express';
import { protect }       from '../../shared/middlewares/auth.middleware';
import { globalSearch }  from './search.service';
import { success, error } from '../../shared/utils/response.util';
import { AuthRequest }   from '../../types';

const router = Router();

router.get('/', protect as RequestHandler, async (req: Request, res: Response) => {
  const q    = (req.query['q'] as string ?? '').trim();
  const role = (req as AuthRequest).user?.role ?? 'employee';

  if (q.length < 2) { error(res, 'Query must be at least 2 characters', 400); return; }

  const results = await globalSearch(q, role);
  success(res, results);
});

export default router;
