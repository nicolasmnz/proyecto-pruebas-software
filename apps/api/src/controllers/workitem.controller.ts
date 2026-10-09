import { Request, Response } from 'express';
import { IdParams } from '../types/request.js';
import { isUuid } from '../utils/uuid.js';

import { findProjectById } from '../repositories/project.repository.js';
import {
    createWorkItem,
    findArchivedItems,
    findBoardItem,
    findBoardItems,
    moveWorkItem,
    setWorkItemArchived
} from '../repositories/workitem.repository.js';

// Coinciden con los CHECK y VARCHAR de work_items; las épicas no se crean desde el tablero
const MAX_TITLE_LENGTH = 200;
const CREATABLE_TYPES = ['TASK', 'STORY', 'BUG'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

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

        const [items, archived] = await Promise.all([
            findBoardItems(project.id),
            findArchivedItems(project.id)
        ]);

        return res.status(200).json({
            project,
            columns: BOARD_STATUSES.map((status) => ({
                status,
                items: items.filter((item) => item.status === status)
            })),
            archived
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: 'Error obteniendo tablero'
        });
    }
}


export async function postWorkItem(
    req: Request<IdParams>,
    res: Response
) {
    try {
        if (!isUuid(req.params.id)) {
            return res.status(404).json({
                message: 'Proyecto no encontrado'
            });
        }

        const {
            title,
            description,
            type = 'TASK',
            priority = 'MEDIUM',
            status = 'TODO',
            estimate,
            createdBy
        } = req.body;

        if (typeof title !== 'string' || !title.trim()) {
            return res.status(400).json({
                message: 'title es obligatorio'
            });
        }

        if (title.trim().length > MAX_TITLE_LENGTH) {
            return res.status(400).json({
                message: `title no puede superar ${MAX_TITLE_LENGTH} caracteres`
            });
        }

        if (!CREATABLE_TYPES.includes(type)) {
            return res.status(400).json({
                message: `type debe ser uno de: ${CREATABLE_TYPES.join(', ')}`
            });
        }

        if (!PRIORITIES.includes(priority)) {
            return res.status(400).json({
                message: `priority debe ser una de: ${PRIORITIES.join(', ')}`
            });
        }

        if (!(BOARD_STATUSES as readonly string[]).includes(status)) {
            return res.status(400).json({
                message: `status debe ser uno de: ${BOARD_STATUSES.join(', ')}`
            });
        }

        if (
            estimate !== undefined &&
            estimate !== null &&
            (!Number.isInteger(estimate) || estimate < 0)
        ) {
            return res.status(400).json({
                message: 'estimate debe ser un entero mayor o igual a 0'
            });
        }

        if (typeof createdBy !== 'string' || !isUuid(createdBy)) {
            return res.status(400).json({
                message: 'createdBy es obligatorio'
            });
        }

        const project = await findProjectById(req.params.id);

        if (!project) {
            return res.status(404).json({
                message: 'Proyecto no encontrado'
            });
        }

        if (project.is_archived) {
            return res.status(409).json({
                message: 'El proyecto está archivado. Restáuralo para agregar tareas'
            });
        }

        const item = await createWorkItem({
            projectId: project.id,
            createdBy,
            type,
            title: title.trim(),
            description:
                typeof description === 'string' && description.trim()
                    ? description.trim()
                    : null,
            status,
            priority,
            estimate: estimate ?? null
        });

        return res.status(201).json(item);

    } catch (error) {
        // 23503: createdBy no corresponde a un usuario existente
        if ((error as { code?: string }).code === '23503') {
            return res.status(400).json({
                message: 'createdBy no corresponde a un usuario existente'
            });
        }

        console.error(error);

        return res.status(500).json({
            message: 'Error creando tarea'
        });
    }
}


export async function patchWorkItem(
    req: Request<IdParams & { itemId: string }>,
    res: Response
) {
    try {
        const { id, itemId } = req.params;

        if (!isUuid(id)) {
            return res.status(404).json({
                message: 'Proyecto no encontrado'
            });
        }

        const { status } = req.body;

        if (
            typeof status !== 'string' ||
            !(BOARD_STATUSES as readonly string[]).includes(status)
        ) {
            return res.status(400).json({
                message: `status debe ser uno de: ${BOARD_STATUSES.join(', ')}`
            });
        }

        const project = await findProjectById(id);

        if (!project) {
            return res.status(404).json({
                message: 'Proyecto no encontrado'
            });
        }

        const item = isUuid(itemId)
            ? await findBoardItem(project.id, itemId)
            : undefined;

        if (!item) {
            return res.status(404).json({
                message: 'Tarea no encontrada'
            });
        }

        if (project.is_archived) {
            return res.status(409).json({
                message: 'El proyecto está archivado. Restáuralo para mover tareas'
            });
        }

        if (item.is_archived) {
            return res.status(409).json({
                message: 'La tarea está archivada. Restáurala para moverla'
            });
        }

        // Soltar la tarea en su propia columna no cambia nada
        if (item.status === status) {
            return res.status(200).json(item);
        }

        return res
            .status(200)
            .json(await moveWorkItem(project.id, itemId, status));

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: 'Error moviendo tarea'
        });
    }
}


async function setArchived(
    req: Request<IdParams & { itemId: string }>,
    res: Response,
    archived: boolean
) {
    const { id, itemId } = req.params;

    if (!isUuid(id)) {
        return res.status(404).json({
            message: 'Proyecto no encontrado'
        });
    }

    const project = await findProjectById(id);

    if (!project) {
        return res.status(404).json({
            message: 'Proyecto no encontrado'
        });
    }

    const item = isUuid(itemId)
        ? await findBoardItem(project.id, itemId)
        : undefined;

    if (!item) {
        return res.status(404).json({
            message: 'Tarea no encontrada'
        });
    }

    if (project.is_archived) {
        return res.status(409).json({
            message: 'El proyecto está archivado. Restáuralo para modificar tareas'
        });
    }

    if (archived && item.status !== 'DONE') {
        return res.status(409).json({
            message: 'Solo se pueden archivar tareas que están en Hecho'
        });
    }

    // Ya está en el estado pedido: no hay nada que cambiar
    if (item.is_archived === archived) {
        return res.status(200).json(item);
    }

    return res
        .status(200)
        .json(await setWorkItemArchived(project.id, itemId, archived));
}


export async function patchArchiveWorkItem(
    req: Request<IdParams & { itemId: string }>,
    res: Response
) {
    try {
        return await setArchived(req, res, true);

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: 'Error archivando tarea'
        });
    }
}


export async function patchRestoreWorkItem(
    req: Request<IdParams & { itemId: string }>,
    res: Response
) {
    try {
        return await setArchived(req, res, false);

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: 'Error restaurando tarea'
        });
    }
}
