export type GroceryCategory =
  | "Fruits"
  | "Vegetables"
  | "Meat"
  | "Dairy"
  | "Bakery"
  | "Pantry"
  | "Seafood"
  | "Frozen"
  | "Beverages"
  | "Snacks";

export type StorageLocation = "cabinet" | "fridge" | "freezer" | "countertop";

export interface GroceryItem {
  id: string;
  name: string;
  category: GroceryCategory;
  quantity: number;
  unit: string;
  location: "pantry" | "shopping_list";
  targetStore: string; // Store intended to buy at or bought at
  price: number; // Cost (current or last paid)
  storageLocation?: StorageLocation;
  lastPurchasedDate?: string;
  checkedInStore?: boolean; // For shopping checklist
  notes?: string;
  lowStockAlert?: boolean;
  imageUrl?: string;
}

export interface StoreOption {
  id: string;
  name: string;
  color: string;
  logoInitial: string;
  logoUrl?: string;
  tagline?: string;
}

export type SmartActionType =
  | "move_pantry_to_store" // Item is in pantry -> move/replenish to shopping list
  | "add_to_store"         // New item -> add to in-store shopping list
  | "move_store_to_pantry" // Item is on shopping list -> mark bought & move to pantry
  | "add_to_pantry"        // New item -> add straight to home pantry
  | "remove_from_pantry"   // Item consumed/expired -> delete from pantry
  | "remove_from_store";   // Remove item from shopping list

export interface SmartActionDraft {
  id: string;
  actionType: SmartActionType;
  name: string;
  category: GroceryCategory;
  quantity: number;
  unit: string;
  store: string;
  price: number;
  selected: boolean;
  notes?: string;
  imageUrl?: string;
  reasoning: string;
  existingItemId?: string;
  existingItemLocation?: "pantry" | "shopping_list";
  existingPantryQty?: number;
}

export interface ParsedItemDraft {
  id: string;
  name: string;
  category: GroceryCategory;
  quantity: number;
  unit: string;
  store: string;
  price: number;
  destination: "shopping_list" | "pantry";
  selected: boolean;
  notes?: string;
  imageUrl?: string;
  duplicateInfo?: {
    pantryQuantity: number;
    lastStore: string;
    lastPrice: number;
  };
  // Optional smart action enhancement
  actionType?: SmartActionType;
  reasoning?: string;
  existingItemId?: string;
}

export interface PriceComparison {
  store: string;
  price: number;
  date: string;
}
