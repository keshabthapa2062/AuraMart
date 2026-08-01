import React from 'react';
import { Trash2, X, AlertTriangle } from 'lucide-react';
import { Product } from '../types';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  product: Product | null;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  isDeleting?: boolean;
}

export default function ConfirmDeleteModal({
  isOpen,
  product,
  onClose,
  onConfirm,
  isDeleting = false
}: ConfirmDeleteModalProps) {
  if (!isOpen || !product) return null;

  const productImage = Array.isArray(product.image) && product.image.length > 0 
    ? product.image[0] 
    : typeof product.image === 'string' 
      ? product.image 
      : 'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=800&auto=format&fit=crop&q=80';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div 
        id="confirm-delete-modal-panel"
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 sm:p-7 overflow-y-auto max-h-[90vh] my-auto border border-neutral-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isDeleting}
          className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-neutral-900 transition-colors rounded-xl hover:bg-neutral-100"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Warning Icon & Header */}
        <div className="flex items-center gap-3.5 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 border border-red-100 shrink-0">
            <Trash2 className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-neutral-900 tracking-tight">
              Delete Product
            </h3>
            <p className="text-xs font-medium text-red-600 flex items-center gap-1 mt-0.5">
              <AlertTriangle className="h-3 w-3" />
              <span>Permanent action</span>
            </p>
          </div>
        </div>

        {/* Product Details Box */}
        <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 flex items-center gap-3 mb-5">
          <img 
            src={productImage} 
            alt={product.name}
            className="h-12 w-12 rounded-lg object-cover border border-neutral-200 shrink-0 bg-white" 
          />
          <div className="min-w-0 flex-1">
            <p className="font-bold text-sm text-neutral-900 truncate">{product.name}</p>
            <p className="text-xs text-neutral-500 truncate">
              {product.brand || 'Brand'} • {product.category || 'Category'}
            </p>
          </div>
        </div>

        {/* Description Text */}
        <p className="text-sm text-neutral-600 leading-relaxed mb-6">
          Are you sure you want to delete <strong className="text-neutral-900 font-semibold">{product.name}</strong>? Click <span className="font-bold text-red-600">Yes</span> to permanently remove this item from the store as well as the database.
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-neutral-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl border border-neutral-200 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-sm font-bold text-white shadow-md shadow-red-200 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isDeleting ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                <span>Yes, Delete Product</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
