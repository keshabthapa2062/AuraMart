import React from 'react';

export const FALLBACK_PRODUCT_IMAGE = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80';

export const getProductImageUrl = (image: any): string => {
  if (!image) return FALLBACK_PRODUCT_IMAGE;
  if (Array.isArray(image)) {
    const first = image.find(i => typeof i === 'string' && i.trim().length > 0);
    return first ? first.trim() : FALLBACK_PRODUCT_IMAGE;
  }
  if (typeof image === 'string' && image.trim().length > 0) {
    return image.trim();
  }
  return FALLBACK_PRODUCT_IMAGE;
};

export const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  const target = e.target as HTMLImageElement;
  if (target && target.src !== FALLBACK_PRODUCT_IMAGE) {
    target.src = FALLBACK_PRODUCT_IMAGE;
  }
};
