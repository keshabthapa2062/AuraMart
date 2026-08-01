import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, ArrowRight, Play, Pause, ChevronLeft, ChevronRight, Star, Eye, Search, ShoppingBag, ShieldCheck } from 'lucide-react';
import { Product, UserProfile } from '../types';
import { formatCurrencyVal } from '../utils/currency';
import { getProductImageUrl, handleImageError } from '../utils/image';

interface RecommendedItem {
  product: Product;
  reason: string;
  reasonType: 'browsing' | 'search' | 'rating' | 'curated';
}

interface StellaLiveRecommendationsProps {
  products: Product[];
  recentlyViewed: Product[];
  searchQuery: string;
  userCountry: string;
  userCity: string;
  onViewDetails: (product: Product) => void;
  onAddToCart: (product: Product, quantity: number) => void;
  onOpenAssistant: () => void;
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
}

export default function StellaLiveRecommendations({
  products,
  recentlyViewed,
  searchQuery,
  userCountry,
  userCity,
  onViewDetails,
  onAddToCart,
  onOpenAssistant,
  currentUser,
  onOpenAuth
}: StellaLiveRecommendationsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Load search history from LocalStorage
  const searchHistory = useMemo(() => {
    try {
      const saved = localStorage.getItem('aura_search_history');
      if (saved) return JSON.parse(saved) as string[];
    } catch (_) {}
    return [];
  }, [searchQuery]);

  // Construct diverse recommended items list based on user history & activity
  const recommendedItems = useMemo<RecommendedItem[]>(() => {
    if (!products || products.length === 0) return [];

    const items: RecommendedItem[] = [];
    const usedIds = new Set<string>();

    // 1. Browsing Activity (Recently Viewed items)
    recentlyViewed.forEach(p => {
      const pId = p.id || (p as any)._id;
      if (pId && !usedIds.has(pId)) {
        usedIds.add(pId);
        items.push({
          product: p,
          reason: 'Recently Viewed Pick',
          reasonType: 'browsing'
        });
      }
    });

    // 2. Active or Stored Search History Matches
    const allSearchTerms = [...(searchQuery ? [searchQuery] : []), ...searchHistory].filter(Boolean);
    allSearchTerms.forEach(term => {
      const termLower = term.toLowerCase();
      const match = products.find(p => {
        const pId = p.id || (p as any)._id;
        return pId && !usedIds.has(pId) && (
          p.name.toLowerCase().includes(termLower) ||
          p.category.toLowerCase().includes(termLower) ||
          (p.brand && p.brand.toLowerCase().includes(termLower))
        );
      });
      if (match) {
        const pId = match.id || (match as any)._id;
        usedIds.add(pId);
        items.push({
          product: match,
          reason: `Searched "${term}"`,
          reasonType: 'search'
        });
      }
    });

    // 3. High Rating Picks
    const topRated = products.filter(p => {
      const pId = p.id || (p as any)._id;
      return pId && !usedIds.has(pId) && p.rating >= 4.7;
    });

    topRated.slice(0, 4).forEach(p => {
      const pId = p.id || (p as any)._id;
      usedIds.add(pId);
      items.push({
        product: p,
        reason: `${p.rating}★ Top Rated`,
        reasonType: 'rating'
      });
    });

    // 4. Fill remaining items from general catalog
    if (items.length < 5) {
      products.forEach(p => {
        const pId = p.id || (p as any)._id;
        if (pId && !usedIds.has(pId) && items.length < 8) {
          usedIds.add(pId);
          items.push({
            product: p,
            reason: "Curated Choice",
            reasonType: 'curated'
          });
        }
      });
    }

    return items;
  }, [products, recentlyViewed, searchQuery, searchHistory]);

  // Keep currentIndex within bounds if list length changes
  useEffect(() => {
    if (currentIndex >= recommendedItems.length && recommendedItems.length > 0) {
      setCurrentIndex(0);
    }
  }, [recommendedItems.length, currentIndex]);

  // Automatic looping interval (every 3.5 seconds)
  useEffect(() => {
    if (isPaused || recommendedItems.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % recommendedItems.length);
    }, 3500);

    return () => clearInterval(timer);
  }, [isPaused, recommendedItems.length]);

  if (recommendedItems.length === 0) return null;

  const currentItem = recommendedItems[currentIndex] || recommendedItems[0];
  const currentProduct = currentItem.product;

  const getBadgeColor = (type: RecommendedItem['reasonType']) => {
    switch (type) {
      case 'browsing':
        return 'bg-indigo-600 text-white';
      case 'search':
        return 'bg-emerald-600 text-white';
      case 'rating':
        return 'bg-amber-600 text-white';
      default:
        return 'bg-purple-600 text-white';
    }
  };

  return (
    <div className="relative bg-white border-b border-neutral-100 overflow-hidden select-none">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-12 sm:py-16 flex flex-col md:flex-row md:items-center justify-between gap-10">
        
        {/* Left Side: Hero Text & Main Actions */}
        <div className="max-w-xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-neutral-900 text-white rounded-full text-[10px] font-bold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
            <span>Featured Live Recommendations</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping ml-1" />
          </div>
          
          <h1 className="font-sans font-extrabold text-3xl sm:text-5xl text-neutral-950 tracking-tight leading-[1.1] md:max-w-lg">
            Premium Goods for Your Everyday Rhythm.
          </h1>

          <p className="text-sm sm:text-base text-neutral-500 leading-relaxed max-w-md">
            Curated lifestyle products, smart desktop mechanics, and clean essentials tailored dynamically to your preferences and browsing activity.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              onClick={onOpenAssistant}
              className="px-6 py-3 bg-indigo-600 text-white hover:bg-indigo-700 font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Shopping Concierge</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <a
              href="#catalog-view"
              className="px-6 py-3 bg-neutral-50 border border-neutral-200 hover:bg-neutral-100 text-neutral-800 font-semibold text-xs sm:text-sm rounded-xl transition-all text-center flex items-center justify-center cursor-pointer"
            >
              Explore Catalog
            </a>
          </div>
        </div>

        {/* Right Side: Exact Compact Live Recommendation Loop Card */}
        <div className="flex-1 max-w-md md:max-w-sm relative group bg-[#FDFDFD] border border-neutral-200/80 p-5 rounded-3xl shadow-sm hover:shadow-md transition-all">
          
          {/* Top Live Status & Controls Header */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-100">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                Live Pick ({currentIndex + 1}/{recommendedItems.length})
              </span>
            </div>

            {/* Micro Controls: Pause/Play & Prev/Next */}
            <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl">
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="p-1 text-neutral-600 hover:text-neutral-900 hover:bg-white rounded-lg transition-colors cursor-pointer"
                title={isPaused ? "Resume Loop" : "Pause Loop"}
              >
                {isPaused ? <Play className="h-3 w-3 fill-current" /> : <Pause className="h-3 w-3 fill-current" />}
              </button>
              <button
                onClick={() => setCurrentIndex(prev => (prev - 1 + recommendedItems.length) % recommendedItems.length)}
                className="p-1 text-neutral-600 hover:text-neutral-900 hover:bg-white rounded-lg transition-colors cursor-pointer"
                title="Previous product"
              >
                <ChevronLeft className="h-3 w-3" />
              </button>
              <button
                onClick={() => setCurrentIndex(prev => (prev + 1) % recommendedItems.length)}
                className="p-1 text-neutral-600 hover:text-neutral-900 hover:bg-white rounded-lg transition-colors cursor-pointer"
                title="Next product"
              >
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Product Image Container */}
          <div 
            onClick={() => onViewDetails(currentProduct)}
            className="aspect-square w-full rounded-2xl overflow-hidden bg-neutral-50 relative group/img cursor-pointer"
          >
            <img 
              key={`hero-rec-${currentProduct.id || (currentProduct as any)._id}`}
              src={getProductImageUrl(currentProduct.image)} 
              alt={currentProduct.name} 
              referrerPolicy="no-referrer"
              onError={handleImageError}
              className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500"
            />

            {/* Context Reason Tag Overlay */}
            <div className={`absolute top-3 left-3 ${getBadgeColor(currentItem.reasonType)} text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest shadow-sm flex items-center gap-1`}>
              <Sparkles className="h-3 w-3" />
              <span>{currentItem.reason}</span>
            </div>
          </div>

          {/* Product Meta Details & Action Row */}
          <div className="mt-4 space-y-2">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <span className="font-mono text-[9px] font-bold text-indigo-600 uppercase tracking-widest block mb-0.5 truncate">
                  {currentProduct.category} {currentProduct.brand ? `• ${currentProduct.brand}` : ''}
                </span>
                <h3 
                  onClick={() => onViewDetails(currentProduct)}
                  className="font-sans font-bold text-sm text-neutral-900 line-clamp-1 hover:text-indigo-600 transition-colors cursor-pointer" 
                  title={currentProduct.name}
                >
                  {currentProduct.name}
                </h3>
                
                <div className="flex items-center gap-1.5 mt-1">
                  <Star className="h-3 w-3 fill-amber-400 stroke-amber-400" />
                  <span className="text-xs font-semibold text-neutral-700">{currentProduct.rating}</span>
                  <span className="text-neutral-300">•</span>
                  <span className="text-xs font-medium text-neutral-400">Fast delivery to {userCity}</span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className="font-sans font-extrabold text-base text-neutral-950">
                  {formatCurrencyVal(currentProduct.price, userCountry)}
                </p>
                <button 
                  onClick={() => onViewDetails(currentProduct)}
                  className="text-[10px] font-bold text-indigo-600 hover:underline mt-1 block"
                >
                  View Specs
                </button>
              </div>
            </div>

            {/* Add to Cart / Login Quick Action Button */}
            <div className="pt-2">
              <button
                onClick={() => {
                  if (!currentUser) {
                    onOpenAuth();
                  } else {
                    onAddToCart(currentProduct, 1);
                  }
                }}
                className="w-full py-2.5 bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                <span>{currentUser ? 'Add to Cart' : 'Log In to Add to Cart'}</span>
              </button>
            </div>
          </div>

          {/* Bottom Pagination Dots */}
          <div className="flex items-center justify-center gap-1.5 mt-4 pt-2">
            {recommendedItems.map((_, idx) => (
              <button
                key={`dot-${idx}`}
                onClick={() => {
                  setCurrentIndex(idx);
                  setIsPaused(true);
                }}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === currentIndex ? 'w-5 bg-indigo-600' : 'w-1.5 bg-neutral-200 hover:bg-neutral-300'
                }`}
                title={`Product ${idx + 1}`}
              />
            ))}
          </div>

        </div>

      </div>
    </div>
  );
}
