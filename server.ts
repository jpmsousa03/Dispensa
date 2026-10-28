import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "25mb" }));
app.use(express.static(path.join(process.cwd(), "public")));

// Lazy Gemini client helper
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Timeout helper to ensure snappy response and prevent long loading spinners
function withTimeout<T>(promise: Promise<T>, ms: number = 7500): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Gemini API request timed out")), ms)
    ),
  ]);
}

// GenerateContent with automatic transient error retry for temporary 503 high demand spikes only (NEVER retry 429 quota exhaustion)
async function generateContentWithRetry(ai: any, params: any, timeoutMs: number = 25000): Promise<any> {
  try {
    return await withTimeout(ai.models.generateContent(params), timeoutMs);
  } catch (err: any) {
    const msg = String(err?.message || "");
    // NEVER retry on 429 / quota errors to prevent burning rate limits
    if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota")) {
      throw err;
    }
    if (msg.includes("503") || msg.includes("UNAVAILABLE") || msg.includes("high demand")) {
      console.warn("Retrying Gemini call once after transient 503 spike...");
      await new Promise((r) => setTimeout(r, 1500));
      return await withTimeout(ai.models.generateContent(params), timeoutMs);
    }
    throw err;
  }
}

// Resilient JSON parser that gracefully repairs truncated JSON structures
function safeJsonParse(str: string, fallback: any = {}): any {
  if (!str || typeof str !== "string") return fallback;
  const trimmed = str.trim();
  try {
    return JSON.parse(trimmed);
  } catch (initialErr) {
    // Attempt repair by finding last complete closing brace and balancing open brackets
    try {
      const lastCloseBrace = trimmed.lastIndexOf("}");
      if (lastCloseBrace !== -1) {
        let candidate = trimmed.substring(0, lastCloseBrace + 1);
        let openBrackets = 0;
        let openBraces = 0;
        let inString = false;
        let escaped = false;
        for (let i = 0; i < candidate.length; i++) {
          const c = candidate[i];
          if (escaped) {
            escaped = false;
            continue;
          }
          if (c === "\\") {
            escaped = true;
            continue;
          }
          if (c === '"') {
            inString = !inString;
            continue;
          }
          if (!inString) {
            if (c === "[") openBrackets++;
            else if (c === "]") openBrackets--;
            else if (c === "{") openBraces++;
            else if (c === "}") openBraces--;
          }
        }
        while (openBrackets > 0) {
          candidate += "]";
          openBrackets--;
        }
        while (openBraces > 0) {
          candidate += "}";
          openBraces--;
        }
        return JSON.parse(candidate);
      }
    } catch (repairErr) {
      console.warn("JSON repair attempt failed:", repairErr);
    }
  }
  return fallback;
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Voice Audio Transcription using Gemini
app.post("/api/ai/transcribe-voice", async (req, res) => {
  try {
    const { audioBase64, mimeType = "audio/webm", language = "en", languageName = "English" } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: "Audio base64 data is required" });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: "GEMINI_API_KEY is not configured",
      });
    }

    const cleanBase64 = audioBase64.replace(/^data:[^;]+;base64,/, "");
    // Use clean standard MIME type for audio inlineData
    const actualMime = mimeType ? mimeType.split(";")[0].trim() : "audio/webm";

    let transcript = "";
    let lastError: any = null;

    const langContext = languageName
      ? `The speaker is speaking in ${languageName} (or Portuguese / English / Spanish). `
      : "";
    const prompt = `Listen carefully to this spoken audio. ${langContext}Transcribe all spoken words verbatim into plain text in the exact language spoken. Preserve all grocery item names, quantities, brand names, and instructions accurately. Return strictly the transcribed speech without markdown formatting or introductory remarks. If the audio is completely silent or contains zero human speech, return [SILENCE].`;

    // 1. Primary: gemini-3.8-flash (multimodal audio transcription)
    try {
      const response = await generateContentWithRetry(
        ai,
        {
          model: "gemini-3.8-flash",
          contents: {
            parts: [
              {
                inlineData: {
                  data: cleanBase64,
                  mimeType: actualMime,
                },
              },
              {
                text: prompt,
              },
            ],
          },
        },
        20000
      );

      transcript = response.text?.trim() || "";
      if (!transcript && response.candidates?.[0]?.content?.parts) {
        transcript = response.candidates[0].content.parts
          .map((p: any) => p.text || "")
          .join(" ")
          .trim();
      }
    } catch (primaryErr: any) {
      lastError = primaryErr;
      console.warn("gemini-3.8-flash transcribe error:", primaryErr?.message);
    }

    // 2. Fallback: gemini-3.1-flash-lite (high-throughput, separate quota pool)
    if (!transcript || transcript === "[SILENCE]") {
      try {
        const fallbackRes = await generateContentWithRetry(
          ai,
          {
            model: "gemini-3.1-flash-lite",
            contents: {
              parts: [
                {
                  inlineData: {
                    data: cleanBase64,
                    mimeType: actualMime,
                  },
                },
                {
                  text: prompt,
                },
              ],
            },
          },
          20000
        );

        const fbText = fallbackRes.text?.trim() || "";
        if (fbText && fbText !== "[SILENCE]") {
          transcript = fbText;
        }
      } catch (fallbackErr: any) {
        lastError = fallbackErr;
        console.warn("gemini-3.1-flash-lite fallback error:", fallbackErr?.message);
      }
    }

    // Clean up transcript
    transcript = transcript
      .replace(/^\[SILENCE\]\.?$/i, "")
      .replace(/^["']|["']$/g, "")
      .trim();

    // Check if error was caused by API rate limit / quota
    const errMsg = String(lastError?.message || "");
    if (!transcript && (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota"))) {
      return res.status(429).json({
        error: "Gemini API rate limit or quota reached. Please wait a few moments or type your items directly.",
      });
    }

    if (!transcript || /^(please provide the audio|i cannot hear|no audio|cannot transcribe|unable to transcribe|please provide a valid audio|no spoken words|only silence|silence)/i.test(transcript)) {
      return res.json({
        transcript: "",
        noSpeech: true,
        message: "No speech detected in audio. Please speak clearly into your microphone, or choose one of the sample phrases below.",
      });
    }

    return res.json({ transcript });
  } catch (err: any) {
    console.error("Audio transcription error:", err);
    return res.status(500).json({
      error: err.message || "Failed to transcribe audio",
    });
  }
});

// Dynamic Product Image Cache
const productImageCache = new Map<string, string>();

// Verified clean ingredient packshots for authentic product fallbacks
const VERIFIED_FOOD_PACKSHOTS: Record<string, string> = {
  chicken: "https://img.spoonacular.com/ingredients_250x250/chicken-breasts.png",
  beef: "https://img.spoonacular.com/ingredients_250x250/fresh-ground-beef.jpg",
  pork: "https://img.spoonacular.com/ingredients_250x250/fresh-ground-beef.jpg",
  mozzarella: "https://img.spoonacular.com/ingredients_250x250/mozzarella.png",
  milk: "https://img.spoonacular.com/ingredients_250x250/milk.png",
  yogurt: "https://img.spoonacular.com/ingredients_250x250/plain-yogurt.jpg",
  cheese: "https://img.spoonacular.com/ingredients_250x250/cheddar-cheese.png",
  egg: "https://img.spoonacular.com/ingredients_250x250/egg.png",
  eggs: "https://img.spoonacular.com/ingredients_250x250/egg.png",
  bread: "https://img.spoonacular.com/ingredients_250x250/sourdough-bread.jpg",
  sourdough: "https://img.spoonacular.com/ingredients_250x250/sourdough-bread.jpg",
  pasta: "https://img.spoonacular.com/ingredients_250x250/penne-pasta.jpg",
  penne: "https://img.spoonacular.com/ingredients_250x250/penne-pasta.jpg",
  oil: "https://img.spoonacular.com/ingredients_250x250/olive-oil.jpg",
  "olive oil": "https://img.spoonacular.com/ingredients_250x250/olive-oil.jpg",
  salmon: "https://img.spoonacular.com/ingredients_250x250/salmon.png",
  butter: "https://img.spoonacular.com/ingredients_250x250/butter.png",
  apple: "https://img.spoonacular.com/ingredients_250x250/apple.jpg",
  apples: "https://img.spoonacular.com/ingredients_250x250/apple.jpg",
  lime: "https://img.spoonacular.com/ingredients_250x250/lime.jpg",
  limes: "https://img.spoonacular.com/ingredients_250x250/lime.jpg",
  lemon: "https://img.spoonacular.com/ingredients_250x250/lemon.png",
  lemons: "https://img.spoonacular.com/ingredients_250x250/lemon.png",
  banana: "https://img.spoonacular.com/ingredients_250x250/bananas.jpg",
  bananas: "https://img.spoonacular.com/ingredients_250x250/bananas.jpg",
  blueberry: "https://img.spoonacular.com/ingredients_250x250/blueberries.jpg",
  blueberries: "https://img.spoonacular.com/ingredients_250x250/blueberries.jpg",
  strawberry: "https://img.spoonacular.com/ingredients_250x250/strawberries.png",
  strawberries: "https://img.spoonacular.com/ingredients_250x250/strawberries.png",
  bacon: "https://img.spoonacular.com/ingredients_250x250/raw-bacon.png",
  coffee: "https://img.spoonacular.com/ingredients_250x250/coffee-beans.jpg",
  rice: "https://img.spoonacular.com/ingredients_250x250/white-rice.jpg",
  tomato: "https://img.spoonacular.com/ingredients_250x250/tomato.png",
  potato: "https://img.spoonacular.com/ingredients_250x250/potatoes-yukon-gold.png",
  onion: "https://img.spoonacular.com/ingredients_250x250/brown-onion.png",
  garlic: "https://img.spoonacular.com/ingredients_250x250/garlic.png",
  avocado: "https://img.spoonacular.com/ingredients_250x250/avocado.jpg",
  orange: "https://img.spoonacular.com/ingredients_250x250/orange.png",
  ham: "https://img.spoonacular.com/ingredients_250x250/ham.png",
  tuna: "https://img.spoonacular.com/ingredients_250x250/canned-tuna.png",
};

// Fetch authentic grocery product image via external Food & Product APIs (OpenFoodFacts, Wikipedia, etc.)
async function fetchProductImageFromApi(name: string, category?: string): Promise<string> {
  if (!name || typeof name !== "string") return "";
  const cleanName = name.trim().toLowerCase();
  const cacheKey = `${cleanName}:${(category || "").toLowerCase()}`;
  if (productImageCache.has(cacheKey)) {
    return productImageCache.get(cacheKey)!;
  }

  // Strip brand details, packaging, sizes, and quantity suffixes
  let clean = cleanName
    .replace(/\(.*?\)/g, "")
    .replace(/\b\d+(\.\d+)?\s*(kg|g|pcs|ml|l|pack|packung|un|x)\b/gi, "")
    .replace(/^(organic|fresh|bio|crisp|wild|extra virgin|extra|pure|aged|free-range|artisan|bronze-cut|dark roast|whole|raw)\s+/gi, "")
    .trim();

  // Translations dictionary to bridge Portuguese/Spanish/French to English for global APIs
  const translations: Record<string, string> = {
    maçã: "apple",
    maçãs: "apple",
    banana: "banana",
    bananas: "banana",
    pão: "bread",
    "pão de forma": "sliced bread",
    leite: "milk",
    ovos: "eggs",
    ovo: "eggs",
    queijo: "cheese",
    bacon: "bacon",
    salmão: "salmon",
    arroz: "rice",
    café: "coffee",
    azeite: "olive oil",
    manteiga: "butter",
    iogurte: "yogurt",
    tomate: "tomato",
    batata: "potato",
    frango: "chicken",
    presunto: "ham",
    carne: "beef",
    "carne bovina": "beef",
    "carne picada": "ground beef",
    massa: "pasta",
    macarrão: "pasta",
    limão: "lemon",
    lima: "lime",
    laranja: "orange",
    morango: "strawberry",
    mirtilo: "blueberry",
  };

  const translated = translations[clean] || translations[cleanName];

  // Build targeted query priority list
  const queries: string[] = [];
  if (clean) queries.push(clean);
  if (translated && !queries.includes(translated)) queries.push(translated);
  if (!queries.includes(cleanName)) queries.push(cleanName);

  // Extract individual keywords (e.g. "chicken fillets" -> "chicken")
  const words = (translated || clean).split(/[\s,-]+/);
  for (const w of words) {
    if (w.length > 2 && !queries.includes(w)) {
      queries.push(w);
    }
  }

  // 1. Query Open Food Facts API (millions of authentic barcode packaged groceries)
  for (const q of queries.slice(0, 3)) {
    if (!q) continue;
    try {
      const offUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
        q
      )}&search_simple=1&action=process&json=1&page_size=2`;
      const res = await fetch(offUrl, {
        headers: { "User-Agent": "GroceryPantryApp/2.0 (contact: info@groceryapp.internal)" },
        signal: AbortSignal.timeout(2500),
      });
      if (res.ok) {
        const data: any = await res.json();
        if (data.products && Array.isArray(data.products)) {
          for (const prod of data.products) {
            const img = prod.image_front_url || prod.image_front_small_url || prod.image_url;
            if (img && typeof img === "string" && img.startsWith("http")) {
              productImageCache.set(cacheKey, img);
              return img;
            }
          }
        }
      }
    } catch {
      // Continue to next source
    }
  }

  // 2. Query Wikimedia Commons / Wikipedia API for high-resolution food photos
  for (const q of queries.slice(0, 3)) {
    try {
      const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
        q
      )}&gsrlimit=1&prop=pageimages&pithumbsize=400&format=json`;
      const res = await fetch(wikiUrl, {
        headers: { "User-Agent": "GroceryPantryApp/2.0" },
        signal: AbortSignal.timeout(2500),
      });
      if (res.ok) {
        const data: any = await res.json();
        const pages = data.query?.pages;
        if (pages) {
          const firstPage: any = Object.values(pages)[0];
          if (firstPage?.thumbnail?.source) {
            const img = firstPage.thumbnail.source;
            productImageCache.set(cacheKey, img);
            return img;
          }
        }
      }
    } catch {
      // Continue
    }
  }

  // 3. Fallback to verified food packshot CDN
  for (const q of queries) {
    if (VERIFIED_FOOD_PACKSHOTS[q]) {
      const img = VERIFIED_FOOD_PACKSHOTS[q];
      productImageCache.set(cacheKey, img);
      return img;
    }
  }

  return "";
}

// Endpoint to dynamically retrieve product images via API calls
app.get("/api/image/product", async (req, res) => {
  const name = String(req.query.name || "").trim();
  const category = String(req.query.category || "").trim();
  if (!name) {
    return res.status(400).json({ error: "Product name is required" });
  }
  const imageUrl = await fetchProductImageFromApi(name, category);
  return res.json({ name, category, imageUrl });
});

// Alias endpoint for product search
app.get("/api/products/search", async (req, res) => {
  const query = String(req.query.query || req.query.name || "").trim();
  const category = String(req.query.category || "").trim();
  if (!query) {
    return res.status(400).json({ error: "Query is required" });
  }
  const imageUrl = await fetchProductImageFromApi(query, category);
  return res.json({ query, category, imageUrl });
});

// Helper function for local smart interpretation if Gemini model is overloaded (503) or offline
function localSmartInterpret(
  text: string,
  pantryItems: any[] = [],
  shoppingListItems: any[] = [],
  defaultStore: string = "Lidl",
  language: string = "en",
  _languageName: string = "English"
) {
  const detectCat = (name: string) => {
    const l = name.toLowerCase();
    if (l.match(/apple|banana|lime|lemon|berry|berries|orange|fruit|grape|avocado|mango|pear|maç|pera/)) return "Fruits";
    if (l.match(/tomato|carrot|salad|lettuce|cucumber|onion|garlic|potato|pepper|spinach|broccoli|veg|tomate|batata|cebola|alho/)) return "Vegetables";
    if (l.match(/chicken|pork|beef|meat|steak|bacon|sausage|turkey|ground|carne|frango|porco|vaca|presunto/)) return "Meat";
    if (l.match(/milk|cheese|mozzarella|yogurt|cheddar|butter|cream|egg|parmesan|dairy|leite|queijo|iogurte|manteiga|ovo/)) return "Dairy";
    if (l.match(/bread|sourdough|bagel|croissant|bun|toast|bakery|rye|pão|pao|bolo/)) return "Bakery";
    if (l.match(/salmon|fish|tuna|shrimp|cod|prawn|seafood|salmão|salmao|peixe|atum|bacalhau/)) return "Seafood";
    if (l.match(/ice cream|pizza|frozen|congelad/)) return "Frozen";
    if (l.match(/coffee|tea|juice|soda|water|coke|drink|beverage|café|cafe|chá|cha|sumo|água|agua/)) return "Beverages";
    if (l.match(/chip|snack|cookie|chocolate|nuts|candy|bolacha|biscoito/)) return "Snacks";
    return "Pantry";
  };

  // Split into clauses or items
  const cleanInput = text.replace(/^(oh|hey|please|can you|i want to|we need to)\s+/i, "");
  const segments = cleanInput
    .split(/(?:,|\band\b|\be\b|\balso\b|\bthen\b|\.|\n)+/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const actions: any[] = [];
  let lastExplicitStore = defaultStore;

  for (const seg of segments) {
    const lowerSeg = seg.toLowerCase();

    // Check if segment expresses removal, cancellation, or negation
    const isRemoval = lowerSeg.match(/\b(remove|delete|finish|finished|ate|threw away|expired|throw away|drop|do not need|don't need|dont need|no need|not need|actually don't need|actually do not need|don't want|dont want|do not want|don't buy|dont buy|do not buy|cancel|forget|não preciso|nao preciso|não quero|apagar|remover|cancela)\b/);
    // Check if segment expresses already bought / moving to pantry
    const isBought = lowerSeg.match(/\b(bought|got|purchased|arrived|put in pantry|restocked)\b/);

    // Detect explicit price if stated (e.g. "a 2.50€", "for 3 euros", "custou 4€")
    let price = 0;
    const priceMatch =
      seg.match(/(?:for|a|por|custou|custa|at)\s*(\d+(?:[.,]\d+)?)\s*(?:€|eur|euros|\$)?/i) ||
      seg.match(/(\d+(?:[.,]\d+)?)\s*(?:€|eur|euros)\b/i);
    if (priceMatch) {
      price = parseFloat(priceMatch[1].replace(",", "."));
    }

    // Detect supermarket specifically for this item
    let itemStore = "";
    let storeReasoning = "";
    if (/continente/i.test(seg)) {
      itemStore = "Continente";
      lastExplicitStore = "Continente";
      storeReasoning = "Assigned to Continente as requested.";
    } else if (/pingo\s*doce|pingodoce/i.test(seg)) {
      itemStore = "Pingo Doce";
      lastExplicitStore = "Pingo Doce";
      storeReasoning = "Assigned to Pingo Doce as requested.";
    } else if (/mercadona/i.test(seg)) {
      itemStore = "Mercadona";
      lastExplicitStore = "Mercadona";
      storeReasoning = "Assigned to Mercadona as requested.";
    } else if (/auchan|jumbo/i.test(seg)) {
      itemStore = "Auchan";
      lastExplicitStore = "Auchan";
      storeReasoning = "Assigned to Auchan as requested.";
    } else if (/aldi/i.test(seg)) {
      itemStore = "Aldi";
      lastExplicitStore = "Aldi";
      storeReasoning = "Assigned to Aldi as requested.";
    } else if (/lidl/i.test(seg)) {
      itemStore = "Lidl";
      lastExplicitStore = "Lidl";
      storeReasoning = "Assigned to Lidl as requested.";
    } else if (/prisma/i.test(seg)) {
      itemStore = "Prisma";
      lastExplicitStore = "Prisma";
      storeReasoning = "Assigned to Prisma as requested.";
    } else if (/k-?supermarket/i.test(seg)) {
      itemStore = "KSupermarket";
      lastExplicitStore = "KSupermarket";
      storeReasoning = "Assigned to KSupermarket as requested.";
    }

    // Clean segment into candidate item name, stripping filler, conversational words, negations, and store phrases
    let itemName = seg
      .replace(/\b(actually i do not need|actually i don't need|actually i dont need|i do not need|i don't need|i dont need|do not need|don't need|dont need|no need for|no need|not need|actually don't need|actually not|i don't want|i dont want|don't want|dont want|don't buy|dont buy|cancel the|forget the|delete the|remove the|i need to buy|need to buy|i need to|i need|need|i want to buy|i want to|i want|want|buy|get|purchase|we have|we got|add|remove|delete|finished|expired|não preciso de|nao preciso de|não preciso|não quero|esquece o|cancela o|preciso de comprar|preciso comprar|preciso de|preciso|comprar|temos|acabou)\b/gi, "")
      .replace(/\b(from|at|in|to|de|no|na|do|da)\s+(continente|pingo doce|pingodoce|lidl|mercadona|auchan|aldi|prisma|ksupermarket|intermarche|intermarché|minipreco|minipreço|carrefour|store|pantry|shopping list|loja|supermercado|despensa)\b/gi, "")
      .replace(/\b(some|a bit of|few|um pouco de|algum|alguns|algumas|the|o|a|os|as)\b/gi, "")
      .replace(/(?:for|a|por|custou|custa|at)\s*(\d+(?:[.,]\d+)?)\s*(?:€|eur|euros|\$)?/gi, "")
      .trim();

    if (!itemName) continue;

    // Detect quantity
    let qty = 1;
    let unit = "pcs";
    const qtyMatch = itemName.match(/^(\d+(?:[.,]\d+)?)\s*(x|kg|g|lbs|pcs|pack|carton|balls|bottle|loaf|boxes)?\b/i);
    if (qtyMatch) {
      qty = parseFloat(qtyMatch[1].replace(",", "."));
      if (qtyMatch[2] && qtyMatch[2].toLowerCase() !== "x") unit = qtyMatch[2].toLowerCase();
      itemName = itemName.replace(qtyMatch[0], "").trim();
    }

    if (!itemName) continue;
    const l = itemName.toLowerCase();
    if (language === "pt") {
      if (l === "apples" || l === "apple" || l === "maçãs" || l === "macas") itemName = "Maçã";
      else if (l === "bananas" || l === "banana") itemName = "Banana";
      else if (l === "tomatoes" || l === "tomato" || l === "tomates") itemName = "Tomate";
      else if (l === "potatoes" || l === "potato" || l === "batatas") itemName = "Batata";
      else if (l === "eggs" || l === "egg" || l === "ovos") itemName = "Ovo";
      else if (l === "milk" || l === "milks" || l === "leite") itemName = "Leite";
      else if (l === "cheese" || l === "queijos") itemName = "Queijo";
      else if (l === "bread" || l === "pães" || l === "paes") itemName = "Pão";
      else if (l === "bacon") itemName = "Bacon";
    } else if (language === "en") {
      if (l === "apples" || l === "maçãs" || l === "macas" || l === "manzanas" || l === "pommes") itemName = "Apple";
      else if (l === "bananas" || l === "plátanos" || l === "bananes") itemName = "Banana";
      else if (l === "tomatoes" || l === "tomates" || l === "pomodori") itemName = "Tomato";
      else if (l === "potatoes" || l === "batatas" || l === "patatas") itemName = "Potato";
      else if (l === "eggs" || l === "ovos" || l === "huevos" || l === "oeufs") itemName = "Egg";
      else if (l === "milk" || l === "leite" || l === "leche" || l === "lait") itemName = "Milk";
      else if (l === "bacon") itemName = "Bacon";
    }
    itemName = itemName.charAt(0).toUpperCase() + itemName.slice(1);
    const category = detectCat(itemName);

    // Suggest store if not explicitly mentioned
    if (!itemStore) {
      if (category === "Bakery" || category === "Seafood") {
        itemStore = defaultStore || "Lidl";
        storeReasoning = `Assigned to ${itemStore}.`;
      } else if (category === "Dairy" || category === "Meat") {
        itemStore = defaultStore || "Lidl";
        storeReasoning = `Assigned to ${itemStore}.`;
      } else {
        itemStore = lastExplicitStore || defaultStore || "Lidl";
        storeReasoning = `Assigned to ${itemStore}.`;
      }
    }

    if (isRemoval) {
      // Find in pantry or shopping list
      const pantryMatch = pantryItems.find(
        (p) =>
          p.name.toLowerCase().includes(itemName.toLowerCase()) ||
          itemName.toLowerCase().includes(p.name.toLowerCase())
      );
      if (pantryMatch) {
        actions.push({
          actionType: "remove_from_pantry",
          name: pantryMatch.name,
          category: pantryMatch.category,
          quantity: pantryMatch.quantity,
          unit: pantryMatch.unit || "pcs",
          store: pantryMatch.targetStore || itemStore,
          price: pantryMatch.price || 0,
          reasoning: `Consumed or expired → Remove from pantry inventory.`,
          existingItemId: pantryMatch.id,
          existingItemLocation: "pantry",
        });
        continue;
      }
      const shopMatch = shoppingListItems.find(
        (s) =>
          s.name.toLowerCase().includes(itemName.toLowerCase()) ||
          itemName.toLowerCase().includes(s.name.toLowerCase())
      );
      if (shopMatch) {
        actions.push({
          actionType: "remove_from_store",
          name: shopMatch.name,
          category: shopMatch.category,
          quantity: shopMatch.quantity,
          unit: shopMatch.unit || "pcs",
          store: shopMatch.targetStore || itemStore,
          price: shopMatch.price || 0,
          reasoning: `Removed from ${shopMatch.targetStore} shopping list.`,
          existingItemId: shopMatch.id,
          existingItemLocation: "shopping_list",
        });
        continue;
      }

      // If requested removal but not found in existing lists, DO NOT generate a phantom removal action!
      continue;
    }

    if (isBought) {
      // Check if was on shopping list
      const shopMatch = shoppingListItems.find(
        (s) =>
          s.name.toLowerCase().includes(itemName.toLowerCase()) ||
          itemName.toLowerCase().includes(s.name.toLowerCase())
      );
      if (shopMatch) {
        actions.push({
          actionType: "move_store_to_pantry",
          name: shopMatch.name,
          category: shopMatch.category,
          quantity: shopMatch.quantity || qty,
          unit: shopMatch.unit || unit,
          store: shopMatch.targetStore || itemStore,
          price: shopMatch.price || price || 0,
          reasoning: `Matched on ${shopMatch.targetStore} shopping list → Mark bought and move to Pantry!`,
          existingItemId: shopMatch.id,
          existingItemLocation: "shopping_list",
        });
      } else {
        actions.push({
          actionType: "add_to_pantry",
          name: itemName,
          category,
          quantity: qty,
          unit,
          store: itemStore,
          price,
          reasoning: `New purchased item → Add fresh to Home Pantry.`,
        });
      }
      continue;
    }

    // Default intent: User wants to buy / needs item
    const pantryMatch = pantryItems.find(
      (p) =>
        p.name.toLowerCase().includes(itemName.toLowerCase()) ||
        itemName.toLowerCase().includes(p.name.toLowerCase())
    );

    if (pantryMatch) {
      actions.push({
        actionType: "move_pantry_to_store",
        name: pantryMatch.name,
        category: pantryMatch.category,
        quantity: qty,
        unit: pantryMatch.unit || unit,
        store: pantryMatch.targetStore || itemStore,
        price: pantryMatch.price || price || 0,
        reasoning: `Found in Pantry (${pantryMatch.quantity} ${pantryMatch.unit || "pcs"} in stock) → Move to ${itemStore} shopping list to restock!`,
        existingItemId: pantryMatch.id,
        existingItemLocation: "pantry",
        existingPantryQty: pantryMatch.quantity,
      });
    } else {
      actions.push({
        actionType: "add_to_store",
        name: itemName,
        category,
        quantity: qty,
        unit,
        store: itemStore,
        price,
        reasoning: `${storeReasoning} Not found in pantry → Add fresh to ${itemStore} shopping list.`,
      });
    }
  }

  return {
    detectedStore: lastExplicitStore,
    summary: `Interpreted ${actions.length} action(s)`,
    actions,
  };
}

// Deep Contextual Grocery Interpretation (Add, Move pantry to store, Move store to pantry, Remove)
app.post("/api/ai/smart-interpret", async (req, res) => {
  const {
    text,
    pantryItems = [],
    shoppingListItems = [],
    defaultStore = "Lidl",
    language = "en",
    languageName = "English",
  } = req.body;

  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Text prompt is required" });
  }

  const ai = getGeminiClient();
  if (!ai) {
    // Graceful local fallback
    const fallback = localSmartInterpret(text, pantryItems, shoppingListItems, defaultStore, language, languageName);
    return res.json(fallback);
  }

  try {
    const pantrySummary = pantryItems
      .map(
        (p: any) =>
          `- [ID: ${p.id}] "${p.name}" (${p.quantity} ${p.unit || "pcs"}, store: ${p.targetStore || "Lidl"}, category: ${p.category || "Pantry"}, price: €${p.price || 0})`
      )
      .join("\n");

    const shoppingSummary = shoppingListItems
      .map(
        (s: any) =>
          `- [ID: ${s.id}] "${s.name}" (${s.quantity} ${s.unit || "pcs"}, store: ${s.targetStore || defaultStore}, category: ${s.category || "Pantry"})`
      )
      .join("\n");

    const prompt = `You are an expert grocery, culinary, and pantry logistics AI.
A user gave this spoken or written instruction: "${text}".

==================================================
CURRENT USER INVENTORIES FOR CONTEXTUAL DECISIONS:
==================================================

1. IN-STORE SHOPPING LIST (${shoppingListItems.length} items currently planned to purchase):
${shoppingSummary || "• (Empty: Shopping list has no items)"}

2. HOME PANTRY INVENTORY (${pantryItems.length} items currently stocked in home pantry):
${pantrySummary || "• (Empty: Pantry is currently empty)"}
==================================================

Default supermarket store: "${defaultStore}".
TARGET INTERFACE LANGUAGE: "${languageName}" (ISO code: "${language}").

CRITICAL AI TRANSLATION, PRECISE IDENTIFICATION & CANONICAL NAMING RULES:
1. TARGET LANGUAGE:
   - Output every item "name", "category", and "reasoning" strictly in the target interface language: ${languageName.toUpperCase()}.
   - If the user's input was in another language (e.g. Portuguese, Spanish, French, German, Italian), translate each item into its authentic, idiomatic product name in ${languageName} (e.g. if interface is English: "maçãs" -> "Apple", "leite" -> "Milk", "azeite" -> "Olive Oil", "presunto" -> "Ham").
   - If interface is Portuguese ("Português"): "apples" -> "Maçã", "milk" -> "Leite", "olive oil" -> "Azeite", "ham" -> "Presunto".

2. PRESERVE DISTINCT ITEM SPECIFICITY (DO NOT OVERSIMPLIFY):
   - You MUST preserve the exact, distinct grocery product name!
   - NEVER oversimplify or downgrade distinct items into broad generic categories!
     * "bacon" MUST be "Bacon", NEVER generic "Pork" or "Meat"!
     * "ham" or "presunto" MUST be "Ham" (or "Presunto"), NEVER generic "Meat" or "Pork"!
     * "sourdough bread" MUST be "Sourdough Bread", NEVER generic "Bread"!
     * "cheddar" or "cheddar cheese" MUST be "Cheddar Cheese", NEVER generic "Cheese"!
     * "parmesan" MUST be "Parmesan", NEVER generic "Cheese"!
     * "greek yogurt" MUST be "Greek Yogurt", NEVER generic "Yogurt"!
     * "chicken breast" MUST be "Chicken Breast", NEVER generic "Meat"!
     * "salmon" MUST be "Salmon", NEVER generic "Fish"!

3. SINGULAR & CANONICAL PRODUCT TITLES:
   - Normalize plural counts into clean product names (e.g. "3 apples" -> name: "Apple", quantity: 3; "2 loaves of sourdough" -> name: "Sourdough Bread", quantity: 2; "bacon" -> name: "Bacon", quantity: 1).

4. AUTOMATIC CATEGORIZATION:
   - Accurately assign the most appropriate category: "Fruits", "Vegetables", "Meat", "Dairy", "Bakery", "Pantry", "Seafood", "Frozen", "Beverages", "Snacks".
   - (For example, "Bacon" -> "Meat", "Cheddar Cheese" -> "Dairy", "Sourdough Bread" -> "Bakery", "Apple" -> "Fruits", "Olive Oil" -> "Pantry").

CRITICAL ACTION DECISION RULES — USE USER'S INVENTORIES ABOVE:
1. REMOVALS, DELETIONS & NEGATIONS ("actually I don't need [item]", "don't buy [item]", "remove [item]", "delete [item]", "cancel [item]", "não preciso de [item]", "já não quero [item]", "tira o [item]"):
   - SEARCH the In-Store Shopping List and Home Pantry inventories provided above for this item (match across languages and singular/plural, e.g. "milk" matches "Leite", "eggs" matches "Ovo" or "Ovos").
   - Case A: If found on the In-Store Shopping List:
     -> actionType: "remove_from_store", existingItemId: [matching shopping list item ID], existingItemLocation: "shopping_list", reasoning: "Found on shopping list → Remove {name} as requested."
   - Case B: If found in the Home Pantry:
     -> actionType: "remove_from_pantry", existingItemId: [matching pantry item ID], existingItemLocation: "pantry", reasoning: "Found in pantry → Remove {name} as requested."
   - Case C: IF NOT FOUND ON EITHER LIST (CRITICAL MANDATORY RULE):
     -> DO NOT create any removal action! DO NOT return "remove_from_store" or "remove_from_pantry" for items that are not on the user's lists!
     -> Never remove items that were never on the list in the first place. Omit the non-existent item from the "actions" array entirely.
     -> Explain in the "summary" that the item was not present on the list.

2. REPLENISHMENTS & RESTOCKS ("move_pantry_to_store"):
   - User says they need / want to buy / ran out of this item, AND it ALREADY EXISTS in their Home Pantry inventory above!
   - (e.g., user says "I need eggs, tomatoes and cheese", and "Eggs" is already in the pantry. Suggest moving eggs to the store shopping list to replenish without creating a duplicate blind item!)
   - Set "existingItemId" to matching pantry item's ID, "existingPantryQty" to pantry item's quantity.
   - Set "reasoning": "Found in Pantry ({qty} {unit} in stock) → Move to {store} shopping list to restock."

3. FRESH PURCHASES ("add_to_store"):
   - User wants to buy / get an item, and it is NOT in their Home Pantry inventory above.
   - (e.g., in "I want cake and milk", neither is in pantry).
   - Set "reasoning": "Not found in pantry → Add fresh to {store} shopping list."

4. COMPLETED PURCHASES ("move_store_to_pantry"):
   - User says they bought / brought home / restocked an item that was on their In-Store Shopping List.
   - Set "existingItemId" to matching shopping list item's ID.
   - Set "reasoning": "Matched on shopping list → Mark purchased and move into pantry."

5. DIRECT PANTRY INTAKE ("add_to_pantry"):
   - User explicitly says they bought / added a new item directly into their pantry inventory that was not on the shopping list.
   - Set "reasoning": "Add fresh directly into Home Pantry."

6. CONSUMED / EXPIRED ("remove_from_pantry"):
   - User says they consumed, finished, ate, ran out of, threw away, or want to delete an existing pantry item (e.g. "finished the milk", "remove expired yogurt").
   - Set "existingItemId" to matching pantry item's ID.
   - Set "reasoning": "Consumed or removed from pantry."

CRITICAL SUPERMARKET & STORE ALLOCATION RULES (PAY CLOSE ATTENTION):
- When the user mentions MULTIPLE supermarkets in their speech (e.g. 'add apples from Aldi and milk from Lidl' / 'no Aldi compra pão e no Lidl compra peixe' / 'from Prisma get salmon and from KSupermarket get cheese'):
  * Pay CLOSE ATTENTION to which item belongs to which supermarket!
  * Set each item's 'store' field INDIVIDUALLY to the exact supermarket specified for that item.
  * NEVER lump all items into Lidl or defaultStore!
  * Support and properly capitalize all supermarket names (e.g. Lidl, Aldi, Prisma, KSupermarket, etc.).
- INTELLIGENT STORE SUGGESTION:
  * If the user mentions a supermarket for some items, but NOT for another item, or if the user asks to add an item without specifying any supermarket:
    SUGGEST the best supermarket for that specific item based on:
    a) If the item is already in the user's pantry or shopping list, suggest the store where the user already buys it.
    b) Otherwise, suggest the most logical supermarket: "Lidl", "Aldi", "Prisma", "KSupermarket", or the user's defaultStore ("${defaultStore}").
    c) Include the reasoning for the store suggestion in 'reasoning' (e.g. "Assigned to Aldi as specified" or "Suggested Lidl for pantry staples").

CRITICAL RULE ON PRICES (NEVER ESTIMATE UNKNOWN PRICES):
- If the user explicitly stated a price in speech/text (e.g. 'for 2.50 euros', 'a 3 euros', 'custou 1.99'): extract that price.
- If moving an existing item from the user's inventory that already has a known price: preserve that price.
- OTHERWISE, IF THE USER DID NOT STATE A PRICE: DO NOT TRY TO ESTIMATE IT.
- Set 'price' strictly to 0.
- NEVER invent, guess, or estimate random prices. The user explicitly instructed: "if you don't know the price, don't try to estimate it."`;

    const response = await generateContentWithRetry(
      ai,
      {
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          maxOutputTokens: 4096,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detectedStore: { type: Type.STRING },
              summary: { type: Type.STRING },
              actions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    actionType: {
                      type: Type.STRING,
                      description:
                        "One of: move_pantry_to_store, add_to_store, move_store_to_pantry, add_to_pantry, remove_from_pantry, remove_from_store",
                    },
                    name: { type: Type.STRING },
                    category: { type: Type.STRING },
                    quantity: { type: Type.NUMBER },
                    unit: { type: Type.STRING },
                    store: {
                      type: Type.STRING,
                      description:
                        "The specific supermarket for this item (e.g. Continente, Pingo Doce, Lidl, Mercadona, Auchan, Aldi, Prisma, KSupermarket). Respect user's specified store per item, or intelligently suggest if unspecified.",
                    },
                    price: {
                      type: Type.NUMBER,
                      description:
                        "Numerical price ONLY if explicitly specified by user or known from existing item. If unknown, set to 0. Do NOT estimate or guess.",
                    },
                    reasoning: { type: Type.STRING },
                    notes: { type: Type.STRING },
                    existingItemId: { type: Type.STRING },
                    existingItemLocation: { type: Type.STRING },
                    existingPantryQty: { type: Type.NUMBER },
                  },
                  required: ["actionType", "name", "category", "store", "reasoning"],
                },
              },
            },
            required: ["actions"],
          },
        },
      },
      25000
    );

    const parsed = safeJsonParse(response.text || "{}", {});
    if (parsed.actions && Array.isArray(parsed.actions)) {
      // Dynamically attach authentic product images via API calls
      await Promise.all(
        parsed.actions.map(async (act: any) => {
          if (!act.imageUrl && act.name) {
            act.imageUrl = await fetchProductImageFromApi(act.name, act.category);
          }
        })
      );
      return res.json(parsed);
    }
    // Only if response was malformed/missing actions array, fallback to local interpreter
    const fallback = localSmartInterpret(text, pantryItems, shoppingListItems, defaultStore, language, languageName);
    return res.json(fallback);
  } catch (err: any) {
    console.warn("Gemini smart interpret warning (switching to local smart interpret):", err?.message);
    const fallback = localSmartInterpret(text, pantryItems, shoppingListItems, defaultStore, language, languageName);
    return res.json(fallback);
  }
});

// Parse natural language or voice dictation (legacy / simple endpoint)
app.post("/api/ai/parse-text", async (req, res) => {
  try {
    const { text, defaultStore, language = "en", languageName = "English" } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text prompt is required" });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: "GEMINI_API_KEY is not configured",
        useFallback: true,
      });
    }

    const response = await generateContentWithRetry(
      ai,
      {
        model: "gemini-3.8-flash",
        contents: `You are an expert grocery assistant. Extract grocery items from this text: "${text}".
TARGET INTERFACE LANGUAGE: "${languageName}" (ISO code: "${language}").

AI TRANSLATION & CANONICAL NAMING RULES:
1. Translate all item names and categories into "${languageName}". If input is "maçãs" and language is English, output "Apple". If input is "apples" and language is Portuguese, output "Maçã".
2. Always output singular canonical names (e.g. "apples" -> "Apple", "2 bananas" -> name: "Banana", quantity: 2).
3. PRESERVE DISTINCT SPECIFIC ITEMS: Never oversimplify distinct items! "Bacon" MUST be "Bacon" (category: Meat), NEVER "Pork" or "Carne de Porco"! "Ham" MUST be "Ham" (or "Presunto"), NEVER "Pork"! "Sourdough Bread" is "Sourdough Bread", not generic "Bread".
4. AUTOMATIC CATEGORIZATION: Accurately assign category to one of: "Fruits", "Vegetables", "Meat", "Dairy", "Bakery", "Pantry", "Seafood", "Frozen", "Beverages", "Snacks".
5. Extract quantity, unit, price if mentioned, and store if mentioned (default to "${defaultStore || "Lidl"}").`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedStore: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  category: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  unit: { type: Type.STRING },
                  estimatedPrice: { type: Type.NUMBER },
                  store: { type: Type.STRING },
                  notes: { type: Type.STRING },
                },
                required: ["name", "category"],
              },
            },
          },
          required: ["items"],
        },
      },
    });

    const parsed = safeJsonParse(response.text || "{}", {});
    if (parsed.items && Array.isArray(parsed.items)) {
      await Promise.all(
        parsed.items.map(async (item: any) => {
          if (!item.imageUrl && item.name) {
            item.imageUrl = await fetchProductImageFromApi(item.name, item.category);
          }
        })
      );
    }
    return res.json(parsed);
  } catch (err: any) {
    console.error("Gemini text parse error:", err);
    return res.status(500).json({
      error: err.message || "Failed to process text",
      useFallback: true,
    });
  }
});
// Parse receipt image with Multimodal AI and cross-check against shopping list & pantry
app.post("/api/ai/parse-receipt", async (req, res) => {
  const {
    imageBase64,
    mimeType = "image/jpeg",
    shoppingListItems = [],
    pantryItems = [],
    defaultStore = "Lidl",
    language = "en",
    languageName = "English",
  } = req.body || {};

  try {
    if (!imageBase64) {
      return res.status(400).json({ error: "Image base64 data is required" });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: "GEMINI_API_KEY is not configured",
      });
    }

    // Clean base64 string if data url prefix is present
    const base64Data = imageBase64.replace(/^data:[^;]+;base64,/, "");
    const cleanMime = (mimeType || "image/jpeg").split(";")[0].trim();

    const shoppingListSummary = shoppingListItems
      .map((s: any) => `- [ID: ${s.id}] "${s.name}" (store: ${s.targetStore})`)
      .join("\n");

    const pantrySummary = pantryItems
      .map((p: any) => `- [ID: ${p.id}] "${p.name}" (quantity: ${p.quantity} ${p.unit})`)
      .join("\n");

    const response = await generateContentWithRetry(
      ai,
      {
        model: "gemini-3.8-flash",
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: cleanMime,
              },
            },
            {
              text: `You are an expert multimodal receipt OCR and grocery auditor.
Analyze this grocery store receipt photo with multimodal vision precision.

CRITICAL MANDATORY REQUIREMENT — EXHAUSTIVE LINE-BY-LINE TRANSCRIPTION:
1. EXTRACT EVERY SINGLE PURCHASED ITEM (NEVER STOP EARLY):
   - You MUST scan the ENTIRE receipt from the first purchased product line down to the subtotal line.
   - You MUST extract EVERY SINGLE product row printed on this receipt.
   - If the receipt has 5 items, return 5 items. If it has 12 items, return all 12 items. If it has 25 items, return all 25 items.
   - Extracting only 1 or 2 items from a multi-item receipt is STRICTLY PROHIBITED. Scan sequentially through every row!
   - Every product, weighable fruit or vegetable, dairy product, meat, beverage, bakery good, snack, or grocery item MUST have its own individual entry in the "items" array.

2. QUANTITY, WEIGHT & PRICE PRECISION:
   - For produce or meat sold by weight (e.g. "0.750 kg x 1.99 €/kg = 1.49 €"):
     * name: "Banana" (or target language name)
     * quantity: 0.75
     * unit: "kg"
     * price: 1.49
   - For multi-packs or quantity multipliers (e.g. "2 x 1.29 = 2.58"):
     * quantity: 2
     * price: 2.58
   - For single items, default quantity is 1 and price is the printed line price.
   - If a promotional discount line appears beneath an item (e.g. "PROMO -0.50" or "DESCONTO -0.30"), deduct it to record the net paid price for that item.

3. EXCLUDE NON-PRODUCT LINES:
   - Exclude metadata rows from "items": SUB-TOTAL, TOTAL, TAX, IVA, VAT, CASH, CARD, VISA, MULTIBANCO, CHANGE, TROCO, CARD PAYMENT, DATE/TIME, STORE TAX ID/NIF, STORE ADDRESS/PHONE/WEBSITE, BARCODE.
   - If the image is not a receipt or contains no readable purchases, return "items": [] and "storeName": "Unknown". Do not invent items.

TARGET WEBSITE INTERFACE LANGUAGE: "${languageName}" (ISO code: "${language}").
CRITICAL TRANSLATION & CANONICAL PRODUCT TITLES:
- Receipts often have cryptic abbreviations or are printed in another language (e.g. Portuguese, Spanish, French, German, Italian, Finnish).
- You MUST translate every item name into a clean, singular canonical grocery title in "${languageName}"!
  * For example, if receipt is Portuguese and has "MAÇÃ FUJI KG" or "MANZANAS":
    - In English interface: name MUST be "Apple" (or "Fuji Apple").
    - In Portuguese interface: name MUST be "Maçã" (or "Maçã Fuji").
  * If receipt has "LEITE GORDO 1L":
    - In English interface: name MUST be "Whole Milk".
    - In Portuguese interface: name MUST be "Leite Gordo".
  * If receipt has "BACON FUMADO":
    - In English interface: name MUST be "Bacon".
    - In Portuguese interface: name MUST be "Bacon".
- PRESERVE SPECIFICITY: Bacon remains "Bacon" (Meat), not generic Pork. Sourdough Bread is "Sourdough Bread" (Bakery), not generic Bread. Cheddar is "Cheddar Cheese" (Dairy).
- Every item "name", "category", and "reasoning" MUST be in ${languageName.toUpperCase()}.

User's CURRENT IN-STORE SHOPPING LIST:
${shoppingListSummary || "(No items currently on shopping list)"}

User's CURRENT HOME PANTRY:
${pantrySummary || "(Pantry empty)"}

Tasks:
1. Extract store name (e.g., Lidl, Prisma, K-Supermarket, Continente, Pingo Doce, Trader Joe's, Mercadona, etc. Default: "${defaultStore}").
2. Extract total amount (number) and currency symbol (e.g. € or $).
3. Extract date of purchase (YYYY-MM-DD) if visible.
4. Extract every grocery item purchased from the receipt lines:
   - name: clean, human-readable name in ${languageName} (e.g. "Apple", "Bacon", "Eggs", "Milk", "Sourdough Bread"). Preserve exact item specificity.
   - category: one of: "Fruits", "Vegetables", "Meat", "Dairy", "Bakery", "Pantry", "Seafood", "Frozen", "Beverages", "Snacks"
   - quantity: number (weight or count)
   - unit: e.g. "pcs", "kg", "g", "pack", "carton", "bottle", "loaf"
   - price: final paid price as number
   - actionType:
     * "move_store_to_pantry" if the item matches an item on the user's shopping list (it fulfills the shopping list item and moves to pantry!).
     * "add_to_pantry" if it is a fresh item to add into the pantry.
   - existingItemId: ID of the matching shopping list item if matched.
    - reasoning: keep concise in ${languageName} (1 short sentence, max 10 words, e.g. "Matched on shopping list" or "Receipt purchase at ${defaultStore}").`,
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          maxOutputTokens: 32768,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              storeName: { type: Type.STRING },
              totalAmount: { type: Type.NUMBER },
              currency: { type: Type.STRING },
              purchaseDate: { type: Type.STRING },
              items: {
                type: Type.ARRAY,
                description: "Complete array of EVERY individual grocery product purchased on the receipt. Must contain all items, never just one.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    category: { type: Type.STRING },
                    quantity: { type: Type.NUMBER },
                    unit: { type: Type.STRING },
                    price: { type: Type.NUMBER },
                    actionType: { type: Type.STRING },
                    existingItemId: { type: Type.STRING },
                    reasoning: { type: Type.STRING },
                  },
                  required: ["name", "category", "price", "actionType"],
                },
              },
            },
            required: ["storeName", "items"],
          },
        },
      },
      60000
    );

    const parsed = safeJsonParse(response.text || "{}", {});
    if (parsed.items && Array.isArray(parsed.items) && parsed.items.length > 0) {
      // Dynamically attach authentic product images via API calls
      await Promise.all(
        parsed.items.map(async (item: any) => {
          if (!item.imageUrl && item.name) {
            item.imageUrl = await fetchProductImageFromApi(item.name, item.category);
          }
        })
      );

      return res.json({
        storeName: parsed.storeName || defaultStore || "Lidl",
        totalAmount: Number((parsed.totalAmount || 0).toFixed(2)),
        currency: parsed.currency || "€",
        purchaseDate: parsed.purchaseDate,
        items: parsed.items,
      });
    }

    return res.status(422).json({
      error: "No grocery items detected from this receipt photo. Please upload a clear photo with items and prices visible.",
    });
  } catch (err: any) {
    console.error("Gemini receipt parse error:", err);
    return res.status(500).json({
      error: err.message || "Failed to process receipt with AI. Please try again with a clear photo.",
    });
  }
});

// Vite middleware for development vs static build for production
async function setupApp() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

setupApp();
