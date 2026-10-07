export interface Project {
    id: string;
    name: string;
    description: string | null;
    created_by: string;
    is_archived: boolean;
    created_at: string;
    updated_at: string;
}