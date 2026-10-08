import dotenv from "dotenv";

// npm -w ejecuta la API con cwd = apps/api, por eso se busca también
// el .env de la raíz del monorepo. Las variables ya definidas
// (Docker, CI, .env.test) no se sobrescriben.
dotenv.config({
    path: [".env", "../../.env"],
    quiet: true,
});

export const env = {
    port: Number(process.env.PORT ?? process.env.API_PORT ?? 3000),
    corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
};
