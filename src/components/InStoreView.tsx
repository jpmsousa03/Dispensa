import React, { useState } from "react";
import {
  GroceryItem,
  StoreOption,
  GroceryCategory,
} from "../types";
import { getCategoryIcon, getCategoryBadgeColor } from "../utils/categoryIcons";
import { ProductImage } from "./ProductImage";
import { StoreLogo } from "./StoreLogo";
import { QuickStoreSelector } from "./QuickStoreSelector";
import { useLanguage } from "../context/LanguageContext";
import { canonicalizeItemName } from "../utils/itemLocalization";
import { detectCategory } from "../utils/smartItemParser";
import {
  Check,
  CheckCircle2,
  Plus,
  Trash2,
  AlertTriangle,
  ArrowRight,
  ShoppingBag,
} from "lucide-react";

interface InStoreViewProps {
  items: GroceryItem[];
  pantryItems: GroceryItem[];
  stores: StoreOption[];
  currency: string;
  onToggleCheck: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
  onMoveBoughtToPantry: (storeName: string) => void;
  onQuickAddItem: (storeName: string, name: string, category: GroceryCategory, price: number) => void;
  onOpenAddModal: () => void;
  onUpdateItemStore?: (itemId: string, newStoreName: string) => void;
}

export const InStoreView: React.FC<InStoreViewProps> = ({
  items,
  pantryItems,
  stores,
  currency,
  onToggleCheck,
  onDeleteItem,
  onMoveBoughtToPantry,
  onQuickAddItem,
  onOpenAddModal,
  onUpdateItemStore,
}) => {
  const { languageInfo, t } = useLanguage();
  const [activeStoreFilter, setActiveStoreFilter] = useState<string>("all");
  const [quickAddStore, setQuickAddStore] = useState<string | null>(null);
  const [quickInputName, setQuickInputName] = useState("");
  const [quickInputPrice, setQuickInputPrice] = useState("");

  // Check if item already exists in pantry to prevent duplicate purchases
  const findPantryMatch = (itemName: string) => {
    const clean = itemName.toLowerCase().trim();
    return pantryItems.find((p) => {
      const pClean = p.name.toLowerCase().trim();
      return (
        pClean === clean ||
        pClean.includes(clean) ||
        clean.includes(pClean)
      );
    });
  };

  const visibleStores =
    activeStoreFilter === "all"
      ? stores.filter(
          (s) =>
            items.some((i) => i.targetStore.toLowerCase() === s.name.toLowerCase()) ||
            (items.length === 0 && ["lidl", "continente"].includes(s.id))
        )
      : stores.filter((s) => s.name.toLowerCase() === activeStoreFilter.toLowerCase());

  const relevantStores = stores.filter(
    (s) =>
      items.some((i) => i.targetStore.toLowerCase() === s.name.toLowerCase()) ||
      ["lidl", "continente", "pingodoce", "mercadona"].includes(s.id)
  );

  const handleQuickAddSubmit = (storeName: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInputName.trim()) return;

    // Canonicalize item name according to current website language (e.g. apples -> Apple or Maçã)
    const canonicalName = canonicalizeItemName(quickInputName.trim(), languageInfo.code);
    const category: GroceryCategory = detectCategory(canonicalName);

    const price = parseFloat(quickInputPrice) || 0;
    onQuickAddItem(storeName, canonicalName, category, price);
    setQuickInputName("");
    setQuickInputPrice("");
    setQuickAddStore(null);
  };

  return (
    <div className="space-y-4">
      {/* Store Quick Tabs & Summary Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-stone-200/80 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[11px] font-medium uppercase tracking-wider text-stone-400 mr-1 shrink-0">
            Stores:
          </span>
          <button
            type="button"
            onClick={() => setActiveStoreFilter("all")}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition shrink-0 ${
              activeStoreFilter === "all"
                ? "bg-[#186835] hover:bg-[#13552b] text-white"
                : "bg-stone-100 text-stone-700 hover:bg-stone-200"
            }`}
          >
            All Stores ({items.length})
          </button>
          {relevantStores.map((store) => {
            const count = items.filter((i) => i.targetStore.toLowerCase() === store.name.toLowerCase()).length;
            return (
              <button
                key={store.id}
                type="button"
                onClick={() => setActiveStoreFilter(store.name)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition flex items-center gap-1.5 shrink-0 ${
                  activeStoreFilter === store.name
                    ? "bg-[#186835] hover:bg-[#13552b] text-white"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                }`}
              >
                <StoreLogo
                  storeNameOrId={store.id || store.name}
                  size="xs"
                  className="w-3.5 h-3.5 p-0 bg-transparent border-0 shadow-none"
                  fallbackInitial={store.logoInitial}
                  fallbackColor={store.color}
                />
                <span>{store.name}</span>
                <span className="text-[10px] font-mono opacity-80">({count})</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-xs text-stone-500">
          <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/70 text-[11px] font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Check off items as you pick them up
          </span>
        </div>
      </div>

      {/* Store Columns Grid directly matching wireframe layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
        {visibleStores.map((store) => {
          const storeItems = items.filter(
            (i) => i.targetStore.toLowerCase() === store.name.toLowerCase()
          );

          const categoriesInStore = Array.from(
            new Set(storeItems.map((i) => i.category))
          );

          const checkedCount = storeItems.filter((i) => i.checkedInStore).length;
          const totalEstimatedCost = storeItems.reduce((acc, curr) => acc + (curr.price || 0), 0);
          const checkedCost = storeItems
            .filter((i) => i.checkedInStore)
            .reduce((acc, curr) => acc + (curr.price || 0), 0);

          return (
            <div
              key={store.id}
              id={`store-card-${store.id}`}
              className="bg-white rounded-xl border border-stone-200/90 shadow-2xs flex flex-col overflow-hidden"
            >
              {/* Store Card Header */}
              <div className="p-3.5 border-b border-stone-100 bg-[#FAFAFA]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <StoreLogo
                      storeNameOrId={store.id || store.name}
                      size="md"
                      fallbackInitial={store.logoInitial}
                      fallbackColor={store.color}
                    />
                    <div>
                      <h3 className="font-bold text-stone-900 text-sm leading-none">
                        {store.name}
                      </h3>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        {store.tagline || "Planned list"}
                      </p>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <span className="text-xs font-bold text-stone-900">
                      {currency}
                      {totalEstimatedCost.toFixed(2)}
                    </span>
                    <p className="text-[10px] text-stone-400">
                      {storeItems.length} {storeItems.length === 1 ? "item" : "items"}
                    </p>
                  </div>
                </div>

                {/* Progress bar for collected items */}
                {storeItems.length > 0 && (
                  <div className="mt-2.5">
                    <div className="flex justify-between text-[10px] font-mono text-stone-500 mb-1">
                      <span>In cart: {checkedCount}/{storeItems.length}</span>
                      <span>
                        {currency}
                        {checkedCost.toFixed(2)}
                      </span>
                    </div>
                    <div className="w-full bg-stone-200/80 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-stone-800 h-full transition-all duration-200 rounded-full"
                        style={{
                          width: `${(checkedCount / storeItems.length) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Categorized Grocery List inside store */}
              <div className="p-3 space-y-4 flex-1 min-h-[220px]">
                {storeItems.length === 0 ? (
                  <div className="py-10 text-center text-stone-400">
                    <ShoppingBag className="w-8 h-8 mx-auto text-stone-300 stroke-1 mb-2" />
                    <p className="text-xs font-medium text-stone-600">No items needed here yet</p>
                    <p className="text-[11px] text-stone-400 mt-0.5 max-w-[180px] mx-auto">
                      Use quick-add below or scan a receipt to add groceries for {store.name}
                    </p>
                  </div>
                ) : (
                  categoriesInStore.map((cat) => {
                    const catItems = storeItems.filter((i) => i.category === cat);
                    const badge = getCategoryBadgeColor(cat);

                    return (
                      <div key={cat} className="space-y-1.5">
                        {/* Category Heading (Fruits, Meat, Dairy) */}
                        <div className="flex items-center gap-1.5 text-stone-600 pt-1">
                          <span className={`p-0.5 rounded ${badge.bg} ${badge.border}`}>
                            {getCategoryIcon(cat, "w-3 h-3")}
                          </span>
                          <span className="uppercase tracking-wider text-[10px] font-bold text-stone-500">
                            {cat}
                          </span>
                          <span className="text-[10px] font-mono text-stone-400">
                            ({catItems.length})
                          </span>
                        </div>

                        {/* Items in category */}
                        <ul className="space-y-1.5">
                          {catItems.map((item) => {
                            const pantryDuplicate = findPantryMatch(item.name);
                            return (
                              <li
                                key={item.id}
                                id={`in-store-item-${item.id}`}
                                className={`group p-2.5 rounded-xl transition border space-y-2 ${
                                  item.checkedInStore
                                    ? "bg-stone-50/80 border-stone-200/50 opacity-60"
                                    : "bg-white hover:bg-stone-50/80 border-stone-200/90 shadow-2xs hover:shadow-xs"
                                }`}
                              >
                                {/* Row 1: Checkbox + Product Packshot + Full Width Item Name + Price */}
                                <div className="flex items-start justify-between gap-2.5">
                                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                    {/* Mechanical tactile Checkbox */}
                                    <button
                                      type="button"
                                      onClick={() => onToggleCheck(item.id)}
                                      aria-label={`Toggle check for ${item.name}`}
                                      className={`w-5 h-5 rounded-md border transition flex items-center justify-center shrink-0 cursor-pointer mt-0.5 ${
                                        item.checkedInStore
                                          ? "bg-stone-900 border-stone-900 text-stone-50"
                                          : "border-stone-300 hover:border-stone-500 bg-white"
                                      }`}
                                    >
                                      {item.checkedInStore && (
                                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                                      )}
                                    </button>

                                    {/* Product packshot */}
                                    <ProductImage
                                      name={item.name}
                                      category={item.category}
                                      imageUrl={item.imageUrl}
                                      size="sm"
                                      className="shrink-0 mt-0.5"
                                    />

                                    {/* Full Item Name with no truncation */}
                                    <div className="flex-1 min-w-0 pr-1">
                                      <span
                                        className={`text-xs sm:text-sm font-semibold leading-snug break-words block ${
                                          item.checkedInStore
                                            ? "line-through text-stone-400"
                                            : "text-stone-900"
                                        }`}
                                        title={item.name}
                                      >
                                        {item.name}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Price */}
                                  <span className="text-xs font-mono font-bold text-stone-800 shrink-0 pt-0.5">
                                    {item.price > 0 ? (
                                      `${currency}${item.price.toFixed(2)}`
                                    ) : (
                                      <span className="text-stone-400 font-normal text-[11px]">—</span>
                                    )}
                                  </span>
                                </div>

                                {/* Row 2: Quantity, Pantry Duplicate Warning, Store Selector & Delete */}
                                <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-100/90 text-xs pl-7.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {/* Quantity pill */}
                                    <span className="text-[11px] font-mono font-medium text-stone-700 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200/60">
                                      {item.quantity} {item.unit}
                                    </span>

                                    {/* Duplicate in Pantry warning */}
                                    {pantryDuplicate && (
                                      <div
                                        className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/70"
                                        title={`You already have ${pantryDuplicate.quantity} ${pantryDuplicate.unit} at home in pantry`}
                                      >
                                        <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                        <span>{pantryDuplicate.quantity} in pantry</span>
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                                    <QuickStoreSelector
                                      currentStore={item.targetStore}
                                      stores={stores}
                                      onSelectStore={(newStore) => onUpdateItemStore?.(item.id, newStore)}
                                      currency={currency}
                                    />

                                    <button
                                      type="button"
                                      onClick={() => onDeleteItem(item.id)}
                                      title="Remove item"
                                      aria-label={`Remove ${item.name}`}
                                      className="opacity-50 group-hover:opacity-100 text-stone-400 hover:text-rose-600 p-1 rounded-md transition cursor-pointer hover:bg-rose-50"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Store Footer Action */}
              <div className="p-2.5 border-t border-stone-100 bg-[#FAFAFA] space-y-2">
                {checkedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => onMoveBoughtToPantry(store.name)}
                    style={{
                      backgroundColor: "#008171",
                      paddingTop: "20px",
                      paddingBottom: "20px",
                    }}
                    className="w-full flex items-center justify-center gap-1.5 px-3 rounded-lg text-white hover:brightness-105 text-xs font-semibold shadow-2xs transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Move {checkedCount} bought to Pantry</span>
                    <ArrowRight className="w-3 h-3 ml-auto" />
                  </button>
                )}

                {/* Inline Quick Add form */}
                {quickAddStore === store.name ? (
                  <form
                    onSubmit={(e) => handleQuickAddSubmit(store.name, e)}
                    className="space-y-1.5 pt-0.5"
                  >
                    <input
                      type="text"
                      placeholder="e.g. 2x Avocados or Milk"
                      value={quickInputName}
                      onChange={(e) => setQuickInputName(e.target.value)}
                      autoFocus
                      className="w-full px-2 py-1 text-xs bg-white border border-stone-200 rounded focus:outline-none focus:border-stone-400"
                    />
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        step="0.01"
                        placeholder={`Price (${currency})`}
                        value={quickInputPrice}
                        onChange={(e) => setQuickInputPrice(e.target.value)}
                        className="w-20 px-2 py-1 text-xs bg-white border border-stone-200 rounded focus:outline-none focus:border-stone-400 font-mono"
                      />
                      <button
                        type="submit"
                        className="flex-1 py-1 px-2 bg-stone-900 text-white rounded text-xs font-semibold hover:bg-black"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickAddStore(null)}
                        className="py-1 px-2 bg-stone-200 text-stone-700 rounded text-xs hover:bg-stone-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <button
                      type="button"
                      onClick={() => setQuickAddStore(store.name)}
                      className="text-stone-600 hover:text-stone-900 font-medium inline-flex items-center gap-1 py-0.5 px-1.5 rounded hover:bg-stone-200/50 transition text-[11px]"
                    >
                      <Plus className="w-3 h-3 text-stone-500" />
                      <span>Quick add</span>
                    </button>

                    <button
                      type="button"
                      onClick={onOpenAddModal}
                      className="text-stone-700 hover:text-stone-900 font-medium inline-flex items-center gap-1 py-0.5 px-1.5 rounded hover:bg-stone-200/50 transition text-[11px]"
                    >
                      <span>Scan receipt</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
