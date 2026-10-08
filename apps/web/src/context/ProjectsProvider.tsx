import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { getArchivedProjects, getProjects } from "../api/projects";
import type { Project } from "../api/projects";
import { ProjectsContext } from "./projectsContext";

type LoadResult =
  | { projects: Project[]; archivedProjects: Project[] }
  | { error: string };

async function loadProjects(signal?: AbortSignal): Promise<LoadResult> {
  try {
    const [projects, archivedProjects] = await Promise.all([
      getProjects(signal),
      getArchivedProjects(signal),
    ]);

    return { projects, archivedProjects };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "No fue posible cargar los proyectos",
    };
  }
}

interface ProjectsProviderProps {
  children: ReactNode;
}

function ProjectsProvider({ children }: ProjectsProviderProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [archivedProjects, setArchivedProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyResult = useCallback((result: LoadResult) => {
    if ("projects" in result) {
      setProjects(result.projects);
      setArchivedProjects(result.archivedProjects);
      setError(null);
    } else {
      setError(result.error);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    loadProjects(controller.signal).then((result) => {
      if (!controller.signal.aborted) {
        applyResult(result);
      }
    });

    return () => controller.abort();
  }, [applyResult]);

  const reload = useCallback(async () => {
    setIsLoading(true);

    applyResult(await loadProjects());
  }, [applyResult]);

  const value = useMemo(
    () => ({ projects, archivedProjects, isLoading, error, reload }),
    [projects, archivedProjects, isLoading, error, reload],
  );

  return (
    <ProjectsContext.Provider value={value}>
      {children}
    </ProjectsContext.Provider>
  );
}

export default ProjectsProvider;
