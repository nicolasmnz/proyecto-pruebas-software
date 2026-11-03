import { randomBytes } from "node:crypto";
import { Request, Response } from "express";
import { findUserByEmail } from "../repositories/user.repository.js";
import { verifyPassword } from "../utils/password.js";


// Hash de relleno con el formato real: con un correo inexistente se calcula
// scrypt igual que con uno registrado, y el tiempo de respuesta no lo delata
const DUMMY_HASH = `scrypt$${randomBytes(16).toString("hex")}$${randomBytes(64).toString("hex")}`;


export async function login(
    req: Request,
    res: Response
) {
    try {
        const {
            email,
            password
        } = req.body;

        // Solo texto: scrypt falla con números u objetos
        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                message: "email y password son obligatorios"
            });
        }

        const user = await findUserByEmail(email);

        if (!user) {
            await verifyPassword(password, DUMMY_HASH);

            return res.status(401).json({
                message: "Correo o contraseña incorrectos"
            });
        }

        const isValidPassword = await verifyPassword(
            password,
            user.password_hash
        );

        if (!isValidPassword) {
            return res.status(401).json({
                message: "Correo o contraseña incorrectos"
            });
        }

        // Solo quien conoce la contraseña sabe que la cuenta está desactivada
        if (!user.is_active) {
            return res.status(403).json({
                message: "Usuario desactivado"
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