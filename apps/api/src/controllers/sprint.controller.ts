import {Request, Response } from "express";

import { ProjectParams, SprintParams,WorkItemParams } from "../types/request.js";

import { findSprintsByProject, findSprintById, createSprint,updateSprint, deleteSprint, assignWorkItemToSprint } from "../repositories/sprint.repository.js";


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
        const sprint = await findSprintById(
            req.params.id,
            req.params.sprintId
        );

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

        if (!name) {
            return res.status(400).json({
                message: "name es obligatorio"
            });
        }

        if (
            startDate &&
            endDate &&
            new Date(endDate) <
            new Date(startDate)
        ) {
            return res.status(400).json({
                message:
                    "endDate no puede ser anterior a startDate"
            });
        }

        const sprint = await createSprint(
            req.params.id,
            name,
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

        if (!name || !status) {
            return res.status(400).json({
                message:
                    "name y status son obligatorios"
            });
        }

        if (!VALID_STATUS.includes(status)) {
            return res.status(400).json({
                message:
                    "Estado de sprint inválido"
            });
        }

        if (
            startDate &&
            endDate &&
            new Date(endDate) <
            new Date(startDate)
        ) {
            return res.status(400).json({
                message:
                    "endDate no puede ser anterior a startDate"
            });
        }

        const sprint = await updateSprint(
            req.params.id,
            req.params.sprintId,
            name,
            goal ?? null,
            status,
            startDate ?? null,
            endDate ?? null
        );

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
        const sprint = await deleteSprint(
            req.params.id,
            req.params.sprintId
        );

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