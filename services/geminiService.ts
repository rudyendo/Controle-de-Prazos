
import { GoogleGenAI } from "@google/genai";

/**
 * Suggests a professional action object for a legal deadline based on the type of document and company.
 * Uses gemini-3-flash-preview for fast and professional legal text generation.
 */
export async function suggestActionObject(peca: string, empresa: string): Promise<string> {
  if (!peca || !empresa) return "";

  try {
    // Dynamic initialization using process.env.API_KEY as per coding guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Using gemini-3-flash-preview for the basic text generation task
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Como um consultor jurídico sênior, sugira um 'Objeto da Ação' ou 'Providência' conciso (máximo 150 caracteres) para um documento do tipo "${peca}" referente à empresa "${empresa}". O texto deve ser direto, formal e indicar a ação necessária. Retorne APENAS o texto da sugestão.`,
    });

    // Extract generated text from the response object
    return response.text?.trim() || "";
  } catch (error) {
    console.error("Gemini Suggestion Error:", error);
    return "Protocolar manifestação técnica conforme prazo processual.";
  }
}
