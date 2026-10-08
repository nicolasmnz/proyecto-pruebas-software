import { Router } from 'express';

import { getBoard, postWorkItem } from '../controllers/workitem.controller.js';

const router = Router();

router.get('/:id/board', getBoard);

router.post('/:id/work-items', postWorkItem);

export default router;
