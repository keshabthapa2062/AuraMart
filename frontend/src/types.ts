export interface Product {
  id: string;
  _id?: string;
  name: string;
  description: string;
  price: number;
  image: string | string[];
  category: string;
  inventory: number;
  rating: number;
  reviewsCount: number;
  featured?: boolean;
  brand?: string;
  subcategory?: string;
  soldCount?: number;
  sku?: string;
  sellerId?: string;
  sellerName?: string;
  originalPrice?: number;
  specs?: Record<string, string>;
  keyFeatures?: string[];
  whatsIncluded?: string[];
  warranty?: string;
  returnPolicy?: string;
  shippingInfo?: string;
  tags?: string[];
  collections?: string[];
  availabilityRange?: 'india' | 'state' | 'city' | 'nearest';
  sellerPincode?: string;
  sellerCity?: string;
  sellerState?: string;
  createdAt?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface ShippingAddress {
  name: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface Order {
  id: string;
  userId: string;
  userEmail: string;
  items: CartItem[];
  total: number;
  originalTotal?: number;
  redeemedCoins?: number;
  earnedCoins?: number;
  offerDiscount?: number;
  appliedOffer?: string;
  status: 'Pending' | 'Processing' | 'Shipped' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
  paymentStatus?: string;
  isPaid?: boolean;
  deliveryOtp?: string;
  shippingAddress: any; // Allow relaxed shippingAddress structure
  createdAt: string;
  paymentMethod: string;
  transactionId: string;
  payouts?: Record<string, any>;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
  images?: string[];
  isVerified?: boolean;
}

export interface AuraCoinRecord {
  id: string;
  userId: string;
  userEmail: string;
  orderId?: string;
  type: 'earned' | 'redeemed' | 'bonus' | 'expired';
  coins: number;
  ratePercent?: number;
  status: 'pending' | 'active' | 'used' | 'expired' | 'canceled';
  createdAt: string;
  deliveredAt?: string;
  unlocksAt?: string;
  expiresAt?: string;
  description: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role?: 'admin' | 'customer' | 'seller' | 'delivery';
  shippingAddress?: ShippingAddress;
  walletBalance?: number;
  auraCoinsBalance?: number;
  pendingCoinsBalance?: number;
  wishlist?: string[];
  notifications?: { id: string; text: string; date: string; read: boolean }[];
  isSellerPending?: boolean;
  pincode?: string;
  city?: string;
  state?: string;
  sellerProfile?: {
    businessName: string;
    storeName: string;
    phone: string;
    email: string;
    country: string;
    state: string;
    city: string;
    pincode?: string;
    address: string;
    identityDocument: string;
    bankDetails: string;
    upi: string;
    taxInformation: string;
    storeLogo: string;
    description: string;
  };
}
