
import { GoogleGenAI, Type } from "@google/genai";
import { Deadline } from "../types";

// Using gemini-3-pro-preview for legal analysis as it requires advanced reasoning and risk assessment
export const getLegalInsights = async (deadlines: Deadline[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Analise os seguintes prazos processuais de um escritório de advocacia e forneça um breve resumo (3 frases) sobre a carga de trabalho e se há algum risco iminente. Prazos: ${JSON.stringify(deadlines.map(d => ({ peca: d.peca, data: d.data, empresa: d.empresa })))}`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Não foi possível gerar insights automáticos no momento.";
  }
};

// New function to extract structured data from raw text (emails, messages)
export const extractDeadlineFromText = async (rawText: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Extraia as informações de um prazo processual a partir do seguinte texto (geralmente um e-mail ou mensagem): "${rawText}". 
  Tente identificar a peça jurídica, o nome da empresa cliente, a instituição/foro, o assunto resumido, a data de vencimento e a hora. 
  Se não encontrar uma data específica, use a data de hoje. Se não encontrar a hora, use 09:00.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            peca: { type: Type.STRING, description: "Tipo de peça jurídica" },
            empresa: { type: Type.STRING, description: "Nome da empresa/cliente em MAIÚSCULAS" },
            instituicao: { type: Type.STRING, description: "Foro ou instituição mencionada" },
            assunto: { type: Type.STRING, description: "Resumo do assunto" },
            data: { type: Type.STRING, description: "Data no formato YYYY-MM-DD" },
            hora: { type: Type.STRING, description: "Hora no formato HH:MM" },
          },
          required: ["peca", "empresa", "assunto", "data"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Extraction Error:", error);
    return null;
  }
};
