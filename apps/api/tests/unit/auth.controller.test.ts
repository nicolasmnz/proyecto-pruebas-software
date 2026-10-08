import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import type { Request, Response } from "express";

import { login } from "../../src/controllers/auth.controller.js";
import { findUserByEmail } from "../../src/repositories/user.repository.js";
import { hashPassword } from "../../src/utils/password.js";

jest.mock("../../src/repositories/user.repository.js");

const mockedFindUserByEmail = jest.mocked(findUserByEmail);

function createResponse() {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
  };

  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);

  return res;
}

function createRequest(body: Record<string, unknown>) {
  return { body } as Request;
}

describe("auth.controller login", () => {
  let storedHash: string;

  beforeEach(async () => {
    storedHash = await hashPassword("123456");
  });

  test("responde 400 si faltan credenciales", async () => {
    const res = createResponse();

    await login(createRequest({ email: "ana@pruebas.cl" }), res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockedFindUserByEmail).not.toHaveBeenCalled();
  });

  test("responde 401 si el usuario no existe", async () => {
    mockedFindUserByEmail.mockResolvedValue(undefined);
    const res = createResponse();

    await login(
      createRequest({ email: "nadie@pruebas.cl", password: "123456" }),
      res as unknown as Response,
    );

    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("responde 403 si el usuario está desactivado", async () => {
    mockedFindUserByEmail.mockResolvedValue({
      id: "1",
      name: "Sofía",
      email: "sofia@pruebas.cl",
      password_hash: storedHash,
      is_active: false,
    });
    const res = createResponse();

    await login(
      createRequest({ email: "sofia@pruebas.cl", password: "123456" }),
      res as unknown as Response,
    );

    expect(res.status).toHaveBeenCalledWith(403);
  });

  test("responde 401 si la contraseña es incorrecta", async () => {
    mockedFindUserByEmail.mockResolvedValue({
      id: "1",
      name: "Ana",
      email: "ana@pruebas.cl",
      password_hash: storedHash,
      is_active: true,
    });
    const res = createResponse();

    await login(
      createRequest({ email: "ana@pruebas.cl", password: "incorrecta" }),
      res as unknown as Response,
    );

    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("responde 200 sin exponer el hash si las credenciales son válidas", async () => {
    mockedFindUserByEmail.mockResolvedValue({
      id: "1",
      name: "Ana",
      email: "ana@pruebas.cl",
      password_hash: storedHash,
      is_active: true,
    });
    const res = createResponse();

    await login(
      createRequest({ email: "ana@pruebas.cl", password: "123456" }),
      res as unknown as Response,
    );

    expect(res.status).toHaveBeenCalledWith(200);

    const body = res.json.mock.calls[0][0] as { user: Record<string, unknown> };

    expect(body.user).toEqual({
      id: "1",
      name: "Ana",
      email: "ana@pruebas.cl",
      is_active: true,
    });
    expect(body.user).not.toHaveProperty("password_hash");
  });
});
