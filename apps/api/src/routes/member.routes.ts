import { Router } from 'express';

import { getProjectMembers } from '../controllers/member.controller.js';

const router = Router();

router.get('/:id/members', getProjectMembers);

export default router;
