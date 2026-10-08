import { Router } from 'express';

import { getBoard } from '../controllers/workitem.controller.js';

const router = Router();

router.get('/:id/board', getBoard);

export default router;
