import { useState } from "react";
import type { SyntheticEvent } from "react";
import { useNavigate } from "react-router-dom";
import {login} from "../services/auth.service";
import {useAuth} from "../context/AuthContext";


export default function LoginPage() {
    const [email, setEmail] =
        useState("");

    const [password, setPassword] =
        useState("");

    const [error, setError] =
        useState("");

    const navigate = useNavigate();

    const {
        loginUser
    } = useAuth();


    async function handleSubmit(
        event: SyntheticEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        setError("");

        try {
            const user = await login(
                email,
                password
            );

            loginUser(user);

            navigate("/projects");

        } catch (error) {
            if (error instanceof Error) {
                setError(error.message);
            }
        }
    }


    return (
        <main>
            <h1>Mira</h1>

            <h2>Iniciar sesión</h2>

            <form onSubmit={handleSubmit}>
                <label>
                    Correo
                </label>

                <input
                    type="email"
                    value={email}
                    onChange={(event) =>
                        setEmail(event.target.value)
                    }
                    required
                />

                <label>
                    Contraseña
                </label>

                <input
                    type="password"
                    value={password}
                    onChange={(event) =>
                        setPassword(event.target.value)
                    }
                    required
                />

                {error && (
                    <p>{error}</p>
                )}

                <button type="submit">
                    Iniciar sesión
                </button>
            </form>
        </main>
    );
}