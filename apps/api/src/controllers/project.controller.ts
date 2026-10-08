import { Request, Response } from 'express';
import { IdParams } from '../types/request.js';

import {
    findAllProjects,
    findProjectById,
    createProject,
    updateProject,
    archiveProject
} from '../repositories/project.repository.js';


export async function getProjects(
    _req: Request,
    res: Response
) {
    try {
        const projects = await findAllProjects();

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

        if (!name || !createdBy) {
            return res.status(400).json({
                message: 'name y createdBy son obligatorios'
            });
        }

        const project = await createProject({
            name,
            description,
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
        const {
            name,
            description
        } = req.body;

        if (!name) {
            return res.status(400).json({
                message: 'name es obligatorio'
            });
        }

        const project = await updateProject(
            req.params.id,
            name,
            description ?? null
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