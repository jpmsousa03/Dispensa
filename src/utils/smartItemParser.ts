import { GroceryCategory, ParsedItemDraft } from "../types";
import { canonicalizeItemName } from "./itemLocalization";
import { LanguageCode } from "../context/LanguageContext";

export function detectCategory(itemName: string): GroceryCategory {
  const lower = itemName.toLowerCase();

  if (
    lower.includes("apple") ||
    lower.includes("maçã") ||
    lower.includes("maca") ||
    lower.includes("manzana") ||
    lower.includes("pomme") ||
    lower.includes("apfel") ||
    lower.includes("banana") ||
    lower.includes("lime") ||
    lower.includes("lima") ||
    lower.includes("lemon") ||
    lower.includes("limão") ||
    lower.includes("limon") ||
    lower.includes("berry") ||
    lower.includes("berries") ||
    lower.includes("mirtilo") ||
    lower.includes("morango") ||
    lower.includes("orange") ||
    lower.includes("laranja") ||
    lower.includes("naranja") ||
    lower.includes("grape") ||
    lower.includes("pear") ||
    lower.includes("fruit") ||
    lower.includes("fruta") ||
    lower.includes("avocado") ||
    lower.includes("abacate") ||
    lower.includes("aguacate") ||
    lower.includes("mango")
  ) {
    return "Fruits";
  }

  if (
    lower.includes("carrot") ||
    lower.includes("cenoura") ||
    lower.includes("zanahoria") ||
    lower.includes("salad") ||
    lower.includes("lettuce") ||
    lower.includes("alface") ||
    lower.includes("tomato") ||
    lower.includes("tomate") ||
    lower.includes("cucumber") ||
    lower.includes("pepino") ||
    lower.includes("onion") ||
    lower.includes("cebola") ||
    lower.includes("cebolla") ||
    lower.includes("garlic") ||
    lower.includes("alho") ||
    lower.includes("ajo") ||
    lower.includes("potato") ||
    lower.includes("batata") ||
    lower.includes("patata") ||
    lower.includes("pepper") ||
    lower.includes("pimento") ||
    lower.includes("spinach") ||
    lower.includes("espinafre") ||
    lower.includes("broccoli") ||
    lower.includes("brócolis")
  ) {
    return "Vegetables";
  }

  if (
    lower.includes("chicken") ||
    lower.includes("frango") ||
    lower.includes("pollo") ||
    lower.includes("poulet") ||
    lower.includes("pork") ||
    lower.includes("porco") ||
    lower.includes("cerdo") ||
    lower.includes("beef") ||
    lower.includes("carne") ||
    lower.includes("meat") ||
    lower.includes("steak") ||
    lower.includes("bife") ||
    lower.includes("bacon") ||
    lower.includes("sausage") ||
    lower.includes("salsicha") ||
    lower.includes("chouriço") ||
    lower.includes("turkey") ||
    lower.includes("peru") ||
    lower.includes("lamb") ||
    lower.includes("ground") ||
    lower.includes("fillet")
  ) {
    return "Meat";
  }

  if (
    lower.includes("milk") ||
    lower.includes("leite") ||
    lower.includes("leche") ||
    lower.includes("lait") ||
    lower.includes("milch") ||
    lower.includes("cheese") ||
    lower.includes("queijo") ||
    lower.includes("queso") ||
    lower.includes("fromage") ||
    lower.includes("mozzarella") ||
    lower.includes("yogurt") ||
    lower.includes("iogurte") ||
    lower.includes("cheddar") ||
    lower.includes("butter") ||
    lower.includes("manteiga") ||
    lower.includes("cream") ||
    lower.includes("egg") ||
    lower.includes("ovo") ||
    lower.includes("huevo") ||
    lower.includes("oeuf") ||
    lower.includes("parmesan")
  ) {
    return "Dairy";
  }

  if (
    lower.includes("bread") ||
    lower.includes("pão") ||
    lower.includes("pao") ||
    lower.includes("pan") ||
    lower.includes("pain") ||
    lower.includes("brot") ||
    lower.includes("sourdough") ||
    lower.includes("bagel") ||
    lower.includes("croissant") ||
    lower.includes("bun") ||
    lower.includes("toast") ||
    lower.includes("torrada") ||
    lower.includes("bakery") ||
    lower.includes("padaria") ||
    lower.includes("rye")
  ) {
    return "Bakery";
  }

  if (
    lower.includes("fish") ||
    lower.includes("peixe") ||
    lower.includes("pescado") ||
    lower.includes("salmon") ||
    lower.includes("salmão") ||
    lower.includes("tuna") ||
    lower.includes("atum") ||
    lower.includes("shrimp") ||
    lower.includes("camarão") ||
    lower.includes("cod") ||
    lower.includes("bacalhau") ||
    lower.includes("prawn")
  ) {
    return "Seafood";
  }

  if (
    lower.includes("frozen") ||
    lower.includes("congelado") ||
    lower.includes("ice cream") ||
    lower.includes("gelado") ||
    lower.includes("helado") ||
    lower.includes("peas") ||
    lower.includes("pizza")
  ) {
    return "Frozen";
  }

  if (
    lower.includes("coffee") ||
    lower.includes("café") ||
    lower.includes("tea") ||
    lower.includes("chá") ||
    lower.includes("juice") ||
    lower.includes("suco") ||
    lower.includes("sumo") ||
    lower.includes("water") ||
    lower.includes("água") ||
    lower.includes("soda") ||
    lower.includes("refrigerante") ||
    lower.includes("drink") ||
    lower.includes("cerveja") ||
    lower.includes("beer") ||
    lower.includes("wine") ||
    lower.includes("vinho")
  ) {
    return "Beverages";
  }

  if (
    lower.includes("chip") ||
    lower.includes("snack") ||
    lower.includes("biscuit") ||
    lower.includes("bolacha") ||
    lower.includes("cookie") ||
    lower.includes("chocolate") ||
    lower.includes("candy") ||
    lower.includes("doce") ||
    lower.includes("nuts") ||
    lower.includes("nozes") ||
    lower.includes("amendoim")
  ) {
    return "Snacks";
  }

  return "Pantry";
}

export function parseQuickText(
  rawText: string,
  defaultStore: string = "Lidl",
  language: LanguageCode = "en"
): Omit<ParsedItemDraft, "duplicateInfo">[] {
  // Splits text by comma, newline, or "and" / "e" / "y"
  const lines = rawText
    .split(/,|\n|\band\b|\be\b|\by\b/gi)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return lines.map((line, idx) => {
    let cleanName = line;
    let qty = 1;
    let unit = "pcs";
    let price = 0;
    let store = defaultStore;

    // Check store in text
    if (/lidl/i.test(line)) store = "Lidl";
    else if (/prisma/i.test(line)) store = "Prisma";
    else if (/k-?supermarket/i.test(line)) store = "KSupermarket";

    // Check price like €4.50 or $4.50 or 4.50€ or 4.50 eur
    const explicitPriceMatch = line.match(/(?:for|at|price|costs?|por|[$€£])\s*([0-9]+(?:[.,][0-9]{2})?)/i);
    if (explicitPriceMatch) {
      price = parseFloat(explicitPriceMatch[1].replace(",", "."));
    }

    // Check quantity like 2x, 3 pcs, 500g, 1.5kg
    const qtyMatch = line.match(/^(\d+(?:[.,]\d+)?)\s*(x|kg|g|lbs|pcs|pack|carton|balls|bottle|loaf|boxes)?\b/i);
    if (qtyMatch) {
      qty = parseFloat(qtyMatch[1].replace(",", "."));
      if (qtyMatch[2] && qtyMatch[2].toLowerCase() !== "x") {
        unit = qtyMatch[2].toLowerCase();
      }
      cleanName = cleanName.replace(qtyMatch[0], "").trim();
    }

    // Clean up extra words from item name
    cleanName = cleanName
      .replace(/(?:from|at|de|em|no|na)\s+(?:lidl|prisma|ksupermarket|loja|store)/gi, "")
      .replace(/(?:for|at|por)\s*[$€£]?\s*\d+(?:[.,]\d{1,2})?/gi, "")
      .replace(/^[-*•]\s*/, "")
      .trim();

    // Canonicalize to interface language: e.g. "apples" or "maçãs" -> "Apple" if EN, or "Maçã" if PT
    if (cleanName.length > 0) {
      cleanName = canonicalizeItemName(cleanName, language);
    } else {
      cleanName = `Item ${idx + 1}`;
    }

    const category = detectCategory(cleanName);

    // Default prices if 0
    if (price === 0) {
      if (category === "Meat") price = 5.49;
      else if (category === "Dairy") price = 2.19;
      else if (category === "Fruits") price = 1.99;
      else if (category === "Bakery") price = 2.49;
      else price = 3.0;
    }

    return {
      id: `draft-${Date.now()}-${idx}`,
      name: cleanName,
      category,
      quantity: qty,
      unit,
      store,
      price: Number(price.toFixed(2)),
      destination: "shopping_list",
      selected: true,
      imageUrl: "",
    };
  });
}
