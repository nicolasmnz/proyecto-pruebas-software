export interface User {
    id: string;
    name: string;
    email: string;
    password: string;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface CreateUserInput {
    name: string;
    email: string;
    password: string;
}

export interface LoginInput {
    email: string;
    password: string;
}