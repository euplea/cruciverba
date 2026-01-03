
import { GoogleGenAI, Type } from "@google/genai";
import { Difficulty, RawEntry } from "../types";

export const fetchCrosswordContent = async (topic: string, difficulty: Difficulty, manualWords?: string[]): Promise<RawEntry[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  let prompt = "";
  if (manualWords && manualWords.length > 0) {
    prompt = `Sei un esperto creatore di cruciverba italiani. Ho una lista di parole e ho bisogno che tu generi degli indizi appropriati e dei piccoli suggerimenti semplificati per un cruciverba di difficoltà ${difficulty}.
    
    Parole: ${manualWords.join(", ")}
    
    Regole per gli indizi:
    - Difficoltà Facile: indizi diretti.
    - Difficoltà Media: indizi che richiedono riflessione.
    - Difficoltà Difficile: indizi criptici o colti.
    
    Regole per il 'hint' (suggerimento):
    - Deve essere un sinonimo o una definizione molto più diretta e semplice rispetto all'indizio principale, per aiutare chi è bloccato.
    - Massimo 3-4 parole.`;
  } else {
    prompt = `Sei un esperto creatore di cruciverba italiani. Genera un elenco di almeno 25 parole, i relativi indizi e dei suggerimenti semplificati per un cruciverba.
    
    Argomento: ${topic}
    Difficoltà: ${difficulty}
    
    Regole per parole e indizi:
    - Difficoltà Facile: parole comuni, indizi diretti.
    - Difficoltà Media: parole varie, indizi riflessivi.
    - Difficoltà Difficile: parole ricercate, indizi criptici o colti.
    
    Per ogni parola, genera anche un 'hint': un sinonimo o una definizione molto più diretta e semplice (max 4 parole) per aiutare l'utente in difficoltà.
    
    Tutte le parole devono essere in italiano, senza spazi, accenti o caratteri speciali.
    Assicurati che le parole siano pertinenti all'argomento scelto.`;
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          entries: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING, description: "La parola (solo lettere, maiuscolo)" },
                clue: { type: Type.STRING, description: "L'indizio principale" },
                hint: { type: Type.STRING, description: "Suggerimento semplificato o sinonimo diretto" }
              },
              required: ["word", "clue", "hint"]
            }
          }
        },
        required: ["entries"]
      }
    }
  });

  const data = JSON.parse(response.text);
  return data.entries.map((e: any) => ({
    word: e.word.toUpperCase().replace(/[^A-Z]/g, ''),
    clue: e.clue,
    hint: e.hint
  }));
};

export const fetchWordSuggestions = async (topic: string, existingWords: string[]): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const prompt = `Sei un assistente per la creazione di cruciverba. 
    Dato il tema "${topic}" and queste parole già inserite: [${existingWords.join(", ")}], 
    suggerisci 8 parole italiane correlate che starebbero bene in un cruciverba.
    Le parole devono essere di lunghezza compresa tra 3 e 12 lettere, senza spazi o accenti.
    Restituisci solo un array JSON di stringhe in maiuscolo.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Errore suggerimenti:", e);
    return [];
  }
};
