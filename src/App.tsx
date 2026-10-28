import React, { useState, useEffect } from "react";
import { GroceryItem, SmartActionDraft, StoreOption, GroceryCategory, StorageLocation } from "./types";
import { INITIAL_ITEMS, DEFAULT_STORES } from "./data/initialData";
import { createStoreOption } from "./utils/storeLogos";
import { getDefaultStorageLocation } from "./utils/storageLocations";
import { Header } from "./components/Header";
import { InStoreView } from "./components/InStoreView";
import { PantryView } from "./components/PantryView";
import { AddItemsModal } from "./components/AddItemsModal";
import { ReviewAddedItemsModal } from "./components/ReviewAddedItemsModal";
import { PriceInsightsModal } from "./components/PriceInsightsModal";
import {
  Plus,
  Sparkles,
  ShoppingBag,
  Home,
  CheckCircle2,
  Info,
  Layers,
  ArrowRight,
} from "lucide-react";

export default function App() {
  // Stores to explicitly exclude as requested
  const REMOVED_STORES = new Set(["continente", "pingo doce", "pingodoce", "mercadona", "auchan"]);

  // Local storage persistence
  const [items, setItems] = useState<GroceryItem[]>(() => {
    try {
      const saved = localStorage.getItem("pantry_groceries_items_v2");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: any) => {
            let qty = typeof item.quantity === "number" ? item.quantity : 1;
            let unit = item.unit || "pcs";
            if (qty >= 100) {
              // Normalize quantities over 100 (e.g. grams) to friendly 1, 2, or 3 packs
              qty = qty >= 600 ? 2 : 1;
              if (unit === "g" || unit === "ml") {
                unit = "pack";
              }
            }
            return {
              ...item,
              quantity: qty,
              unit,
              targetStore:
                item.targetStore && REMOVED_STORES.has(item.targetStore.toLowerCase().trim())
                  ? "Lidl"
                  : item.targetStore || "Lidl",
              storageLocation:
                item.storageLocation ||
                getDefaultStorageLocation(item.category, item.notes, item.name),
              imageUrl: item.imageUrl || "",
            };
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_ITEMS;
  });

  const [stores] = useState<StoreOption[]>(() =>
    DEFAULT_STORES.filter((s) => !REMOVED_STORES.has(s.name.toLowerCase().trim()))
  );
  const [currentView, setCurrentView] = useState<"pantry" | "in_store">("pantry");
  const [currency, setCurrency] = useState<string>("€");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isPriceInsightsOpen, setIsPriceInsightsOpen] = useState(false);
  const [smartActionDrafts, setSmartActionDrafts] = useState<SmartActionDraft[]>([]);

  // Dynamically ensure all stores present in items, drafts, or defaults are available (excluding removed stores)
  const allStores = React.useMemo(() => {
    const map = new Map<string, StoreOption>();
    for (const s of stores) {
      if (!REMOVED_STORES.has(s.name.toLowerCase().trim())) {
        map.set(s.name.toLowerCase().trim(), s);
      }
    }
    for (const i of items) {
      const storeKey = (i.targetStore || "").toLowerCase().trim();
      if (storeKey && !REMOVED_STORES.has(storeKey) && !map.has(storeKey)) {
        map.set(storeKey, createStoreOption(i.targetStore));
      }
    }
    for (const d of smartActionDrafts) {
      const storeKey = (d.store || "").toLowerCase().trim();
      if (storeKey && !REMOVED_STORES.has(storeKey) && !map.has(storeKey)) {
        map.set(storeKey, createStoreOption(d.store));
      }
    }
    return Array.from(map.values());
  }, [stores, items, smartActionDrafts]);
  const [receiptMeta, setReceiptMeta] = useState<{
    storeName: string;
    totalAmount: number;
    currency: string;
    purchaseDate?: string;
  } | null>(null);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("pantry_groceries_items_v2", JSON.stringify(items));
    } catch (e) {
      console.error(e);
    }
  }, [items]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Partition items
  const inStoreItems = items.filter((i) => i.location === "shopping_list");
  const pantryItems = items.filter((i) => i.location === "pantry");

  // Toggle in-store checklist item
  const handleToggleCheck = (itemId: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId ? { ...i, checkedInStore: !i.checkedInStore } : i
      )
    );
  };

  // Delete item
  const handleDeleteItem = (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    showToast("Item removed");
  };

  // Move checked items from in-store shopping list to home pantry
  const handleMoveBoughtToPantry = (storeName: string) => {
    const checkedItems = inStoreItems.filter(
      (i) =>
        i.targetStore.toLowerCase() === storeName.toLowerCase() && i.checkedInStore
    );

    if (checkedItems.length === 0) return;

    const today = new Date().toISOString().split("T")[0];

    setItems((prev) => {
      // Remove checked from shopping list and add or update in pantry
      const remaining = prev.filter(
        (i) =>
          !(
            i.location === "shopping_list" &&
            i.targetStore.toLowerCase() === storeName.toLowerCase() &&
            i.checkedInStore
          )
      );

      const newPantryEntries: GroceryItem[] = checkedItems.map((chk) => {
        // Look for existing pantry item with same name
        const existing = prev.find(
          (p) =>
            p.location === "pantry" &&
            p.name.toLowerCase().trim() === chk.name.toLowerCase().trim()
        );

        if (existing) {
          // Merge quantity
          return {
            ...existing,
            quantity: Number((existing.quantity + chk.quantity).toFixed(1)),
            price: chk.price,
            targetStore: storeName,
            lastPurchasedDate: today,
            imageUrl: chk.imageUrl || existing.imageUrl || "",
          };
        }

        return {
          id: `pantry-${Date.now()}-${chk.id}`,
          name: chk.name,
          category: chk.category,
          quantity: chk.quantity,
          unit: chk.unit,
          location: "pantry",
          targetStore: storeName,
          price: chk.price,
          lastPurchasedDate: today,
          imageUrl: chk.imageUrl || "",
        };
      });

      return [...remaining, ...newPantryEntries];
    });

    showToast(`Moved ${checkedItems.length} purchased items from ${storeName} into Home Pantry!`);
  };

  // 1-Click "Buy More": keeps item in pantry, adds/increments on In-Store Shopping List
  const handleMoveToShoppingList = (pantryItem: GroceryItem) => {
    const storeName = pantryItem.targetStore || "Lidl";
    setItems((prev) => {
      // Check if already on shopping list for that store
      const existingIdx = prev.findIndex(
        (i) =>
          i.location === "shopping_list" &&
          i.name.toLowerCase().trim() === pantryItem.name.toLowerCase().trim() &&
          i.targetStore === storeName
      );

      if (existingIdx !== -1) {
        return prev.map((item, idx) =>
          idx === existingIdx
            ? { ...item, quantity: Number((item.quantity + 1).toFixed(1)) }
            : item
        );
      }

      const newItem: GroceryItem = {
        id: `shop-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: pantryItem.name,
        category: pantryItem.category,
        quantity: 1,
        unit: pantryItem.unit || "pcs",
        location: "shopping_list",
        targetStore: storeName,
        price: pantryItem.price || 0,
        checkedInStore: false,
        imageUrl: pantryItem.imageUrl || "",
      };

      return [...prev, newItem];
    });

    showToast(`Added ${pantryItem.name} to ${storeName} list (kept in pantry)`);
  };

  // 1-Click "All Out": deletes/empties item from Pantry, adds to In-Store Shopping List
  const handleAllOutAndMoveToList = (pantryItem: GroceryItem) => {
    const storeName = pantryItem.targetStore || "Lidl";
    setItems((prev) => {
      // Remove from pantry
      const remaining = prev.filter((i) => i.id !== pantryItem.id);

      // Check if already on shopping list
      const existingIdx = remaining.findIndex(
        (i) =>
          i.location === "shopping_list" &&
          i.name.toLowerCase().trim() === pantryItem.name.toLowerCase().trim() &&
          i.targetStore === storeName
      );

      if (existingIdx !== -1) {
        return remaining.map((item, idx) =>
          idx === existingIdx
            ? { ...item, quantity: Number((item.quantity + (pantryItem.quantity > 0 ? pantryItem.quantity : 1)).toFixed(1)) }
            : item
        );
      }

      const newItem: GroceryItem = {
        id: `shop-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: pantryItem.name,
        category: pantryItem.category,
        quantity: pantryItem.quantity > 0 ? pantryItem.quantity : 1,
        unit: pantryItem.unit || "pcs",
        location: "shopping_list",
        targetStore: storeName,
        price: pantryItem.price || 0,
        checkedInStore: false,
        imageUrl: pantryItem.imageUrl || "",
      };

      return [...remaining, newItem];
    });

    showToast(`All out of ${pantryItem.name}! Moved to ${storeName} list`);
  };

  // Pantry quantity update
  const handleUpdatePantryQuantity = (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id === id) {
          const newQty = Math.max(0, Number((i.quantity + delta).toFixed(1)));
          return {
            ...i,
            quantity: newQty,
            lowStockAlert: newQty <= 1,
          };
        }
        return i;
      })
    );
  };

  // Update item store (e.g. clicked supermarket badge in pantry or in-store)
  const handleUpdateItemStore = (id: string, newStore: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, targetStore: newStore } : i))
    );
    showToast(`Store updated to ${newStore}`);
  };

  // Update item storage location (e.g. dragged between cabinet and fridge)
  const handleUpdateItemStorageLocation = (id: string, newLocation: StorageLocation) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, storageLocation: newLocation } : i))
    );
    const locNames: Record<StorageLocation, string> = {
      cabinet: "Cabinet",
      fridge: "Fridge",
      freezer: "Freezer",
      countertop: "Countertop",
    };
    showToast(`Moved to ${locNames[newLocation]}`);
  };

  // Quick add single item from store column
  const handleQuickAddItem = (
    storeName: string,
    name: string,
    category: GroceryCategory,
    price: number
  ) => {
    const newItem: GroceryItem = {
      id: `quick-${Date.now()}`,
      name,
      category,
      quantity: 1,
      unit: "pcs",
      location: "shopping_list",
      targetStore: storeName,
      price,
      checkedInStore: false,
      imageUrl: "",
    };

    setItems((prev) => [...prev, newItem]);
    showToast(`Added ${name} to ${storeName}`);
  };

  // Transition from "ADD ITEMS" modal to review modal with smart actions
  const handleSmartActionsParsed = (
    actions: SmartActionDraft[],
    meta?: {
      storeName: string;
      totalAmount: number;
      currency: string;
      purchaseDate?: string;
    }
  ) => {
    setSmartActionDrafts(actions);
    setReceiptMeta(meta || null);
    setIsAddModalOpen(false);
    setIsReviewModalOpen(true);
  };

  // Confirm and simultaneously execute all smart actions (Move pantry to store, Add to store, Move store to pantry, Remove)
  const handleConfirmSmartActions = (
    confirmedActions: SmartActionDraft[],
    receiptInfo?: {
      storeName: string;
      totalAmount: number;
      currency: string;
      purchaseDate?: string;
    } | null
  ) => {
    const today = new Date().toISOString().split("T")[0];
    let movedToStoreCount = 0;
    let addedToStoreCount = 0;
    let toPantryCount = 0;
    let removedCount = 0;

    setItems((prev) => {
      let updated = [...prev];

      for (const action of confirmedActions) {
        if (!action.selected) continue;

        if (action.actionType === "move_pantry_to_store") {
          movedToStoreCount++;
          // Remove or decrement from pantry
          if (action.existingItemId) {
            const pIdx = updated.findIndex((i) => i.id === action.existingItemId);
            if (pIdx !== -1) {
              const currentPantry = updated[pIdx];
              if (currentPantry.quantity > action.quantity) {
                updated[pIdx] = {
                  ...currentPantry,
                  quantity: Number((currentPantry.quantity - action.quantity).toFixed(1)),
                };
              } else {
                updated.splice(pIdx, 1);
              }
            }
          } else {
            // Find by name
            const pIdx = updated.findIndex(
              (i) =>
                i.location === "pantry" &&
                i.name.toLowerCase().trim() === action.name.toLowerCase().trim()
            );
            if (pIdx !== -1) {
              updated.splice(pIdx, 1);
            }
          }

          // Add to shopping list
          updated.push({
            id: `shop-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            name: action.name,
            category: action.category,
            quantity: action.quantity,
            unit: action.unit,
            location: "shopping_list",
            targetStore: action.store,
            price: action.price,
            checkedInStore: false,
            notes: action.notes,
            imageUrl: action.imageUrl || "",
          });
        } else if (action.actionType === "add_to_store") {
          addedToStoreCount++;
          // Fresh item to shopping list
          updated.push({
            id: `shop-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            name: action.name,
            category: action.category,
            quantity: action.quantity,
            unit: action.unit,
            location: "shopping_list",
            targetStore: action.store,
            price: action.price,
            checkedInStore: false,
            notes: action.notes,
            imageUrl: action.imageUrl || "",
          });
        } else if (action.actionType === "move_store_to_pantry") {
          toPantryCount++;
          // Fulfill item from shopping list
          if (action.existingItemId) {
            updated = updated.filter((i) => i.id !== action.existingItemId);
          } else {
            const sIdx = updated.findIndex(
              (i) =>
                i.location === "shopping_list" &&
                i.name.toLowerCase().trim() === action.name.toLowerCase().trim()
            );
            if (sIdx !== -1) updated.splice(sIdx, 1);
          }

          // Add or restock into pantry
          const existingPantryIdx = updated.findIndex(
            (i) =>
              i.location === "pantry" &&
              i.name.toLowerCase().trim() === action.name.toLowerCase().trim()
          );

          if (existingPantryIdx !== -1) {
            const ep = updated[existingPantryIdx];
            updated[existingPantryIdx] = {
              ...ep,
              quantity: Number((ep.quantity + action.quantity).toFixed(1)),
              price: action.price || ep.price,
              targetStore: action.store || ep.targetStore,
              lastPurchasedDate: today,
              imageUrl: action.imageUrl || ep.imageUrl,
            };
          } else {
            updated.push({
              id: `pantry-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              name: action.name,
              category: action.category,
              quantity: action.quantity,
              unit: action.unit,
              location: "pantry",
              targetStore: action.store,
              price: action.price,
              lastPurchasedDate: today,
              notes: action.notes,
              imageUrl: action.imageUrl || "",
            });
          }
        } else if (action.actionType === "add_to_pantry") {
          toPantryCount++;
          // Direct fresh add to pantry
          const existingPantryIdx = updated.findIndex(
            (i) =>
              i.location === "pantry" &&
              i.name.toLowerCase().trim() === action.name.toLowerCase().trim()
          );

          if (existingPantryIdx !== -1) {
            const ep = updated[existingPantryIdx];
            updated[existingPantryIdx] = {
              ...ep,
              quantity: Number((ep.quantity + action.quantity).toFixed(1)),
              price: action.price || ep.price,
              targetStore: action.store || ep.targetStore,
              lastPurchasedDate: today,
            };
          } else {
            updated.push({
              id: `pantry-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              name: action.name,
              category: action.category,
              quantity: action.quantity,
              unit: action.unit,
              location: "pantry",
              targetStore: action.store,
              price: action.price,
              lastPurchasedDate: today,
              notes: action.notes,
              imageUrl: action.imageUrl || "",
            });
          }
        } else if (action.actionType === "remove_from_pantry") {
          removedCount++;
          if (action.existingItemId) {
            updated = updated.filter((i) => i.id !== action.existingItemId);
          } else {
            const pIdx = updated.findIndex(
              (i) =>
                i.location === "pantry" &&
                i.name.toLowerCase().trim() === action.name.toLowerCase().trim()
            );
            if (pIdx !== -1) updated.splice(pIdx, 1);
          }
        } else if (action.actionType === "remove_from_store") {
          removedCount++;
          if (action.existingItemId) {
            updated = updated.filter((i) => i.id !== action.existingItemId);
          } else {
            const sIdx = updated.findIndex(
              (i) =>
                i.location === "shopping_list" &&
                i.name.toLowerCase().trim() === action.name.toLowerCase().trim()
            );
            if (sIdx !== -1) updated.splice(sIdx, 1);
          }
        }
      }

      return updated;
    });

    setIsReviewModalOpen(false);
    setSmartActionDrafts([]);
    setReceiptMeta(null);

    const parts = [];
    if (movedToStoreCount > 0) parts.push(`moved ${movedToStoreCount} from pantry to shopping list`);
    if (addedToStoreCount > 0) parts.push(`added ${addedToStoreCount} new items to shopping list`);
    if (toPantryCount > 0) parts.push(`stocked ${toPantryCount} items in pantry`);
    if (removedCount > 0) parts.push(`removed ${removedCount} items`);

    showToast(`Done! ${parts.join(", ") || "Actions executed successfully"}.`);
  };

  // Quick reset to sample data
  const handleResetData = () => {
    if (window.confirm("Reset all groceries back to default sample items?")) {
      setItems(INITIAL_ITEMS);
      showToast("Reset to default groceries");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F8F5] text-stone-900 selection:bg-stone-200 flex flex-col">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-stone-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-stone-800 animate-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Main Header */}
      <Header
        currentView={currentView}
        onViewChange={setCurrentView}
        pantryCount={pantryItems.length}
        shoppingListCount={inStoreItems.length}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenPriceInsights={() => setIsPriceInsightsOpen(true)}
        currency={currency}
        setCurrency={setCurrency}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-4">
        {/* View Content: In Store View OR Pantry View */}
        {currentView === "in_store" ? (
          <InStoreView
            items={inStoreItems}
            pantryItems={pantryItems}
            stores={allStores}
            currency={currency}
            onToggleCheck={handleToggleCheck}
            onDeleteItem={handleDeleteItem}
            onMoveBoughtToPantry={handleMoveBoughtToPantry}
            onQuickAddItem={handleQuickAddItem}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onUpdateItemStore={handleUpdateItemStore}
          />
        ) : (
          <PantryView
            items={pantryItems}
            stores={allStores}
            currency={currency}
            onUpdateQuantity={handleUpdatePantryQuantity}
            onDeleteItem={handleDeleteItem}
            onMoveToShoppingList={handleMoveToShoppingList}
            onRanOutAndMoveToList={handleAllOutAndMoveToList}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onUpdateItemStore={handleUpdateItemStore}
            onUpdateItemStorageLocation={handleUpdateItemStorageLocation}
          />
        )}
      </main>

      {/* Floating Action Button (FAB) with Moving Gradient Aura & AI Styling */}
      <div className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-40 group select-none">
        {/* Animated Moving Gradient Halo Aura */}
        <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 via-amber-400 to-indigo-500 opacity-75 blur-md group-hover:opacity-100 animate-gradient-flow transition-all duration-300" />

        <button
          id="floating-action-button"
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          aria-label="Add Groceries (Scan, Voice, or Text with AI)"
          title="Add Groceries (Scan Receipt, Voice with Gemini Transcribe, or Text)"
          className="relative px-4 sm:px-5 py-3 sm:py-3.5 rounded-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:via-teal-500 hover:to-emerald-600 animate-gradient-flow text-white shadow-2xl flex items-center gap-2.5 transition-all duration-200 transform group-hover:scale-105 active:scale-95 border border-white/30 cursor-pointer backdrop-blur-xs"
        >
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <Plus className="w-4 h-4 text-white stroke-[3]" />
          </div>
          <span className="font-bold text-sm tracking-wide hidden sm:inline text-white drop-shadow-xs">
            Add Items
          </span>
        </button>
      </div>

      {/* Modal 1: ADD ITEMS with Gemini Transcribe & Multimodal AI */}
      <AddItemsModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        pantryItems={pantryItems}
        shoppingListItems={inStoreItems}
        defaultStore="Lidl"
        onSmartActionsParsed={handleSmartActionsParsed}
      />

      {/* Modal 2: REVIEW SUGGESTED ACTIONS (Smart Multi-Action Confirmation) */}
      <ReviewAddedItemsModal
        isOpen={isReviewModalOpen}
        onClose={() => {
          setIsReviewModalOpen(false);
          setReceiptMeta(null);
        }}
        drafts={smartActionDrafts}
        stores={allStores}
        currency={currency}
        receiptMeta={receiptMeta}
        onConfirm={handleConfirmSmartActions}
      />

      {/* Modal 3: Price Insights & Comparisons */}
      <PriceInsightsModal
        isOpen={isPriceInsightsOpen}
        onClose={() => setIsPriceInsightsOpen(false)}
        items={items}
        stores={allStores}
        currency={currency}
      />

      {/* Subtle Footer with reset option */}
      <footer className="border-t border-slate-200 bg-white/80 py-4 px-4 text-center text-xs text-slate-400 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            Connected Pantry & Grocery Store Assistant • AI Voice Transcribe & Multimodal Receipt Vision
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleResetData}
              className="text-slate-400 hover:text-slate-700 underline text-[11px] cursor-pointer"
            >
              Reset sample groceries
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

