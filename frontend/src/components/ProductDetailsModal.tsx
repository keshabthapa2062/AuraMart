import React, { useState, useEffect } from 'react';
import { X, Star, ShoppingBag, MessageSquare, AlertCircle, Sparkles, MapPin, Store, Truck, ShieldCheck, Trash2 } from 'lucide-react';
import { Product, Review, UserProfile } from '../types';
import { formatCurrencyVal } from '../utils/currency';
import { checkDeliverability } from '../utils/deliverability';
import ConfirmDeleteModal from './ConfirmDeleteModal';

interface ProductDetailsModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (p: Product, quantity: number) => void;
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  userCountry: string;
  userPincode?: string;
  userCity?: string;
  userState?: string;
  onDeleteProduct?: (p: Product) => void;
}

export default function ProductDetailsModal({
  product,
  onClose,
  onAddToCart,
  currentUser,
  onOpenAuth,
  userCountry,
  userPincode = '110001',
  userCity = 'New Delhi',
  userState = 'Delhi',
  onDeleteProduct
}: ProductDetailsModalProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [ratingHover, setRatingHover] = useState<number | null>(null);

  // Delete modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (product) {
      fetchReviews();
      setQuantity(1);
      setComment('');
      setRating(5);
      setReviewError(null);
    }
  }, [product]);

  const fetchReviews = async () => {
    if (!product) return;
    setIsLoadingReviews(true);
    try {
      const response = await fetch(`/api/products/${product.id}/reviews`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data);
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setIsLoadingReviews(false);
    }
  };

  if (!product) return null;

  const isOutOfStock = product.inventory === 0;
  const deliv = checkDeliverability(product, userPincode, userCity, userState);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    if (!comment.trim()) {
      setReviewError("Please write a comment.");
      return;
    }

    setIsSubmitting(true);
    setReviewError(null);

    try {
      const response = await fetch(`/api/products/${product.id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUser.uid,
          userName: currentUser.displayName || currentUser.email.split('@')[0],
          rating,
          comment
        })
      });

      if (response.ok) {
        const newReview = await response.json();
        setReviews(prev => [newReview, ...prev]);
        setComment('');
        setRating(5);
      } else {
        const err = await response.json();
        setReviewError(err.error || "Failed to submit review");
      }
    } catch (error) {
      setReviewError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div 
        id="product-details-modal"
        className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 text-neutral-400 hover:text-neutral-900 bg-white/80 hover:bg-white rounded-full shadow-sm transition-all"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Left Side: Product Image */}
        <div className="w-full md:w-1/2 bg-neutral-50 relative aspect-square md:aspect-auto flex items-center justify-center">
          <img
            src={Array.isArray(product.image) ? product.image[0] : product.image}
            alt={product.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Right Side: Content Scrollable container */}
        <div className="w-full md:w-1/2 p-6 sm:p-8 overflow-y-auto max-h-[50vh] md:max-h-[90vh] flex flex-col justify-between">
          <div>
            {/* Header / Category */}
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
              {product.category}
            </span>

            <h2 className="mt-4 font-sans font-bold text-xl sm:text-2xl text-neutral-900 tracking-tight leading-tight">
              {product.name}
            </h2>

            {/* Rating Summary */}
            <div className="mt-3 flex items-center gap-2">
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
              <span className="font-sans text-sm font-semibold text-neutral-800">
                {product.rating}
              </span>
              <span className="text-neutral-300">|</span>
              <span className="text-xs text-neutral-500">
                {reviews.length || product.reviewsCount} verified reviews
              </span>
            </div>

            {/* Price & Stock */}
            <div className="mt-5 flex items-baseline gap-4">
              <span className="font-sans font-bold text-xl text-neutral-950">
                {formatCurrencyVal(product.price, userCountry)}
              </span>
              {isOutOfStock ? (
                <span className="text-xs font-bold font-mono text-red-600 bg-red-50 px-2 py-0.5 rounded uppercase">
                  Out Of Stock
                </span>
              ) : (
                <span className="text-xs font-bold font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase">
                  {product.inventory} available in inventory
                </span>
              )}
            </div>

            {/* Seller & Deliverability Card */}
            <div className="mt-5 p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/70 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-semibold text-neutral-800">
                  <Store className="h-4 w-4 text-indigo-600" />
                  <span>Seller: {product.sellerName || 'Aura Partner Store'}</span>
                </span>
                <span className="text-neutral-500 font-mono text-[11px]">
                  📍 {product.sellerCity || 'New Delhi'} ({product.sellerPincode || '110001'})
                </span>
              </div>

              {/* Deliverability Status */}
              <div className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                deliv.isDeliverable 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}>
                {deliv.isDeliverable ? (
                  <Truck className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <MapPin className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="font-bold flex items-center justify-between">
                    <span>{deliv.badgeText}</span>
                    <span className="font-mono text-[10px] opacity-75">Destination: {userPincode}</span>
                  </div>
                  <p className="text-[11px] mt-0.5 opacity-90">
                    {deliv.isDeliverable ? deliv.deliveryEst : deliv.reason}
                  </p>
                </div>
              </div>
            </div>

            {/* Description */}
            <p className="mt-5 text-sm text-neutral-600 leading-relaxed">
              {product.description}
            </p>

            {/* Quantity Selector & Add to Cart */}
            {!isOutOfStock && (
              <div className="mt-6">
                <div className="flex items-center gap-4">
                  <div className="flex items-center border border-neutral-200 rounded-xl bg-neutral-50 overflow-hidden h-11">
                    <button
                      onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                      disabled={!deliv.isDeliverable}
                      className="px-3.5 hover:bg-neutral-100 font-sans font-bold text-neutral-600 disabled:opacity-40"
                    >
                      -
                    </button>
                    <span className="w-10 text-center font-sans font-semibold text-sm text-neutral-800">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(prev => Math.min(product.inventory, prev + 1))}
                      disabled={!deliv.isDeliverable}
                      className="px-3.5 hover:bg-neutral-100 font-sans font-bold text-neutral-600 disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      if (!deliv.isDeliverable) return;
                      onAddToCart(product, quantity);
                      onClose();
                    }}
                    disabled={!deliv.isDeliverable}
                    className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-semibold transition-all shadow-sm active:scale-98 ${
                      deliv.isDeliverable 
                        ? 'bg-neutral-900 text-white hover:bg-neutral-800' 
                        : 'bg-neutral-200 text-neutral-500 cursor-not-allowed border border-neutral-300'
                    }`}
                  >
                    <ShoppingBag className="h-4 w-4" />
                    <span>
                      {deliv.isDeliverable 
                        ? `Add — ${formatCurrencyVal(product.price * quantity, userCountry)}` 
                        : `Not Deliverable to ${userPincode}`}
                    </span>
                  </button>
                </div>
                {!deliv.isDeliverable && (
                  <p className="mt-2 text-center text-xs text-red-600 font-medium">
                    ⚠️ Delivery restricted to seller zone ({product.sellerCity || 'seller region'}). Please update your delivery pincode in the top bar to a nearby location.
                  </p>
                )}

                {/* Admin/Seller Delete Product Action */}
                {(currentUser?.role === 'admin' || currentUser?.role === 'seller' || onDeleteProduct) && (
                  <div className="mt-3 pt-3 border-t border-neutral-100 flex justify-end">
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete Product</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Reviews Panel */}
          <div className="mt-8 pt-6 border-t border-neutral-100">
            <h3 className="font-sans font-semibold text-sm text-neutral-900 flex items-center gap-2 mb-4">
              <MessageSquare className="h-4 w-4 text-neutral-400" />
              <span>Customer Experience</span>
            </h3>

            {/* Add Review Section */}
            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 mb-6">
              <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wide mb-3 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-indigo-500" />
                <span>Share your experience</span>
              </h4>

              {currentUser ? (
                <form onSubmit={handleReviewSubmit} className="space-y-3">
                  {/* Rating Selector */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-neutral-500 mr-1">Your rating:</span>
                    <div className="flex items-center">
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

                  {/* Comment Input */}
                  <div>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Write your review here... How was the quality? Did it arrive quickly?"
                      rows={2}
                      className="w-full text-xs p-2.5 bg-white border border-neutral-200 rounded-lg outline-none focus:border-neutral-900 resize-none"
                    />
                  </div>

                  {reviewError && (
                    <div className="flex items-center gap-1.5 text-red-600 text-xs font-medium">
                      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{reviewError}</span>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 text-xs bg-neutral-900 text-white font-bold rounded-lg hover:bg-neutral-800 transition-colors shadow-sm"
                    >
                      {isSubmitting ? "Posting..." : "Submit Review"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-2">
                  <p className="text-xs text-neutral-500 mb-2">
                    Please log in to submit a verification review.
                  </p>
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

            {/* List of Reviews */}
            {isLoadingReviews ? (
              <div className="flex justify-center py-4">
                <span className="text-xs text-neutral-400 font-mono animate-pulse">Loading reviews...</span>
              </div>
            ) : reviews.length === 0 ? (
              <p className="text-xs text-neutral-400 text-center py-4">
                No reviews yet. Be the first to express your thoughts!
              </p>
            ) : (
              <div className="space-y-4 max-h-[30vh] overflow-y-auto pr-1">
                {reviews.map((rev) => (
                  <div key={rev.id} className="border-b border-neutral-50 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-neutral-800">
                        {rev.userName}
                      </span>
                      <span className="font-mono text-[9px] text-neutral-400">
                        {new Date(rev.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {/* Stars */}
                    <div className="flex items-center my-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          className={`h-3 w-3 ${
                            star <= rev.rating 
                              ? 'fill-amber-400 stroke-amber-400' 
                              : 'text-neutral-200'
                          }`} 
                        />
                      ))}
                    </div>
                    <p className="text-xs text-neutral-600 mt-0.5">
                      {rev.comment}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Product Confirmation Popup */}
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
              if (onDeleteProduct) onDeleteProduct(product);
              setShowDeleteConfirm(false);
              onClose();
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
