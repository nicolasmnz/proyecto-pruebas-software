import { Request, Response } from "express";
import { EpicParams, ProjectParams, WorkItemParams } from "../types/request.js";
import {findEpicsByProject, findEpicById, createEpic, updateEpic, archiveEpic, assignWorkItemToEpic } from "../repositories/epic.repository.js";




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
        const epic = await findEpicById(
            req.params.id,
            req.params.epicId
        );

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

        if (!title || !createdBy) {
            return res.status(400).json({
                message:
                    "title y createdBy son obligatorios"
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

        const epic = await updateEpic(
            req.params.id,
            req.params.epicId,
            title,
            description ?? null,
            status,
            priority,
            estimate ?? null,
            dueDate ?? null
        );

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
        const epic = await archiveEpic(
            req.params.id,
            req.params.epicId
        );

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