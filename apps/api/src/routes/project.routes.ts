import { Router } from 'express';

import {
    getProjects,
    getProject,
    postProject,
    putProject,
    deleteProject
} from '../controllers/project.controller.js';

const router = Router();

router.get('/', getProjects);

router.get('/:id', getProject);

router.post('/', postProject);

router.put('/:id', putProject);

router.delete('/:id', deleteProject);

export default router;