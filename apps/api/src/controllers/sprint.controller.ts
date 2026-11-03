import {Request, Response } from "express";

import { ProjectParams, SprintParams,WorkItemParams } from "../types/request.js";

import { findSprintsByProject, findSprintById, createSprint,updateSprint, deleteSprint, assignWorkItemToSprint } from "../repositories/sprint.repository.js";
import { findProjectById } from "../repositories/project.repository.js";
import { isValidDate } from "../utils/date.js";
import { isUuid } from "../utils/uuid.js";


// Coincide con sprints.name VARCHAR(100)
const MAX_NAME_LENGTH = 100;


// Validación común a crear y editar; devuelve el mensaje de error o null
function validateSprintFields(
    body: Record<string, unknown>
): string | null {
    const { name, startDate, endDate } = body;

    if (typeof name !== "string" || !name.trim()) {
        return "name es obligatorio";
    }

    if (name.trim().length > MAX_NAME_LENGTH) {
        return `name no puede superar ${MAX_NAME_LENGTH} caracteres`;
    }

    for (const [field, value] of [
        ["startDate", startDate],
        ["endDate", endDate]
    ] as const) {
        if (
            value !== undefined &&
            value !== null &&
            (typeof value !== "string" || !isValidDate(value))
        ) {
            return `${field} debe tener formato AAAA-MM-DD o ser null`;
        }
    }

    // Ambas fechas son AAAA-MM-DD válidas: se comparan como texto
    if (
        typeof startDate === "string" &&
        typeof endDate === "string" &&
        endDate < startDate
    ) {
        return "endDate no puede ser anterior a startDate";
    }

    return null;
}


// Un id con formato inválido no puede existir en la base
function hasValidIds(params: SprintParams) {
    return isUuid(params.id) && isUuid(params.sprintId);
}


const VALID_STATUS = [
    "PLANNED",
    "ACTIVE",
    "COMPLETED",
    "CANCELLED"
];


export async function getSprints(
    req: Request<ProjectParams>,
    res: Response
) {
    try {
        if (!isUuid(req.params.id)) {
            return res.status(404).json({
                message: "Proyecto no encontrado"
            });
        }

        const sprints =
            await findSprintsByProject(
                req.params.id
            );

        return res.status(200).json(sprints);

    } catch (error) {
        return res.status(500).json({
            message: "Error obteniendo sprints"
        });
    }
}


export async function getSprint(
    req: Request<SprintParams>,
    res: Response
) {
    try {
        const sprint = hasValidIds(req.params)
            ? await findSprintById(
                req.params.id,
                req.params.sprintId
            )
            : undefined;

        if (!sprint) {
            return res.status(404).json({
                message: "Sprint no encontrado"
            });
        }

        return res.status(200).json(sprint);

    } catch (error) {
        return res.status(500).json({
            message: "Error obteniendo sprint"
        });
    }
}


export async function postSprint(
    req: Request<ProjectParams>,
    res: Response
) {
    try {
        const {
            name,
            goal,
            startDate,
            endDate
        } = req.body;

        if (!isUuid(req.params.id)) {
            return res.status(404).json({
                message: "Proyecto no encontrado"
            });
        }

        const invalidField =
            validateSprintFields(req.body);

        if (invalidField) {
            return res.status(400).json({
                message: invalidField
            });
        }

        if (!await findProjectById(req.params.id)) {
            return res.status(404).json({
                message: "Proyecto no encontrado"
            });
        }

        const sprint = await createSprint(
            req.params.id,
            name.trim(),
            goal ?? null,
            startDate ?? null,
            endDate ?? null
        );

        return res.status(201).json(sprint);

    } catch (error) {
        return res.status(500).json({
            message: "Error creando sprint"
        });
    }
}


export async function putSprint(
    req: Request<SprintParams>,
    res: Response
) {
    try {
        const {
            name,
            goal,
            status,
            startDate,
            endDate
        } = req.body;

        if (!status) {
            return res.status(400).json({
                message:
                    "name y status son obligatorios"
            });
        }

        const invalidField =
            validateSprintFields(req.body);

        if (invalidField) {
            return res.status(400).json({
                message: invalidField
            });
        }

        if (!VALID_STATUS.includes(status)) {
            return res.status(400).json({
                message:
                    "Estado de sprint inválido"
            });
        }

        const sprint = hasValidIds(req.params)
            ? await updateSprint(
                req.params.id,
                req.params.sprintId,
                name.trim(),
                goal ?? null,
                status,
                startDate ?? null,
                endDate ?? null
            )
            : undefined;

        if (!sprint) {
            return res.status(404).json({
                message: "Sprint no encontrado"
            });
        }

        return res.status(200).json(sprint);

    } catch (error) {
        return res.status(500).json({
            message: "Error actualizando sprint"
        });
    }
}


export async function removeSprint(
    req: Request<SprintParams>,
    res: Response
) {
    try {
        const sprint = hasValidIds(req.params)
            ? await deleteSprint(
                req.params.id,
                req.params.sprintId
            )
            : undefined;

        if (!sprint) {
            return res.status(404).json({
                message: "Sprint no encontrado"
            });
        }

        return res.status(200).json({
            message:
                "Sprint eliminado correctamente",
            sprint
        });

    } catch (error) {
        return res.status(500).json({
            message: "Error eliminando sprint"
        });
    }
}


export async function patchWorkItemSprint(
    req: Request<WorkItemParams>,
    res: Response
) {
    try {
        const {sprintId} = req.body;

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
            sprintId !== null &&
            (typeof sprintId !== "string" || !isUuid(sprintId))
        ) {
            return res.status(400).json({
                message:
                    "sprintId debe ser un UUID válido o null"
            });
        }

        // null significa volver al backlog.
        if (sprintId !== null) {

            const sprint =
                await findSprintById(
                    req.params.id,
                    sprintId
                );

            if (!sprint) {
                return res.status(400).json({
                    message:
                        "El sprint no pertenece al proyecto"
                });
            }
        }

        const workItem =
            await assignWorkItemToSprint(
                req.params.id,
                req.params.itemId,
                sprintId
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
        return res.status(500).json({
            message:
                "Error asignando sprint"
        });
    }
}