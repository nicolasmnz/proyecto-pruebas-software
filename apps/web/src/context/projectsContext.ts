import { createContext, useContext } from "react";

import type { Project } from "../api/projects";

export interface ProjectsContextValue {
  projects: Project[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

// Valor por defecto para componentes renderizados fuera del provider (p. ej. en tests)
export const ProjectsContext = createContext<ProjectsContextValue>({
  projects: [],
  isLoading: false,
  error: null,
  reload: async () => {},
});

export function useProjects() {
  return useContext(ProjectsContext);
}
