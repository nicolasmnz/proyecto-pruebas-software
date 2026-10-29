import { useId } from "react";

import { useTheme } from "../context/themeContext";
import type { Accent, ThemePreference } from "../utils/theme";

import "./SettingsPage.css";

const THEME_OPTIONS: {
  value: ThemePreference;
  label: string;
  description: string;
}[] = [
  {
    value: "system",
    label: "Según el sistema",
    description: "Claro u oscuro, igual que tu sistema operativo.",
  },
  {
    value: "light",
    label: "Claro",
    description: "Fondo claro y texto oscuro.",
  },
  {
    value: "dark",
    label: "Oscuro",
    description: "Fondo oscuro y texto claro.",
  },
];

// Muestra de cada acento; son los valores de themes.css en el tema claro
const ACCENT_OPTIONS: { value: Accent; label: string; swatch: string }[] = [
  { value: "blue", label: "Azul", swatch: "#0c66e4" },
  { value: "green", label: "Verde", swatch: "#1a7a50" },
  { value: "purple", label: "Morado", swatch: "#6e5dc6" },
  { value: "orange", label: "Naranja", swatch: "#a54800" },
];

function SettingsPage() {
  const { theme, accent, highContrast, setTheme, setAccent, setHighContrast } =
    useTheme();
  const accentHintId = useId();

  return (
    <div className="settings-page">
      <h1>Configuración</h1>

      <section className="settings-section" aria-labelledby="appearance-title">
        <h2 id="appearance-title">Apariencia</h2>
        <p className="settings-hint">
          Los cambios se aplican al instante y se guardan en este navegador.
        </p>

        <fieldset className="settings-group">
          <legend>Tema</legend>

          {THEME_OPTIONS.map((option) => (
            <label key={option.value} className="settings-option">
              <input
                type="radio"
                name="theme"
                value={option.value}
                checked={theme === option.value}
                onChange={() => setTheme(option.value)}
              />
              <span>
                <span className="settings-option-label">{option.label}</span>
                <span className="settings-option-description">
                  {option.description}
                </span>
              </span>
            </label>
          ))}

          <label className="settings-option settings-contrast">
            <input
              type="checkbox"
              checked={highContrast}
              onChange={(event) => setHighContrast(event.target.checked)}
            />
            <span>
              <span className="settings-option-label">Alto contraste</span>
              <span className="settings-option-description">
                Bordes y textos reforzados. Respeta el tema: negro sobre blanco
                en claro y blanco sobre negro en oscuro.
              </span>
            </span>
          </label>
        </fieldset>

        <fieldset
          className="settings-group"
          disabled={highContrast}
          aria-describedby={highContrast ? accentHintId : undefined}
        >
          <legend>Color de acento</legend>

          {highContrast && (
            <p id={accentHintId} className="settings-hint">
              El alto contraste usa su propio color de acento.
            </p>
          )}

          <div className="settings-accents">
            {ACCENT_OPTIONS.map((option) => (
              <label key={option.value} className="settings-accent">
                <input
                  type="radio"
                  name="accent"
                  value={option.value}
                  checked={accent === option.value}
                  onChange={() => setAccent(option.value)}
                />
                <span
                  className="settings-swatch"
                  style={{ background: option.swatch }}
                  aria-hidden="true"
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
      </section>
    </div>
  );
}

export default SettingsPage;
