import { useId, useRef, useState } from "react";
import type { SubmitEvent } from "react";
import { Navigate, useSearchParams } from "react-router-dom";

import { useAuth } from "../context/authContext";
import { getRedirectTarget } from "../utils/redirect";

import "../components/ProjectForm.css";
import "./LoginPage.css";

interface FieldErrors {
  email?: string;
  password?: string;
}

function LoginPage() {
  const emailId = useId();
  const passwordId = useId();
  const { user, login } = useAuth();
  const [searchParams] = useSearchParams();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Con la sesión iniciada (o recién iniciada) se va a la página pedida
  if (user) {
    return (
      <Navigate to={getRedirectTarget(searchParams.get("redirect"))} replace />
    );
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    const errors: FieldErrors = {
      email: email ? undefined : "Ingresa tu correo.",
      password: password ? undefined : "Ingresa tu contraseña.",
    };

    setFieldErrors(errors);
    setError(null);

    if (errors.email || errors.password) {
      (errors.email ? emailRef : passwordRef).current?.focus();
      return;
    }

    try {
      setIsSubmitting(true);

      await login(email, password);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No fue posible iniciar sesión.",
      );
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <p className="login-brand">Mira</p>
        <h1 id="login-title">Iniciar sesión</h1>

        <form className="project-form" noValidate onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor={emailId}>Correo</label>
            <input
              ref={emailRef}
              id={emailId}
              name="email"
              type="email"
              autoComplete="username"
              aria-invalid={fieldErrors.email ? true : undefined}
              aria-describedby={
                fieldErrors.email ? `${emailId}-error` : undefined
              }
            />
            {fieldErrors.email && (
              <p id={`${emailId}-error`} className="field-error">
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div className="field">
            <label htmlFor={passwordId}>Contraseña</label>
            <input
              ref={passwordRef}
              id={passwordId}
              name="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={fieldErrors.password ? true : undefined}
              aria-describedby={
                fieldErrors.password ? `${passwordId}-error` : undefined
              }
            />
            {fieldErrors.password && (
              <p id={`${passwordId}-error`} className="field-error">
                {fieldErrors.password}
              </p>
            )}
          </div>

          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn-primary login-submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Iniciando sesión..." : "Iniciar sesión"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default LoginPage;
