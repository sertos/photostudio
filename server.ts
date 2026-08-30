import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, GenerateVideosOperation } from "@google/genai";

const app = express();
const PORT = 3000;

// Body parser with support for large image payloads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Helper to get GoogleGenAI client
function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Health check route
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Edit / Enhance image with Gemini models
app.post("/api/edit-image", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/jpeg", prompt, action } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64 in request body." });
    }

    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt in request body." });
    }

    const ai = getGenAI();

    // Models to try in order of preference for image-to-image editing
    const candidateModels = [
      "gemini-3.1-flash-lite-image",
      "gemini-3.1-flash-image",
      "gemini-3-pro-image",
    ];

    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        console.log(`Attempting image edit with model: ${modelName}`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: {
            parts: [
              {
                inlineData: {
                  data: imageBase64,
                  mimeType: mimeType || "image/jpeg",
                },
              },
              {
                text: `${prompt}. Please process this photo and return the modified/edited image.`,
              },
            ],
          },
        });

        // Search through all candidate parts for the resulting image
        for (const candidate of response.candidates || []) {
          for (const part of candidate.content?.parts || []) {
            if (part.inlineData && part.inlineData.data) {
              console.log(`Successfully generated image using ${modelName}`);
              return res.json({
                resultBase64: part.inlineData.data,
                mimeType: part.inlineData.mimeType || "image/png",
                modelUsed: modelName,
              });
            }
          }
        }

        // If no image was found in response parts
        const textPart = response.text;
        if (textPart) {
          console.warn(`Model ${modelName} returned text instead of image:`, textPart.substring(0, 150));
          lastError = new Error(textPart);
        }
      } catch (err: any) {
        console.error(`Model ${modelName} failed:`, err?.message || err);
        lastError = err;
      }
    }

    // If all AI models failed, return detailed error
    const statusCode = lastError?.status || lastError?.statusCode || 500;
    const message = lastError?.message || "No modified image was returned by the AI model.";
    return res.status(statusCode).json({ error: message });
  } catch (error: any) {
    console.error("Error in /api/edit-image:", error);
    const statusCode = error?.status || error?.statusCode || 500;
    const message = error?.message || "Failed to process image with Gemini.";
    return res.status(statusCode).json({ error: message });
  }
});

// Start video generation with Veo
app.post("/api/generate-video", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/jpeg", prompt, aspectRatio = "9:16" } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64 in request body." });
    }

    const ai = getGenAI();

    const operation = await ai.models.generateVideos({
      model: "veo-3.1-lite-generate-preview",
      prompt: prompt || "Cinematic camera movement and dynamic subtle depth, realistic motion",
      image: {
        imageBytes: imageBase64,
        mimeType: mimeType || "image/jpeg",
      },
      config: {
        numberOfVideos: 1,
        resolution: "720p",
        aspectRatio: aspectRatio === "16:9" ? "16:9" : "9:16",
      },
    });

    return res.json({ operationName: operation.name });
  } catch (error: any) {
    console.error("Error in /api/generate-video:", error);
    const statusCode = error?.status || error?.statusCode || 500;
    const message = error?.message || "Failed to initiate video generation.";
    return res.status(statusCode).json({ error: message, details: error });
  }
});

// Poll video generation status
app.post("/api/video-status", async (req, res) => {
  try {
    const { operationName } = req.body;

    if (!operationName) {
      return res.status(400).json({ error: "Missing operationName in request body." });
    }

    const ai = getGenAI();
    const op = new GenerateVideosOperation();
    op.name = operationName;

    const updated = await ai.operations.getVideosOperation({ operation: op });

    const rawResponse = updated.response as any;
    let safetyReason: string | null = null;
    if (rawResponse?.raiMediaFilteredReasons && rawResponse.raiMediaFilteredReasons.length > 0) {
      safetyReason = rawResponse.raiMediaFilteredReasons[0];
    } else if (rawResponse?.raiMediaFilteredCount > 0 && (!rawResponse?.generatedVideos || rawResponse.generatedVideos.length === 0)) {
      safetyReason = "Generation blocked by AI Safety Filters.";
    }

    return res.json({
      done: !!updated.done,
      error: updated.error || null,
      safetyReason,
      hasVideo: !!updated.response?.generatedVideos?.[0]?.video?.uri,
    });
  } catch (error: any) {
    console.error("Error in /api/video-status:", error);
    const statusCode = error?.status || error?.statusCode || 500;
    const message = error?.message || "Failed to check video generation status.";
    return res.status(statusCode).json({ error: message });
  }
});

// Download finished video as stream
app.post("/api/video-download", async (req, res) => {
  try {
    const { operationName } = req.body;

    if (!operationName) {
      return res.status(400).json({ error: "Missing operationName in request body." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured." });
    }

    const ai = getGenAI();
    const op = new GenerateVideosOperation();
    op.name = operationName;

    const updated = await ai.operations.getVideosOperation({ operation: op });
    const videoUri = updated.response?.generatedVideos?.[0]?.video?.uri;

    if (!videoUri) {
      return res.status(404).json({ error: "Video URI not found or video is not ready yet." });
    }

    const videoRes = await fetch(videoUri, {
      headers: { "x-goog-api-key": apiKey },
    });

    if (!videoRes.ok) {
      const errText = await videoRes.text();
      return res.status(videoRes.status).json({
        error: `Failed to download video stream from Google storage: ${videoRes.status} ${errText}`,
      });
    }

    const arrayBuffer = await videoRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Length", buffer.length.toString());
    res.setHeader("Content-Disposition", `attachment; filename="video_${Date.now()}.mp4"`);
    return res.send(buffer);
  } catch (error: any) {
    console.error("Error in /api/video-download:", error);
    const statusCode = error?.status || error?.statusCode || 500;
    const message = error?.message || "Failed to download generated video.";
    return res.status(statusCode).json({ error: message });
  }
});

// Setup Vite middleware for development or Static file serving for production
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Solvra Photo Studio server running on http://0.0.0.0:${PORT}`);
  });
}

start();
