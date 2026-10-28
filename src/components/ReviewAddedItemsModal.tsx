import React, { useState, useEffect } from "react";
import {
  X,
  Check,
  Home,
  ShoppingBag,
  ArrowRight,
  Trash2,
  Sparkles,
  ArrowRightLeft,
  CheckCircle2,
  Receipt,
  AlertCircle,
} from "lucide-react";
import {
  SmartActionDraft,
  SmartActionType,
  StoreOption,
  GroceryCategory,
} from "../types";
import { getCategoryIcon, getCategoryBadgeColor, CATEGORIES } from "../utils/categoryIcons";
import { ProductImage } from "./ProductImage";

interface ReviewAddedItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  drafts: SmartActionDraft[];
  stores: StoreOption[];
  currency: string;
  receiptMeta?: {
    storeName: string;
    totalAmount: number;
    currency: string;
    purchaseDate?: string;
  } | null;
  onConfirm: (
    finalItems: SmartActionDraft[],
    receiptMeta?: {
      storeName: string;
      totalAmount: number;
      currency: string;
      purchaseDate?: string;
    } | null
  ) => void;
}

export const ReviewAddedItemsModal: React.FC<ReviewAddedItemsModalProps> = ({
  isOpen,
  onClose,
  drafts: initialDrafts,
  stores,
  currency,
  receiptMeta,
  onConfirm,
}) => {
  const [drafts, setDrafts] = useState<SmartActionDraft[]>(initialDrafts);

  useEffect(() => {
    setDrafts(initialDrafts);
  }, [initialDrafts]);

  if (!isOpen || drafts.length === 0) return null;

  const toggleSelect = (id: string) => {
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, selected: !d.selected } : d))
    );
  };

  const updateDraft = (id: string, updates: Partial<SmartActionDraft>) => {
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...updates } : d))
    );
  };

  const removeDraft = (id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  };

  const selectedCount = drafts.filter((d) => d.selected).length;

  const totalCost = drafts
    .filter((d) => d.selected && d.actionType !== "remove_from_pantry" && d.actionType !== "remove_from_store")
    .reduce((acc, d) => acc + (d.price || 0), 0);

  const unpricedCount = drafts.filter(
    (d) => d.selected && d.actionType !== "remove_from_pantry" && d.actionType !== "remove_from_store" && (!d.price || d.price === 0)
  ).length;

  // Group actions by type
  const moveToStoreCount = drafts.filter((d) => d.selected && d.actionType === "move_pantry_to_store").length;
  const addToStoreCount = drafts.filter((d) => d.selected && d.actionType === "add_to_store").length;
  const toPantryCount = drafts.filter(
    (d) => d.selected && (d.actionType === "move_store_to_pantry" || d.actionType === "add_to_pantry")
  ).length;
  const removeCount = drafts.filter(
    (d) => d.selected && (d.actionType === "remove_from_pantry" || d.actionType === "remove_from_store")
  ).length;

  const handleConfirmClick = () => {
    const finalItems = drafts.filter((d) => d.selected);
    onConfirm(finalItems, receiptMeta);
  };

  const getActionBadge = (actionType: SmartActionType) => {
    switch (actionType) {
      case "move_pantry_to_store":
        return {
          label: "Move: Pantry → Store",
          bg: "bg-amber-50 text-amber-800 border-amber-200",
          icon: <ArrowRightLeft className="w-3 h-3 text-amber-600" />,
        };
      case "add_to_store":
        return {
          label: "+ Add to Store List",
          bg: "bg-emerald-50 text-emerald-800 border-emerald-200",
          icon: <ShoppingBag className="w-3 h-3 text-emerald-600" />,
        };
      case "move_store_to_pantry":
        return {
          label: "Purchased → To Pantry",
          bg: "bg-blue-50 text-blue-800 border-blue-200",
          icon: <Home className="w-3 h-3 text-blue-600" />,
        };
      case "add_to_pantry":
        return {
          label: "+ Direct to Pantry",
          bg: "bg-teal-50 text-teal-800 border-teal-200",
          icon: <Home className="w-3 h-3 text-teal-600" />,
        };
      case "remove_from_pantry":
        return {
          label: "Delete from Pantry",
          bg: "bg-rose-50 text-rose-800 border-rose-200",
          icon: <Trash2 className="w-3 h-3 text-rose-600" />,
        };
      case "remove_from_store":
        return {
          label: "Delete from Store List",
          bg: "bg-stone-100 text-stone-700 border-stone-300",
          icon: <Trash2 className="w-3 h-3 text-stone-500" />,
        };
      default:
        return {
          label: "Add Item",
          bg: "bg-stone-50 text-stone-700 border-stone-200",
          icon: <Check className="w-3 h-3 text-stone-600" />,
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-2xs">
      <div
        id="review-added-items-modal"
        className="bg-white rounded-2xl max-w-3xl lg:max-w-4xl w-full p-5 sm:p-6 shadow-2xl border border-stone-200 relative flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-98 duration-100"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-1 rounded-md transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-3 shrink-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold mb-1">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            <span>AI Contextual Interpretation</span>
          </div>
          <h2 className="text-lg font-bold text-stone-900 tracking-tight uppercase">
            REVIEW SUGGESTED ACTIONS
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Cross-referenced with your home pantry & in-store lists
          </p>

          {/* Receipt Banner if parsed from receipt */}
          {receiptMeta && (
            <div className="mt-2.5 p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-700 shrink-0" />
                <span className="font-semibold">
                  Scanned from {receiptMeta.storeName} Receipt
                </span>
                {receiptMeta.purchaseDate && (
                  <span className="text-stone-500 text-[11px]">
                    ({receiptMeta.purchaseDate})
                  </span>
                )}
              </div>
              <span className="font-mono font-bold text-amber-800">
                Total: {receiptMeta.currency}
                {receiptMeta.totalAmount.toFixed(2)}
              </span>
            </div>
          )}

          {/* Action Counts Summary Pills */}
          <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5 text-[11px]">
            {moveToStoreCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 font-semibold flex items-center gap-1">
                <ArrowRightLeft className="w-3 h-3" />
                <span>{moveToStoreCount} from Pantry to Store</span>
              </span>
            )}
            {addToStoreCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200 font-semibold flex items-center gap-1">
                <ShoppingBag className="w-3 h-3" />
                <span>{addToStoreCount} new to Store</span>
              </span>
            )}
            {toPantryCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-200 font-semibold flex items-center gap-1">
                <Home className="w-3 h-3" />
                <span>{toPantryCount} to Pantry</span>
              </span>
            )}
            {removeCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-200 font-semibold flex items-center gap-1">
                <Trash2 className="w-3 h-3" />
                <span>{removeCount} to remove</span>
              </span>
            )}
          </div>
        </div>

        {/* Action Items List */}
        <div className="space-y-3 overflow-y-auto flex-1 pr-1.5 py-1">
          {drafts.map((item) => {
            const badge = getActionBadge(item.actionType);

            return (
              <div
                key={item.id}
                className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                  item.selected
                    ? "bg-white border-stone-300 shadow-sm"
                    : "bg-stone-50/70 border-stone-200/60 opacity-60"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  {/* Select Checkbox */}
                  <button
                    type="button"
                    onClick={() => toggleSelect(item.id)}
                    className={`mt-1 w-5 h-5 rounded-md border transition flex items-center justify-center shrink-0 cursor-pointer ${
                      item.selected
                        ? "bg-stone-900 border-stone-900 text-stone-50"
                        : "border-stone-300 bg-white hover:border-stone-400"
                    }`}
                  >
                    {item.selected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>

                  {/* Product Packshot */}
                  <ProductImage
                    name={item.name}
                    category={item.category}
                    imageUrl={item.imageUrl}
                    size="md"
                    className="shrink-0 rounded-lg shadow-2xs mt-0.5"
                  />

                  {/* Content & Controls */}
                  <div className="flex-1 space-y-2.5 min-w-0">
                    {/* Top Row: Full-width Item Name & Action Selector + Delete */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      {/* Name input with full room to breathe */}
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) =>
                            updateDraft(item.id, { name: e.target.value })
                          }
                          placeholder="Item name..."
                          title="Click to edit item name"
                          className="font-bold text-stone-900 text-sm sm:text-base bg-transparent border-b border-stone-200 hover:border-stone-400 focus:border-stone-900 focus:outline-none px-1 py-0.5 w-full transition"
                        />
                      </div>

                      {/* Action selector & Delete button */}
                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={item.actionType}
                          onChange={(e) =>
                            updateDraft(item.id, {
                              actionType: e.target.value as SmartActionType,
                            })
                          }
                          className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border cursor-pointer ${badge.bg} focus:outline-none focus:ring-1 focus:ring-stone-400 shadow-2xs`}
                        >
                          <option value="add_to_store">
                            Add fresh to Store List
                          </option>
                          <option value="move_pantry_to_store">
                            Move from Pantry to Store List
                          </option>
                          <option value="move_store_to_pantry">
                            Purchased → Move to Pantry
                          </option>
                          <option value="add_to_pantry">
                            Add fresh to Pantry
                          </option>
                          <option value="remove_from_pantry">
                            Remove from Pantry
                          </option>
                          <option value="remove_from_store">
                            Remove from Store List
                          </option>
                        </select>

                        <button
                          type="button"
                          onClick={() => removeDraft(item.id)}
                          title="Remove this action"
                          aria-label={`Remove ${item.name}`}
                          className="text-stone-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Middle Row: Reasoning Why */}
                    {item.reasoning && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-stone-100/80 text-stone-700 text-xs">
                        <span className="text-stone-400 font-semibold shrink-0">Why:</span>
                        <span className="font-medium text-stone-700 leading-snug">{item.reasoning}</span>
                      </div>
                    )}

                    {/* Bottom Row: Store, Price, Quantity, Unit, Category */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs border-t border-stone-100">
                      <div className="flex items-center gap-3 flex-wrap">
                        {/* Store select */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-stone-400 text-xs font-medium">Store:</span>
                          <select
                            value={item.store}
                            onChange={(e) =>
                              updateDraft(item.id, { store: e.target.value })
                            }
                            className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-stone-200 bg-white text-stone-800 shadow-2xs focus:outline-none focus:border-stone-400 cursor-pointer"
                          >
                            {item.store && !stores.some((s) => s.name.toLowerCase() === item.store.toLowerCase()) && (
                              <option value={item.store}>{item.store}</option>
                            )}
                            {stores.map((s) => (
                              <option key={s.id} value={s.name}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Price input */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-stone-400 text-xs font-medium">Price:</span>
                          <div
                            className="flex items-center text-xs font-mono font-medium text-stone-800 bg-white px-2 py-1 rounded-lg border border-stone-200 shadow-2xs"
                            title={item.price > 0 ? `Price: ${currency}${item.price}` : "Price unknown (not estimated)"}
                          >
                            <span className="mr-0.5 text-stone-400 font-sans">{currency}</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={item.price > 0 ? item.price : ""}
                              onChange={(e) =>
                                updateDraft(item.id, {
                                  price: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-14 bg-transparent focus:outline-none text-right font-mono font-semibold"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Quantity, Unit & Category Controls */}
                      <div className="flex items-center gap-2 text-xs flex-wrap ml-auto">
                        <span className="text-stone-400 font-medium">Qty:</span>
                        <input
                          type="number"
                          min="0.5"
                          step="0.5"
                          value={item.quantity}
                          onChange={(e) =>
                            updateDraft(item.id, {
                              quantity: parseFloat(e.target.value) || 1,
                            })
                          }
                          className="w-12 px-2 py-1 rounded-lg border border-stone-200 bg-white text-stone-800 text-center font-mono font-bold shadow-2xs focus:outline-none focus:border-stone-400"
                        />
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) =>
                            updateDraft(item.id, { unit: e.target.value })
                          }
                          className="w-14 px-2 py-1 rounded-lg border border-stone-200 bg-white text-stone-800 text-center font-medium shadow-2xs focus:outline-none focus:border-stone-400"
                        />

                        <select
                          value={item.category}
                          onChange={(e) =>
                            updateDraft(item.id, {
                              category: e.target.value as GroceryCategory,
                            })
                          }
                          className="px-2.5 py-1 rounded-lg border border-stone-200 bg-white text-stone-700 text-xs font-medium shadow-2xs focus:outline-none focus:border-stone-400 cursor-pointer"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-3 mt-2 border-t border-stone-200 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-stone-600">
            Selected <strong>{selectedCount}</strong> action(s) • Total:{" "}
            <strong className="font-mono text-stone-900">
              {currency}
              {totalCost.toFixed(2)}
            </strong>
            {unpricedCount > 0 && (
              <span className="text-stone-400 ml-1.5 font-normal">
                ({unpricedCount} unpriced)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-stone-200 text-stone-700 font-medium text-xs hover:bg-stone-50 transition"
            >
              Cancel
            </button>

            <button
              id="confirm-smart-actions-btn"
              type="button"
              onClick={handleConfirmClick}
              disabled={selectedCount === 0}
              className="px-5 py-2 rounded-lg bg-stone-900 hover:bg-black active:scale-98 disabled:opacity-40 text-stone-50 font-bold text-xs shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>CONFIRM ALL ACTIONS</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
