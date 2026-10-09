import { Router } from 'express';

import {
    getBoard,
    patchWorkItem,
    postWorkItem
} from '../controllers/workitem.controller.js';

const router = Router();

router.get('/:id/board', getBoard);

router.post('/:id/work-items', postWorkItem);

router.patch('/:id/work-items/:itemId', patchWorkItem);

export default router;
