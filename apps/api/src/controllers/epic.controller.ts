import { Request, Response } from "express";
import { EpicParams, ProjectParams, WorkItemParams } from "../types/request.js";
import {findEpicsByProject, findEpicById, createEpic, updateEpic, archiveEpic, assignWorkItemToEpic } from "../repositories/epic.repository.js";
import { findProjectById } from "../repositories/project.repository.js";
import { isValidDate } from "../utils/date.js";
import { isUuid } from "../utils/uuid.js";




// Un id con formato inválido no puede existir en la base
function hasValidIds(params: EpicParams) {
    return isUuid(params.id) && isUuid(params.epicId);
}


// Coincide con work_items.title VARCHAR(200)
const MAX_TITLE_LENGTH = 200;


// Validación común a crear y editar; devuelve el mensaje de error o null
function validateEpicFields(
    body: Record<string, unknown>
): string | null {
    const { title, estimate, dueDate } = body;

    if (
        typeof title === "string" &&
        title.length > MAX_TITLE_LENGTH
    ) {
        return `title no puede superar ${MAX_TITLE_LENGTH} caracteres`;
    }

    if (
        estimate !== undefined &&
        estimate !== null &&
        (
            typeof estimate !== "number" ||
            !Number.isInteger(estimate) ||
            estimate < 0
        )
    ) {
        return "estimate debe ser un entero mayor o igual a 0";
    }

    if (
        dueDate !== undefined &&
        dueDate !== null &&
        (typeof dueDate !== "string" || !isValidDate(dueDate))
    ) {
        return "dueDate debe tener formato AAAA-MM-DD o ser null";
    }

    return null;
}


const VALID_STATUS = [
    "TODO",
    "IN_PROGRESS",
    "DONE"
];

const VALID_PRIORITY = [
    "LOW",
    "MEDIUM",
    "HIGH",
    "CRITICAL"
];


export async function getEpics(
    req: Request<ProjectParams>,
    res: Response
) {
    try {
        if (!isUuid(req.params.id)) {
            return res.status(404).json({
                message: "Proyecto no encontrado"
            });
        }

        const epics =
            await findEpicsByProject(
                req.params.id
            );

        return res.status(200).json(epics);

    } catch (error) {
        return res.status(500).json({
            message:
                "Error obteniendo épicas"
        });
    }
}


export async function getEpic(
    req: Request<EpicParams>,
    res: Response
) {
    try {
        const epic = hasValidIds(req.params)
            ? await findEpicById(
                req.params.id,
                req.params.epicId
            )
            : undefined;

        if (!epic) {
            return res.status(404).json({
                message: "Épica no encontrada"
            });
        }

        return res.status(200).json(epic);

    } catch (error) {
        return res.status(500).json({
            message:
                "Error obteniendo épica"
        });
    }
}


export async function postEpic(
    req: Request<ProjectParams>,
    res: Response
) {
    try {
        const {
            title,
            description,
            priority,
            estimate,
            dueDate,
            createdBy
        } = req.body;

        if (!isUuid(req.params.id)) {
            return res.status(404).json({
                message: "Proyecto no encontrado"
            });
        }

        if (!title || !createdBy) {
            return res.status(400).json({
                message:
                    "title y createdBy son obligatorios"
            });
        }

        if (
            typeof createdBy !== "string" ||
            !isUuid(createdBy)
        ) {
            return res.status(400).json({
                message:
                    "createdBy debe ser un UUID válido"
            });
        }

        const invalidField =
            validateEpicFields(req.body);

        if (invalidField) {
            return res.status(400).json({
                message: invalidField
            });
        }

        const selectedPriority =
            priority ?? "MEDIUM";

        if (
            !VALID_PRIORITY.includes(
                selectedPriority
            )
        ) {
            return res.status(400).json({
                message:
                    "Prioridad inválida"
            });
        }

        if (!await findProjectById(req.params.id)) {
            return res.status(404).json({
                message: "Proyecto no encontrado"
            });
        }

        const epic = await createEpic(
            req.params.id,
            title,
            description ?? null,
            selectedPriority,
            estimate ?? null,
            dueDate ?? null,
            createdBy
        );

        return res.status(201).json(epic);

    } catch (error) {
        // 23503: createdBy no corresponde a un usuario existente
        if ((error as { code?: string }).code === "23503") {
            return res.status(400).json({
                message:
                    "createdBy no corresponde a un usuario existente"
            });
        }

        return res.status(500).json({
            message:
                "Error creando épica"
        });
    }
}


export async function putEpic(
    req: Request<EpicParams>,
    res: Response
) {
    try {
        const {
            title,
            description,
            status,
            priority,
            estimate,
            dueDate
        } = req.body;

        if (
            !title ||
            !status ||
            !priority
        ) {
            return res.status(400).json({
                message:
                    "title, status y priority son obligatorios"
            });
        }

        if (
            !VALID_STATUS.includes(status)
        ) {
            return res.status(400).json({
                message:
                    "Estado inválido"
            });
        }

        if (
            !VALID_PRIORITY.includes(priority)
        ) {
            return res.status(400).json({
                message:
                    "Prioridad inválida"
            });
        }

        const invalidField =
            validateEpicFields(req.body);

        if (invalidField) {
            return res.status(400).json({
                message: invalidField
            });
        }

        const epic = hasValidIds(req.params)
            ? await updateEpic(
                req.params.id,
                req.params.epicId,
                title,
                description ?? null,
                status,
                priority,
                estimate ?? null,
                dueDate ?? null
            )
            : undefined;

        if (!epic) {
            return res.status(404).json({
                message:
                    "Épica no encontrada"
            });
        }

        return res.status(200).json(epic);

    } catch (error) {
        return res.status(500).json({
            message:
                "Error actualizando épica"
        });
    }
}


export async function deleteEpic(
    req: Request<EpicParams>,
    res: Response
) {
    try {
        const epic = hasValidIds(req.params)
            ? await archiveEpic(
                req.params.id,
                req.params.epicId
            )
            : undefined;

        if (!epic) {
            return res.status(404).json({
                message:
                    "Épica no encontrada"
            });
        }

        return res.status(200).json({
            message:
                "Épica archivada correctamente",
            epic
        });

    } catch (error) {
        return res.status(500).json({
            message:
                "Error archivando épica"
        });
    }
}

export async function patchWorkItemEpic(
    req: Request<WorkItemParams>,
    res: Response
) {
    try {
        const { epicId } = req.body;

        if (
            !isUuid(req.params.id) ||
            !isUuid(req.params.itemId)
        ) {
            return res.status(404).json({
                message:
                    "Work item no encontrado"
            });
        }

        if (
            epicId !== null &&
            (typeof epicId !== "string" || !isUuid(epicId))
        ) {
            return res.status(400).json({
                message:
                    "epicId debe ser un UUID válido o null"
            });
        }

        /*
         * epicId = null significa quitar el Work Item de su épica actual.
         */
        if (epicId !== null) {

            const epic = await findEpicById(
                req.params.id,
                epicId
            );

            if (!epic) {
                return res.status(400).json({
                    message:
                        "La épica no existe o no pertenece al proyecto"
                });
            }
        }

        const workItem =
            await assignWorkItemToEpic(
                req.params.id,
                req.params.itemId,
                epicId
            );

        if (!workItem) {
            return res.status(404).json({
                message:
                    "Work item no encontrado"
            });
        }

        return res.status(200).json(
            workItem
        );

    } catch (error) {

        console.error(
            "Error asignando épica:",
            error
        );

        return res.status(500).json({
            message:
                "Error asignando épica"
        });
    }
}