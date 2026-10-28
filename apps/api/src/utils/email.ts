// Los correos se comparan sin espacios alrededor y en minúsculas
export function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}
