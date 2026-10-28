export type SprintStatus =
    | "PLANNED"
    | "ACTIVE"
    | "COMPLETED"
    | "CANCELLED";

export interface Sprint {
    id: string;
    project_id: string;
    name: string;
    goal: string | null;
    status: SprintStatus;
    start_date: string | null;
    end_date: string | null;
    created_at: Date;
    updated_at: Date;
}

export interface CreateSprintInput {
    name: string;
    goal?: string;
    startDate?: string;
    endDate?: string;
}

export interface UpdateSprintInput {
    name: string;
    goal?: string;
    status: SprintStatus;
    startDate?: string;
    endDate?: string;
}