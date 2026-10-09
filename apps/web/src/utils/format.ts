const dateFormatter = new Intl.DateTimeFormat("es-CL", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatDate(value: string): string {
  return dateFormatter.format(new Date(value));
}

// Fecha sin hora (AAAA-MM-DD): se interpreta como día local, no como UTC,
// para que no se corra al día anterior en husos al oeste de Greenwich
export function formatDueDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);

  return dateFormatter.format(new Date(year, month - 1, day));
}

export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return "?";
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  "#0c66e4",
  "#1f845a",
  "#6e5dc6",
  "#c9372c",
  "#b65c02",
  "#227d9b",
];

// Color estable por proyecto: el mismo id siempre produce el mismo color
export function getAvatarColor(id: string): string {
  // FNV-1a: distribuye mejor que una suma simple entre ids parecidos
  let hash = 2166136261;

  for (const char of id) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619) >>> 0;
  }

  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

// Minúsculas y sin tildes, para que "gestion" encuentre "Gestión"
export function normalizeText(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}
