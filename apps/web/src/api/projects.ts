export interface CreateProjectData {
  name: string;
  description?: string;
  createdBy: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

const API_URL = import.meta.env.VITE_API_URL;

export async function createProject(data: CreateProjectData): Promise<Project> {
  const response = await fetch(`${API_URL}/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();

    throw new Error(error.message ?? "No fue posible crear el proyecto");
  }

  return response.json();
}
