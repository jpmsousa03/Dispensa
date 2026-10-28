import React, { useState } from "react";
import { getStoreLogo, normalizeStoreKey, STORE_BRAND_CONFIGS } from "../utils/storeLogos";

interface StoreLogoProps {
  storeNameOrId: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  variant?: "square" | "banner";
  fallbackInitial?: string;
  fallbackColor?: string;
}

export const StoreLogo: React.FC<StoreLogoProps> = ({
  storeNameOrId,
  size = "md",
  className = "",
  variant = "square",
  fallbackInitial,
  fallbackColor,
}) => {
  const [hasError, setHasError] = useState(false);
  const logoUrl = getStoreLogo(storeNameOrId, variant);
  const key = normalizeStoreKey(storeNameOrId);
  const brand = STORE_BRAND_CONFIGS[key];

  const sizeClasses = {
    xs: "w-4 h-4 p-0.5 rounded-sm",
    sm: "w-6 h-6 p-0.5 rounded-md",
    md: "w-8 h-8 p-1 rounded-lg",
    lg: "w-10 h-10 p-1.5 rounded-xl",
  }[size];

  const initialSizeClasses = {
    xs: "text-[9px]",
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  }[size];

  if (hasError || !logoUrl) {
    const initial = fallbackInitial || brand?.initial || storeNameOrId.charAt(0).toUpperCase();
    return (
      <div
        className={`flex items-center justify-center font-bold text-white shrink-0 shadow-2xs select-none ${
          sizeClasses
        } ${fallbackColor || "bg-stone-600"} ${className}`}
      >
        <span className={initialSizeClasses}>{initial}</span>
      </div>
    );
  }

  return (
    <div
      className={`bg-white border border-stone-200/90 shadow-2xs flex items-center justify-center shrink-0 overflow-hidden select-none transition-transform duration-150 ${sizeClasses} ${className}`}
      title={storeNameOrId}
    >
      <img
        src={logoUrl}
        alt={`${storeNameOrId} logo`}
        className="w-full h-full object-contain pointer-events-none"
        loading="lazy"
        onError={() => setHasError(true)}
      />
    </div>
  );
};
