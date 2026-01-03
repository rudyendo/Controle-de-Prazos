
import { GoogleGenAI, Type } from "@google/genai";
import { Deadline } from "../types";

// Função para obter a instância da AI de forma segura
const getAI = () => {
  const key = process.env.API_KEY;
  if (!key) return null;
  return new GoogleGenAI({ apiKey: key });
};

export const getLegalInsights = async (deadlines: Deadline[]) => {
  const ai = getAI();
  if (!ai) return "Sistema de IA aguardando configuração de chave de API.";

  const prompt = `Analise estes prazos de um escritório de advocacia: ${JSON.stringify(deadlines.map(d => ({ peca: d.peca, data: d.data, empresa: d.empresa })))}. Forneça um resumo estratégico de 3 frases sobre riscos e prioridades.`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
    });
    return response.text || "Sem insights para os dados atuais.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "IA temporariamente indisponível. Verifique a conexão.";
  }
};

export const extractDeadlineFromText = async (rawText: string) => {
  const ai = getAI();
  if (!ai) return null;
  
  const prompt = `Extraia os dados deste prazo jurídico em JSON: "${rawText}". Campos: peca, empresa (MAIÚSCULAS), instituicao, assunto, data (YYYY-MM-DD), hora (HH:MM).`;

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

    const text = response.text?.trim();
    return text ? JSON.parse(text) : null;
  } catch (error) {
    console.error("Extraction Error:", error);
    return null;
  }
};
