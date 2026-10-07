import type {
    CreateUserInput,
    UpdateUserInput,
    User
} from "../types/user";


const API_URL =
    "http://localhost:3000/api/users";


export async function getUsers():
Promise<User[]> {

    const response =
        await fetch(API_URL);

    if (!response.ok) {
        throw new Error(
            "Error obteniendo usuarios"
        );
    }

    return response.json();
}


export async function createUser(
    data: CreateUserInput
) {
    const response =
        await fetch(
            API_URL,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(data)
            }
        );

    if (!response.ok) {
        const data =
            await response.json();

        throw new Error(
            data.message ??
            "Error creando usuario"
        );
    }

    return response.json();
}


export async function updateUser(
    id: string,
    data: UpdateUserInput
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
            "Error actualizando usuario"
        );
    }

    return response.json();
}


export async function deleteUser(
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
            "Error desactivando usuario"
        );
    }

    return response.json();
}