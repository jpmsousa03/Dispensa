import React from "react";
import { GroceryCategory } from "../types";
import { getCategoryIcon, getCategoryBadgeColor } from "../utils/categoryIcons";

export type VisualStyle = "product";

interface ProductVisualProps {
  name: string;
  category: GroceryCategory;
  size?: "sm" | "md" | "lg";
  style?: VisualStyle;
  className?: string;
}

export const ProductVisual: React.FC<ProductVisualProps> = ({
  name,
  category,
  size = "md",
  className = "",
}) => {
  const badge = getCategoryBadgeColor(category);

  const sizeClasses = {
    sm: "w-8 h-8 rounded-lg p-1",
    md: "w-12 h-12 rounded-lg p-1.5",
    lg: "w-16 h-16 rounded-xl p-2",
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div
      className={`shrink-0 bg-stone-50 border border-stone-200/80 shadow-2xs flex items-center justify-center overflow-hidden ${sizeClasses[size]} ${className}`}
      title={name}
    >
      <div className={`w-full h-full rounded-md flex items-center justify-center ${badge.bg} ${badge.text}`}>
        {getCategoryIcon(category, iconSizes[size])}
      </div>
    </div>
  );
};
