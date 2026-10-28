export interface Epic {
    id: string;
    project_id: string;
    type: "EPIC";
    title: string;
    description: string | null;
    status: string;
    priority: string;
    estimate: number | null;
    due_date: string | null;
    created_at: Date;
    updated_at: Date;
}

export interface CreateEpicInput {
    title: string;
    description?: string;
    priority?: string;
    estimate?: number;
    dueDate?: string;
    createdBy: string;
}

export interface UpdateEpicInput {
    title: string;
    description?: string;
    status: string;
    priority: string;
    estimate?: number;
    dueDate?: string;
}