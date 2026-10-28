import React, { createContext, useContext, useState, useEffect } from "react";
import { GroceryCategory } from "../types";

export type LanguageCode = "en" | "pt" | "es" | "fr" | "de" | "it";

export interface LanguageInfo {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: "en", name: "English", nativeName: "English", flag: "🇬🇧" },
  { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇵🇹" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "it", name: "Italian", nativeName: "Italiano", flag: "🇮🇹" },
];

export const CATEGORY_TRANSLATIONS: Record<LanguageCode, Record<GroceryCategory, string>> = {
  en: {
    Fruits: "Fruits",
    Vegetables: "Vegetables",
    Meat: "Meat",
    Dairy: "Dairy",
    Bakery: "Bakery",
    Pantry: "Pantry",
    Seafood: "Seafood",
    Frozen: "Frozen",
    Beverages: "Beverages",
    Snacks: "Snacks",
  },
  pt: {
    Fruits: "Frutas",
    Vegetables: "Legumes & Verduras",
    Meat: "Carnes",
    Dairy: "Laticínios & Ovos",
    Bakery: "Padaria",
    Pantry: "Despensa",
    Seafood: "Peixes & Frutos do Mar",
    Frozen: "Congelados",
    Beverages: "Bebidas",
    Snacks: "Snacks & Petiscos",
  },
  es: {
    Fruits: "Frutas",
    Vegetables: "Verduras",
    Meat: "Carnes",
    Dairy: "Lácteos y Huevos",
    Bakery: "Panadería",
    Pantry: "Despensa",
    Seafood: "Pescados y Mariscos",
    Frozen: "Congelados",
    Beverages: "Bebidas",
    Snacks: "Snacks",
  },
  fr: {
    Fruits: "Fruits",
    Vegetables: "Légumes",
    Meat: "Viandes",
    Dairy: "Produits Laitiers",
    Bakery: "Boulangerie",
    Pantry: "Épicerie",
    Seafood: "Poissons & Fruits de mer",
    Frozen: "Surgelés",
    Beverages: "Boissons",
    Snacks: "Snacks",
  },
  de: {
    Fruits: "Obst & Früchte",
    Vegetables: "Gemüse",
    Meat: "Fleisch",
    Dairy: "Milchprodukte & Eier",
    Bakery: "Bäckerei",
    Pantry: "Vorrat",
    Seafood: "Fisch & Meeresfrüchte",
    Frozen: "Tiefkühl",
    Beverages: "Getränke",
    Snacks: "Snacks",
  },
  it: {
    Fruits: "Frutta",
    Vegetables: "Verdura",
    Meat: "Carne",
    Dairy: "Latticini e Uova",
    Bakery: "Panetteria",
    Pantry: "Dispensa",
    Seafood: "Pesce e Frutti di mare",
    Frozen: "Surgelati",
    Beverages: "Bevande",
    Snacks: "Snack",
  },
};

const UI_STRINGS: Record<LanguageCode, Record<string, string>> = {
  en: {
    pantry_view: "Pantry View",
    in_store_view: "In Store View",
    add_items: "Add Items",
    quick_add: "Quick Add & AI Assist",
    search_placeholder: "Search pantry & grocery items...",
    all_categories: "All Categories",
    stock_levels: "Stock Levels",
    in_stock: "In Stock",
    low_stock: "Low Stock",
    out_of_stock: "Out of Stock",
    restock: "Restock",
    move_to_pantry: "Move to Pantry",
    move_to_store: "Move to Shopping List",
    checked_items: "Checked Items",
    total_estimated: "Estimated Total",
    voice_placeholder: "Type or dictate items (e.g. '2 apples, organic milk and sourdough bread')...",
    listening: "Listening... speak now",
    scan_receipt: "Scan Receipt",
    analyzing: "Analyzing with AI...",
    language: "Language",
  },
  pt: {
    pantry_view: "Despensa",
    in_store_view: "Na Loja (Lista)",
    add_items: "Adicionar Itens",
    quick_add: "Adição Rápida com IA",
    search_placeholder: "Pesquisar itens na despensa e lista...",
    all_categories: "Todas as Categorias",
    stock_levels: "Níveis de Estoque",
    in_stock: "Em Estoque",
    low_stock: "Estoque Baixo",
    out_of_stock: "Esgotado",
    restock: "Repor Estoque",
    move_to_pantry: "Mover para Despensa",
    move_to_store: "Mover para Lista de Compras",
    checked_items: "Itens Comprados",
    total_estimated: "Total Estimado",
    voice_placeholder: "Digite ou fale os itens (ex: '2 maçãs, leite e pão')...",
    listening: "Ouvindo... fale agora",
    scan_receipt: "Escanear Recibo",
    analyzing: "Analisando com IA...",
    language: "Idioma",
  },
  es: {
    pantry_view: "Despensa",
    in_store_view: "En Tienda",
    add_items: "Añadir Artículos",
    quick_add: "Añadir con IA",
    search_placeholder: "Buscar en la despensa y lista...",
    all_categories: "Todas las Categorías",
    stock_levels: "Niveles de Stock",
    in_stock: "En Stock",
    low_stock: "Stock Bajo",
    out_of_stock: "Agotado",
    restock: "Reponer",
    move_to_pantry: "Mover a Despensa",
    move_to_store: "Mover a Lista de Compras",
    checked_items: "Artículos Comprados",
    total_estimated: "Total Estimado",
    voice_placeholder: "Escriba o dicte los artículos (ej: '2 manzanas, leche y pan')...",
    listening: "Escuchando... hable ahora",
    scan_receipt: "Escanear Ticket",
    analyzing: "Analizando con IA...",
    language: "Idioma",
  },
  fr: {
    pantry_view: "Garde-manger",
    in_store_view: "En Magasin",
    add_items: "Ajouter Articles",
    quick_add: "Ajout Rapide IA",
    search_placeholder: "Rechercher dans le garde-manger...",
    all_categories: "Toutes Catégories",
    stock_levels: "Niveaux de Stock",
    in_stock: "En Stock",
    low_stock: "Stock Faible",
    out_of_stock: "Épuisé",
    restock: "Réapprovisionner",
    move_to_pantry: "Mettre au Garde-manger",
    move_to_store: "Ajouter à la Liste",
    checked_items: "Articles Achetés",
    total_estimated: "Total Estimé",
    voice_placeholder: "Tapez ou dictez vos courses (ex: '2 pommes, lait et pain')...",
    listening: "Écoute en cours...",
    scan_receipt: "Scanner Ticket",
    analyzing: "Analyse IA en cours...",
    language: "Langue",
  },
  de: {
    pantry_view: "Vorratskammer",
    in_store_view: "Im Laden",
    add_items: "Artikel Hinzufügen",
    quick_add: "Schnell mit KI",
    search_placeholder: "Vorrat und Einkaufsliste durchsuchen...",
    all_categories: "Alle Kategorien",
    stock_levels: "Bestand",
    in_stock: "Auf Lager",
    low_stock: "Knapp",
    out_of_stock: "Ausverkauft",
    restock: "Auffüllen",
    move_to_pantry: "In Vorrat einlagern",
    move_to_store: "Auf Einkaufsliste",
    checked_items: "Gekaufte Artikel",
    total_estimated: "Geschätzte Summe",
    voice_placeholder: "Eingeben oder diktieren (z.B. '2 Äpfel, Milch und Brot')...",
    listening: "Zuhören...",
    scan_receipt: "Kassenzettel scannen",
    analyzing: "KI-Analyse läuft...",
    language: "Sprache",
  },
  it: {
    pantry_view: "Dispensa",
    in_store_view: "In Negozio",
    add_items: "Aggiungi Articoli",
    quick_add: "Aggiunta Rapida IA",
    search_placeholder: "Cerca nella dispensa e lista...",
    all_categories: "Tutte le Categorie",
    stock_levels: "Livelli di Scorte",
    in_stock: "Disponibile",
    low_stock: "In Esaurimento",
    out_of_stock: "Esaurito",
    restock: "Rifornisci",
    move_to_pantry: "Sposta in Dispensa",
    move_to_store: "Aggiungi alla Lista",
    checked_items: "Articoli Acquistati",
    total_estimated: "Totale Stimato",
    voice_placeholder: "Digita o detta la spesa (es: '2 mele, latte e pane')...",
    listening: "In ascolto...",
    scan_receipt: "Scansiona Scontrino",
    analyzing: "Analisi IA in corso...",
    language: "Lingua",
  },
};

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  languageInfo: LanguageInfo;
  t: (key: string) => string;
  categoryLabel: (category: GroceryCategory) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  languageInfo: SUPPORTED_LANGUAGES[0],
  t: (key: string) => key,
  categoryLabel: (category: GroceryCategory) => category,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    try {
      const saved = localStorage.getItem("pantry_interface_language") as LanguageCode;
      if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
        return saved;
      }
    } catch (e) {
      console.error(e);
    }
    return "en";
  });

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    try {
      localStorage.setItem("pantry_interface_language", lang);
    } catch (e) {
      console.error(e);
    }
  };

  const languageInfo =
    SUPPORTED_LANGUAGES.find((l) => l.code === language) ||
    SUPPORTED_LANGUAGES[0];

  const t = (key: string): string => {
    const dict = UI_STRINGS[language] || UI_STRINGS.en;
    return dict[key] || UI_STRINGS.en[key] || key;
  };

  const categoryLabel = (category: GroceryCategory): string => {
    const catDict = CATEGORY_TRANSLATIONS[language] || CATEGORY_TRANSLATIONS.en;
    return catDict[category] || category;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        languageInfo,
        t,
        categoryLabel,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
