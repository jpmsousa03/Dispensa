import { StorageLocation, GroceryCategory } from "../types";

export interface StorageLocationConfig {
  id: StorageLocation;
  name: string;
  namePt: string;
  shortLabel: string;
  iconName: "refrigerator" | "cabinet" | "snowflake" | "countertop";
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  cardBorder: string;
  headerBg: string;
  dropZoneActive: string;
  description: string;
}

export const STORAGE_LOCATIONS: StorageLocationConfig[] = [
  {
    id: "fridge",
    name: "Fridge",
    namePt: "Frigorífico",
    shortLabel: "Fridge",
    iconName: "refrigerator",
    badgeBg: "bg-sky-50 text-sky-800",
    badgeBorder: "border-sky-200",
    badgeText: "text-sky-700",
    cardBorder: "border-sky-200/90",
    headerBg: "bg-sky-50/60",
    dropZoneActive: "border-sky-500 bg-sky-50/80 ring-2 ring-sky-400",
    description: "Perishables, fresh dairy, meats & cold items",
  },
  {
    id: "cabinet",
    name: "Cabinet / Pantry",
    namePt: "Armário / Despensa",
    shortLabel: "Cabinet",
    iconName: "cabinet",
    badgeBg: "bg-amber-50 text-amber-900",
    badgeBorder: "border-amber-200",
    badgeText: "text-amber-800",
    cardBorder: "border-amber-200/90",
    headerBg: "bg-amber-50/60",
    dropZoneActive: "border-amber-500 bg-amber-50/80 ring-2 ring-amber-400",
    description: "Dry goods, cans, oils, pasta, spices & snacks",
  },
  {
    id: "freezer",
    name: "Freezer",
    namePt: "Congelador",
    shortLabel: "Freezer",
    iconName: "snowflake",
    badgeBg: "bg-indigo-50 text-indigo-900",
    badgeBorder: "border-indigo-200",
    badgeText: "text-indigo-800",
    cardBorder: "border-indigo-200/90",
    headerBg: "bg-indigo-50/60",
    dropZoneActive: "border-indigo-500 bg-indigo-50/80 ring-2 ring-indigo-400",
    description: "Frozen meats, vegetables, ice cream & ready meals",
  },
  {
    id: "countertop",
    name: "Countertop / Ambient",
    namePt: "Bancada",
    shortLabel: "Counter",
    iconName: "countertop",
    badgeBg: "bg-emerald-50 text-emerald-900",
    badgeBorder: "border-emerald-200",
    badgeText: "text-emerald-800",
    cardBorder: "border-emerald-200/90",
    headerBg: "bg-emerald-50/60",
    dropZoneActive: "border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-400",
    description: "Fresh whole fruits, bread, bananas & ambient produce",
  },
];

export function getStorageLocationConfig(location?: StorageLocation): StorageLocationConfig {
  const loc = location || "cabinet";
  return (
    STORAGE_LOCATIONS.find((s) => s.id === loc) ||
    STORAGE_LOCATIONS[1] // cabinet fallback
  );
}

export function getDefaultStorageLocation(
  category?: GroceryCategory,
  notes?: string,
  name?: string
): StorageLocation {
  const text = `${notes || ""} ${name || ""}`.toLowerCase();
  if (text.includes("freezer") || text.includes("congelad") || text.includes("gelo")) {
    return "freezer";
  }
  if (text.includes("fridge") || text.includes("frigorífico") || text.includes("geladeira") || text.includes("crisper")) {
    return "fridge";
  }
  if (text.includes("counter") || text.includes("bancada") || text.includes("fruteira")) {
    return "countertop";
  }

  switch (category) {
    case "Dairy":
    case "Meat":
    case "Seafood":
      return "fridge";
    case "Frozen":
      return "freezer";
    case "Fruits":
      if (text.includes("banana") || text.includes("apple") || text.includes("maçã") || text.includes("orange") || text.includes("laranja")) {
        return "countertop";
      }
      return "fridge";
    case "Vegetables":
      return "fridge";
    case "Bakery":
    case "Pantry":
    case "Beverages":
    case "Snacks":
    default:
      return "cabinet";
  }
}
