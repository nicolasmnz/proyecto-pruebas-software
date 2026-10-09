import { describe, expect, test } from "@jest/globals";

import { hashPassword, verifyPassword } from "../../src/utils/password.js";

describe("password utils", () => {
  test("hashPassword no guarda la contraseña en texto plano", async () => {
    const hash = await hashPassword("123456");

    expect(hash).not.toContain("123456");
    expect(hash).toMatch(/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
  });

  test("hashPassword genera un hash distinto en cada llamada (salt)", async () => {
    const first = await hashPassword("123456");
    const second = await hashPassword("123456");

    expect(first).not.toBe(second);
  });

  test("verifyPassword acepta la contraseña correcta", async () => {
    const hash = await hashPassword("secreto");

    await expect(verifyPassword("secreto", hash)).resolves.toBe(true);
  });

  test("verifyPassword rechaza una contraseña incorrecta", async () => {
    const hash = await hashPassword("secreto");

    await expect(verifyPassword("otra", hash)).resolves.toBe(false);
  });

  test.each(["123456", "", "scrypt$abc", "bcrypt$00$00"])(
    "verifyPassword rechaza un hash con formato inválido: %p",
    async (storedHash) => {
      await expect(verifyPassword("123456", storedHash)).resolves.toBe(false);
    },
  );
});
