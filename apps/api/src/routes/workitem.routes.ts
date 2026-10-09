import { Router } from 'express';

import {
    deleteWorkItemById,
    getBoard,
    getWorkItem,
    patchArchiveWorkItem,
    patchRestoreWorkItem,
    patchWorkItem,
    postWorkItem,
    putWorkItem
} from '../controllers/workitem.controller.js';

const router = Router();

router.get('/:id/board', getBoard);

router.post('/:id/work-items', postWorkItem);

router.get('/:id/work-items/:itemId', getWorkItem);

router.put('/:id/work-items/:itemId', putWorkItem);

router.delete('/:id/work-items/:itemId', deleteWorkItemById);

router.patch('/:id/work-items/:itemId', patchWorkItem);

router.patch('/:id/work-items/:itemId/archive', patchArchiveWorkItem);

router.patch('/:id/work-items/:itemId/restore', patchRestoreWorkItem);

export default router;
