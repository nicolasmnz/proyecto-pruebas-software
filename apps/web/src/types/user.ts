export interface User {
    id: string;
    name: string;
    email: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface CreateUserInput {
    name: string;
    email: string;
    password: string;
}

export interface UpdateUserInput {
    name: string;
    email: string;
}