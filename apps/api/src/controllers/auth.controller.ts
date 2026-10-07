import { Request, Response } from "express";

import {
    findUserByEmail
} from "../repositories/user.repository.js";


export async function login(
    req: Request,
    res: Response
) {
    try {
        const {
            email,
            password
        } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "email y password son obligatorios"
            });
        }

        const user = await findUserByEmail(email);

        if (!user) {
            return res.status(401).json({
                message: "Correo o contraseña incorrectos"
            });
        }

        if (!user.is_active) {
            return res.status(403).json({
                message: "Usuario desactivado"
            });
        }

        // password_hash es texto plano
        if (user.password_hash !== password) {
            return res.status(401).json({
                message: "Correo o contraseña incorrectos"
            });
        }

        return res.status(200).json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                is_active: user.is_active
            }
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Error iniciando sesión"
        });
    }
}