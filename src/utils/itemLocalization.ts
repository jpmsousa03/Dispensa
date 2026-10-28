export type LanguageCode = "en" | "pt" | "es" | "fr" | "de" | "it";

// Canonical concept dictionary mapping various multilingual and plural tokens to language-specific standard canonical names
interface ConceptTranslation {
  en: string; // Singular canonical in English (e.g. "Apple")
  pt: string; // Singular canonical in Portuguese (e.g. "Maçã")
  es: string; // Singular canonical in Spanish (e.g. "Manzana")
  fr: string; // Singular canonical in French (e.g. "Pomme")
  de: string; // Singular canonical in German (e.g. "Apfel")
  it: string; // Singular canonical in Italian (e.g. "Mela")
  category: "Fruits" | "Vegetables" | "Meat" | "Dairy" | "Bakery" | "Pantry" | "Seafood" | "Frozen" | "Beverages" | "Snacks";
  // All multilingual tokens (singular, plural, accented, unaccented) that represent this concept
  aliases: string[];
}

export const GROCERY_CONCEPTS: ConceptTranslation[] = [
  {
    en: "Apple",
    pt: "Maçã",
    es: "Manzana",
    fr: "Pomme",
    de: "Apfel",
    it: "Mela",
    category: "Fruits",
    aliases: [
      "apple", "apples", "red apple", "green apple",
      "maçã", "maçãs", "maca", "macas", "maca fuji", "maçã fuji", "maçã gala",
      "manzana", "manzanas",
      "pomme", "pommes",
      "apfel", "äpfel", "aepfel",
      "mela", "mele",
    ],
  },
  {
    en: "Banana",
    pt: "Banana",
    es: "Plátano",
    fr: "Banane",
    de: "Banane",
    it: "Banana",
    category: "Fruits",
    aliases: [
      "banana", "bananas", "organic bananas",
      "plátano", "platano", "plátanos", "platanos",
      "banane", "bananes",
    ],
  },
  {
    en: "Orange",
    pt: "Laranja",
    es: "Naranja",
    fr: "Orange",
    de: "Orange",
    it: "Arancia",
    category: "Fruits",
    aliases: [
      "orange", "oranges",
      "laranja", "laranjas",
      "naranja", "naranjas",
      "arancia", "arance",
    ],
  },
  {
    en: "Lemon",
    pt: "Limão Siciliano",
    es: "Limón",
    fr: "Citron",
    de: "Zitrone",
    it: "Limone",
    category: "Fruits",
    aliases: [
      "lemon", "lemons",
      "limão", "limao", "limões", "limoes",
      "limón", "limon", "limones",
      "citron", "citrons",
      "zitrone", "zitronen",
      "limone", "limoni",
    ],
  },
  {
    en: "Lime",
    pt: "Lima",
    es: "Lima",
    fr: "Citron Vert",
    de: "Limette",
    it: "Lime",
    category: "Fruits",
    aliases: ["lime", "limes", "lima", "limas", "limette", "limetten"],
  },
  {
    en: "Avocado",
    pt: "Abacate",
    es: "Aguacate",
    fr: "Avocat",
    de: "Avocado",
    it: "Avocado",
    category: "Fruits",
    aliases: [
      "avocado", "avocados", "hass avocado",
      "abacate", "abacates",
      "aguacate", "aguacates", "palta",
      "avocat", "avocats",
    ],
  },
  {
    en: "Strawberry",
    pt: "Morango",
    es: "Fresa",
    fr: "Fraise",
    de: "Erdbeere",
    it: "Fragola",
    category: "Fruits",
    aliases: [
      "strawberry", "strawberries",
      "morango", "morangos",
      "fresa", "fresas", "frutilla",
      "fraise", "fraises",
      "erdbeere", "erdbeeren",
      "fragola", "fragole",
    ],
  },
  {
    en: "Blueberry",
    pt: "Mirtilo",
    es: "Arándano",
    fr: "Myrtille",
    de: "Blaubeere",
    it: "Mirtillo",
    category: "Fruits",
    aliases: [
      "blueberry", "blueberries",
      "mirtilo", "mirtilos",
      "arándano", "arandano", "arándanos",
      "myrtille", "myrtilles",
      "blaubeere", "heidelbeere",
      "mirtillo", "mirtilli",
    ],
  },
  {
    en: "Milk",
    pt: "Leite",
    es: "Leche",
    fr: "Lait",
    de: "Milch",
    it: "Latte",
    category: "Dairy",
    aliases: [
      "milk", "milks", "whole milk", "skim milk", "oat milk",
      "leite", "leite gordo", "leite meio gordo", "leite magro", "leites",
      "leche", "leche entera", "leche desnatada",
      "lait", "lait entier",
      "milch", "vollmilch",
      "latte", "latte intero",
    ],
  },
  {
    en: "Egg",
    pt: "Ovo",
    es: "Huevo",
    fr: "Oeuf",
    de: "Ei",
    it: "Uovo",
    category: "Dairy",
    aliases: [
      "egg", "eggs", "fresh eggs", "organic eggs",
      "ovo", "ovos", "ovos biologicos", "ovos frescos",
      "huevo", "huevos",
      "oeuf", "oeufs", "œuf", "œufs",
      "ei", "eier",
      "uovo", "uova",
    ],
  },
  {
    en: "Cheese",
    pt: "Queijo",
    es: "Queso",
    fr: "Fromage",
    de: "Käse",
    it: "Formaggio",
    category: "Dairy",
    aliases: [
      "cheese", "cheeses", "cheddar", "gouda", "parmesan",
      "queijo", "queijos", "queijo prato", "queijo flamengo", "mozzarella",
      "queso", "quesos",
      "fromage", "fromages",
      "käse", "kaese",
      "formaggio", "formaggi",
    ],
  },
  {
    en: "Butter",
    pt: "Manteiga",
    es: "Mantequilla",
    fr: "Beurre",
    de: "Butter",
    it: "Burro",
    category: "Dairy",
    aliases: [
      "butter", "unsalted butter",
      "manteiga", "manteigas",
      "mantequilla", "manteca",
      "beurre",
      "burro",
    ],
  },
  {
    en: "Yogurt",
    pt: "Iogurte",
    es: "Yogur",
    fr: "Yaourt",
    de: "Joghurt",
    it: "Yogurt",
    category: "Dairy",
    aliases: [
      "yogurt", "yogurts", "greek yogurt",
      "iogurte", "iogurtes", "iogurte grego",
      "yogur", "yogures",
      "yaourt", "yaourts",
      "joghurt",
    ],
  },
  {
    en: "Bread",
    pt: "Pão",
    es: "Pan",
    fr: "Pain",
    de: "Brot",
    it: "Pane",
    category: "Bakery",
    aliases: [
      "bread", "breads", "sourdough", "sourdough bread", "white bread", "toast", "loaf",
      "pão", "pao", "pães", "paes", "pão de forma", "pão alentejano",
      "pan", "panes", "pan de molde",
      "pain", "baguette",
      "brot", "brötchen",
      "pane",
    ],
  },
  {
    en: "Croissant",
    pt: "Croissant",
    es: "Cruasán",
    fr: "Croissant",
    de: "Croissant",
    it: "Cornetto",
    category: "Bakery",
    aliases: ["croissant", "croissants", "cruasán", "cornetto", "cornetti"],
  },
  {
    en: "Chicken",
    pt: "Frango",
    es: "Pollo",
    fr: "Poulet",
    de: "Hähnchen",
    it: "Pollo",
    category: "Meat",
    aliases: [
      "chicken", "chicken breast", "chicken fillets", "chickens",
      "frango", "frangos", "peito de frango", "bifes de frango",
      "pollo", "pechuga de pollo",
      "poulet", "blanc de poulet",
      "hähnchen", "haehnchen", "huhn",
    ],
  },
  {
    en: "Beef",
    pt: "Carne Bovina",
    es: "Carne de Vacuno",
    fr: "Boeuf",
    de: "Rindfleisch",
    it: "Manzo",
    category: "Meat",
    aliases: [
      "beef", "ground beef", "steak", "minced meat",
      "carne", "carne picada", "carne moída", "carne bovina", "bife",
      "ternera", "carne picada",
      "boeuf", "bœuf", "steak haché",
      "rindfleisch", "hackfleisch",
      "manzo",
    ],
  },
  {
    en: "Pork",
    pt: "Carne de Porco",
    es: "Carne de Cerdo",
    fr: "Porc",
    de: "Schweinefleisch",
    it: "Maiale",
    category: "Meat",
    aliases: [
      "pork", "pork chops", "pork belly",
      "carne de porco", "lombo de porco", "febras",
      "cerdo", "chuletas",
      "porc",
      "schweinefleisch",
      "maiale",
    ],
  },
  {
    en: "Bacon",
    pt: "Bacon",
    es: "Bacon",
    fr: "Bacon",
    de: "Speck",
    it: "Pancetta",
    category: "Meat",
    aliases: [
      "bacon", "bacon fatiado", "smoked bacon", "crispy bacon",
      "speck", "pancetta", "toucinho", "tocino",
    ],
  },
  {
    en: "Ham",
    pt: "Presunto",
    es: "Jamón",
    fr: "Jambon",
    de: "Schinken",
    it: "Prosciutto",
    category: "Meat",
    aliases: [
      "ham", "smoked ham",
      "presunto", "fiambre",
      "jamón", "jamon",
      "jambon",
      "schinken",
      "prosciutto",
    ],
  },
  {
    en: "Salmon",
    pt: "Salmão",
    es: "Salmón",
    fr: "Saumon",
    de: "Lachs",
    it: "Salmone",
    category: "Seafood",
    aliases: [
      "salmon", "salmon fillet", "fresh salmon",
      "salmão", "salmao", "posta de salmão",
      "salmón", "salmon",
      "saumon",
      "lachs",
      "salmone",
    ],
  },
  {
    en: "Tuna",
    pt: "Atum",
    es: "Atún",
    fr: "Thon",
    de: "Thunfisch",
    it: "Tonno",
    category: "Seafood",
    aliases: [
      "tuna", "canned tuna",
      "atum", "lata de atum",
      "atún", "atun",
      "thon",
      "thunfisch",
      "tonno",
    ],
  },
  {
    en: "Tomato",
    pt: "Tomate",
    es: "Tomate",
    fr: "Tomate",
    de: "Tomate",
    it: "Pomodoro",
    category: "Vegetables",
    aliases: [
      "tomato", "tomatoes", "cherry tomatoes",
      "tomate", "tomates", "tomate chucha", "tomate cereja",
      "tomaten",
      "pomodoro", "pomodori",
    ],
  },
  {
    en: "Potato",
    pt: "Batata",
    es: "Patata",
    fr: "Pomme de Terre",
    de: "Kartoffel",
    it: "Patata",
    category: "Vegetables",
    aliases: [
      "potato", "potatoes",
      "batata", "batatas",
      "patata", "patatas", "papa", "papas",
      "pomme de terre", "pommes de terre",
      "kartoffel", "kartoffeln",
    ],
  },
  {
    en: "Onion",
    pt: "Cebola",
    es: "Cebolla",
    fr: "Oignon",
    de: "Zwiebel",
    it: "Cipolla",
    category: "Vegetables",
    aliases: [
      "onion", "onions", "red onion",
      "cebola", "cebolas",
      "cebolla", "cebollas",
      "oignon", "oignons",
      "zwiebel", "zwiebeln",
      "cipolla", "cipolle",
    ],
  },
  {
    en: "Garlic",
    pt: "Alho",
    es: "Ajo",
    fr: "Ail",
    de: "Knoblauch",
    it: "Aglio",
    category: "Vegetables",
    aliases: ["garlic", "alho", "alhos", "ajo", "ajos", "ail", "knoblauch", "aglio"],
  },
  {
    en: "Carrot",
    pt: "Cenoura",
    es: "Zanahoria",
    fr: "Carotte",
    de: "Karotte",
    it: "Carota",
    category: "Vegetables",
    aliases: [
      "carrot", "carrots",
      "cenoura", "cenouras",
      "zanahoria", "zanahorias",
      "carotte", "carottes",
      "karotte", "karotten", "möhre",
      "carota", "carote",
    ],
  },
  {
    en: "Olive Oil",
    pt: "Azeite de Oliva",
    es: "Aceite de Oliva",
    fr: "Huile d'Olive",
    de: "Olivenöl",
    it: "Olio d'Oliva",
    category: "Pantry",
    aliases: [
      "olive oil", "oil", "extra virgin olive oil",
      "azeite", "azeite de oliva", "azeite virgem extra", "oleo",
      "aceite", "aceite de oliva",
      "huile d'olive", "huile",
      "olivenöl", "olivenoel",
      "olio d'oliva", "olio",
    ],
  },
  {
    en: "Pasta",
    pt: "Massa",
    es: "Pasta",
    fr: "Pâtes",
    de: "Nudeln",
    it: "Pasta",
    category: "Pantry",
    aliases: [
      "pasta", "spaghetti", "penne", "macaroni", "fusilli",
      "massa", "esparguete", "macarrão", "macarrao",
      "fideos",
      "pâtes", "pates",
      "nudeln",
    ],
  },
  {
    en: "Rice",
    pt: "Arroz",
    es: "Arroz",
    fr: "Riz",
    de: "Reis",
    it: "Riso",
    category: "Pantry",
    aliases: ["rice", "white rice", "arroz", "riz", "reis", "riso"],
  },
  {
    en: "Coffee",
    pt: "Café",
    es: "Café",
    fr: "Café",
    de: "Kaffee",
    it: "Caffè",
    category: "Beverages",
    aliases: [
      "coffee", "coffee beans", "ground coffee",
      "café", "cafe", "café em grão", "cafe moido",
      "kaffee",
      "caffè", "caffe",
    ],
  },
  {
    en: "Water",
    pt: "Água",
    es: "Agua",
    fr: "Eau",
    de: "Wasser",
    it: "Acqua",
    category: "Beverages",
    aliases: [
      "water", "mineral water", "sparkling water",
      "água", "agua", "água mineral",
      "eau",
      "wasser",
      "acqua",
    ],
  },
];

/**
 * Normalizes an English plural noun to singular:
 * e.g. "apples" -> "Apple", "bananas" -> "Banana", "tomatoes" -> "Tomato"
 */
export function singularizeWord(word: string): string {
  const trimmed = word.trim();
  const lower = trimmed.toLowerCase();

  // Explicit irregular or common cases
  if (lower === "apples") return "Apple";
  if (lower === "bananas") return "Banana";
  if (lower === "lemons") return "Lemon";
  if (lower === "limes") return "Lime";
  if (lower === "oranges") return "Orange";
  if (lower === "eggs") return "Egg";
  if (lower === "breads") return "Bread";
  if (lower === "milks") return "Milk";
  if (lower === "tomatoes") return "Tomato";
  if (lower === "potatoes") return "Potato";
  if (lower === "carrots") return "Carrot";
  if (lower === "onions") return "Onion";
  if (lower === "strawberries") return "Strawberry";
  if (lower === "blueberries") return "Blueberry";
  if (lower === "berries") return "Berry";
  if (lower === "croissants") return "Croissant";
  if (lower === "avocados") return "Avocado";
  if (lower === "cookies") return "Cookie";

  // General English heuristics
  if (lower.endsWith("ies") && lower.length > 4) {
    return trimmed.slice(0, -3) + "y";
  }
  if (lower.endsWith("es") && !lower.endsWith("tes") && !lower.endsWith("les") && lower.length > 4) {
    return trimmed.slice(0, -2);
  }
  if (lower.endsWith("s") && !lower.endsWith("ss") && !lower.endsWith("us") && lower.length > 3) {
    return trimmed.slice(0, -1);
  }

  return trimmed;
}

/**
 * Main translation & canonicalization function:
 * Converts any raw input word (in any language or plural form)
 * to the standardized, singular item name in the website interface language!
 *
 * Example:
 * canonicalizeItemName("apples", "en") -> "Apple"
 * canonicalizeItemName("maçãs", "en") -> "Apple"
 * canonicalizeItemName("pommes", "en") -> "Apple"
 * canonicalizeItemName("apples", "pt") -> "Maçã"
 * canonicalizeItemName("maçãs", "pt") -> "Maçã"
 * canonicalizeItemName("milk", "pt") -> "Leite"
 */
export function canonicalizeItemName(
  rawName: string,
  targetLanguage: LanguageCode = "en"
): string {
  if (!rawName || typeof rawName !== "string") return "";

  const clean = rawName.trim().toLowerCase();

  // 1. Try exact match or plural match against canonical concepts
  for (const concept of GROCERY_CONCEPTS) {
    for (const alias of concept.aliases) {
      if (clean === alias || clean === alias + "s") {
        return concept[targetLanguage] || concept.en;
      }
    }
  }

  // 2. Fallback: if target language is English, apply standard singularization & capitalization
  if (targetLanguage === "en") {
    const sing = singularizeWord(rawName);
    return sing.charAt(0).toUpperCase() + sing.slice(1);
  }

  // 3. Default: Capitalize first letter preserving the exact item title
  return rawName.charAt(0).toUpperCase() + rawName.slice(1);
}
