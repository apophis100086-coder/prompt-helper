import dotenv from "dotenv";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { optimizePrompt, parseOptimizeRequest, mapUnknownError } from "./optimizer.js";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_request, response) => {
    response.json({ ok: true });
  });

  app.post("/api/optimize", async (request, response) => {
    try {
      const payload = parseOptimizeRequest(request.body);
      const result = await optimizePrompt(payload);
      response.json(result);
    } catch (error) {
      const mapped = mapUnknownError(error);
      response.status(mapped.status).json({
        error: {
          code: mapped.code,
          message: mapped.message
        }
      });
    }
  });

  const distPath = path.resolve(__dirname, "../dist");
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get("*", (_request, response) => {
      response.sendFile(path.join(distPath, "index.html"));
    });
  }

  return app;
}

if (process.env.NODE_ENV !== "test") {
  const port = Number(process.env.PORT || 8787);
  createApp().listen(port, "127.0.0.1", () => {
    console.log(`API server listening on http://127.0.0.1:${port}`);
  });
}
