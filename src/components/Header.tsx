import React from "react";
import { Home, ShoppingBag, Globe } from "lucide-react";
import { IDispensaLogo } from "./IDispensaLogo";
import { useLanguage, SUPPORTED_LANGUAGES, LanguageCode } from "../context/LanguageContext";

interface HeaderProps {
  currentView: "pantry" | "in_store";
  onViewChange: (view: "pantry" | "in_store") => void;
  pantryCount: number;
  shoppingListCount: number;
  onOpenAddModal: () => void;
  onOpenPriceInsights: () => void;
  currency: string;
  setCurrency: (c: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onViewChange,
  pantryCount,
  shoppingListCount,
  currency,
  setCurrency,
}) => {
  const { language, setLanguage, languageInfo, t } = useLanguage();

  // Authentic Lucide icon patterns for Pantry View (Home) and Store View (ShoppingBag) in warm gold #C9971E
  const patternSvg =
    currentView === "pantry"
      ? `data:image/svg+xml,%3Csvg width='72' height='72' viewBox='0 0 72 72' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23C9971E' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cg transform='translate(12, 12)'%3E%3Cpath d='M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'/%3E%3Cpolyline points='9 22 9 12 15 12 15 22'/%3E%3C/g%3E%3Cg transform='translate(48, 48)'%3E%3Cpath d='M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'/%3E%3Cpolyline points='9 22 9 12 15 12 15 22'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E`
      : `data:image/svg+xml,%3Csvg width='72' height='72' viewBox='0 0 72 72' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23C9971E' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cg transform='translate(12, 12)'%3E%3Cpath d='M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z'/%3E%3Cline x1='3' y1='6' x2='21' y2='6'/%3E%3Cpath d='M16 10a4 4 0 0 1-8 0'/%3E%3C/g%3E%3Cg transform='translate(48, 48)'%3E%3Cpath d='M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z'/%3E%3Cline x1='3' y1='6' x2='21' y2='6'/%3E%3Cpath d='M16 10a4 4 0 0 1-8 0'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E`;

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-stone-200/80 shadow-2xs select-none transition-colors">
      {/* Subtle Warm Top Accent Gradient Line */}
      <div className="h-0.5 w-full bg-gradient-to-r from-amber-400 via-amber-300 to-emerald-400 opacity-90" />

      {/* Subtle Refined Background Texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035] transition-all duration-300"
        style={{
          backgroundImage: `url("${patternSvg}")`,
          backgroundSize: "72px 72px",
        }}
      />

      {/* Selected Element: Main Header Content Container */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-3.5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          {/* Logo on Left: iDispensa */}
          <div className="flex items-center justify-between w-full sm:w-auto">
            <IDispensaLogo />

            {/* Mobile Controls: Language & Currency */}
            <div className="flex items-center gap-1.5 sm:hidden">
              <div className="relative inline-flex items-center">
                <select
                  aria-label="Interface Language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                  className="text-xs font-semibold px-2 py-1 rounded-lg border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none appearance-none cursor-pointer pr-5 shadow-2xs"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.code.toUpperCase()}
                    </option>
                  ))}
                </select>
                <Globe className="w-3 h-3 text-stone-500 absolute right-1.5 pointer-events-none" />
              </div>

              <button
                type="button"
                onClick={() => setCurrency(currency === "€" ? "$" : "€")}
                className="text-xs font-mono font-bold px-2 py-1 rounded-lg border border-stone-200 bg-stone-50 text-stone-800 shadow-2xs active:scale-95"
              >
                {currency}
              </button>
            </div>
          </div>

          {/* Centered Modern Segmented Control */}
          <div className="flex items-center justify-center">
            <div
              id="view-toggle-container"
              className="inline-flex items-center p-1 bg-stone-100/90 rounded-2xl border border-stone-200/80 shadow-2xs gap-1"
            >
              {/* Pantry View Tab */}
              <button
                id="pantry-view-tab"
                type="button"
                onClick={() => onViewChange("pantry")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  currentView === "pantry"
                    ? "bg-white text-stone-900 shadow-xs border border-stone-200/90 font-bold"
                    : "text-stone-600 hover:text-stone-900 hover:bg-white/60"
                }`}
              >
                <Home
                  className={`w-4 h-4 stroke-[2.2] ${
                    currentView === "pantry" ? "text-emerald-700" : "text-stone-400"
                  }`}
                />
                <span>{t("pantry_view")}</span>
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ml-0.5 transition-colors ${
                    currentView === "pantry"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200/70"
                      : "bg-stone-200/70 text-stone-600"
                  }`}
                >
                  {pantryCount}
                </span>
              </button>

              {/* In Store View Tab */}
              <button
                id="in-store-view-tab"
                type="button"
                onClick={() => onViewChange("in_store")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  currentView === "in_store"
                    ? "bg-white text-stone-900 shadow-xs border border-stone-200/90 font-bold"
                    : "text-stone-600 hover:text-stone-900 hover:bg-white/60"
                }`}
              >
                <ShoppingBag
                  className={`w-4 h-4 stroke-[2.2] ${
                    currentView === "in_store" ? "text-amber-700" : "text-stone-400"
                  }`}
                />
                <span>{t("in_store_view")}</span>
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ml-0.5 transition-colors ${
                    currentView === "in_store"
                      ? "bg-amber-50 text-amber-800 border border-amber-200/70"
                      : "bg-stone-200/70 text-stone-600"
                  }`}
                >
                  {shoppingListCount}
                </span>
              </button>
            </div>
          </div>

          {/* Right Desktop Controls: Language Selector + Currency Switcher */}
          <div className="hidden sm:flex items-center justify-end gap-2.5 min-w-44">
            {/* Language Selector Dropdown */}
            <div className="relative inline-flex items-center">
              <select
                id="header-language-select"
                aria-label="Interface Language"
                value={language}
                onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                className="text-xs font-semibold pl-7 pr-7 py-1.5 rounded-xl border border-stone-200/90 bg-stone-50 hover:bg-white text-stone-800 shadow-2xs transition-all appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-stone-300"
                title="Select Website Interface Language"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.nativeName} ({lang.code.toUpperCase()})
                  </option>
                ))}
              </select>
              <Globe className="w-3.5 h-3.5 text-stone-500 absolute left-2.5 pointer-events-none" />
              <span className="text-[10px] text-stone-400 absolute right-2.5 pointer-events-none">▼</span>
            </div>

            {/* Currency Toggle */}
            <button
              type="button"
              onClick={() => setCurrency(currency === "€" ? "$" : "€")}
              title="Toggle currency format"
              className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl border border-stone-200/90 bg-stone-50 hover:bg-white text-stone-800 shadow-2xs transition-all cursor-pointer active:scale-95"
            >
              <span>{currency === "€" ? "EUR (€)" : "USD ($)"}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
