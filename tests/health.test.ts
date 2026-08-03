import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";

const app = createApp();

describe("GET /api/v1/health", () => {
  it("responde 200 con success:true y data.status = 'ok'", async () => {
    const response = await request(app).get("/api/v1/health");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("ok");
    expect(response.body.data).toHaveProperty("environment");
    expect(response.body.data).toHaveProperty("uptime");
    expect(response.body.data).toHaveProperty("timestamp");
  });

  it("no expone variables de entorno ni secretos", async () => {
    const response = await request(app).get("/api/v1/health");
    const body = JSON.stringify(response.body);

    expect(body).not.toMatch(/SUPABASE/i);
    expect(body).not.toMatch(/SECRET/i);
    expect(body).not.toMatch(/KEY/i);
  });
});

describe("Rutas inexistentes", () => {
  it("GET /api/v1/ruta-inexistente responde 404 con el formato de error común", async () => {
    const response = await request(app).get("/api/v1/ruta-inexistente");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "El recurso solicitado no existe.",
      },
    });
  });

  it("responde JSON, no el HTML por defecto de Express", async () => {
    const response = await request(app).get("/no-existe-ni-siquiera-api");

    expect(response.headers["content-type"]).toMatch(/json/);
  });
});
