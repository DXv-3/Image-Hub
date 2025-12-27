import { GoogleGenAI, Type } from "@google/genai";
import { AspectRatio, ImageSize } from "../types";

// Initialize the client. 
// Note: API_KEY is injected by the environment after selection via window.aistudio
const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Composite two images (Natural Insert)
 * Uses gemini-3-pro-image-preview for high fidelity editing/composition
 */
export const generateRelationshipPhoto = async (
  bgBase64: string,
  bgMime: string,
  refBase64: string,
  refMime: string,
  description: string
): Promise<string> => {
  const ai = getAiClient();
  
  const prompt = `Edit the Background Scene by inserting the subject from Person Reference. 
  Use the reference strictly for structural inpainting. 
  Harmonize lighting, grain, and color temperature to match the background. 
  Output a single photorealistic image. 
  Context: ${description}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: {
      parts: [
        { text: prompt },
        {
          inlineData: {
            mimeType: bgMime,
            data: bgBase64
          }
        },
        {
          inlineData: {
            mimeType: refMime,
            data: refBase64
          }
        }
      ]
    },
    config: {
      imageConfig: {
        aspectRatio: '1:1', // Default for composite
        imageSize: '2K'
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image generated");
};

/**
 * Generate Image from Scratch
 * Uses gemini-3-pro-image-preview
 */
export const generateImage = async (
  prompt: string,
  size: ImageSize,
  ratio: AspectRatio
): Promise<string> => {
  const ai = getAiClient();
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts: [{ text: prompt }] },
    config: {
      imageConfig: {
        imageSize: size,
        aspectRatio: ratio
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image generated");
};

/**
 * Edit Image
 * Uses gemini-2.5-flash-image for fast editing
 */
export const editImage = async (
  imageBase64: string,
  imageMime: string,
  prompt: string
): Promise<string> => {
  const ai = getAiClient();

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { text: prompt },
        {
          inlineData: {
            mimeType: imageMime,
            data: imageBase64
          }
        }
      ]
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image generated");
};

/**
 * Animate Image (Veo)
 * Uses veo-3.1-fast-generate-preview
 */
export const generateVideo = async (
  imageBase64: string,
  imageMime: string,
  prompt: string,
  ratio: AspectRatio
): Promise<string> => {
  const ai = getAiClient();

  // Veo supports 16:9 or 9:16. Map other ratios to closest supported.
  const videoRatio = ratio === '9:16' ? '9:16' : '16:9';

  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: prompt || "Animate this image cinematically",
    image: {
      imageBytes: imageBase64,
      mimeType: imageMime
    },
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: videoRatio
    }
  });

  // Poll for completion
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!videoUri) throw new Error("No video generated");

  // Fetch with API Key
  const videoResponse = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
  const videoBlob = await videoResponse.blob();
  return URL.createObjectURL(videoBlob);
};

/**
 * Analyze Image (Thinking Mode)
 * Uses gemini-3-pro-preview
 */
export const analyzeImage = async (
  imageBase64: string,
  imageMime: string,
  prompt: string
): Promise<string> => {
  const ai = getAiClient();

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        { text: prompt || "Analyze this image in extreme detail. Structure your response with headers." },
        {
          inlineData: {
            mimeType: imageMime,
            data: imageBase64
          }
        }
      ]
    },
    config: {
      thinkingConfig: {
        thinkingBudget: 32768 // Max thinking for deep analysis
      }
    }
  });

  return response.text || "No analysis generated.";
};

/**
 * Culinary Analysis (Whisk-like)
 * Uses gemini-3-pro-preview
 */
export const analyzeFood = async (
  imageBase64: string,
  imageMime: string,
  userPrompt?: string
): Promise<string> => {
  const ai = getAiClient();
  const basePrompt = "Analyze this food image. Identify the dish, estimate the ingredients, and provide a step-by-step recipe. Also suggest a wine pairing. Use Markdown headers (#) for sections.";
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        { text: userPrompt ? `${basePrompt} User note: ${userPrompt}` : basePrompt },
        {
          inlineData: {
            mimeType: imageMime,
            data: imageBase64
          }
        }
      ]
    }
  });

  return response.text || "Could not analyze food.";
};

/**
 * Deep Reasoning (Grok-like)
 * Uses gemini-3-pro-preview with Search Grounding
 */
export const deepReasoning = async (
  prompt: string
): Promise<string> => {
  const ai = getAiClient();

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: { parts: [{ text: prompt }] },
    config: {
      thinkingConfig: {
        thinkingBudget: 16000 
      },
      tools: [{ googleSearch: {} }] // Enable Google Search grounding
    }
  });

  // Extract grounding metadata if available
  let text = response.text || "";
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  
  if (groundingChunks) {
    text += "\n\n### Sources\n";
    groundingChunks.forEach((chunk: any) => {
      if (chunk.web?.uri) {
        text += `- [${chunk.web.title}](${chunk.web.uri})\n`;
      }
    });
  }

  return text || "No reasoning generated.";
};

/**
 * Generate Speech (TTS)
 * Uses gemini-2.5-flash-preview-tts
 */
export const generateSpeech = async (text: string): Promise<ArrayBuffer> => {
  const ai = getAiClient();
  
  // Truncate text if too long for a quick demo to save latency, 
  // though model handles long text well.
  const cleanText = text.replace(/[*#\[\]()]/g, '').substring(0, 1000);

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: cleanText }] }],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("No audio generated");

  // Decode Base64
  const binaryString = atob(base64Audio);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};