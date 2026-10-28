import React from "react";
import {
  Apple,
  Beef,
  Milk,
  Croissant,
  Package,
  Fish,
  Snowflake,
  Coffee,
  Cookie,
  Carrot,
} from "lucide-react";
import { GroceryCategory } from "../types";

export const CATEGORIES: GroceryCategory[] = [
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

export function getCategoryIcon(category: GroceryCategory, className: string = "w-4 h-4") {
  switch (category) {
    case "Fruits":
      return <Apple className={className} />;
    case "Vegetables":
      return <Carrot className={className} />;
    case "Meat":
      return <Beef className={className} />;
    case "Dairy":
      return <Milk className={className} />;
    case "Bakery":
      return <Croissant className={className} />;
    case "Pantry":
      return <Package className={className} />;
    case "Seafood":
      return <Fish className={className} />;
    case "Frozen":
      return <Snowflake className={className} />;
    case "Beverages":
      return <Coffee className={className} />;
    case "Snacks":
      return <Cookie className={className} />;
    default:
      return <Package className={className} />;
  }
}

export function getCategoryBadgeColor(category: GroceryCategory): {
  bg: string;
  text: string;
  border: string;
} {
  switch (category) {
    case "Fruits":
      return {
        bg: "bg-[#7BC68D]/35 text-[#1E5631]",
        text: "text-[#1E5631]",
        border: "border-[#7BC68D]/50",
      };
    case "Vegetables":
      return {
        bg: "bg-[#8BC34A]/30 text-[#33691E]",
        text: "text-[#33691E]",
        border: "border-[#8BC34A]/40",
      };
    case "Meat":
      return {
        bg: "bg-[#F28B82]/35 text-[#9C27B0]",
        text: "text-[#9C27B0]",
        border: "border-[#F28B82]/50",
      };
    case "Dairy":
      return {
        bg: "bg-[#AECBFA]/40 text-[#1A73E8]",
        text: "text-[#1A73E8]",
        border: "border-[#AECBFA]/60",
      };
    case "Bakery":
      return {
        bg: "bg-[#FFE082]/40 text-[#E65100]",
        text: "text-[#E65100]",
        border: "border-[#FFE082]/60",
      };
    case "Pantry":
      return {
        bg: "bg-[#F6BF26]/35 text-[#D97706]",
        text: "text-[#D97706]",
        border: "border-[#F6BF26]/50",
      };
    case "Seafood":
      return {
        bg: "bg-[#80DEEA]/40 text-[#006064]",
        text: "text-[#006064]",
        border: "border-[#80DEEA]/60",
      };
    case "Frozen":
      return {
        bg: "bg-[#B3E5FC]/40 text-[#0277BD]",
        text: "text-[#0277BD]",
        border: "border-[#B3E5FC]/60",
      };
    case "Beverages":
      return {
        bg: "bg-[#D7AEFB]/40 text-[#6B21A8]",
        text: "text-[#6B21A8]",
        border: "border-[#D7AEFB]/60",
      };
    case "Snacks":
      return {
        bg: "bg-[#FFCC80]/40 text-[#E65100]",
        text: "text-[#E65100]",
        border: "border-[#FFCC80]/60",
      };
    default:
      return {
        bg: "bg-slate-50 text-slate-700",
        text: "text-slate-700",
        border: "border-slate-200",
      };
  }
}
