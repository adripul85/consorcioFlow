
import { GoogleGenAI, Type } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const isValidKey = apiKey && apiKey !== 'PLACEHOLDER_API_KEY' && apiKey.trim() !== '';
const ai = isValidKey ? new GoogleGenAI(apiKey) : null;

/**
 * Generates a smart analysis of building expenses and units for audit purposes.
 */
export const getSmartAnalysis = async (expenses: any[], units: any[]) => {
  const prompt = `
    Analiza los siguientes datos de un consorcio de edificios:
    Unidades: ${JSON.stringify(units)}
    Gastos: ${JSON.stringify(expenses)}
    
    Proporciona en ESPAÑOL:
    1. Un resumen de los gastos totales.
    2. Identificación de anomalías o costos elevados.
    3. Sugerencias de medidas de ahorro basadas en las categorías de gastos.
    
    Devuelve la respuesta como un informe de auditoría claro y profesional para el administrador.
  `;

  try {
    if (!ai) return "Configuración de IA incompleta (Falta API Key).";
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error en análisis de Gemini:", error);
    return "No se pudo generar el análisis de IA.";
  }
};

/**
 * Extracts data from an invoice image using Multimodal Gemini.
 */
export const extractDataFromInvoice = async (base64Data: string, mimeType: string, availableCategories: string[]) => {
  const prompt = `
    Eres un asistente contable experto. Analiza la imagen de esta factura/comprobante de servicios para un consorcio.
    Extrae los siguientes datos y clasifica el gasto según estas categorías permitidas: ${availableCategories.join(', ')}.
    
    IMPORTANTE:
    - La fecha debe ser ISO (YYYY-MM-DD).
    - El monto debe ser un número puro.
    - La descripción debe ser breve pero clara (ej: "Reparación Ascensor", "Artículos de Limpieza").
    - Si no estás seguro de la categoría, usa la más cercana o 'otros'.
    
    Responde ÚNICAMENTE con el objeto JSON.
  `;

  try {
    if (!ai) return null;
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: {
        parts: [{ inlineData: { data: base64Data, mimeType } }, { text: prompt }]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            date: { type: Type.STRING },
            category: { type: Type.STRING },
            notes: { type: Type.STRING }
          },
          required: ["description", "amount", "date", "category"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error extrayendo datos de imagen:", error);
    return null;
  }
};

/**
 * Standardizes bank statement rows into a structured JSON format using AI.
 */
export const standardizeBankTransactions = async (rawRows: any[], accountId: string) => {
  const prompt = `
    Eres un experto contable y analista de datos. Tu tarea es convertir filas crudas de un extracto bancario a un formato JSON estandarizado para un sistema de consorcios.
    
    Datos crudos (primeras 50 filas): ${JSON.stringify(rawRows.slice(0, 50))}
    
    INSTRUCCIONES:
    1. Identifica las columnas de Fecha, Concepto/Descripción y Monto/Importe.
    2. Convierte las fechas a formato ISO YYYY-MM-DD.
    3. Los montos deben ser números positivos.
    4. Determina el tipo: 
       - 'debit' para gastos, pagos, extracciones, comisiones (montos que restan).
       - 'credit' para depósitos, transferencias recibidas, cobros (montos que suman).
    5. Deduce la 'entityName' (Razón Social) a partir de la glosa bancaria (ej: si dice "TRANSF RECIBIDA DE PEREZ JUAN", entityName es "Juan Perez").
    
    RESPUESTA: Devuelve ÚNICAMENTE un JSON array con esta estructura:
    [
      {
        "accountId": "${accountId}",
        "date": "YYYY-MM-DD",
        "description": "Limpieza de descripción técnica",
        "type": "debit" | "credit",
        "amount": 123.45,
        "reference": "Nro de operación si existe",
        "entityName": "Razón Social o Persona Identificada"
      }
    ]
  `;

  try {
    if (!ai) return [];
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              accountId: { type: Type.STRING },
              date: { type: Type.STRING },
              description: { type: Type.STRING },
              type: { type: Type.STRING },
              amount: { type: Type.NUMBER },
              reference: { type: Type.STRING },
              entityName: { type: Type.STRING }
            },
            required: ["accountId", "date", "description", "type", "amount", "entityName"]
          }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Error estandarizando con IA:", error);
    return [];
  }
};

export const getSettlementNotice = async (month: string, year: number, total: number, expenses: any[]) => {
  const prompt = `Redacta un comunicado formal para vecinos. Liquidación de ${month} ${year}. Total: $${total}. Gastos: ${JSON.stringify(expenses)}.`;
  try {
    if (!ai) return "Error al generar el borrador.";
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    return "Error al generar el borrador.";
  }
};

export const draftAnnouncement = async (topic: string) => {
  const prompt = `Redacta un comunicado institucional sobre: ${topic}. ESPAÑOL.`;
  try {
    if (!ai) return "No se pudo generar el borrador.";
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    return "No se pudo generar el borrador.";
  }
};

export const getCalendarSuggestions = async (expenses: any[]) => {
  const prompt = `Sugiere 3 tareas de calendario basadas en estos gastos: ${JSON.stringify(expenses.slice(0, 20))}`;
  try {
    if (!ai) return [];
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              date: { type: Type.STRING },
              type: { type: Type.STRING },
              reasoning: { type: Type.STRING }
            },
            required: ["title", "date", "type", "reasoning"]
          }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    return [];
  }
};

export const getIncomeAnalysis = async (units: any[]) => {
  const prompt = `Analiza recaudación y morosidad de unidades: ${JSON.stringify(units)}. ESPAÑOL.`;
  try {
    if (!ai) return "No se pudo generar el análisis.";
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    return "No se pudo generar el análisis.";
  }
};
