import {useEffect,useState} from "react";
import type { SyntheticEvent } from "react";
import type {Project} from "../types/project";
import {createProject,deleteProject,getProjects,updateProject} from "../services/project.service";
import {useAuth} from "../context/AuthContext";


export default function ProjectsPage() {

    const [projects, setProjects] =
        useState<Project[]>([]);

    const [name, setName] =
        useState("");

    const [description, setDescription] =
        useState("");

    const [editingId, setEditingId] =
        useState<string | null>(null);

    const {
        user
    } = useAuth();


    async function loadProjects() {
        const data =
            await getProjects();

        setProjects(data);
    }


    useEffect(() => {
        loadProjects();
    }, []);


    async function handleSubmit(
        event: SyntheticEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (!user) {
            return;
        }

        if (editingId) {

            await updateProject(
                editingId,
                {
                    name,
                    description
                }
            );

        } else {

            await createProject({
                name,
                description,
                createdBy: user.id
            });
        }

        setName("");
        setDescription("");
        setEditingId(null);

        await loadProjects();
    }


    function handleEdit(
        project: Project
    ) {
        setEditingId(project.id);

        setName(project.name);

        setDescription(
            project.description ?? ""
        );
    }


    async function handleDelete(
        id: string
    ) {
        await deleteProject(id);

        await loadProjects();
    }


    return (
        <main>

            <h1>Proyectos</h1>


            <form onSubmit={handleSubmit}>

                <input
                    type="text"
                    placeholder="Nombre"
                    value={name}
                    onChange={(event) =>
                        setName(
                            event.target.value
                        )
                    }
                    required
                />


                <textarea
                    placeholder="Descripción"
                    value={description}
                    onChange={(event) =>
                        setDescription(
                            event.target.value
                        )
                    }
                />


                <button type="submit">
                    {editingId
                        ? "Guardar cambios"
                        : "Crear proyecto"
                    }
                </button>


                {editingId && (
                    <button
                        type="button"
                        onClick={() => {
                            setEditingId(null);
                            setName("");
                            setDescription("");
                        }}
                    >
                        Cancelar
                    </button>
                )}

            </form>


            <hr />


            {projects.map(
                (project) => (

                    <article
                        key={project.id}
                    >

                        <h2>
                            {project.name}
                        </h2>

                        <p>
                            {
                                project.description
                            }
                        </p>


                        <button
                            onClick={() =>
                                handleEdit(
                                    project
                                )
                            }
                        >
                            Editar
                        </button>


                        <button
                            onClick={() =>
                                handleDelete(
                                    project.id
                                )
                            }
                        >
                            Archivar
                        </button>

                    </article>
                )
            )}

        </main>
    );
}