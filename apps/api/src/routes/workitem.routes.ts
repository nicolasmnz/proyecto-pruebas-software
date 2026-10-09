import { Router } from 'express';

import {
    deleteWorkItemById,
    getBoard,
    getWorkItem,
    patchArchiveDoneItems,
    patchArchiveWorkItem,
    patchRestoreWorkItem,
    patchWorkItem,
    postWorkItem,
    putWipLimits,
    putWorkItem
} from '../controllers/workitem.controller.js';

const router = Router();

router.get('/:id/board', getBoard);

router.put('/:id/wip-limits', putWipLimits);

router.post('/:id/work-items', postWorkItem);

// Debe ir antes de las rutas con :itemId, que tomarían "archive-done" por un id
router.patch('/:id/work-items/archive-done', patchArchiveDoneItems);

router.get('/:id/work-items/:itemId', getWorkItem);

router.put('/:id/work-items/:itemId', putWorkItem);

router.delete('/:id/work-items/:itemId', deleteWorkItemById);

router.patch('/:id/work-items/:itemId', patchWorkItem);

router.patch('/:id/work-items/:itemId/archive', patchArchiveWorkItem);

router.patch('/:id/work-items/:itemId/restore', patchRestoreWorkItem);

export default router;
