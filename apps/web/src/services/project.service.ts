import type {
    Project
} from "../types/project";


const API_URL =
    "http://localhost:3000/api/projects";


export async function getProjects():
Promise<Project[]> {

    const response =
        await fetch(API_URL);

    if (!response.ok) {
        throw new Error(
            "Error obteniendo proyectos"
        );
    }

    return response.json();
}


export async function createProject(
    data: {
        name: string;
        description: string;
        createdBy: string;
    }
) {
    const response =
        await fetch(API_URL, {
            method: "POST",

            headers: {
                "Content-Type":
                    "application/json"
            },

            body: JSON.stringify(data)
        });

    if (!response.ok) {
        throw new Error(
            "Error creando proyecto"
        );
    }

    return response.json();
}


export async function updateProject(
    id: string,
    data: {
        name: string;
        description: string;
    }
) {
    const response =
        await fetch(
            `${API_URL}/${id}`,
            {
                method: "PUT",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(data)
            }
        );

    if (!response.ok) {
        throw new Error(
            "Error actualizando proyecto"
        );
    }

    return response.json();
}


export async function deleteProject(
    id: string
) {
    const response =
        await fetch(
            `${API_URL}/${id}`,
            {
                method: "DELETE"
            }
        );

    if (!response.ok) {
        throw new Error(
            "Error archivando proyecto"
        );
    }

    return response.json();
}