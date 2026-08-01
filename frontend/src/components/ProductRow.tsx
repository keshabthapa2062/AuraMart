import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from './ProductCard';
import { Product } from '../types';

interface ProductRowProps {
  title: React.ReactNode;
  icon?: React.ReactNode;
  subtitle?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  products: Product[];
  onAddToCart: (product: Product, e?: React.MouseEvent) => void;
  onViewDetails: (product: Product) => void;
  userCountry: string;
  badgeText?: string;
  extraCard?: React.ReactNode;
  renderExtraBelowCard?: (product: Product, index: number) => React.ReactNode;
  cardWidthClass?: string;
}

export default function ProductRow({
  title,
  icon,
  subtitle,
  badge,
  action,
  products,
  onAddToCart,
  onViewDetails,
  userCountry,
  badgeText,
  extraCard,
  renderExtraBelowCard,
  cardWidthClass = "w-[210px] sm:w-[240px] md:w-[260px]"
}: ProductRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const scrollAmount = rowRef.current.clientWidth * 0.75;
      rowRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="relative group/row">
      {/* Row Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-sans font-extrabold text-sm sm:text-base text-neutral-950 uppercase tracking-wider flex items-center gap-1.5">
                {title}
              </h3>
              {badge}
            </div>
            {subtitle && <p className="text-[11px] text-neutral-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {action}
          
          {/* Scroll Left / Right Buttons */}
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => scroll('left')}
              className="h-8 w-8 rounded-full border border-neutral-200/90 bg-white hover:bg-neutral-900 hover:text-white text-neutral-700 shadow-xs flex items-center justify-center transition-all cursor-pointer active:scale-95"
              title="Scroll Left"
              aria-label="Scroll Left"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="h-8 w-8 rounded-full border border-neutral-200/90 bg-white hover:bg-neutral-900 hover:text-white text-neutral-700 shadow-xs flex items-center justify-center transition-all cursor-pointer active:scale-95"
              title="Scroll Right"
              aria-label="Scroll Right"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Side Scroll Container */}
      <div
        ref={rowRef}
        className="flex gap-4 overflow-x-auto pb-4 pt-1 px-1 scrollbar-none snap-x scroll-smooth -mx-1"
      >
        {products.map((product, idx) => (
          <div
            key={product.id || idx}
            className={`${cardWidthClass} shrink-0 snap-start relative`}
          >
            {badgeText && (
              <span className="absolute top-2 right-2 z-10 bg-red-600 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md shadow-sm">
                {badgeText}
              </span>
            )}
            <ProductCard
              product={product}
              onAddToCart={onAddToCart}
              onViewDetails={onViewDetails}
              userCountry={userCountry}
            />
            {renderExtraBelowCard && renderExtraBelowCard(product, idx)}
          </div>
        ))}

        {extraCard}
      </div>
    </div>
  );
}
