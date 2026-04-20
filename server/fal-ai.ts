/**
 * fal.ai Image Generation Service — Enhanced Body Visualization
 *
 * Uses fal.ai Flux Schnell for:
 * - High-quality body transformation previews
 * - Realistic body composition visualization
 * - Before/after comparison images
 *
 * Falls back to built-in generateImage if fal.ai is unreachable.
 */
import { fal } from "@fal-ai/client";
import { generateImage as builtInGenerateImage } from "./_core/imageGeneration";
import { storagePut } from "./storage";

// Configure fal.ai client
function initFal(): boolean {
  const key = process.env.FAL_KEY;
  if (!key) return false;
  fal.config({ credentials: key });
  return true;
}

export interface BodyVisRequest {
  prompt: string;
  imageUrl?: string; // Original photo for image-to-image
  width?: number;
  height?: number;
  numImages?: number;
}

export interface BodyVisResult {
  imageUrl: string;
  source: "fal" | "builtin";
}

/**
 * Generate a body visualization image using fal.ai Flux Schnell.
 * Falls back to built-in image generation if fal.ai is unavailable.
 */
export async function generateBodyVisualization(
  req: BodyVisRequest
): Promise<BodyVisResult> {
  // Try fal.ai first
  if (initFal()) {
    try {
      const result = await fal.subscribe("fal-ai/flux/schnell", {
        input: {
          prompt: req.prompt,
          image_size: {
            width: req.width ?? 768,
            height: req.height ?? 1024,
          },
          num_images: req.numImages ?? 1,
          num_inference_steps: 4,
          enable_safety_checker: true,
        },
      });

      const images = (result.data as any)?.images;
      if (images && images.length > 0) {
        const imageUrl = images[0].url;
        // Upload to S3 for persistence
        const response = await fetch(imageUrl);
        const buffer = Buffer.from(await response.arrayBuffer());
        const key = `body-vis/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
        const { url: s3Url } = await storagePut(key, buffer, "image/png");
        return { imageUrl: s3Url, source: "fal" };
      }
    } catch (err: any) {
      console.warn("[fal.ai] Error, falling back to built-in:", err.message);
    }
  }

  // Fallback to built-in image generation
  try {
    const { url } = await builtInGenerateImage({
      prompt: req.prompt,
      ...(req.imageUrl
        ? { originalImages: [{ url: req.imageUrl, mimeType: "image/jpeg" as const }] }
        : {}),
    });
    if (!url) throw new Error("Built-in image generation returned no URL");
    return { imageUrl: url, source: "builtin" };
  } catch (err: any) {
    console.warn("[Built-in Image Gen] Error:", err.message);
    throw new Error("Image generation failed. Please try again.");
  }
}

/**
 * Generate body transformation visualization with specific body composition targets.
 */
export async function generateTransformationImage(
  photoUrl: string,
  currentBF: number,
  targetBF: number,
  gender: string = "male",
  additionalContext?: string
): Promise<BodyVisResult> {
  const bfDiff = currentBF - targetBF;
  const muscleGain = bfDiff > 5 ? "with visible muscle definition increase" : "with subtle muscle tone improvement";

  const prompt = `Professional fitness transformation photo. ${gender === "female" ? "Female" : "Male"} physique at ${targetBF}% body fat, ${muscleGain}. Athletic build, natural lighting, realistic body proportions. ${additionalContext ?? ""} High quality, photorealistic, fitness magazine style.`;

  return generateBodyVisualization({
    prompt,
    imageUrl: photoUrl,
    width: 768,
    height: 1024,
  });
}
