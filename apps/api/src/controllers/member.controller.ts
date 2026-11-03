import { Request, Response } from 'express';

import { IdParams } from '../types/request.js';
import { isUuid } from '../utils/uuid.js';
import { findProjectById } from '../repositories/project.repository.js';
import { findMembersWithRole } from '../repositories/member.repository.js';


export async function getProjectMembers(
    req: Request<IdParams>,
    res: Response
) {
    try {
        const project = isUuid(req.params.id)
            ? await findProjectById(req.params.id)
            : undefined;

        if (!project) {
            return res.status(404).json({
                message: 'Proyecto no encontrado'
            });
        }

        return res.status(200).json(await findMembersWithRole(project.id));

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: 'Error obteniendo los integrantes del proyecto'
        });
    }
}
