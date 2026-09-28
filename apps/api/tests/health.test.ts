import { describe, expect, it } from "@jest/globals";
import request from "supertest";

import app from "../src/app.js";

describe("GET /api/health", () => {
  it("debe responder 200 OK", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
    });
  });
});
