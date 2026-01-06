import { GoogleGenAI } from "@google/genai";

// Initialize the Google GenAI SDK with the API key from environment variables.
// The API key is assumed to be pre-configured in process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

/**
 * Suggests a professional action object for a legal deadline based on the type of document and company.
 * Uses gemini-3-flash-preview for fast and professional legal text generation.
 */
export async function suggestActionObject(peca: string, empresa: string): Promise<string> {
  if (!peca || !empresa) return "";

  try {
    // Using gemini-3-flash-preview as per model selection rules for basic text tasks.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Como um consultor jurídico sênior, sugira um 'Objeto da Ação' ou 'Providência' conciso (máximo 150 caracteres) para um documento do tipo "${peca}" referente à empresa "${empresa}". O texto deve ser direto e profissional. Retorne APENAS o texto da sugestão.`,
    });

    // Extracting text output directly from the .text property of GenerateContentResponse.
    return response.text?.trim() || "";
  } catch (error) {
    console.error("Gemini Suggestion Error:", error);
    return "";
  }
}