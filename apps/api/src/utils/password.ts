import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
    password: string,
    salt: string,
    keylen: number
) => Promise<Buffer>;

const KEY_LENGTH = 64;
const ALGORITHM = "scrypt";

// Formato almacenado: scrypt$<salt hex>$<hash hex>
export async function hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString("hex");
    const derivedKey = await scryptAsync(password, salt, KEY_LENGTH);

    return `${ALGORITHM}$${salt}$${derivedKey.toString("hex")}`;
}

export async function verifyPassword(
    password: string,
    storedHash: string
): Promise<boolean> {
    const [algorithm, salt, hash] = storedHash.split("$");

    if (algorithm !== ALGORITHM || !salt || !hash) {
        return false;
    }

    const expected = Buffer.from(hash, "hex");

    if (expected.length !== KEY_LENGTH) {
        return false;
    }

    const derivedKey = await scryptAsync(password, salt, KEY_LENGTH);

    return timingSafeEqual(derivedKey, expected);
}
