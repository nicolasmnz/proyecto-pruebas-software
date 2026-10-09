import { Request, Response } from 'express';
import { IdParams } from '../types/request.js';
import { isUuid } from '../utils/uuid.js';

import { findProjectById } from '../repositories/project.repository.js';
import {
    createWorkItem,
    deleteWorkItem,
    findArchivedItems,
    findBoardItem,
    findBoardItems,
    findProjectMembers,
    findWipLimits,
    findWorkItemDetail,
    moveWorkItem,
    setWipLimits,
    setWorkItemArchived,
    updateWorkItem,
    WIP_STATUSES
} from '../repositories/workitem.repository.js';

// Coinciden con los CHECK y VARCHAR de work_items; las épicas no se crean desde el tablero
const MAX_TITLE_LENGTH = 200;
const EDITABLE_TYPES = ['TASK', 'STORY', 'BUG'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const MAX_WIP_LIMIT = 999;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Orden de las columnas del tablero
export const BOARD_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'] as const;

type ItemParams = IdParams & { itemId: string };

// Error de validación o de búsqueda; se distingue por clase para no
// confundirlo con una fila de la base (las tareas también tienen "status")
class Failure {
    constructor(
        readonly status: number,
        readonly message: string
    ) {}
}

type Project = NonNullable<Awaited<ReturnType<typeof findProjectById>>>;

function isFailure(value: unknown): value is Failure {
    return value instanceof Failure;
}

function respond(res: Response, failure: Failure) {
    return res.status(failure.status).json({ message: failure.message });
}

async function loadProject(id: string): Promise<Project | Failure> {
    const project = isUuid(id) ? await findProjectById(id) : undefined;

    return project ?? new Failure(404, 'Proyecto no encontrado');
}

// Un proyecto archivado es de solo lectura
function assertEditable(project: Project, action: string): Failure | null {
    return project.is_archived
        ? new Failure(409, `El proyecto está archivado. Restáuralo para ${action}`)
        : null;
}

function isValidDate(value: string): boolean {
    if (!DATE_PATTERN.test(value)) {
        return false;
    }

    const date = new Date(`${value}T00:00:00Z`);

    return !Number.isNaN(date.getTime())
        && date.toISOString().startsWith(value);
}

function normalizeText(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
}

interface WorkItemFields {
    title: string;
    description: string | null;
    type: string;
    priority: string;
    estimate: number | null;
}

// Validación común a crear y editar
function validateFields(
    body: Record<string, unknown>
): WorkItemFields | Failure {
    const { title, description, type, priority, estimate } = body;

    if (typeof title !== 'string' || !title.trim()) {
        return new Failure(400, 'title es obligatorio');
    }

    if (title.trim().length > MAX_TITLE_LENGTH) {
        return new Failure(400, `title no puede superar ${MAX_TITLE_LENGTH} caracteres`);
    }

    if (typeof type !== 'string' || !EDITABLE_TYPES.includes(type)) {
        return new Failure(400, `type debe ser uno de: ${EDITABLE_TYPES.join(', ')}`);
    }

    if (typeof priority !== 'string' || !PRIORITIES.includes(priority)) {
        return new Failure(400, `priority debe ser una de: ${PRIORITIES.join(', ')}`);
    }

    if (
        estimate !== undefined &&
        estimate !== null &&
        (typeof estimate !== 'number' || !Number.isInteger(estimate) || estimate < 0)
    ) {
        return new Failure(400, 'estimate debe ser un entero mayor o igual a 0');
    }

    return {
        title: title.trim(),
        description: normalizeText(description),
        type,
        priority,
        estimate: (estimate as number | null | undefined) ?? null
    };
}

async function loadItem(project: Project, itemId: string) {
    const item = isUuid(itemId)
        ? await findBoardItem(project.id, itemId)
        : undefined;

    return item ?? new Failure(404, 'Tarea no encontrada');
}

function serverError(res: Response, error: unknown, message: string) {
    console.error(error);

    return res.status(500).json({ message });
}


export async function getBoard(
    req: Request<IdParams>,
    res: Response
) {
    try {
        const project = await loadProject(req.params.id);

        if (isFailure(project)) {
            return respond(res, project);
        }

        const [items, archived, members, wipLimits] = await Promise.all([
            findBoardItems(project.id),
            findArchivedItems(project.id),
            findProjectMembers(project.id),
            findWipLimits(project.id)
        ]);

        return res.status(200).json({
            project,
            columns: BOARD_STATUSES.map((status) => ({
                status,
                items: items.filter((item) => item.status === status)
            })),
            archived,
            members,
            wip_limits: wipLimits
        });

    } catch (error) {
        return serverError(res, error, 'Error obteniendo tablero');
    }
}


export async function postWorkItem(
    req: Request<IdParams>,
    res: Response
) {
    try {
        if (!isUuid(req.params.id)) {
            return respond(res, new Failure(404, 'Proyecto no encontrado'));
        }

        const {
            type = 'TASK',
            priority = 'MEDIUM',
            status = 'TODO',
            createdBy
        } = req.body;

        const fields = validateFields({ ...req.body, type, priority });

        if (isFailure(fields)) {
            return respond(res, fields);
        }

        if (!(BOARD_STATUSES as readonly string[]).includes(status)) {
            return res.status(400).json({
                message: `status debe ser uno de: ${BOARD_STATUSES.join(', ')}`
            });
        }

        if (typeof createdBy !== 'string' || !isUuid(createdBy)) {
            return res.status(400).json({
                message: 'createdBy es obligatorio'
            });
        }

        const project = await loadProject(req.params.id);

        if (isFailure(project)) {
            return respond(res, project);
        }

        const blocked = assertEditable(project, 'agregar tareas');

        if (blocked) {
            return respond(res, blocked);
        }

        const item = await createWorkItem({
            ...fields,
            projectId: project.id,
            createdBy,
            status
        });

        return res.status(201).json(item);

    } catch (error) {
        // 23503: createdBy no corresponde a un usuario existente
        if ((error as { code?: string }).code === '23503') {
            return res.status(400).json({
                message: 'createdBy no corresponde a un usuario existente'
            });
        }

        return serverError(res, error, 'Error creando tarea');
    }
}


export async function getWorkItem(
    req: Request<ItemParams>,
    res: Response
) {
    try {
        const project = await loadProject(req.params.id);

        if (isFailure(project)) {
            return respond(res, project);
        }

        const item = isUuid(req.params.itemId)
            ? await findWorkItemDetail(project.id, req.params.itemId)
            : undefined;

        if (!item) {
            return respond(res, new Failure(404, 'Tarea no encontrada'));
        }

        return res.status(200).json(item);

    } catch (error) {
        return serverError(res, error, 'Error obteniendo tarea');
    }
}


export async function putWorkItem(
    req: Request<ItemParams>,
    res: Response
) {
    try {
        const project = await loadProject(req.params.id);

        if (isFailure(project)) {
            return respond(res, project);
        }

        const item = await loadItem(project, req.params.itemId);

        if (isFailure(item)) {
            return respond(res, item);
        }

        const blocked = assertEditable(project, 'editar tareas');

        if (blocked) {
            return respond(res, blocked);
        }

        const fields = validateFields(req.body);

        if (isFailure(fields)) {
            return respond(res, fields);
        }

        const { assigneeId, dueDate } = req.body;

        if (
            assigneeId !== undefined &&
            assigneeId !== null &&
            (typeof assigneeId !== 'string' || !isUuid(assigneeId))
        ) {
            return res.status(400).json({
                message: 'assigneeId debe ser un id de usuario o null'
            });
        }

        // Solo se puede asignar a quienes participan del proyecto; conservar
        // al responsable actual siempre es válido
        if (assigneeId && assigneeId !== item.assignee_id) {
            const members = await findProjectMembers(project.id);

            if (!members.some((member) => member.id === assigneeId)) {
                return res.status(400).json({
                    message: 'assigneeId debe ser un miembro del proyecto'
                });
            }
        }

        if (
            dueDate !== undefined &&
            dueDate !== null &&
            (typeof dueDate !== 'string' || !isValidDate(dueDate))
        ) {
            return res.status(400).json({
                message: 'dueDate debe tener formato AAAA-MM-DD o ser null'
            });
        }

        return res.status(200).json(
            await updateWorkItem(project.id, item.id, {
                ...fields,
                assigneeId: assigneeId ?? null,
                dueDate: dueDate ?? null
            })
        );

    } catch (error) {
        return serverError(res, error, 'Error actualizando tarea');
    }
}


export async function deleteWorkItemById(
    req: Request<ItemParams>,
    res: Response
) {
    try {
        const project = await loadProject(req.params.id);

        if (isFailure(project)) {
            return respond(res, project);
        }

        const item = await loadItem(project, req.params.itemId);

        if (isFailure(item)) {
            return respond(res, item);
        }

        const blocked = assertEditable(project, 'eliminar tareas');

        if (blocked) {
            return respond(res, blocked);
        }

        await deleteWorkItem(project.id, item.id);

        return res.status(200).json({
            message: 'Tarea eliminada correctamente',
            id: item.id
        });

    } catch (error) {
        return serverError(res, error, 'Error eliminando tarea');
    }
}


export async function patchWorkItem(
    req: Request<ItemParams>,
    res: Response
) {
    try {
        const { status } = req.body;

        if (
            typeof status !== 'string' ||
            !(BOARD_STATUSES as readonly string[]).includes(status)
        ) {
            return respond(res, new Failure(400, `status debe ser uno de: ${BOARD_STATUSES.join(', ')}`));
        }

        const { index } = req.body;

        if (
            index !== undefined &&
            (typeof index !== 'number' || !Number.isInteger(index) || index < 0)
        ) {
            return respond(res, new Failure(400, 'index debe ser un entero mayor o igual a 0'));
        }

        const project = await loadProject(req.params.id);

        if (isFailure(project)) {
            return respond(res, project);
        }

        const item = await loadItem(project, req.params.itemId);

        if (isFailure(item)) {
            return respond(res, item);
        }

        const blocked = assertEditable(project, 'mover tareas');

        if (blocked) {
            return respond(res, blocked);
        }

        if (item.is_archived) {
            return respond(res, new Failure(409, 'La tarea está archivada. Restáurala para moverla'));
        }

        // Sin posición, soltar la tarea en su propia columna no cambia nada
        if (item.status === status && index === undefined) {
            return res.status(200).json(item);
        }

        return res
            .status(200)
            .json(await moveWorkItem(project.id, item.id, status, index));

    } catch (error) {
        return serverError(res, error, 'Error moviendo tarea');
    }
}


async function setArchived(
    req: Request<ItemParams>,
    res: Response,
    archived: boolean
) {
    const project = await loadProject(req.params.id);

    if (isFailure(project)) {
        return respond(res, project);
    }

    const item = await loadItem(project, req.params.itemId);

    if (isFailure(item)) {
        return respond(res, item);
    }

    const blocked = assertEditable(project, 'modificar tareas');

    if (blocked) {
        return respond(res, blocked);
    }

    if (archived && item.status !== 'DONE') {
        return respond(res, new Failure(409, 'Solo se pueden archivar tareas que están en Hecho'));
    }

    // Ya está en el estado pedido: no hay nada que cambiar
    if (item.is_archived === archived) {
        return res.status(200).json(item);
    }

    return res
        .status(200)
        .json(await setWorkItemArchived(project.id, item.id, archived));
}


export async function patchArchiveWorkItem(
    req: Request<ItemParams>,
    res: Response
) {
    try {
        return await setArchived(req, res, true);

    } catch (error) {
        return serverError(res, error, 'Error archivando tarea');
    }
}


export async function patchRestoreWorkItem(
    req: Request<ItemParams>,
    res: Response
) {
    try {
        return await setArchived(req, res, false);

    } catch (error) {
        return serverError(res, error, 'Error restaurando tarea');
    }
}


export async function putWipLimits(
    req: Request<IdParams>,
    res: Response
) {
    try {
        const project = await loadProject(req.params.id);

        if (isFailure(project)) {
            return respond(res, project);
        }

        const blocked = assertEditable(project, 'cambiar los límites');

        if (blocked) {
            return respond(res, blocked);
        }

        const body = req.body ?? {};
        const limits: Record<string, number | null> = {};

        for (const status of WIP_STATUSES) {
            const value = body[status];

            if (value === undefined || value === null) {
                limits[status] = null;
                continue;
            }

            if (
                typeof value !== 'number' ||
                !Number.isInteger(value) ||
                value < 1 ||
                value > MAX_WIP_LIMIT
            ) {
                return res.status(400).json({
                    message: `${status} debe ser un entero entre 1 y ${MAX_WIP_LIMIT}, o null para quitar el límite`
                });
            }

            limits[status] = value;
        }

        return res.status(200).json(await setWipLimits(project.id, limits));

    } catch (error) {
        return serverError(res, error, 'Error guardando límites');
    }
}
