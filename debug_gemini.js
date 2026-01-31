import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY || "");

async function listModels() {
    try {
        const result = await genAI.listModels();
        console.log("Modelos disponibles:");
        result.models.forEach((m) => {
            console.log(`- ${m.name} (${m.displayName})`);
        });
    } catch (error) {
        console.error("Error listando modelos:", error);
    }
}

listModels();
