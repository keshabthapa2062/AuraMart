import React, { useState, useEffect } from 'react';
import { 
  Star, 
  ShoppingBag, 
  Heart, 
  Sparkles, 
  CreditCard, 
  MessageSquare, 
  ShieldCheck, 
  Truck, 
  RotateCcw, 
  Award, 
  CheckCircle, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  Edit3, 
  Info,
  AlertCircle
} from 'lucide-react';
import { Product, Review, UserProfile, CartItem } from '../types';
import ProductCard from './ProductCard';
import { formatCurrencyVal } from '../utils/currency';
import ConfirmDeleteModal from './ConfirmDeleteModal';

interface ProductDetailsPageProps {
  productId: string;
  onAddToCart: (p: Product, qty: number) => void;
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  onSelectTab: (tab: 'shop' | 'orders' | 'admin' | 'dashboard') => void;
  onTriggerCheckout: () => void;
  userCountry: string;
  userPincode?: string;
  userCity?: string;
  userState?: string;
  onViewProduct: (productId: string) => void;
  onDeleteProduct?: (productId: string) => void;
}

export default function ProductDetailsPage({
  productId,
  onAddToCart,
  currentUser,
  onOpenAuth,
  onSelectTab,
  onTriggerCheckout,
  userCountry,
  userPincode = '110001',
  userCity = 'New Delhi',
  userState = 'Delhi',
  onViewProduct,
  onDeleteProduct
}: ProductDetailsPageProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [customersAlsoViewed, setCustomersAlsoViewed] = useState<Product[]>([]);
  const [budgetMatches, setBudgetMatches] = useState<Product[]>([]);
  
  // Delete modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Gallery slider state
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [zoomStyle, setZoomStyle] = useState<{ display: string; transform: string; left: string; top: string }>({
    display: 'none',
    transform: 'scale(2)',
    left: '0px',
    top: '0px'
  });

  // Seller States
  const [sellerCountry, setSellerCountry] = useState<string>('India');
  const [sellerStoreName, setSellerStoreName] = useState<string>('Aura Store');

  // Purchase state
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);

  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(5);
  const [ratingHover, setRatingHover] = useState<number | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);

  // Image upload simulation for reviews
  const [reviewImage, setReviewImage] = useState<string>('');

  // Payment Offers state
  const [paymentOffers, setPaymentOffers] = useState<any[]>([]);
  const [preferredPayment, setPreferredPayment] = useState<string>(() => {
    return localStorage.getItem('aura_preferred_payment_name') || '';
  });

  const handleSelectPaymentMethod = (method: string) => {
    const val = method.toLowerCase();
    let mappedId = 'card';
    if (val.includes('upi') || val.includes('phonepe') || val.includes('google pay') || val.includes('paytm') || val.includes('bhim')) {
      mappedId = 'upi';
    } else if (val.includes('esewa')) {
      mappedId = 'esewa';
    } else if (val.includes('khalti')) {
      mappedId = 'khalti';
    } else if (val.includes('net banking') || val.includes('netbanking')) {
      mappedId = 'netbanking';
    } else if (val.includes('paypal')) {
      mappedId = 'paypal';
    } else if (val.includes('apple pay')) {
      mappedId = 'applepay';
    } else if (val.includes('gpay') || val.includes('google pay')) {
      mappedId = 'googlepay';
    } else if (val.includes('cod') || val.includes('cash on delivery')) {
      mappedId = 'cod';
    }
    
    setPreferredPayment(method);
    localStorage.setItem('aura_preferred_payment_method', mappedId);
    localStorage.setItem('aura_preferred_payment_name', method);
  };

  useEffect(() => {
    fetchProductDetails();
    fetchPaymentOffers();
    
    // Check wishlist status from local storage
    const userKey = currentUser?.uid ? currentUser.uid : 'guest';
    const wishlistKey = `aura_wishlist_${userKey}`;
    const wishlist = JSON.parse(localStorage.getItem(wishlistKey) || localStorage.getItem('aura_wishlist') || '[]');
    setIsWishlisted(wishlist.includes(productId));
  }, [productId, currentUser]);

  const fetchProductDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${productId}`);
      if (res.ok) {
        const data = await res.json();
        setProduct(data);
        
        if (data.sellerId) {
          fetch(`/api/seller/${data.sellerId}/payment-methods`)
            .then(r => r.json())
            .then(sellerData => {
              if (sellerData && sellerData.country) {
                setSellerCountry(sellerData.country);
                setSellerStoreName(sellerData.storeName);
              }
            })
            .catch(err => console.error("Error loading seller profile:", err));
        } else {
          setSellerCountry('India');
          setSellerStoreName('Aura Store');
        }

        // Fetch similar category products
        const allRes = await fetch('/api/products');
        if (allRes.ok) {
          const allData: Product[] = await allRes.json();
          
          // Row 1: More from this category
          const filteredCat = allData.filter(p => p.category === data.category && p.id !== data.id);
          setSimilarProducts(filteredCat.slice(0, 4));
          
          // Row 2: Customers also viewed (high ratings, mixed categories)
          const highRated = allData.filter(p => p.rating >= 4.5 && p.id !== data.id);
          setCustomersAlsoViewed(highRated.slice(0, 4));

          // Row 3: Budget friendly matches (similar category, lower or equal price)
          const budget = allData.filter(p => p.category === data.category && p.price <= data.price && p.id !== data.id);
          setBudgetMatches(budget.slice(0, 4));
        }

        // Fetch reviews
        fetchReviews();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    setIsLoadingReviews(true);
    try {
      const response = await fetch(`/api/products/${productId}/reviews`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingReviews(false);
    }
  };

  const fetchPaymentOffers = async () => {
    try {
      const res = await fetch('/api/payment-offers');
      if (res.ok) {
        const data = await res.json();
        setPaymentOffers(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-24 text-center">
        <span className="font-mono text-xs text-neutral-400 animate-pulse block">Synchronizing premium asset...</span>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-24 text-center">
        <h2 className="font-sans font-bold text-lg text-neutral-900">Product not found</h2>
        <p className="text-xs text-neutral-400 mt-2">The specified product has been removed or does not exist.</p>
        <button
          onClick={() => window.history.pushState({}, '', '/')}
          className="mt-6 px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-semibold"
        >
          Return to Catalog
        </button>
      </div>
    );
  }

  // Derive extra properties
  const brand = product.brand || "Aura Premium";
  const subcategory = product.subcategory || (product.category === "Electronics" ? "Luxe Hardware" : "Everyday Goods");
  const soldCount = product.soldCount || (product.reviewsCount ? product.reviewsCount * 4 + 48 : 75);
  const sku = product.sku || `AU-${product.id.toUpperCase().slice(0, 6)}-2026`;
  const originalPrice = product.originalPrice || Math.round(product.price * 1.35);
  const percentageOff = Math.round(((originalPrice - product.price) / originalPrice) * 100);

  const formatPriceVal = (usdVal: number) => {
    return formatCurrencyVal(usdVal, userCountry);
  };

  // Gallery Images - support preset array or fallback to param variations
  const images = Array.isArray(product.image)
    ? product.image
    : [
        product.image,
        product.image + "&sat=-30",
        product.image + "&hue=120",
        product.image + "&brightness=110"
      ];

  // Dynamic Payment Options based on Country
  const getPaymentMethods = (country: string) => {
    switch (country.toLowerCase()) {
      case 'india':
        return ['UPI', 'PhonePe', 'Google Pay', 'Paytm', 'BHIM', 'Net Banking', 'Credit Card', 'Debit Card', 'Wallet'];
      case 'nepal':
        return ['eSewa', 'Khalti', 'IME Pay', 'FonePay'];
      default:
        return ['Visa', 'Mastercard', 'PayPal', 'Stripe'];
    }
  };

  const paymentMethods = getPaymentMethods(sellerCountry);

  // Specifications Grid mapping
  const specs = product.specs || {
    "Brand": brand,
    "Category": product.category,
    "Subcategory": subcategory,
    "SKU": sku,
    "Materials": product.category === "Electronics" ? "Anodized Aluminum, Silicone" : "Organic Cotton Threading",
    "Warranty": "1 Year Manufacturer Protection",
    "Dispatch": "Ships within 24 Hours",
    "Origin": "Designed in India"
  };

  const keyFeatures = product.keyFeatures || [
    "Premium selected high-performance materials.",
    "Engineered and hand-crafted with ergonomic feedback.",
    "Eco-safe biodegradable packaging material.",
    "Seamless styling optimized for modern everyday workspaces."
  ];

  const whatsIncluded = product.whatsIncluded || [
    "1x " + product.name,
    "1x Protective Storage Bag",
    "1x Certificate of Premium Craftsmanship",
    "1x Quick Installation Manual"
  ];

  const handleWishlistToggle = () => {
    const userKey = currentUser?.uid ? currentUser.uid : 'guest';
    const wishlistKey = `aura_wishlist_${userKey}`;
    const wishlist = JSON.parse(localStorage.getItem(wishlistKey) || localStorage.getItem('aura_wishlist') || '[]');
    let updated;
    if (wishlist.includes(product.id)) {
      updated = wishlist.filter((id: string) => id !== product.id);
      setIsWishlisted(false);
    } else {
      updated = [...wishlist, product.id];
      setIsWishlisted(true);
    }
    localStorage.setItem(wishlistKey, JSON.stringify(updated));
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    if (!comment.trim()) {
      setReviewError("Please type a descriptive review.");
      return;
    }

    setIsSubmittingReview(true);
    setReviewError(null);

    const token = localStorage.getItem('aura_token');
    try {
      const url = editingReviewId 
        ? `/api/reviews/${editingReviewId}`
        : `/api/products/${product.id}/reviews`;
        
      const method = editingReviewId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: currentUser.uid,
          userName: currentUser.displayName,
          rating,
          comment,
          images: reviewImage ? [reviewImage] : []
        })
      });

      if (res.ok) {
        setComment('');
        setReviewImage('');
        setRating(5);
        setEditingReviewId(null);
        fetchReviews();
      } else {
        const data = await res.json();
        setReviewError(data.error || "Failed to post review");
      }
    } catch (err) {
      setReviewError("Connection failure. Try again.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleEditClick = (rev: Review) => {
    setEditingReviewId(rev.id);
    setComment(rev.comment);
    setRating(rev.rating);
    if (rev.images && rev.images.length > 0) {
      setReviewImage(rev.images[0]);
    }
    document.getElementById('review-form-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDeleteReview = async (revId: string) => {
    if (!confirm("Are you sure you want to delete your review?")) return;
    const token = localStorage.getItem('aura_token');
    try {
      const res = await fetch(`/api/reviews/${revId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        fetchReviews();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete review");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Zoom slider helper on hover
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomStyle({
      display: 'block',
      transform: 'scale(1.8)',
      left: `-${x * 0.8}%`,
      top: `-${y * 0.8}%`
    });
  };

  const handleMouseLeave = () => {
    setZoomStyle(prev => ({ ...prev, display: 'none' }));
  };

  // Star breakdown calculator
  const ratingBreakdown = [0, 0, 0, 0, 0]; // 5 to 1 star counts
  reviews.forEach(r => {
    const rounded = Math.round(r.rating);
    if (rounded >= 1 && rounded <= 5) {
      ratingBreakdown[5 - rounded]++;
    }
  });

  const totalCalculatedReviews = reviews.length || 1;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 animate-fade-in select-none">
      
      {/* Back navigation */}
      <div className="mb-6 flex justify-between items-center select-none">
        <button
          onClick={() => window.history.pushState({}, '', '/')}
          className="inline-flex items-center gap-1 text-xs font-bold text-neutral-500 hover:text-neutral-900 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Return to Catalog</span>
        </button>
        <span className="font-mono text-[10px] text-neutral-400">SKU: {sku}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        
        {/* Left Side: Product Gallery */}
        <div className="space-y-4">
          <div 
            className="aspect-square bg-neutral-50 rounded-2xl border border-neutral-100 overflow-hidden relative group"
          >
            <img
              src={images[activeImageIdx]}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80'; }}
              referrerPolicy="no-referrer"
            />
            
            {/* Carousel navigation controls inside gallery */}
            <button
              onClick={() => setActiveImageIdx(prev => (prev === 0 ? images.length - 1 : prev - 1))}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/90 hover:bg-white rounded-full shadow-md text-neutral-600 hover:text-neutral-900 transition-all opacity-0 group-hover:opacity-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setActiveImageIdx(prev => (prev === images.length - 1 ? 0 : prev + 1))}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/90 hover:bg-white rounded-full shadow-md text-neutral-600 hover:text-neutral-900 transition-all opacity-0 group-hover:opacity-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Thumbnails Row */}
          <div className="flex gap-3 justify-center">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImageIdx(idx)}
                className={`w-20 aspect-square rounded-xl overflow-hidden bg-neutral-50 border transition-all ${
                  idx === activeImageIdx 
                    ? 'border-indigo-600 ring-2 ring-indigo-50 shadow-sm scale-102' 
                    : 'border-neutral-100 hover:border-neutral-200'
                }`}
              >
                <img src={img} alt={`Angle ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Product details, specifications, purchasing */}
        <div className="space-y-6">
          
          {/* Header metadata */}
          <div>
            <div className="flex items-center gap-2 select-none">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                {product.category}
              </span>
              <span className="text-neutral-300">•</span>
              <span className="text-xs text-neutral-400 font-medium">{subcategory}</span>
            </div>

            <h1 className="mt-3 font-sans font-extrabold text-2xl sm:text-3xl text-neutral-950 tracking-tight leading-tight">
              {product.name}
            </h1>

            <div className="mt-1 text-xs text-neutral-400 font-medium">
              Brand: <span className="text-neutral-700 font-semibold">{brand}</span> | Sold by: <span className="text-neutral-700 font-semibold">{product.sellerName || "Aura Direct"}</span>
            </div>

            {/* Rating summary */}
            <div className="mt-4 flex items-center gap-2 select-none">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star 
                    key={star} 
                    className={`h-4 w-4 ${
                      star <= Math.round(product.rating) 
                        ? 'fill-amber-400 stroke-amber-400' 
                        : 'text-neutral-200'
                    }`} 
                  />
                ))}
              </div>
              <span className="text-xs font-bold text-neutral-800">{product.rating}</span>
              <span className="text-neutral-300">|</span>
              <span className="text-xs font-semibold text-neutral-500">{reviews.length || product.reviewsCount} verified reviews</span>
              <span className="text-neutral-300">|</span>
              <span className="text-xs font-bold text-emerald-600 font-mono bg-emerald-50 px-2 py-0.5 rounded uppercase">{soldCount}+ Sold</span>
            </div>
          </div>

          {/* Price details card */}
          <div className="bg-neutral-50/50 p-5 rounded-2xl border border-neutral-100 space-y-2">
            <div className="flex items-baseline gap-3">
              <span className="font-sans font-extrabold text-3xl text-neutral-950">
                {formatPriceVal(product.price)}
              </span>
              <span className="font-sans text-sm text-neutral-400 line-through">
                {formatPriceVal(originalPrice)}
              </span>
              <span className="text-xs font-bold font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase">
                {percentageOff}% OFF
              </span>
            </div>
            <div className="text-[10px] text-neutral-400 leading-none">
              Inclusive of all VAT and customized dispatch taxes for your country.
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {/* Quantity Selector */}
              {product.inventory > 0 && (
                <div className="flex items-center border border-neutral-200 rounded-xl bg-neutral-50 overflow-hidden h-12">
                  <button
                    onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                    className="px-4 hover:bg-neutral-100 font-sans font-bold text-neutral-600"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-sans font-semibold text-sm text-neutral-800">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(prev => Math.min(product.inventory, prev + 1))}
                    className="px-4 hover:bg-neutral-100 font-sans font-bold text-neutral-600"
                  >
                    +
                  </button>
                </div>
              )}

              {/* Wishlist Button */}
              <button
                onClick={handleWishlistToggle}
                className={`p-3.5 rounded-xl border transition-all ${
                  isWishlisted 
                    ? 'bg-rose-50 border-rose-100 text-rose-500' 
                    : 'bg-white border-neutral-200 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
                }`}
                title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
              >
                <Heart className={`h-5 w-5 ${isWishlisted ? 'fill-rose-500' : ''}`} />
              </button>
            </div>

            {/* Core Action triggers */}
            {product.inventory === 0 ? (
              <div className="py-3 bg-red-50 border border-red-100 rounded-xl text-center text-xs font-bold text-red-600 uppercase">
                Product Currently Out Of Stock
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => onAddToCart(product, quantity)}
                  className="w-full flex items-center justify-center gap-2 h-12 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all active:scale-98"
                >
                  <ShoppingBag className="h-4 w-4" />
                  <span>Add to Cart — {formatPriceVal(product.price * quantity)}</span>
                </button>
                <button
                  onClick={() => {
                    onAddToCart(product, quantity);
                    onTriggerCheckout();
                  }}
                  className="w-full flex items-center justify-center gap-2 h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all active:scale-98 cursor-pointer"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Buy Now Instantly</span>
                </button>
              </div>
            )}

            {/* Admin / Seller Delete Option */}
            {(currentUser?.role === 'admin' || currentUser?.role === 'seller' || onDeleteProduct) && (
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-all border border-red-100 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Product</span>
                </button>
              </div>
            )}
          </div>

          {/* Dynamic Payment methods */}
          <div className="border-t border-neutral-100 pt-5">
            <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <CreditCard className="h-4 w-4 text-neutral-400" />
              <span>Seller-Specific Payment Methods</span>
            </h4>
            <p className="text-[10px] text-indigo-600 font-medium mb-1">
              Offered by <strong>{sellerStoreName}</strong> ({sellerCountry})
            </p>
            <p className="text-[9px] text-neutral-400 mb-3">Click any method to pre-select it automatically during checkout, or choose later.</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {paymentMethods.map((method) => {
                // Find matching payment offer from seed data
                const offer = paymentOffers.find(o => o.method.toLowerCase() === method.toLowerCase());
                const isPromo = offer && offer.badge && offer.badge !== 'No Offer';
                const isSelected = preferredPayment.toLowerCase() === method.toLowerCase();

                return (
                  <button 
                    type="button"
                    key={method} 
                    onClick={() => handleSelectPaymentMethod(method)}
                    className={`p-2.5 rounded-xl border flex flex-col justify-between h-14 text-left transition-all relative ${
                      isSelected 
                        ? 'border-neutral-950 bg-neutral-950 text-white shadow-md scale-102 ring-2 ring-neutral-200' 
                        : isPromo 
                          ? 'border-indigo-100 bg-indigo-50/20 hover:border-indigo-300' 
                          : 'border-neutral-100 bg-white hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className={`text-[10px] font-bold ${isSelected ? 'text-white' : 'text-neutral-800'}`}>{method}</span>
                      {isSelected && (
                        <span className="text-[8px] font-bold uppercase px-1 bg-indigo-600 text-white rounded scale-90">Preferred</span>
                      )}
                    </div>
                    {isPromo ? (
                      <span className={`text-[9px] font-bold font-mono flex items-center gap-0.5 ${isSelected ? 'text-indigo-300' : 'text-indigo-600'}`}>
                        <Sparkles className="h-2.5 w-2.5" />
                        <span>{offer.badge}</span>
                      </span>
                    ) : (
                      <span className={`text-[9px] font-mono ${isSelected ? 'text-neutral-400' : 'text-neutral-400'}`}>
                        {isSelected ? 'Ready for Checkout' : 'No Active Offer'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Guarantee Badges */}
          <div className="grid grid-cols-3 gap-4 border-t border-b border-neutral-100 py-4 select-none">
            <div className="flex flex-col items-center text-center space-y-1">
              <Truck className="h-5 w-5 text-neutral-400" />
              <span className="text-[10px] font-bold text-neutral-800">Secure Dispatch</span>
              <span className="text-[8px] text-neutral-400">Tracked shipping</span>
            </div>
            <div className="flex flex-col items-center text-center space-y-1">
              <RotateCcw className="h-5 w-5 text-neutral-400" />
              <span className="text-[10px] font-bold text-neutral-800">Easy Returns</span>
              <span className="text-[8px] text-neutral-400">30-day window</span>
            </div>
            <div className="flex flex-col items-center text-center space-y-1">
              <Award className="h-5 w-5 text-neutral-400" />
              <span className="text-[10px] font-bold text-neutral-800">Quality Assured</span>
              <span className="text-[8px] text-neutral-400">Authentic certified</span>
            </div>
          </div>

        </div>
      </div>

      {/* Product Description details split-tab */}
      <div className="mt-16 pt-8 border-t border-neutral-100 grid grid-cols-1 lg:grid-cols-3 gap-12">
        
        {/* Core details */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h3 className="font-sans font-extrabold text-lg text-neutral-950 mb-3">Product Description</h3>
            <p className="text-sm text-neutral-600 leading-relaxed">{product.description}</p>
          </div>

          <div>
            <h4 className="font-sans font-bold text-sm text-neutral-900 mb-2">Key Features</h4>
            <ul className="space-y-1.5 text-xs text-neutral-600 list-disc pl-4">
              {keyFeatures.map((feat, idx) => (
                <li key={idx}>{feat}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-sans font-bold text-sm text-neutral-900 mb-2">What's Included</h4>
            <ul className="space-y-1.5 text-xs text-neutral-600 list-disc pl-4">
              {whatsIncluded.map((incl, idx) => (
                <li key={idx}>{incl}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Specifications Table */}
        <div className="bg-white border border-neutral-100 rounded-2xl p-6 shadow-sm h-fit">
          <h3 className="font-sans font-bold text-sm text-neutral-900 uppercase tracking-wider mb-4 border-b border-neutral-50 pb-2">Technical Specifications</h3>
          <div className="overflow-hidden rounded-xl border border-neutral-100 text-xs">
            <table className="w-full text-left border-collapse">
              <tbody className="divide-y divide-neutral-100">
                {Object.entries(specs).map(([key, val]) => (
                  <tr key={key} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="py-2.5 px-4 font-bold text-neutral-400 uppercase text-[9px] w-1/3 bg-neutral-50/50">{key}</td>
                    <td className="py-2.5 px-4 font-medium text-neutral-700">{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Similar products - 3 distinct categorized recommendation rows (2-5 rows requirement) */}
      <div className="mt-16 pt-8 border-t border-neutral-100 space-y-12 select-none">
        
        {/* Row 1: More from the same Category */}
        {similarProducts.length > 0 && (
          <div className="animate-fade-in">
            <h3 className="font-sans font-extrabold text-sm sm:text-base text-neutral-950 uppercase tracking-wider mb-4">
              More from the <span className="text-indigo-600">{product.category}</span> Collection
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {similarProducts.map(p => (
                <ProductCard
                  key={`sim-cat-${p.id}`}
                  product={p}
                  onAddToCart={(prod) => onAddToCart(prod, 1)}
                  onViewDetails={(prod) => {
                    onViewProduct(prod.id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  userCountry={userCountry}
                />
              ))}
            </div>
          </div>
        )}

        {/* Row 2: Customers Also Viewed (High-rated products) */}
        {customersAlsoViewed.length > 0 && (
          <div className="animate-fade-in">
            <h3 className="font-sans font-extrabold text-sm sm:text-base text-neutral-950 uppercase tracking-wider mb-4">
              Customers Also Viewed & Liked
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {customersAlsoViewed.map(p => (
                <ProductCard
                  key={`sim-viewed-${p.id}`}
                  product={p}
                  onAddToCart={(prod) => onAddToCart(prod, 1)}
                  onViewDetails={(prod) => {
                    onViewProduct(prod.id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  userCountry={userCountry}
                />
              ))}
            </div>
          </div>
        )}

        {/* Row 3: Budget Friendly Alternatives */}
        {budgetMatches.length > 0 && (
          <div className="animate-fade-in">
            <h3 className="font-sans font-extrabold text-sm sm:text-base text-neutral-950 uppercase tracking-wider mb-4">
              Budget Friendly Alternatives
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {budgetMatches.map(p => (
                <ProductCard
                  key={`sim-budget-${p.id}`}
                  product={p}
                  onAddToCart={(prod) => onAddToCart(prod, 1)}
                  onViewDetails={(prod) => {
                    onViewProduct(prod.id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  userCountry={userCountry}
                />
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Customer reviews and feedback loop */}
      <div className="mt-16 pt-8 border-t border-neutral-100 grid grid-cols-1 lg:grid-cols-3 gap-12 select-none">
        
        {/* Left Side: Rating summary breakdowns */}
        <div className="space-y-6">
          <h3 className="font-sans font-extrabold text-lg text-neutral-950">Customer Reviews</h3>
          
          <div className="flex items-center gap-4">
            <span className="font-sans font-extrabold text-5xl text-neutral-950">{product.rating}</span>
            <div>
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star 
                    key={star} 
                    className={`h-4.5 w-4.5 ${
                      star <= Math.round(product.rating) 
                        ? 'fill-amber-400 stroke-amber-400' 
                        : 'text-neutral-200'
                    }`} 
                  />
                ))}
              </div>
              <span className="text-xs text-neutral-400 font-medium">Based on {reviews.length || product.reviewsCount} reviews</span>
            </div>
          </div>

          {/* Rating Breakdown bars */}
          <div className="space-y-2 select-none">
            {ratingBreakdown.map((count, idx) => {
              const starLevel = 5 - idx;
              const percentage = Math.round((count / totalCalculatedReviews) * 100);

              return (
                <div key={starLevel} className="flex items-center gap-3 text-xs">
                  <span className="font-bold text-neutral-500 w-3 font-mono">{starLevel}</span>
                  <Star className="h-3.5 w-3.5 fill-amber-400 stroke-amber-400 flex-shrink-0" />
                  <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${percentage || 0}%` }} />
                  </div>
                  <span className="font-mono text-neutral-400 w-8 text-right">{percentage || 0}%</span>
                </div>
              );
            })}
          </div>

          {/* Write a Review section */}
          <div id="review-form-section" className="bg-neutral-50 p-5 rounded-2xl border border-neutral-100 space-y-4">
            <h4 className="font-sans font-bold text-xs text-neutral-800 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              <span>{editingReviewId ? "Revise Your Review" : "Write a Verified Review"}</span>
            </h4>

            {currentUser ? (
              <form onSubmit={handleReviewSubmit} className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-500">Your score:</span>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setRatingHover(star)}
                        onMouseLeave={() => setRatingHover(null)}
                        className="focus:outline-none transition-transform active:scale-125"
                      >
                        <Star 
                          className={`h-5 w-5 ${
                            star <= (ratingHover !== null ? ratingHover : rating)
                              ? 'fill-amber-400 stroke-amber-400' 
                              : 'text-neutral-300'
                          }`} 
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-bold text-neutral-500 uppercase tracking-[0.05em] block mb-1">Commentary</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Describe durability, styling accents, sizing fits..."
                    rows={3}
                    className="w-full text-xs p-3 border border-neutral-200 rounded-xl bg-white outline-none focus:border-neutral-900 resize-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-neutral-500 uppercase tracking-[0.05em] block mb-1">Image URL (Optional)</label>
                  <input
                    type="url"
                    value={reviewImage}
                    onChange={(e) => setReviewImage(e.target.value)}
                    placeholder="https://example.com/review-pic.jpg"
                    className="w-full text-xs p-2.5 border border-neutral-200 rounded-xl bg-white outline-none focus:border-neutral-900"
                  />
                </div>

                {reviewError && (
                  <div className="flex items-center gap-1.5 text-red-600 text-xs font-semibold">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{reviewError}</span>
                  </div>
                )}

                <div className="flex gap-2">
                  {editingReviewId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingReviewId(null);
                        setComment('');
                        setReviewImage('');
                        setRating(5);
                      }}
                      className="flex-1 py-2 bg-white border border-neutral-200 text-neutral-600 rounded-xl text-xs font-bold"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="flex-1 py-2 bg-neutral-950 text-white hover:bg-neutral-800 rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    {isSubmittingReview ? "Saving..." : editingReviewId ? "Save Review" : "Post Review"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-4">
                <p className="text-xs text-neutral-500 mb-2">Please log in to submit a verification review.</p>
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="text-xs font-bold text-indigo-600 hover:underline"
                >
                  Log In / Sign Up
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Reviews list */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-sans font-bold text-sm text-neutral-900 uppercase tracking-wider mb-2">Review Thread</h3>

          {isLoadingReviews ? (
            <div className="text-center py-12">
              <span className="text-xs text-neutral-400 font-mono animate-pulse">Retrieving review threads...</span>
            </div>
          ) : reviews.length === 0 ? (
            <p className="text-xs text-neutral-400 text-center py-12 border-2 border-dashed border-neutral-100 rounded-2xl bg-white">
              No reviews registered yet. Share your experience with our products first!
            </p>
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 no-scrollbar">
              {reviews.map((rev) => (
                <div key={rev.id} className="p-5 bg-white border border-neutral-100 rounded-2xl shadow-sm space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center font-bold text-neutral-700 text-xs border border-neutral-100">
                        {rev.userName ? rev.userName.slice(0, 2).toUpperCase() : "US"}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-neutral-800">{rev.userName || "Verified Customer"}</span>
                          <span className="text-[9px] font-bold text-emerald-600 font-mono bg-emerald-50 px-1.5 py-0.5 rounded uppercase flex items-center gap-0.5 select-none">
                            <CheckCircle className="h-2.5 w-2.5" />
                            <span>Verified</span>
                          </span>
                        </div>
                        <span className="font-mono text-[9px] text-neutral-400 block mt-0.5">{new Date(rev.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Delete / Edit icons for active user's own reviews */}
                    {currentUser && currentUser.uid === rev.userId && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditClick(rev)}
                          className="p-1 hover:bg-neutral-100 text-neutral-400 hover:text-neutral-900 rounded-lg transition-colors"
                          title="Edit Review"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteReview(rev.id)}
                          className="p-1 hover:bg-red-50 text-neutral-400 hover:text-red-600 rounded-lg transition-colors"
                          title="Delete Review"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Stars */}
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star} 
                        className={`h-3.5 w-3.5 ${
                          star <= rev.rating 
                            ? 'fill-amber-400 stroke-amber-400' 
                            : 'text-neutral-200'
                        }`} 
                      />
                    ))}
                  </div>

                  {/* Comment */}
                  <p className="text-xs text-neutral-600 leading-relaxed font-medium">
                    {rev.comment}
                  </p>

                  {/* Review Images */}
                  {rev.images && rev.images.length > 0 && (
                    <div className="flex gap-2 pt-1">
                      {rev.images.map((imgUrl, i) => (
                        <div key={i} className="w-20 aspect-square rounded-xl border border-neutral-100 overflow-hidden bg-neutral-50">
                          <img src={imgUrl} alt="Customer upload" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Product Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={showDeleteConfirm}
        product={product}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={async () => {
          if (!product) return;
          setIsDeleting(true);
          try {
            const token = localStorage.getItem('aura_token');
            const pId = product.id || (product as any)._id;
            const res = await fetch(`/api/products/${encodeURIComponent(pId)}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
              if (onDeleteProduct) onDeleteProduct(pId);
              setShowDeleteConfirm(false);
              onSelectTab('shop');
            } else {
              const data = await res.json();
              alert(data.error || "Failed to delete product");
            }
          } catch (e) {
            console.error(e);
          } finally {
            setIsDeleting(false);
          }
        }}
        isDeleting={isDeleting}
      />
    </div>
  );
}
