import { ACTION_PROMPTS } from "../constants";
import { ActionType, EditedResult } from "../types";

export const editImageWithGemini = async (
  base64Data: string,
  mimeType: string,
  action: ActionType,
  customPrompt?: string
): Promise<EditedResult> => {
  const prompt = customPrompt || ACTION_PROMPTS[action];

  try {
    const response = await fetch("/api/edit-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imageBase64: base64Data,
        mimeType: mimeType || "image/jpeg",
        prompt,
        action,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.error || `Server responded with status ${response.status}`;
      throw new Error(message);
    }

    const data = await response.json();
    if (!data.resultBase64) {
      throw new Error("No image was received from the editing service.");
    }

    const resultMime = data.mimeType || "image/png";
    return {
      type: "image",
      dataUrl: `data:${resultMime};base64,${data.resultBase64}`,
      mimeType: resultMime,
    };
  } catch (error) {
    console.error("Gemini Edit Error:", error);
    throw error;
  }
};

export const animateImageWithVeo = async (
  base64Data: string,
  mimeType: string,
  prompt: string,
  aspectRatio: "16:9" | "9:16" = "9:16"
): Promise<EditedResult> => {
  try {
    // 1. Request video generation
    const startResponse = await fetch("/api/generate-video", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imageBase64: base64Data,
        mimeType: mimeType || "image/jpeg",
        prompt: prompt || ACTION_PROMPTS[ActionType.ANIMATE],
        aspectRatio,
      }),
    });

    if (!startResponse.ok) {
      const errorData = await startResponse.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to start video generation (${startResponse.status})`);
    }

    const { operationName } = await startResponse.json();
    if (!operationName) {
      throw new Error("No operation ID received from video generation service.");
    }

    // 2. Poll until complete
    let isDone = false;
    let attempts = 0;
    const maxAttempts = 60; // Up to 8 minutes

    while (!isDone && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 8000));
      attempts++;

      const statusResponse = await fetch("/api/video-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ operationName }),
      });

      if (!statusResponse.ok) {
        const errorData = await statusResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to check video status (${statusResponse.status})`);
      }

      const statusData = await statusResponse.json();

      if (statusData.safetyReason) {
        throw new Error(`Safety Block: ${statusData.safetyReason}`);
      }

      if (statusData.error) {
        throw new Error(`Veo Generation Error: ${statusData.error.message || JSON.stringify(statusData.error)}`);
      }

      if (statusData.done) {
        isDone = true;
      }
    }

    if (!isDone) {
      throw new Error("Video generation timed out. Please try again.");
    }

    // 3. Download video
    const downloadResponse = await fetch("/api/video-download", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ operationName }),
    });

    if (!downloadResponse.ok) {
      const errData = await downloadResponse.json().catch(() => ({}));
      throw new Error(errData.error || `Failed to download video (${downloadResponse.status})`);
    }

    const blob = await downloadResponse.blob();
    const videoUrl = URL.createObjectURL(blob);

    return {
      type: "video",
      dataUrl: videoUrl,
      mimeType: "video/mp4",
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("Safety Block")) {
      throw error;
    }
    console.error("Veo Animation Error:", error);
    throw error;
  }
};
