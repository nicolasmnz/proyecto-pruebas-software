import { Request, Response } from "express";

import { IdParams } from "../types/request.js";

import {
    findAllUsers,
    findUserById,
    findUserByEmail,
    createUser,
    updateUser,
    deactivateUser
} from "../repositories/user.repository.js";


export async function getUsers(
    _req: Request,
    res: Response
) {
    try {
        const users = await findAllUsers();

        return res.status(200).json(users);

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Error obteniendo usuarios"
        });
    }
}


export async function getUser(
    req: Request<IdParams>,
    res: Response
) {
    try {
        const user = await findUserById(
            req.params.id
        );

        if (!user) {
            return res.status(404).json({
                message: "Usuario no encontrado"
            });
        }

        return res.status(200).json(user);

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Error obteniendo usuario"
        });
    }
}


export async function postUser(
    req: Request,
    res: Response
) {
    try {
        const {
            name,
            email,
            password
        } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message:
                    "name, email y password son obligatorios"
            });
        }

        const existingUser =
            await findUserByEmail(email);

        if (existingUser) {
            return res.status(409).json({
                message:
                    "El correo ya está registrado"
            });
        }

        const user = await createUser(
            name,
            email,
            password
        );

        return res.status(201).json(user);

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Error creando usuario"
        });
    }
}


export async function putUser(
    req: Request<IdParams>,
    res: Response
) {
    try {
        const {
            name,
            email
        } = req.body;

        if (!name || !email) {
            return res.status(400).json({
                message:
                    "name y email son obligatorios"
            });
        }

        const user = await updateUser(
            req.params.id,
            name,
            email
        );

        if (!user) {
            return res.status(404).json({
                message:
                    "Usuario no encontrado"
            });
        }

        return res.status(200).json(user);

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message:
                "Error actualizando usuario"
        });
    }
}


export async function deleteUser(
    req: Request<IdParams>,
    res: Response
) {
    try {
        const user = await deactivateUser(
            req.params.id
        );

        if (!user) {
            return res.status(404).json({
                message:
                    "Usuario no encontrado"
            });
        }

        return res.status(200).json({
            message:
                "Usuario desactivado correctamente",
            user
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message:
                "Error desactivando usuario"
        });
    }
}