import {useEffect,useState} from "react";
import type {SyntheticEvent} from "react";
import type {User} from "../types/user";
import {createUser,deleteUser,getUsers,updateUser} from "../services/user.service";

export default function UsersPage() {

    const [users, setUsers] =
        useState<User[]>([]);

    const [name, setName] =
        useState("");

    const [email, setEmail] =
        useState("");

    const [password, setPassword] =
        useState("");

    const [editingId, setEditingId] =
        useState<string | null>(null);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");


    async function loadUsers() {
        try {
            setLoading(true);
            setError("");

            const data =
                await getUsers();

            setUsers(data);

        } catch (error) {

            if (error instanceof Error) {
                setError(error.message);
            }

        } finally {
            setLoading(false);
        }
    }


    useEffect(() => {
        loadUsers();
    }, []);


    async function handleSubmit(
        event: SyntheticEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        setError("");

        try {

            if (editingId) {

                await updateUser(
                    editingId,
                    {
                        name,
                        email
                    }
                );

            } else {

                await createUser({
                    name,
                    email,
                    password
                });
            }

            resetForm();

            await loadUsers();

        } catch (error) {

            if (error instanceof Error) {
                setError(error.message);
            }
        }
    }


    function handleEdit(
        user: User
    ) {
        setEditingId(user.id);

        setName(user.name);
        setEmail(user.email);

        // No necesitamos contraseña
        // al editar el usuario.
        setPassword("");
    }


    async function handleDelete(
        id: string
    ) {
        try {
            setError("");

            await deleteUser(id);

            await loadUsers();

        } catch (error) {

            if (error instanceof Error) {
                setError(error.message);
            }
        }
    }


    function resetForm() {
        setName("");
        setEmail("");
        setPassword("");
        setEditingId(null);
    }


    if (loading) {
        return (
            <main>
                <p>Cargando usuarios...</p>
            </main>
        );
    }


    return (
        <main>

            <h1>Usuarios</h1>


            {/* FORMULARIO CREATE / UPDATE */}

            <section>

                <h2>
                    {editingId
                        ? "Editar usuario"
                        : "Crear usuario"
                    }
                </h2>


                <form onSubmit={handleSubmit}>

                    <div>
                        <label htmlFor="name">
                            Nombre
                        </label>

                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(event) =>
                                setName(
                                    event.target.value
                                )
                            }
                            required
                        />
                    </div>


                    <div>
                        <label htmlFor="email">
                            Correo
                        </label>

                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(event) =>
                                setEmail(
                                    event.target.value
                                )
                            }
                            required
                        />
                    </div>


                    {!editingId && (
                        <div>
                            <label htmlFor="password">
                                Contraseña
                            </label>

                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(event) =>
                                    setPassword(
                                        event.target.value
                                    )
                                }
                                required
                            />
                        </div>
                    )}


                    <button type="submit">
                        {editingId
                            ? "Guardar cambios"
                            : "Crear usuario"
                        }
                    </button>


                    {editingId && (
                        <button
                            type="button"
                            onClick={resetForm}
                        >
                            Cancelar
                        </button>
                    )}

                </form>

            </section>


            {error && (
                <p>
                    {error}
                </p>
            )}


            <hr />


            {/* LISTADO */}

            <section>

                <h2>
                    Usuarios registrados
                </h2>


                {users.length === 0 ? (

                    <p>
                        No existen usuarios.
                    </p>

                ) : (

                    <table>

                        <thead>
                            <tr>
                                <th>
                                    Nombre
                                </th>

                                <th>
                                    Correo
                                </th>

                                <th>
                                    Estado
                                </th>

                                <th>
                                    Acciones
                                </th>
                            </tr>
                        </thead>


                        <tbody>

                            {users.map((user) => (

                                <tr key={user.id}>

                                    <td>
                                        {user.name}
                                    </td>

                                    <td>
                                        {user.email}
                                    </td>

                                    <td>
                                        {user.is_active
                                            ? "Activo"
                                            : "Inactivo"
                                        }
                                    </td>

                                    <td>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleEdit(
                                                    user
                                                )
                                            }
                                            disabled={
                                                !user.is_active
                                            }
                                        >
                                            Editar
                                        </button>


                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleDelete(
                                                    user.id
                                                )
                                            }
                                            disabled={
                                                !user.is_active
                                            }
                                        >
                                            Desactivar
                                        </button>

                                    </td>

                                </tr>

                            ))}

                        </tbody>

                    </table>

                )}

            </section>

        </main>
    );
}