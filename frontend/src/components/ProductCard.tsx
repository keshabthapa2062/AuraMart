import React from 'react';
import { Star, ShoppingBag, Info, MapPin, Zap } from 'lucide-react';
import { Product } from '../types';
import { formatCurrencyVal } from '../utils/currency';
import { checkDeliverability } from '../utils/deliverability';
import { getProductImageUrl, handleImageError } from '../utils/image';

interface ProductCardProps {
  key?: string | number;
  product: Product;
  onAddToCart: (p: Product) => void;
  onViewDetails: (p: Product) => void;
  isSuggested?: boolean; // Highlighted by AI
  userCountry: string;
  userPincode?: string;
  userCity?: string;
  userState?: string;
}

export default function ProductCard({
  product,
  onAddToCart,
  onViewDetails,
  isSuggested = false,
  userCountry,
  userPincode = '110001',
  userCity = 'New Delhi',
  userState = 'Delhi'
}: ProductCardProps) {
  const isOutOfStock = product.inventory === 0;
  const isLowStock = product.inventory > 0 && product.inventory <= 5;

  const deliv = checkDeliverability(product, userPincode, userCity, userState);

  return (
    <div 
      id={`product-card-${product.id}`}
      className={`group relative flex flex-col overflow-hidden rounded-2xl bg-white border transition-all duration-300 hover:shadow-lg ${
        isSuggested 
          ? 'border-indigo-500 ring-2 ring-indigo-100 shadow-md scale-[1.01]' 
          : 'border-neutral-100 hover:border-neutral-200'
      }`}
    >
      {/* Product Highlight Badge for AI suggestions */}
      {isSuggested && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1 rounded-full bg-indigo-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
          <span>AI Recommended</span>
        </div>
      )}

      {/* Featured Badge */}
      {!isSuggested && product.featured && (
        <div className="absolute top-3 left-3 z-10 rounded-full bg-neutral-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
          <span>Featured</span>
        </div>
      )}

      {/* Product Image */}
      <div 
        onClick={() => onViewDetails(product)}
        className="aspect-square w-full overflow-hidden bg-neutral-50 relative cursor-pointer"
      >
        <img
          src={getProductImageUrl(product.image)}
          alt={product.name}
          referrerPolicy="no-referrer"
          onError={handleImageError}
          className="h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
        
        {/* Deliverability Badge Overlay */}
        <div className="absolute bottom-2 left-2 z-10">
          {!deliv.isDeliverable ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600/90 backdrop-blur-sm text-[9px] font-bold text-white shadow-sm">
              <MapPin className="h-2.5 w-2.5" />
              <span>Not Deliverable</span>
            </span>
          ) : deliv.expressAvailable ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600/90 backdrop-blur-sm text-[9px] font-bold text-white shadow-sm">
              <Zap className="h-2.5 w-2.5 fill-current" />
              <span>24h Express</span>
            </span>
          ) : null}
        </div>

        {/* Quick View Button on Hover */}
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden sm:block z-10">
          <button 
            onClick={(e) => { e.stopPropagation(); onViewDetails(product); }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-white text-neutral-950 shadow-md hover:bg-neutral-50"
          >
            <Info className="h-3 w-3 text-neutral-600" />
            <span>Details</span>
          </button>
        </div>
      </div>

      {/* Product Info */}
      <div className="flex flex-1 flex-col p-2.5 sm:p-3">
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-neutral-400 truncate max-w-[60px]">
            {product.category}
          </span>
          {/* Star Rating */}
          <div className="flex items-center gap-0.5">
            <Star className="h-2.5 w-2.5 fill-amber-400 stroke-amber-400" />
            <span className="font-mono text-[10px] font-semibold text-neutral-700">
              {product.rating}
            </span>
          </div>
        </div>

        <h3 
          onClick={() => onViewDetails(product)}
          className="font-sans font-semibold text-xs text-neutral-900 hover:text-indigo-600 transition-colors line-clamp-1 cursor-pointer"
          title={product.name}
        >
          {product.name}
        </h3>

        {/* Seller & Deliverability Text */}
        <div className="mt-1 flex items-center justify-between gap-1 text-[9px]">
          <span className="text-neutral-500 truncate max-w-[110px]" title={`Seller: ${product.sellerName || 'Aura Seller'} (${product.sellerCity || 'India'})`}>
            🏪 {product.sellerName || 'Aura Store'} ({product.sellerCity || 'Delhi'})
          </span>
        </div>

        {/* Pricing and Action */}
        <div className="mt-2.5 pt-2 border-t border-neutral-50 flex items-center justify-between gap-1">
          <div className="min-w-0">
            <span className="font-sans font-bold text-xs text-neutral-950 block truncate">
              {formatCurrencyVal(product.price, userCountry)}
            </span>
            {/* Inventory Indicator */}
            {isOutOfStock ? (
              <span className="font-mono text-[8px] font-semibold text-red-600 uppercase tracking-wider leading-none block mt-0.5">
                Sold Out
              </span>
            ) : !deliv.isDeliverable ? (
              <span className="font-mono text-[8px] font-semibold text-red-600 uppercase tracking-wider leading-none block mt-0.5" title={deliv.reason}>
                Out of Range
              </span>
            ) : isLowStock ? (
              <span className="font-mono text-[8px] font-semibold text-amber-600 uppercase tracking-wider leading-none block mt-0.5 animate-pulse">
                {product.inventory} left
              </span>
            ) : (
              <span className="font-mono text-[8px] text-emerald-600 uppercase tracking-wider leading-none block mt-0.5">
                In Stock
              </span>
            )}
          </div>

          <button
            onClick={() => onAddToCart(product)}
            disabled={isOutOfStock || !deliv.isDeliverable}
            title={!deliv.isDeliverable ? deliv.reason || `Seller is outside deliverable range for pincode ${userPincode}` : "Add to Cart"}
            className={`flex items-center justify-center gap-1 h-7 px-2 rounded-lg text-[10px] font-semibold select-none transition-all ${
              isOutOfStock || !deliv.isDeliverable
                ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed border border-neutral-200'
                : 'bg-neutral-900 text-white hover:bg-neutral-800 active:scale-95 shadow-sm'
            }`}
          >
            <ShoppingBag className="h-3 w-3" />
            <span className="hidden sm:inline">
              {!deliv.isDeliverable ? 'Unavailable' : 'Add'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
