import { GoogleGenerativeAI } from "@google/generative-ai";

const getAI = () => {
  // Intentamos obtener la API Key de varias fuentes comunes en Vite/React
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY ||
    (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : "") ||
    "";

  if (!apiKey) {
    console.warn("API Key de Gemini no encontrada. Verifique VITE_GEMINI_API_KEY en su archivo .env.local");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  // Usamos gemini-1.5-flash-latest para asegurar compatibilidad y velocidad
  return genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
};

/**
 * Generates a smart analysis of building expenses and units for audit purposes.
 */
export const getSmartAnalysis = async (expenses: any[], units: any[]) => {
  const ai = getAI();
  const prompt = `
    Analiza los siguientes datos de un consorcio de edificios:
    Unidades: ${JSON.stringify(units)}
    Gastos: ${JSON.stringify(expenses)}
    
    Proporciona en ESPAÑOL:
    1. Un resumen de los gastos totales.
    2. Identificación de anomalías o costos elevados.
    3. Sugerencias de medidas de ahorro.
    
    Devuelve un informe de auditoría claro.
  `;

  try {
    const result = await ai.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Error en análisis:", error);
    return "No se pudo generar el análisis.";
  }
};

/**
 * Extracts unit data from a document using Gemini Pro.
 */
export const extractUnitsFromDocument = async (base64Data: string, mimeType: string) => {
  const ai = getAI();
  const prompt = `
    Analiza este documento de un edificio. Extrae las unidades en JSON (array).
    Formato: [{ floor, department, coefficient, owner }]
    - floor: Piso (ej: "1", "PB").
    - department: Depto (ej: "A", "1").
    - coefficient: % participacion (ej: 2.5).
    - owner: Nombre o "Sin Propietario".
    Responde SOLO JSON.
  `;

  try {
    const result = await ai.generateContent({
      contents: [{
        role: 'user', parts: [
          { inlineData: { data: base64Data, mimeType } },
          { text: prompt }
        ]
      }],
      generationConfig: { responseMimeType: "application/json" }
    });

    return JSON.parse(result.response.text() || "[]");
  } catch (error) {
    console.error("Error IA:", error);
    return null;
  }
};

/**
 * Extracts data from an invoice.
 */
export const extractDataFromInvoice = async (base64Data: string, mimeType: string, availableCategories: string[]) => {
  const ai = getAI();
  const prompt = `
    Analiza esta factura. Extrae JSON: { date, description, amount, category }.
    Categorías permitidas: ${availableCategories.join(', ')}.
    Monto como número. Fecha YYYY-MM-DD.
    Responde SOLO JSON.
  `;

  try {
    const result = await ai.generateContent({
      contents: [{
        role: 'user', parts: [
          { inlineData: { data: base64Data, mimeType } },
          { text: prompt }
        ]
      }],
      generationConfig: { responseMimeType: "application/json" }
    });

    return JSON.parse(result.response.text() || "{}");
  } catch (error) {
    console.error("Error IA Factura:", error);
    return null;
  }
};

/**
 * Standardizes bank statement rows.
 */
export const standardizeBankTransactions = async (rawRows: any[], accountId: string) => {
  const ai = getAI();
  const prompt = `
    Convierte estos movimientos bancarios a JSON estandarizado:
    Data: ${JSON.stringify(rawRows.slice(0, 50))}
    Formato: [{ accountId: "${accountId}", date: "YYYY-MM-DD", description: string, type: "debit"|"credit", amount: number, entityName: string }]
    Responde SOLO JSON.
  `;

  try {
    const result = await ai.generateContent(prompt);
    return JSON.parse(result.response.text() || "[]");
  } catch (error) {
    console.error("Error IA Banco:", error);
    return [];
  }
};

export const getSettlementNotice = async (month: string, year: number, total: number, expenses: any[]) => {
  const ai = getAI();
  const prompt = `Comunicado formal de liquidación: ${month} ${year}. Total: $${total}. Gastos: ${JSON.stringify(expenses)}.`;
  try {
    const result = await ai.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    return "Error al generar comunicado.";
  }
};

export const draftAnnouncement = async (topic: string) => {
  const ai = getAI();
  const prompt = `Redacta comunicado sobre: ${topic}.`;
  try {
    const result = await ai.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    return "Error al generar borrador.";
  }
};

export const getCalendarSuggestions = async (expenses: any[]) => {
  const ai = getAI();
  const prompt = `Sugiere 3 tareas de calendario para estos gastos: ${JSON.stringify(expenses.slice(0, 10))}. Responde solo JSON array de strings.`;
  try {
    const result = await ai.generateContent(prompt);
    return JSON.parse(result.response.text() || "[]");
  } catch (error) {
    return [];
  }
};

export const getIncomeAnalysis = async (units: any[]) => {
  const ai = getAI();
  const prompt = `Analiza recaudación: ${JSON.stringify(units)}.`;
  try {
    const result = await ai.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    return "Error al generar análisis.";
  }
};

/**
 * Extracts structured data from PDF text using Gemini Flash.
 */
export const extractDataFromPdf = async (text: string) => {
  const ai = getAI();
  const prompt = `
    Analiza este texto extraído de una liquidación de expensas (Administración Farzati):
    ${text}
    
    Extrae y devuelve un JSON con:
    1. Una lista de "gastos" (id, description, amount, category, date).
    2. Una lista de "unidades" (id, floor, department, coefficient, owner, previousBalance, deuda).
    
    Sigue estrictamente la estructura de tipos de nuestro sistema.
    Responde SOLO JSON.
  `;

  try {
    const result = await ai.generateContent(prompt);
    const content = result.response.text();
    // Limpieza de posibles tags de markdown
    const jsonStr = content.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Error procesando PDF con Gemini:", error);
    return null;
  }
};
