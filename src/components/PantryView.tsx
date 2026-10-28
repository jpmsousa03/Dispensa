import React, { useState } from "react";
import { GroceryItem, StoreOption, GroceryCategory, StorageLocation } from "../types";
import { getCategoryIcon, getCategoryBadgeColor } from "../utils/categoryIcons";
import {
  STORAGE_LOCATIONS,
  StorageLocationConfig,
  getStorageLocationConfig,
  getDefaultStorageLocation,
} from "../utils/storageLocations";
import { ProductImage } from "./ProductImage";
import { QuickStoreSelector } from "./QuickStoreSelector";
import { useLanguage } from "../context/LanguageContext";
import {
  Plus,
  Minus,
  ShoppingCart,
  Search,
  PackageCheck,
  Refrigerator,
  Archive,
  Snowflake,
  UtensilsCrossed,
  GripVertical,
  Trash2,
  ChevronDown,
  Check,
  ArrowUpDown,
  LayoutGrid,
  Columns3,
  ListFilter,
  X,
  Sparkles,
  AlertTriangle,
} from "lucide-react";

interface PantryViewProps {
  items: GroceryItem[];
  stores: StoreOption[];
  currency: string;
  onUpdateQuantity: (id: string, delta: number) => void;
  onDeleteItem: (id: string) => void;
  onMoveToShoppingList: (item: GroceryItem) => void;
  onRanOutAndMoveToList?: (item: GroceryItem) => void;
  onOpenAddModal: () => void;
  onUpdateItemStore?: (id: string, newStoreName: string) => void;
  onUpdateItemStorageLocation?: (id: string, newLocation: StorageLocation) => void;
}

// Category order for category grouping mode
const CATEGORY_ORDER: GroceryCategory[] = [
  "Fruits",
  "Vegetables",
  "Meat",
  "Dairy",
  "Bakery",
  "Pantry",
  "Seafood",
  "Frozen",
  "Beverages",
  "Snacks",
];

export const PantryView: React.FC<PantryViewProps> = ({
  items,
  stores,
  currency,
  onUpdateQuantity,
  onDeleteItem,
  onMoveToShoppingList,
  onRanOutAndMoveToList,
  onOpenAddModal,
  onUpdateItemStore,
  onUpdateItemStorageLocation,
}) => {
  const { t, categoryLabel } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"storage_zones" | "unified_shelf" | "categories">("categories");
  const [activeStorageFilter, setActiveStorageFilter] = useState<string>("all");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("all");
  
  // Sort options: including Storage Location as requested by user
  const [sortBy, setSortBy] = useState<"location" | "name" | "store" | "quantity" | "price_asc" | "price_desc">("location");

  // Drag and drop state
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverLocation, setDragOverLocation] = useState<StorageLocation | null>(null);
  const [dragOverAction, setDragOverAction] = useState<"buy_more" | "all_out" | null>(null);

  // Active dragged item helper
  const draggedItem = items.find((i) => i.id === draggedItemId);

  // Active location popover menu on item cards
  const [openLocationMenuId, setOpenLocationMenuId] = useState<string | null>(null);

  // Helper to get effective storage location
  const getItemStorageLocation = (item: GroceryItem): StorageLocation => {
    return (
      item.storageLocation ||
      getDefaultStorageLocation(item.category, item.notes, item.name)
    );
  };

  // Filter items based on search and active filter
  const filteredItems = items.filter((item) => {
    const itemLocation = getItemStorageLocation(item);
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.targetStore.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStorage =
      activeStorageFilter === "all" || itemLocation === activeStorageFilter;
    const matchesCat =
      activeCategoryFilter === "all" || item.category === activeCategoryFilter;

    if (viewMode === "categories") {
      return matchesSearch && matchesCat;
    }
    return matchesSearch && matchesStorage;
  });

  // Sort items according to active sort option
  const sortItems = (itemList: GroceryItem[]): GroceryItem[] => {
    return [...itemList].sort((a, b) => {
      switch (sortBy) {
        case "location": {
          const orderMap: Record<StorageLocation, number> = {
            fridge: 1,
            cabinet: 2,
            freezer: 3,
            countertop: 4,
          };
          const locA = getItemStorageLocation(a);
          const locB = getItemStorageLocation(b);
          const diff = (orderMap[locA] || 9) - (orderMap[locB] || 9);
          if (diff !== 0) return diff;
          return a.name.localeCompare(b.name);
        }
        case "name":
          return a.name.localeCompare(b.name);
        case "quantity":
          return b.quantity - a.quantity;
        case "store":
          return a.targetStore.localeCompare(b.targetStore) || a.name.localeCompare(b.name);
        case "price_asc":
          return (a.price || 0) - (b.price || 0);
        case "price_desc":
          return (b.price || 0) - (a.price || 0);
        default:
          return 0;
      }
    });
  };

  // Render Storage Location icon
  const renderLocationIcon = (iconName: string, className = "w-4 h-4") => {
    switch (iconName) {
      case "refrigerator":
        return <Refrigerator className={className} />;
      case "cabinet":
        return <Archive className={className} />;
      case "snowflake":
        return <Snowflake className={className} />;
      case "countertop":
        return <UtensilsCrossed className={className} />;
      default:
        return <Archive className={className} />;
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    e.dataTransfer.setData("text/plain", itemId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedItemId(itemId);
  };

  const handleDragEnd = () => {
    setDraggedItemId(null);
    setDragOverLocation(null);
    setDragOverAction(null);
  };

  const handleDragOver = (e: React.DragEvent, locationId: StorageLocation) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverLocation !== locationId) {
      setDragOverLocation(locationId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverLocation(null);
    }
  };

  const handleDrop = (e: React.DragEvent, locationId: StorageLocation) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData("text/plain") || draggedItemId;
    if (itemId && onUpdateItemStorageLocation) {
      onUpdateItemStorageLocation(itemId, locationId);
    }
    setDragOverLocation(null);
    setDragOverAction(null);
    setDraggedItemId(null);
  };

  const handleActionDragOver = (e: React.DragEvent, action: "buy_more" | "all_out") => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverAction !== action) {
      setDragOverAction(action);
    }
  };

  const handleActionDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverAction(null);
    }
  };

  const handleActionDrop = (e: React.DragEvent, action: "buy_more" | "all_out") => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData("text/plain") || draggedItemId;
    if (itemId) {
      const targetItem = items.find((i) => i.id === itemId);
      if (targetItem) {
        if (action === "buy_more") {
          onMoveToShoppingList(targetItem);
        } else if (action === "all_out") {
          onRanOutAndMoveToList?.(targetItem);
        }
      }
    }
    setDragOverAction(null);
    setDragOverLocation(null);
    setDraggedItemId(null);
  };

  // Renders a single pantry item card: highly legible, beautiful layout, zero-slop
  const renderItemCard = (item: GroceryItem) => {
    const itemLocation = getItemStorageLocation(item);
    const locConfig = getStorageLocationConfig(itemLocation);
    const isDragging = draggedItemId === item.id;
    const isLocationMenuOpen = openLocationMenuId === item.id;
    const isOutOfStock = item.quantity <= 0;
    const isLowStock = item.quantity === 1;

    return (
      <div
        key={item.id}
        id={`pantry-item-${item.id}`}
        draggable={true}
        onDragStart={(e) => handleDragStart(e, item.id)}
        onDragEnd={handleDragEnd}
        className={`bg-white rounded-xl border shadow-2xs hover:shadow-sm hover:border-stone-300 transition-all p-3.5 space-y-3 relative group select-none ${
          isOutOfStock
            ? "border-amber-300/80 bg-amber-50/20"
            : isLowStock
            ? "border-stone-200/90 hover:border-amber-300/70"
            : "border-stone-200/90"
        } ${
          isDragging
            ? "opacity-30 scale-95 border-emerald-500 ring-2 ring-emerald-400 bg-emerald-50/20"
            : ""
        }`}
      >
        {/* Top Section: Drag Grip, Packshot, Product Info & Stepper */}
        <div className="flex items-start gap-3">
          {/* Drag Handle */}
          <div
            className="cursor-grab active:cursor-grabbing text-stone-300 group-hover:text-stone-500 hover:text-stone-900 transition p-1 -ml-1.5 shrink-0 mt-0.5"
            title="Drag & Drop into Cabinet, Fridge, Freezer or Countertop"
          >
            <GripVertical className="w-4 h-4" />
          </div>

          {/* Product Image Packshot */}
          <ProductImage
            name={item.name}
            category={item.category}
            imageUrl={item.imageUrl}
            size="md"
            className="shrink-0 mt-0.5"
          />

          {/* Product Title, Notes & Category - No truncation, wraps naturally */}
          <div className="flex-1 min-w-0 pr-1">
            <h4
              className="font-bold text-stone-900 text-sm leading-snug break-words"
              title={item.name}
            >
              {item.name}
            </h4>
            <div className="flex items-center gap-1.5 text-xs text-stone-500 mt-1 flex-wrap">
              <span className="font-medium text-stone-600">{categoryLabel(item.category)}</span>
              {isOutOfStock ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200/80 px-1.5 py-0.2 rounded">
                  <AlertTriangle className="w-2.5 h-2.5 text-rose-500" />
                  Out of stock
                </span>
              ) : isLowStock ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-1.5 py-0.2 rounded">
                  <AlertTriangle className="w-2.5 h-2.5 text-amber-500" />
                  Low stock
                </span>
              ) : null}
              {item.notes ? (
                <>
                  <span aria-hidden="true" className="text-stone-300">·</span>
                  <span className="italic text-stone-400 break-words">{item.notes}</span>
                </>
              ) : null}
            </div>
          </div>

          {/* Tactile Stepper Control (- [qty] +) */}
          <div className="inline-flex items-center rounded-lg border border-stone-200 bg-stone-50 px-1 py-0.5 shadow-2xs shrink-0 mt-0.5">
            <button
              type="button"
              onClick={() => onUpdateQuantity(item.id, -1)}
              title="Consume 1 item"
              aria-label={`Decrease quantity of ${item.name}`}
              className="w-6 h-6 flex items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-white rounded transition cursor-pointer"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span
              className={`text-xs font-mono font-bold px-1.5 min-w-[24px] text-center ${
                isOutOfStock ? "text-rose-600 font-black" : "text-stone-900"
              }`}
            >
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() => onUpdateQuantity(item.id, 1)}
              title="Add 1 item"
              aria-label={`Increase quantity of ${item.name}`}
              className="w-6 h-6 flex items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-white rounded transition cursor-pointer"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Bottom Section: Clickable Supermarket, Storage Location Switcher, Price & Actions */}
        <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-stone-100 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Clickable Supermarket Selector Label */}
            <div title={`Supermarket: ${item.targetStore} (Click to switch)`}>
              <QuickStoreSelector
                currentStore={item.targetStore}
                stores={stores}
                onSelectStore={(newStore) => onUpdateItemStore?.(item.id, newStore)}
                currency={currency}
              />
            </div>

            {/* Clickable Storage Location Switcher Badge */}
            <div className="relative inline-block">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenLocationMenuId(isLocationMenuOpen ? null : item.id);
                }}
                title={`Stored in ${locConfig.name} — Click to move to another zone`}
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer shadow-2xs ${locConfig.badgeBg} ${locConfig.badgeBorder} hover:brightness-95 active:scale-95`}
              >
                {renderLocationIcon(locConfig.iconName, "w-3.5 h-3.5")}
                <span>{locConfig.shortLabel}</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              {/* Location Switch Dropdown Popover */}
              {isLocationMenuOpen && (
                <div
                  className="absolute left-0 mt-1 w-48 bg-white rounded-xl shadow-2xl border border-stone-200/90 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 ring-1 ring-black/5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-3 py-1 border-b border-stone-100 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Move Storage Zone
                  </div>
                  <div className="py-1">
                    {STORAGE_LOCATIONS.map((loc) => {
                      const isSelected = itemLocation === loc.id;
                      return (
                        <button
                          key={loc.id}
                          type="button"
                          onClick={() => {
                            onUpdateItemStorageLocation?.(item.id, loc.id);
                            setOpenLocationMenuId(null);
                          }}
                          className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between gap-2 hover:bg-stone-50 transition cursor-pointer ${
                            isSelected ? "font-semibold bg-stone-50 text-stone-900" : "text-stone-700"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`p-1 rounded-md ${loc.badgeBg} ${loc.badgeBorder} border`}>
                              {renderLocationIcon(loc.iconName, "w-3 h-3")}
                            </span>
                            <span>{loc.name}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Item Price */}
            <span className="text-xs font-mono font-medium text-stone-600 pl-0.5">
              {item.price > 0 ? `${currency}${item.price.toFixed(2)}` : "—"}
            </span>
          </div>

          {/* Quick Actions: Buy More & All Out & Delete */}
          <div className="flex items-center gap-1.5 ml-auto flex-wrap justify-end">
            {/* 1. Buy More: keeps in pantry, adds 1 to In-Store list */}
            <button
              type="button"
              onClick={() => onMoveToShoppingList(item)}
              title={`Keep current pantry stock and add 1 to ${item.targetStore} shopping list`}
              className="inline-flex items-center gap-1 text-[11px] sm:text-xs text-stone-700 hover:text-stone-900 bg-stone-100/90 hover:bg-stone-200/80 border border-stone-200 px-2 sm:px-2.5 py-1 rounded-lg transition font-medium cursor-pointer shadow-2xs active:scale-95"
            >
              <Plus className="w-3 h-3 text-stone-500" />
              <ShoppingCart className="w-3 h-3 text-stone-600" />
              <span>Buy more</span>
            </button>

            {/* 2. All Out: removes from pantry and adds to In-Store list */}
            <button
              type="button"
              onClick={() => onRanOutAndMoveToList?.(item)}
              title={`Ran out! Remove from pantry and add to ${item.targetStore} shopping list`}
              className={`inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold px-2 sm:px-2.5 py-1 rounded-lg transition cursor-pointer shadow-2xs active:scale-95 ${
                isOutOfStock
                  ? "bg-amber-600 hover:bg-amber-700 text-white shadow-xs font-bold"
                  : "text-amber-900 hover:text-amber-950 bg-amber-50 hover:bg-amber-100/90 border border-amber-200/90 hover:border-amber-300"
              }`}
            >
              <span>All Out</span>
            </button>

            {/* 3. Delete */}
            <button
              type="button"
              onClick={() => onDeleteItem(item.id)}
              title="Delete item from pantry"
              aria-label={`Delete ${item.name}`}
              className="text-stone-300 hover:text-rose-600 hover:bg-rose-50 p-1 rounded-lg transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4" onClick={() => setOpenLocationMenuId(null)}>
      {/* Top Toolbar: Search, View Mode, Filters & Sort */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full lg:w-80">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="pantry-search-input"
              type="text"
              placeholder={t("search_placeholder") || "Search pantry items, stores..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs font-medium bg-stone-50/80 hover:bg-stone-50 focus:bg-white border border-stone-200 rounded-xl focus:outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-200/50 transition placeholder:text-stone-400 text-stone-800"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-0.5 rounded cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* View Mode & Sort Bar */}
          <div className="flex items-center gap-2.5 flex-wrap justify-between lg:justify-end">
            {/* View Mode Switcher */}
            <div className="inline-flex items-center p-1 bg-stone-100 rounded-xl border border-stone-200/80 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("unified_shelf")}
                title="All Items Shelf View"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  viewMode === "unified_shelf"
                    ? "bg-white text-stone-900 shadow-2xs font-bold"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <ListFilter className="w-3.5 h-3.5 text-emerald-600" />
                <span>All Shelf</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("categories")}
                title="Grouped by Food Categories"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  viewMode === "categories"
                    ? "bg-white text-stone-900 shadow-2xs font-bold"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5 text-amber-600" />
                <span>Categories</span>
              </button>
            </div>

            {/* Sort Selector: includes Sort by Cabinet/Fridge Location */}
            <div className="flex items-center gap-1.5 shrink-0 bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-stone-500 shrink-0" />
              <select
                id="pantry-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Sort pantry items"
                className="text-xs font-semibold text-stone-700 bg-transparent focus:outline-none cursor-pointer pr-1"
              >
                <option value="location">Sort: Storage Zone (Fridge → Cabinet)</option>
                <option value="name">Sort: Name (A → Z)</option>
                <option value="store">Sort: Supermarket</option>
                <option value="quantity">Sort: Quantity (High → Low)</option>
                <option value="price_asc">Sort: Price (Low → High)</option>
                <option value="price_desc">Sort: Price (High → Low)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quick Filter Tabs */}
        {viewMode !== "categories" ? (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 border-t border-stone-100">
            <span className="text-xs font-medium text-stone-400 shrink-0 pr-1">Filter:</span>
            <button
              type="button"
              onClick={() => setActiveStorageFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeStorageFilter === "all"
                  ? "bg-stone-900 text-white shadow-2xs"
                  : "bg-stone-50 text-stone-700 border border-stone-200 hover:bg-stone-100"
              }`}
            >
              All Items ({items.length})
            </button>
            {STORAGE_LOCATIONS.map((loc) => {
              const count = items.filter((i) => getItemStorageLocation(i) === loc.id).length;
              const isActive = activeStorageFilter === loc.id;
              return (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => setActiveStorageFilter(isActive ? "all" : loc.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? "bg-stone-900 text-white shadow-2xs"
                      : "bg-stone-50 text-stone-700 border border-stone-200 hover:bg-stone-100"
                  }`}
                >
                  {renderLocationIcon(loc.iconName, `w-3.5 h-3.5 ${isActive ? "text-white" : loc.badgeText}`)}
                  <span>{loc.shortLabel}</span>
                  <span className={`font-mono text-[11px] ${isActive ? "text-stone-300" : "text-stone-500"}`}>
                    ({count})
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 border-t border-stone-100">
            <span className="text-xs font-medium text-stone-400 shrink-0 pr-1">Category:</span>
            <button
              type="button"
              onClick={() => setActiveCategoryFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeCategoryFilter === "all"
                  ? "bg-stone-900 text-white shadow-2xs"
                  : "bg-stone-50 text-stone-700 border border-stone-200 hover:bg-stone-100"
              }`}
            >
              All Categories ({items.length})
            </button>
            {CATEGORY_ORDER.map((cat) => {
              const count = items.filter((i) => i.category === cat).length;
              if (count === 0 && activeCategoryFilter !== cat) return null;
              const isActive = activeCategoryFilter === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategoryFilter(isActive ? "all" : cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? "bg-stone-900 text-white shadow-2xs"
                      : "bg-stone-50 text-stone-700 border border-stone-200 hover:bg-stone-100"
                  }`}
                >
                  {getCategoryIcon(cat, `w-3.5 h-3.5 ${isActive ? "text-white" : "text-stone-600"}`)}
                  <span>{categoryLabel(cat)}</span>
                  <span className={`font-mono text-[11px] ${isActive ? "text-stone-300" : "text-stone-500"}`}>
                    ({count})
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Storage Zone Targets (Fixed at top of screen, visible even when scrolled to bottom of page) */}
      {draggedItemId && (
        <div className="fixed top-18 sm:top-20 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-2xl bg-white/95 backdrop-blur-md p-3 rounded-2xl border-2 border-stone-300 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-150">
          <div className="flex items-center justify-between px-1 pb-2 border-b border-stone-100 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600">
              Move Storage Zone {draggedItem ? `— ${draggedItem.name}` : ""}
            </span>
            <span className="text-[10px] font-medium text-stone-400">
              Drop item into a zone
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {STORAGE_LOCATIONS.map((loc) => {
              const isTarget = dragOverLocation === loc.id;
              return (
                <div
                  key={loc.id}
                  onDragOver={(e) => handleDragOver(e, loc.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, loc.id)}
                  className={`py-2.5 px-3 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer select-none ${
                    isTarget
                      ? `${loc.dropZoneActive} scale-105 shadow-md ring-2 ring-emerald-500`
                      : "border-stone-300 bg-stone-50 hover:bg-white text-stone-700 hover:border-stone-400"
                  }`}
                >
                  {renderLocationIcon(loc.iconName, "w-4 h-4 text-current")}
                  <span>{loc.shortLabel}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating Shopping Replenishment Targets (Fixed at bottom-left corner, clearly labeled) */}
      {draggedItemId && (
        <div className="fixed bottom-6 left-6 z-50 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-150 max-w-lg">
          {/* Target 1: Buy More */}
          <div
            onDragOver={(e) => handleActionDragOver(e, "buy_more")}
            onDragLeave={handleActionDragLeave}
            onDrop={(e) => handleActionDrop(e, "buy_more")}
            className={`px-4 py-3 rounded-2xl border-2 border-dashed transition-all cursor-pointer shadow-xl backdrop-blur-md flex items-center gap-3 select-none ${
              dragOverAction === "buy_more"
                ? "bg-emerald-100 border-emerald-600 text-emerald-950 scale-105 ring-2 ring-emerald-500 shadow-2xl"
                : "bg-white/95 border-stone-300 text-stone-800 hover:border-stone-400"
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center shrink-0">
              <ShoppingCart className="w-4 h-4 text-stone-700" />
            </div>
            <div>
              <div className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <span>Buy more</span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 rounded font-semibold">
                  + List
                </span>
              </div>
              <div className="text-[10px] text-stone-500 mt-0.5">
                Drop to keep in pantry & add to shopping list
              </div>
            </div>
          </div>

          {/* Target 2: All Out */}
          <div
            onDragOver={(e) => handleActionDragOver(e, "all_out")}
            onDragLeave={handleActionDragLeave}
            onDrop={(e) => handleActionDrop(e, "all_out")}
            className={`px-4 py-3 rounded-2xl border-2 border-dashed transition-all cursor-pointer shadow-xl backdrop-blur-md flex items-center gap-3 select-none ${
              dragOverAction === "all_out"
                ? "bg-amber-100 border-amber-600 text-amber-950 scale-105 ring-2 ring-amber-500 shadow-2xl"
                : "bg-amber-50/95 border-amber-300 text-amber-950 hover:border-amber-400"
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
              <ShoppingCart className="w-4 h-4 text-amber-800" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <span>All out</span>
                <span className="text-[10px] text-amber-800 bg-amber-100 border border-amber-300 px-1 rounded font-semibold">
                  Move to List
                </span>
              </div>
              <div className="text-[10px] text-amber-800/80 mt-0.5">
                Drop to remove from pantry & move to list
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Pantry Views */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center shadow-xs">
          <PackageCheck className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-stone-900">
            {searchQuery ? "No matching pantry items found" : "Your pantry is empty"}
          </h3>
          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
            Scan receipts after shopping, transcribe audio groceries, or click Add Items below.
          </p>
          <button
            type="button"
            onClick={onOpenAddModal}
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Items to Pantry</span>
          </button>
        </div>
      ) : viewMode === "storage_zones" ? (
        /* STORAGE LOCATION COLUMNS (Cabinet, Fridge, Freezer, Countertop) */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {STORAGE_LOCATIONS.map((loc) => {
            const locItems = sortItems(
              filteredItems.filter((i) => getItemStorageLocation(i) === loc.id)
            );
            const isDragTarget = dragOverLocation === loc.id;
            const totalValue = locItems.reduce((acc, curr) => acc + (curr.price || 0), 0);

            return (
              <div
                key={loc.id}
                id={`storage-zone-${loc.id}`}
                onDragOver={(e) => handleDragOver(e, loc.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, loc.id)}
                className={`bg-white rounded-2xl border transition-all duration-150 flex flex-col shadow-2xs min-h-[380px] ${
                  loc.cardBorder
                } ${isDragTarget ? loc.dropZoneActive : "hover:border-stone-300"}`}
              >
                {/* Column Zone Header */}
                <div className={`p-4 border-b border-stone-100 rounded-t-2xl ${loc.headerBg}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className={`p-2 rounded-xl border bg-white shadow-2xs ${loc.badgeBorder} ${loc.badgeText}`}>
                        {renderLocationIcon(loc.iconName, "w-4 h-4")}
                      </span>
                      <div>
                        <h3 className="font-bold text-stone-900 text-xs uppercase tracking-wider font-mono">
                          {loc.name}
                        </h3>
                        <p className="text-[11px] text-stone-500 line-clamp-1">
                          {loc.description}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-stone-900">
                        {locItems.length} {locItems.length === 1 ? "item" : "items"}
                      </span>
                      <p className="text-[11px] font-mono text-stone-500">
                        {currency}{totalValue.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Drop Target Indicator */}
                  {isDragTarget && (
                    <div className="mt-2.5 py-1.5 px-3 rounded-lg bg-emerald-600 text-white text-xs font-bold text-center animate-pulse flex items-center justify-center gap-2 shadow-xs">
                      <span>Drop item to store in {loc.name}</span>
                    </div>
                  )}
                </div>

                {/* Cards inside this Storage Location */}
                <div className="p-3.5 space-y-3 flex-1">
                  {locItems.length === 0 ? (
                    <div
                      className={`py-14 px-3 text-center border-2 border-dashed rounded-xl transition ${
                        isDragTarget
                          ? "border-emerald-500 bg-emerald-50/50 text-emerald-800"
                          : "border-stone-200/90 text-stone-400 bg-stone-50/50"
                      }`}
                    >
                      {renderLocationIcon(loc.iconName, "w-8 h-8 mx-auto opacity-40 mb-2")}
                      <p className="text-xs font-semibold text-stone-700">Empty {loc.name}</p>
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        Drag grocery items here to store in {loc.name.toLowerCase()}
                      </p>
                    </div>
                  ) : (
                    locItems.map(renderItemCard)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === "unified_shelf" ? (
        /* UNIFIED SHELF VIEW: Spacious grid with clear section headers by location */
        <div className="space-y-6">
          {STORAGE_LOCATIONS.map((loc) => {
            const locItems = sortItems(
              filteredItems.filter((i) => getItemStorageLocation(i) === loc.id)
            );
            if (locItems.length === 0 && activeStorageFilter !== "all" && activeStorageFilter !== loc.id) return null;
            const isDragTarget = dragOverLocation === loc.id;
            const totalValue = locItems.reduce((acc, curr) => acc + (curr.price || 0), 0);

            return (
              <div
                key={loc.id}
                id={`unified-zone-${loc.id}`}
                onDragOver={(e) => handleDragOver(e, loc.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, loc.id)}
                className={`bg-white rounded-2xl border transition-all p-4 shadow-2xs ${loc.cardBorder} ${
                  isDragTarget ? loc.dropZoneActive : ""
                }`}
              >
                {/* Section Header */}
                <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-stone-100">
                  <div className="flex items-center gap-2.5">
                    <span className={`p-2 rounded-xl border bg-white shadow-2xs ${loc.badgeBorder} ${loc.badgeText}`}>
                      {renderLocationIcon(loc.iconName, "w-4 h-4")}
                    </span>
                    <div>
                      <h3 className="font-bold text-stone-900 text-sm font-mono uppercase tracking-wide">
                        {loc.name}
                      </h3>
                      <p className="text-xs text-stone-500">{loc.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-stone-800">
                      {locItems.length} {locItems.length === 1 ? "item" : "items"}
                    </span>
                    <span className="text-xs font-mono text-stone-400 block">
                      {currency}{totalValue.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Items Grid */}
                {locItems.length === 0 ? (
                  <div className="py-8 text-center border-2 border-dashed border-stone-200 rounded-xl text-stone-400 text-xs">
                    No items in {loc.name}. Drag items here to store them.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                    {locItems.map(renderItemCard)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* FOOD CATEGORY CARDS GRID */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {CATEGORY_ORDER.map((category) => {
            const catItems = sortItems(
              filteredItems.filter((i) => i.category === category)
            );
            if (catItems.length === 0 && activeCategoryFilter !== category) return null;
            const badge = getCategoryBadgeColor(category);

            return (
              <div
                key={category}
                id={`pantry-card-${category.toLowerCase()}`}
                className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs flex flex-col p-4"
              >
                {/* Category Card Header */}
                <div className="flex items-center gap-2.5 pb-3 border-b border-stone-100">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${badge.bg} ${badge.border} border shrink-0 shadow-2xs`}
                  >
                    {getCategoryIcon(category, "w-4 h-4")}
                  </div>
                  <div>
                    <h3 className="font-bold text-xs uppercase tracking-wider text-stone-900 font-mono">
                      {categoryLabel(category)}
                    </h3>
                    <span className="text-[11px] text-stone-400 font-mono block mt-0.5">
                      {catItems.length} {catItems.length === 1 ? "item" : "items"}
                    </span>
                  </div>
                </div>

                {/* Items inside this Category Card */}
                <div className="mt-3 space-y-3 flex-1">
                  {catItems.map(renderItemCard)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
