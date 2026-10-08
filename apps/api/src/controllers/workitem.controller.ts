import { Request, Response } from 'express';
import { IdParams } from '../types/request.js';
import { isUuid } from '../utils/uuid.js';

import { findProjectById } from '../repositories/project.repository.js';
import { findBoardItems } from '../repositories/workitem.repository.js';

// Orden de las columnas del tablero
export const BOARD_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'] as const;

export async function getBoard(
    req: Request<IdParams>,
    res: Response
) {
    try {
        if (!isUuid(req.params.id)) {
            return res.status(404).json({
                message: 'Proyecto no encontrado'
            });
        }

        const project = await findProjectById(req.params.id);

        if (!project) {
            return res.status(404).json({
                message: 'Proyecto no encontrado'
            });
        }

        const items = await findBoardItems(project.id);

        return res.status(200).json({
            project,
            columns: BOARD_STATUSES.map((status) => ({
                status,
                items: items.filter((item) => item.status === status)
            }))
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: 'Error obteniendo tablero'
        });
    }
}
