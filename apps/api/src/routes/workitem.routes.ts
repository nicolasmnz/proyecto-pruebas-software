import { Router } from 'express';

import {
    getBoard,
    patchArchiveWorkItem,
    patchRestoreWorkItem,
    patchWorkItem,
    postWorkItem
} from '../controllers/workitem.controller.js';

const router = Router();

router.get('/:id/board', getBoard);

router.post('/:id/work-items', postWorkItem);

router.patch('/:id/work-items/:itemId', patchWorkItem);
router.patch('/:id/work-items/:itemId/archive', patchArchiveWorkItem);

router.patch('/:id/work-items/:itemId/restore', patchRestoreWorkItem);

export default router;
