import React, { useState, useRef, useEffect } from "react";
import { StoreOption } from "../types";
import { StoreLogo } from "./StoreLogo";
import { ChevronDown, Check, Plus } from "lucide-react";

interface QuickStoreSelectorProps {
  currentStore: string;
  stores: StoreOption[];
  onSelectStore: (newStoreName: string) => void;
  className?: string;
  currency?: string;
}

export const QuickStoreSelector: React.FC<QuickStoreSelectorProps> = ({
  currentStore,
  stores,
  onSelectStore,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [dropUp, setDropUp] = useState(false);
  const [alignRight, setAlignRight] = useState(false);

  // Explicitly exclude removed supermarkets
  const REMOVED_STORES = new Set(["continente", "pingo doce", "pingodoce", "mercadona", "auchan"]);
  const availableStores = stores.filter(
    (s) => !REMOVED_STORES.has(s.name.toLowerCase().trim())
  );

  // Position calculation on open to prevent clipping
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceRight = window.innerWidth - rect.left;
      
      // If less than 240px below, open upwards
      setDropUp(spaceBelow < 240);
      // If less than 220px to the right, align to right
      setAlignRight(spaceRight < 220);
    }
  }, [isOpen]);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowCustomInput(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setShowCustomInput(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (showCustomInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showCustomInput]);

  const handleSelect = (storeName: string) => {
    onSelectStore(storeName);
    setIsOpen(false);
    setShowCustomInput(false);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customInput.trim()) {
      handleSelect(customInput.trim());
      setCustomInput("");
    }
  };

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      {/* Clickable Supermarket Badge */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        title={`Supermarket: ${currentStore} — Click to switch store`}
        aria-label={`Change supermarket from ${currentStore}`}
        className={`inline-flex items-center gap-1.5 text-xs font-semibold text-stone-800 bg-white hover:bg-stone-50 hover:text-stone-900 border border-stone-200/90 hover:border-stone-400 px-2.5 py-1 rounded-lg transition-all shadow-2xs group cursor-pointer active:scale-95 ${
          isOpen ? "ring-2 ring-stone-400 border-stone-400 bg-stone-50" : ""
        } ${className}`}
      >
        <StoreLogo
          storeNameOrId={currentStore}
          size="xs"
          className="w-4 h-4 p-0 bg-transparent border-0 shadow-none shrink-0"
        />
        <span className="truncate max-w-[150px]">{currentStore}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-stone-400 group-hover:text-stone-700 transition-transform duration-150 shrink-0 ${
            isOpen ? "rotate-180 text-stone-800" : ""
          }`}
        />
      </button>

      {/* Floating Dropdown Menu with smart position */}
      {isOpen && (
        <div
          className={`absolute ${
            dropUp ? "bottom-full mb-1.5" : "top-full mt-1.5"
          } ${
            alignRight ? "right-0" : "left-0"
          } w-56 bg-white rounded-xl shadow-2xl border border-stone-200/90 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 ring-1 ring-black/5`}
          style={{ minWidth: "190px" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2.5 py-1 border-b border-stone-100 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Select Supermarket
            </span>
            <span className="text-[10px] text-stone-400 font-mono">
              {availableStores.length} stores
            </span>
          </div>

          <div className="max-h-56 overflow-y-auto py-1 space-y-0.5">
            {availableStores.map((store) => {
              const isSelected =
                store.name.toLowerCase() === currentStore.toLowerCase();
              return (
                <button
                  key={store.id || store.name}
                  type="button"
                  onClick={() => handleSelect(store.name)}
                  className={`w-full text-left px-2.5 py-1.5 text-xs flex items-center justify-between gap-2 hover:bg-stone-100 transition cursor-pointer ${
                    isSelected ? "bg-amber-50 font-semibold text-stone-900" : "text-stone-700"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <StoreLogo
                      storeNameOrId={store.id || store.name}
                      size="xs"
                      fallbackInitial={store.logoInitial}
                      fallbackColor={store.color}
                      className="w-4 h-4 p-0 shrink-0"
                    />
                    <span className="truncate">{store.name}</span>
                  </div>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Option to type custom store name */}
          <div className="border-t border-stone-100 pt-1 px-1.5">
            {showCustomInput ? (
              <form onSubmit={handleCustomSubmit} className="flex items-center gap-1 p-1">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Other store name..."
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  className="w-full text-xs px-2 py-1 bg-stone-50 border border-stone-200 rounded-md focus:outline-none focus:border-stone-500"
                />
                <button
                  type="submit"
                  className="px-2 py-1 bg-stone-900 text-white text-[11px] font-semibold rounded-md hover:bg-black shrink-0"
                >
                  Save
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setShowCustomInput(true)}
                className="w-full text-left px-2 py-1 text-[11px] text-stone-500 hover:text-stone-900 hover:bg-stone-50 rounded flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Custom store name...</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
