export interface StoreBrandConfig {
  square: string;
  banner: string;
  initial: string;
  accentColor: string;
  twBadgeBg: string;
  tagline: string;
}

export const STORE_BRAND_CONFIGS: Record<string, StoreBrandConfig> = {
  lidl: {
    square: "/logos/lidl_square.png",
    banner: "/logos/lidl.png",
    initial: "L",
    accentColor: "#0050AA",
    twBadgeBg: "bg-blue-600 text-white border-blue-700",
    tagline: "Great value essentials",
  },
  continente: {
    square: "",
    banner: "",
    initial: "C",
    accentColor: "#DA291C",
    twBadgeBg: "bg-red-600 text-white border-red-700",
    tagline: "Fresh quality & wide variety",
  },
  pingodoce: {
    square: "",
    banner: "",
    initial: "PD",
    accentColor: "#679B00",
    twBadgeBg: "bg-lime-700 text-white border-lime-800",
    tagline: "Fresh bakery, meals & counter",
  },
  mercadona: {
    square: "",
    banner: "",
    initial: "M",
    accentColor: "#007A3D",
    twBadgeBg: "bg-emerald-700 text-white border-emerald-800",
    tagline: "Always good prices & deli",
  },
  auchan: {
    square: "",
    banner: "",
    initial: "A",
    accentColor: "#E2001A",
    twBadgeBg: "bg-rose-600 text-white border-rose-700",
    tagline: "Hypermarket selection",
  },
  aldi: {
    square: "",
    banner: "",
    initial: "A",
    accentColor: "#001E82",
    twBadgeBg: "bg-sky-800 text-white border-sky-900",
    tagline: "Discount essentials",
  },
  prisma: {
    square: "/logos/prisma_square.png",
    banner: "/logos/prisma.png",
    initial: "P",
    accentColor: "#007841",
    twBadgeBg: "bg-emerald-600 text-white border-emerald-700",
    tagline: "Wide selection & bulk",
  },
  ksupermarket: {
    square: "/logos/ksupermarket_square.png",
    banner: "/logos/ksupermarket.png",
    initial: "K",
    accentColor: "#ED6600",
    twBadgeBg: "bg-amber-600 text-white border-amber-700",
    tagline: "Fresh counter & gourmet",
  },
  intermarche: {
    square: "",
    banner: "",
    initial: "ITM",
    accentColor: "#E30613",
    twBadgeBg: "bg-red-700 text-white border-red-800",
    tagline: "Local fresh producers",
  },
  minipreco: {
    square: "",
    banner: "",
    initial: "MP",
    accentColor: "#D31027",
    twBadgeBg: "bg-rose-700 text-white border-rose-800",
    tagline: "Neighborhood grocery",
  },
  carrefour: {
    square: "",
    banner: "",
    initial: "C",
    accentColor: "#004E98",
    twBadgeBg: "bg-blue-700 text-white border-blue-800",
    tagline: "Hypermarket essentials",
  },
};

export function normalizeStoreKey(storeNameOrId: string): string {
  if (!storeNameOrId) return "lidl";
  const clean = storeNameOrId.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (clean.includes("lidl")) return "lidl";
  if (clean.includes("continente")) return "continente";
  if (clean.includes("pingodoce") || clean.includes("pingo")) return "pingodoce";
  if (clean.includes("mercadona")) return "mercadona";
  if (clean.includes("auchan") || clean.includes("jumbo")) return "auchan";
  if (clean.includes("aldi")) return "aldi";
  if (clean.includes("prisma")) return "prisma";
  if (
    clean.includes("ksupermarket") ||
    clean.includes("citymarket") ||
    clean.includes("kmarket") ||
    clean === "k"
  ) {
    return "ksupermarket";
  }
  if (clean.includes("intermarche")) return "intermarche";
  if (clean.includes("minipreco")) return "minipreco";
  if (clean.includes("carrefour")) return "carrefour";
  return clean;
}

export function getStoreLogo(
  storeNameOrId: string,
  variant: "square" | "banner" = "square"
): string {
  const key = normalizeStoreKey(storeNameOrId);
  const config = STORE_BRAND_CONFIGS[key];
  if (config && config.square) {
    return variant === "square" ? config.square : config.banner;
  }
  return "";
}

export function createStoreOption(storeName: string): {
  id: string;
  name: string;
  color: string;
  logoInitial: string;
  logoUrl?: string;
  tagline?: string;
} {
  const key = normalizeStoreKey(storeName);
  const config = STORE_BRAND_CONFIGS[key];
  const formattedName = storeName
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

  if (config) {
    return {
      id: key,
      name:
        key === "pingodoce"
          ? "Pingo Doce"
          : key === "intermarche"
          ? "Intermarché"
          : key === "minipreco"
          ? "Minipreço"
          : key === "ksupermarket"
          ? "KSupermarket"
          : formattedName,
      color: config.twBadgeBg,
      logoInitial: config.initial,
      logoUrl: config.square || undefined,
      tagline: config.tagline,
    };
  }

  return {
    id: key || "store-" + Date.now(),
    name: formattedName || "Store",
    color: "bg-stone-700 text-white border-stone-800",
    logoInitial: storeName.charAt(0).toUpperCase() || "S",
    tagline: "Planned groceries",
  };
}
