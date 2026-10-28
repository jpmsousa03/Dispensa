// Dynamic Product Image Service — fully powered by API calls to /api/image/product

const imageApiCache = new Map<string, string>();

/**
 * Fetches authentic grocery product image dynamically from the backend product image API
 * (which queries Open Food Facts, Wikipedia, and verified food packshots live).
 */
export async function fetchProductImageFromApi(
  name: string,
  category?: string
): Promise<string> {
  if (!name || typeof name !== "string") return "";
  const clean = name.trim().toLowerCase();
  const cacheKey = `${clean}:${(category || "").toLowerCase()}`;

  // 1. In-memory cache
  if (imageApiCache.has(cacheKey)) {
    return imageApiCache.get(cacheKey)!;
  }

  // 2. Local storage cache
  try {
    const cached = localStorage.getItem(`prod_img_${cacheKey}`);
    if (cached) {
      imageApiCache.set(cacheKey, cached);
      return cached;
    }
  } catch {
    // Ignore storage errors
  }

  // 3. Dynamic call to the backend API endpoint
  try {
    const res = await fetch(
      `/api/image/product?name=${encodeURIComponent(clean)}&category=${encodeURIComponent(
        category || ""
      )}`
    );
    if (res.ok) {
      const data = await res.json();
      if (data.imageUrl && typeof data.imageUrl === "string" && data.imageUrl.startsWith("http")) {
        imageApiCache.set(cacheKey, data.imageUrl);
        try {
          localStorage.setItem(`prod_img_${cacheKey}`, data.imageUrl);
        } catch {
          // Ignore storage errors
        }
        return data.imageUrl;
      }
    }
  } catch (err) {
    console.warn("Product image API call failed:", err);
  }

  return "";
}

/**
 * Synchronous resolver for cached image or empty string if not yet fetched via API.
 * Ensures the app does not rely on static hardcoded image maps.
 */
export function getItemImage(name?: string, category?: string): string {
  if (!name) return "";
  const clean = name.trim().toLowerCase();
  const cacheKey = `${clean}:${(category || "").toLowerCase()}`;

  if (imageApiCache.has(cacheKey)) {
    return imageApiCache.get(cacheKey)!;
  }

  try {
    const cached = localStorage.getItem(`prod_img_${cacheKey}`);
    if (cached) {
      imageApiCache.set(cacheKey, cached);
      return cached;
    }
  } catch {
    // Ignore
  }

  return "";
}
