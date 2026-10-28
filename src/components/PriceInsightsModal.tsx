import React from "react";
import { X, TrendingDown, CheckCircle2 } from "lucide-react";
import { GroceryItem, StoreOption } from "../types";
import { ProductImage } from "./ProductImage";
import { StoreLogo } from "./StoreLogo";

interface PriceInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: GroceryItem[];
  stores: StoreOption[];
  currency: string;
}

export const PriceInsightsModal: React.FC<PriceInsightsModalProps> = ({
  isOpen,
  onClose,
  items,
  stores,
  currency,
}) => {
  if (!isOpen) return null;

  const storeStats = stores.map((store) => {
    const storeItems = items.filter(
      (i) => i.targetStore.toLowerCase() === store.name.toLowerCase()
    );
    const totalSpent = storeItems.reduce((acc, curr) => acc + (curr.price || 0), 0);
    const avgPrice = storeItems.length > 0 ? totalSpent / storeItems.length : 0;
    return {
      store: store.name,
      count: storeItems.length,
      total: totalSpent,
      avgPrice,
      color: store.color,
      logoInitial: store.logoInitial,
    };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-2xs">
      <div
        id="price-insights-modal"
        className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-7 shadow-xl border border-stone-200 relative flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-98 duration-100"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-1 rounded-md transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-4 shrink-0">
          <div className="flex items-center gap-1.5 text-stone-600 mb-1">
            <TrendingDown className="w-4 h-4 text-stone-700" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-stone-500">
              Price Tracker & History
            </span>
          </div>
          <h2 className="text-base font-bold text-stone-900 tracking-tight">
            Store Comparisons & Price History
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Compare past item prices across Lidl, Prisma, and K-Supermarket
          </p>
        </div>

        {/* Store stats cards */}
        <div className="grid grid-cols-3 gap-2.5 mb-4 shrink-0">
          {storeStats.map((st) => (
            <div
              key={st.store}
              className="p-2.5 rounded-lg border border-stone-200 bg-stone-50/60 space-y-1"
            >
              <div className="flex items-center gap-1.5">
                <StoreLogo
                  storeNameOrId={st.store}
                  size="sm"
                  fallbackInitial={st.logoInitial}
                  fallbackColor={st.color}
                />
                <span className="font-semibold text-xs text-stone-900 truncate">
                  {st.store}
                </span>
              </div>
              <div className="pt-0.5 font-mono">
                <span className="text-sm font-bold text-stone-900">
                  {currency}
                  {st.total.toFixed(2)}
                </span>
                <span className="block text-[10px] text-stone-400">
                  {st.count} items
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Common items price comparison table */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 block">
            Sample Price Index
          </span>

          <div className="space-y-1.5">
            {[
              {
                name: "Apples (1kg)",
                lidl: 2.49,
                prisma: 2.29,
                ksupermarket: 3.10,
                best: "Prisma",
              },
              {
                name: "Fresh Limes (pack)",
                lidl: 1.20,
                prisma: 1.89,
                ksupermarket: 1.65,
                best: "Lidl",
              },
              {
                name: "Chicken Fillets (kg)",
                lidl: 6.89,
                prisma: 8.40,
                ksupermarket: 7.20,
                best: "Lidl",
              },
              {
                name: "Minced Pork & Beef (800g)",
                lidl: 4.95,
                prisma: 5.60,
                ksupermarket: 6.25,
                best: "Lidl",
              },
              {
                name: "Mozzarella Di Bufala",
                lidl: 1.79,
                prisma: 2.45,
                ksupermarket: 2.15,
                best: "Lidl",
              },
            ].map((row) => (
              <div
                key={row.name}
                className="p-2 rounded-lg border border-stone-200/80 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs"
              >
                <div className="flex items-center gap-2">
                  <ProductImage
                    name={row.name}
                    category={
                      row.name.includes("Apple") || row.name.includes("Lime")
                        ? "Fruits"
                        : row.name.includes("Chicken") || row.name.includes("Pork")
                        ? "Meat"
                        : "Dairy"
                    }
                    size="sm"
                  />
                  <div>
                    <h4 className="font-medium text-stone-900 text-xs">{row.name}</h4>
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/70">
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                      Lowest: {row.best}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono">
                  <div className="text-center">
                    <span className="block text-[9px] text-stone-400">Lidl</span>
                    <span
                      className={
                        row.best === "Lidl"
                          ? "text-emerald-700 font-bold"
                          : "text-stone-700"
                      }
                    >
                      {currency}
                      {row.lidl.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="block text-[9px] text-stone-400">Prisma</span>
                    <span
                      className={
                        row.best === "Prisma"
                          ? "text-emerald-700 font-bold"
                          : "text-stone-700"
                      }
                    >
                      {currency}
                      {row.prisma.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="block text-[9px] text-stone-400">
                      K-Market
                    </span>
                    <span
                      className={
                        row.best === "KSupermarket"
                          ? "text-emerald-700 font-bold"
                          : "text-stone-700"
                      }
                    >
                      {currency}
                      {row.ksupermarket.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-3 border-t border-stone-200 shrink-0 text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-stone-900 text-stone-50 text-xs font-medium hover:bg-black transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
