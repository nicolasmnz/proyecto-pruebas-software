import { Request, Response } from 'express';
import { IdParams } from '../types/request.js';
import { isUuid } from '../utils/uuid.js';

import {
    findAllProjects,
    findProjectById,
    createProject,
    updateProject,
    archiveProject,
    restoreProject
} from '../repositories/project.repository.js';

// Coincide con VARCHAR(150) de projects.name
const MAX_NAME_LENGTH = 150;

function validateName(name: unknown): string | null {
    if (typeof name !== 'string' || !name.trim()) {
        return 'name es obligatorio';
    }

    if (name.trim().length > MAX_NAME_LENGTH) {
        return `name no puede superar ${MAX_NAME_LENGTH} caracteres`;
    }

    return null;
}

function normalizeDescription(description: unknown): string | null {
    return typeof description === 'string' && description.trim()
        ? description.trim()
        : null;
}


export async function getProjects(
    req: Request,
    res: Response
) {
    try {
        const projects = await findAllProjects(
            req.query.archived === 'true'
        );

        return res.status(200).json(projects);

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: 'Error obteniendo proyectos'
        });
    }
}


export async function getProject(
    req: Request<IdParams>,
    res: Response
) {
    try {
        // Un id con formato inválido no puede existir: evita el error 500 de PostgreSQL
        if (!isUuid(req.params.id)) {
            return res.status(404).json({
                message: 'Proyecto no encontrado'
            });
        }

        const project = await findProjectById(
            req.params.id
        );

        if (!project) {
            return res.status(404).json({
                message: 'Proyecto no encontrado'
            });
        }

        return res.status(200).json(project);

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: 'Error obteniendo proyecto'
        });
    }
}


export async function postProject(
    req: Request,
    res: Response
) {
    try {
        const {
            name,
            description,
            createdBy
        } = req.body;

        if (!createdBy) {
            return res.status(400).json({
                message: 'createdBy es obligatorio'
            });
        }

        const nameError = validateName(name);

        if (nameError) {
            return res.status(400).json({
                message: nameError
            });
        }

        const project = await createProject({
            name: name.trim(),
            description: normalizeDescription(description) ?? undefined,
            createdBy
        });

        return res.status(201).json(project);

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: 'Error creando proyecto'
        });
    }
}


export async function putProject(
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
            name,
            description
        } = req.body;

        const nameError = validateName(name);

        if (nameError) {
            return res.status(400).json({
                message: nameError
            });
        }

        const project = await updateProject(
            req.params.id,
            name.trim(),
            normalizeDescription(description)
        );

        if (!project) {
            return res.status(404).json({
                message: 'Proyecto no encontrado'
            });
        }

        return res.status(200).json(project);

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: 'Error actualizando proyecto'
        });
    }
}


export async function deleteProject(
    req: Request<IdParams>,
    res: Response
) {
    try {
        if (!isUuid(req.params.id)) {
            return res.status(404).json({
                message: 'Proyecto no encontrado'
            });
        }

        const project = await archiveProject(
            req.params.id
        );

        if (!project) {
            return res.status(404).json({
                message: 'Proyecto no encontrado'
            });
        }

        return res.status(200).json({
            message: 'Proyecto archivado correctamente',
            project
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: 'Error archivando proyecto'
        });
    }
}


export async function patchRestoreProject(
    req: Request<IdParams>,
    res: Response
) {
    try {
        if (!isUuid(req.params.id)) {
            return res.status(404).json({
                message: 'Proyecto no encontrado'
            });
        }

        const project = await restoreProject(
            req.params.id
        );

        if (!project) {
            return res.status(404).json({
                message: 'Proyecto no encontrado'
            });
        }

        return res.status(200).json(project);

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: 'Error restaurando proyecto'
        });
    }
}
