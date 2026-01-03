
import { GoogleGenAI, Type } from "@google/genai";
import { Deadline } from "../types";

// Fix: Initialize GoogleGenAI directly with the API key from process.env as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getLegalInsights = async (deadlines: Deadline[]) => {
  // Fix: Use the top-level ai instance directly and query with model and prompt in one call as recommended
  const prompt = `Analise os seguintes prazos processuais e forneça um resumo estratégico (3 frases) sobre prioridades e riscos. Prazos: ${JSON.stringify(deadlines.map(d => ({ peca: d.peca, data: d.data, empresa: d.empresa })))}`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
    });
    // Fix: Access .text property directly (not a method) as specified in the SDK documentation
    return response.text || "Sem insights disponíveis no momento.";
  } catch (error) {
    console.error("Erro no Gemini (Insights):", error);
    return "Erro ao conectar com a Inteligência Artificial.";
  }
};

export const extractDeadlineFromText = async (rawText: string) => {
  // Fix: Use the top-level ai instance and recommended configuration for structured JSON output
  const prompt = `Extraia as informações de um prazo processual do texto abaixo. Retorne JSON estruturado com peca, empresa (MAIÚSCULAS), instituicao, assunto, data (YYYY-MM-DD) e hora (HH:MM). Texto: "${rawText}"`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            peca: { type: Type.STRING },
            empresa: { type: Type.STRING },
            instituicao: { type: Type.STRING },
            assunto: { type: Type.STRING },
            data: { type: Type.STRING },
            hora: { type: Type.STRING },
          },
          required: ["peca", "empresa", "assunto", "data"]
        }
      }
    });

    // Fix: Access .text property directly and parse the JSON string correctly
    const text = response.text?.trim();
    return text ? JSON.parse(text) : null;
  } catch (error) {
    console.error("Erro no Gemini (Extração):", error);
    return null;
  }
};
