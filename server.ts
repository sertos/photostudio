import express from "express";
import path from "path";
import { GoogleGenAI, GenerateVideosOperation } from "@google/genai";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;

// --- RADAR DE TRAFICO ---
app.use((req, res, next) => {
  console.log(`[RADAR] ${req.method} ${req.url}`);
  next();
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) console.warn("⚠️ Warning: GEMINI_API_KEY is missing!");
  return new GoogleGenAI({ apiKey: apiKey || "dummy-key", httpOptions: { headers: { "User-Agent": "aistudio-build" } } });
}

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.post("/api/edit-image", async (req, res) => {
  console.log("[API] /api/edit-image llamada exitosamente");
  try {
    const { imageBase64, mimeType = "image/jpeg", prompt } = req.body;
    if (!imageBase64 || !prompt) return res.status(400).json({ error: "Faltan datos." });

    const cleanImageBase64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
    const ai = getGenAI();
    
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-image",
      contents: [{
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType,
              data: cleanImageBase64
            }
          }
        ]
      }],
      config: {
        responseModalities: ["TEXT", "IMAGE"]
      }
    });

    for (const candidate of response.candidates || []) {
      for (const part of candidate.content?.parts || []) {
        if (part.inlineData?.data) {
          return res.json({ resultBase64: part.inlineData.data, mimeType: part.inlineData.mimeType || "image/png" });
        }
      }
    }
    return res.status(500).json({ error: "El modelo no devolvió una imagen." });
  } catch (error: any) {
    console.error("Error en Gemini:", error);
    return res.status(500).json({ error: error.message || "Fallo interno." });
  }
});

// Captura cualquier API que no exista y devuelve un JSON claro, no un HTML roto
app.use("/api/*", (req, res) => {
  res.status(404).json({ error: `Ruta API no encontrada: ${req.url}` });
});

async function start() {
  if (process.env.NODE_ENV !== "production") {
    const viteModule = await eval('import("vite")');
    const vite = await viteModule.createServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }
  app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
}

start().catch(err => console.error(err));
