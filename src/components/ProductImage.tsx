import React, { useState, useEffect } from "react";
import { ProductVisual } from "./ProductVisual";
import { getItemImage, fetchProductImageFromApi } from "../utils/productImages";
import { GroceryCategory } from "../types";

interface ProductImageProps {
  name: string;
  category: GroceryCategory;
  imageUrl?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const ProductImage: React.FC<ProductImageProps> = ({
  name,
  category,
  imageUrl,
  size = "md",
  className = "",
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const [src, setSrc] = useState<string>(imageUrl || getItemImage(name, category));
  const [isLoading, setIsLoading] = useState<boolean>(!imageUrl && !getItemImage(name, category));

  useEffect(() => {
    // If an explicit dynamic image URL is passed, use it directly
    if (imageUrl && imageUrl.startsWith("http")) {
      setSrc(imageUrl);
      setImgFailed(false);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    // Call API dynamically for authentic product image
    fetchProductImageFromApi(name, category).then((apiImg) => {
      if (isMounted) {
        if (apiImg) {
          setSrc(apiImg);
          setImgFailed(false);
        } else {
          setImgFailed(true);
        }
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [name, category, imageUrl]);

  const sizeClasses = {
    sm: "w-8 h-8 rounded-lg p-0.5",
    md: "w-12 h-12 rounded-lg p-1",
    lg: "w-16 h-16 rounded-xl p-1.5",
  };

  if (isLoading && !src) {
    return (
      <div
        className={`shrink-0 overflow-hidden bg-stone-100/80 border border-stone-200/50 rounded-lg animate-pulse flex items-center justify-center ${sizeClasses[size]} ${className}`}
      />
    );
  }

  if (imgFailed || !src) {
    return (
      <ProductVisual
        name={name}
        category={category}
        size={size}
        className={className}
      />
    );
  }

  return (
    <div
      className={`shrink-0 overflow-hidden bg-white border border-stone-100/90 shadow-2xs flex items-center justify-center ${sizeClasses[size]} ${className}`}
    >
      <img
        src={src}
        alt={name}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        className="w-full h-full object-contain mix-blend-multiply transition-opacity duration-150"
      />
    </div>
  );
};
