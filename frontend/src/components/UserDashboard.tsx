import React, { useState, useEffect } from 'react';
import { 
  User, 
  Package, 
  Heart, 
  ShoppingBag, 
  MapPin, 
  Wallet, 
  Coins,
  Ticket, 
  Bell, 
  MessageSquare, 
  Eye, 
  Settings, 
  Store, 
  Truck,
  HelpCircle, 
  LogOut, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Copy,
  Send,
  ShieldCheck,
  Phone,
  Globe,
  CreditCard
} from 'lucide-react';
import { UserProfile, Order, Product, Review, AuraCoinRecord } from '../types';
import ProductCard from './ProductCard';
import { formatCurrencyVal } from '../utils/currency';

// Inline Seller Registration Form component
function SellerRegistrationFormInline({
  currentUser,
  onSuccess
}: {
  currentUser: UserProfile;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = React.useState({
    businessName: '',
    storeName: '',
    phone: '',
    email: currentUser.email || '',
    country: 'India',
    state: '',
    city: '',
    pincode: '',
    address: '',
    identityDocument: '',
    bankDetails: '',
    upi: '',
    taxInformation: '',
    storeLogo: 'https://images.unsplash.com/photo-1472851294608-062f824d296e?w=150&auto=format&fit=crop&q=60',
    description: ''
  });

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const token = localStorage.getItem('aura_token');
    if (!token) {
      setError("You must be logged in to register as a seller.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/seller/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        onSuccess();
      } else {
        const err = await response.json();
        setError(err.error || "Failed to submit seller registration form.");
      }
    } catch (err) {
      setError("A connection error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="seller-registration" className="max-w-2xl mx-auto bg-white border border-neutral-100 rounded-2xl p-6 sm:p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-6 select-none">
        <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
          <Store className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-sans font-bold text-lg text-neutral-900 tracking-tight">Become an AuraMart Certified Seller</h2>
          <p className="text-xs text-neutral-400">Launch your boutique storefront on AuraMart's seller network.</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-xs flex items-center gap-2 border border-red-100 animate-fade-in">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 text-xs">
        <div>
          <h3 className="font-sans font-bold text-neutral-700 uppercase tracking-wider mb-3 pb-1 border-b border-neutral-50 flex items-center gap-1.5">
            <Store className="h-3.5 w-3.5 text-neutral-400" />
            <span>Storefront Profile</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-neutral-500 uppercase tracking-wider block mb-1">Store / Brand Name</label>
              <input
                type="text"
                required
                placeholder="E.g., Aero & Co."
                value={formData.storeName}
                onChange={e => setFormData({ ...formData, storeName: e.target.value })}
                className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none bg-neutral-50 focus:bg-white focus:border-neutral-900"
              />
            </div>
            <div>
              <label className="font-bold text-neutral-500 uppercase tracking-wider block mb-1">Legal Business Name</label>
              <input
                type="text"
                required
                placeholder="E.g., Aero Retail Pvt Ltd"
                value={formData.businessName}
                onChange={e => setFormData({ ...formData, businessName: e.target.value })}
                className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none bg-neutral-50 focus:bg-white focus:border-neutral-900"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="font-bold text-neutral-500 uppercase tracking-wider block mb-1">Store Description / Bio</label>
            <textarea
              required
              rows={2}
              placeholder="Tell our customers about your boutique items and brand story..."
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none bg-neutral-50 focus:bg-white focus:border-neutral-900 resize-none"
            />
          </div>
          <div className="mt-4">
            <label className="font-bold text-neutral-500 uppercase tracking-wider block mb-1">Store Logo URL</label>
            <input
              type="url"
              required
              placeholder="https://example.com/logo.png"
              value={formData.storeLogo}
              onChange={e => setFormData({ ...formData, storeLogo: e.target.value })}
              className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none bg-neutral-50 focus:bg-white focus:border-neutral-900"
            />
          </div>
        </div>

        <div>
          <h3 className="font-sans font-bold text-neutral-700 uppercase tracking-wider mb-3 pb-1 border-b border-neutral-50 flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 text-neutral-400" />
            <span>Contact Information</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-neutral-500 uppercase tracking-wider block mb-1">Support Email</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none bg-neutral-50 focus:bg-white"
              />
            </div>
            <div>
              <label className="font-bold text-neutral-500 uppercase tracking-wider block mb-1">Contact Phone</label>
              <input
                type="tel"
                required
                placeholder="+1 or +91..."
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none bg-neutral-50 focus:bg-white"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-sans font-bold text-neutral-700 uppercase tracking-wider mb-3 pb-1 border-b border-neutral-50 flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-neutral-400" />
            <span>HQ Location (India)</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="font-bold text-neutral-500 uppercase tracking-wider block mb-1">State / Region</label>
              <input
                type="text"
                required
                placeholder="E.g., Maharashtra"
                value={formData.state}
                onChange={e => setFormData({ ...formData, state: e.target.value })}
                className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none bg-neutral-50 focus:bg-white focus:border-neutral-900"
              />
            </div>
            <div>
              <label className="font-bold text-neutral-500 uppercase tracking-wider block mb-1">City</label>
              <input
                type="text"
                required
                placeholder="E.g., Mumbai"
                value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
                className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none bg-neutral-50 focus:bg-white focus:border-neutral-900"
              />
            </div>
            <div>
              <label className="font-bold text-neutral-500 uppercase tracking-wider block mb-1">6-Digit PIN Code</label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="E.g., 400001"
                value={formData.pincode}
                onChange={e => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, '') })}
                className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none bg-neutral-50 focus:bg-white focus:border-neutral-900 font-mono"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="font-bold text-neutral-500 uppercase tracking-wider block mb-1">Street Address</label>
            <input
              type="text"
              required
              placeholder="Full HQ warehouse or office physical address..."
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none bg-neutral-50"
            />
          </div>
        </div>

        <div>
          <h3 className="font-sans font-bold text-neutral-700 uppercase tracking-wider mb-3 pb-1 border-b border-neutral-50 flex items-center gap-1.5">
            <CreditCard className="h-3.5 w-3.5 text-neutral-400" />
            <span>Payout & Tax Details</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-neutral-500 uppercase tracking-wider block mb-1">Bank Account & IFSC / Routing</label>
              <input
                type="text"
                required
                placeholder="Bank Name, A/C #, IFSC Code"
                value={formData.bankDetails}
                onChange={e => setFormData({ ...formData, bankDetails: e.target.value })}
                className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none bg-neutral-50"
              />
            </div>
            <div>
              <label className="font-bold text-neutral-500 uppercase tracking-wider block mb-1">UPI ID (for payouts)</label>
              <input
                type="text"
                required
                placeholder="yourname@upi"
                value={formData.upi}
                onChange={e => setFormData({ ...formData, upi: e.target.value })}
                className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none bg-neutral-50"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="font-bold text-neutral-500 uppercase tracking-wider block mb-1">Identity Document Number (e.g. PAN / Aadhaar / Passport)</label>
              <input
                type="text"
                required
                placeholder="ID Document ID Number"
                value={formData.identityDocument}
                onChange={e => setFormData({ ...formData, identityDocument: e.target.value })}
                className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none bg-neutral-50"
              />
            </div>
            <div>
              <label className="font-bold text-neutral-500 uppercase tracking-wider block mb-1">Tax Identification Number (e.g. GSTIN / VAT / EIN)</label>
              <input
                type="text"
                required
                placeholder="TIN or Business License Code"
                value={formData.taxInformation}
                onChange={e => setFormData({ ...formData, taxInformation: e.target.value })}
                className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none bg-neutral-50"
              />
            </div>
          </div>
        </div>

        <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100 flex gap-3 select-none">
          <ShieldCheck className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-neutral-500 leading-relaxed">
            By submitting this form, you certify that all business registrations and credentials provided are legitimate. After Admin review, your buyer account will be granted full access to the seller terminal.
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 bg-neutral-950 text-white font-bold rounded-xl hover:bg-neutral-800 transition-all shadow-md flex items-center justify-center gap-2 text-xs"
        >
          <Send className="h-4 w-4" />
          <span>{isSubmitting ? "Submitting Registration Form..." : "Submit Seller Registration"}</span>
        </button>
      </form>
    </div>
  );
}

interface UserDashboardProps {
  currentUser: UserProfile;
  onLogout: () => void;
  onRefreshUser: () => void;
  products: Product[];
  onAddToCart: (product: Product, quantity?: number) => void;
  onSelectTab: (tab: 'shop' | 'orders' | 'admin' | 'dashboard' | 'seller' | 'delivery') => void;
  userCountry: string;
}

export default function UserDashboard({
  currentUser,
  onLogout,
  onRefreshUser,
  products,
  onAddToCart,
  onSelectTab,
  userCountry
}: UserDashboardProps) {
  const [activeSection, setActiveSection] = useState<string>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [wishlistItems, setWishlistItems] = useState<Product[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [myReviews, setMyReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  
  // Settings forms state
  const [displayName, setDisplayName] = useState(currentUser.displayName || '');
  const [profileImage, setProfileImage] = useState('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80');
  const [settingsStatus, setSettingsStatus] = useState<string | null>(null);

  // Addresses form state
  const [address, setAddress] = useState(currentUser.shippingAddress || {
    name: currentUser.displayName || '',
    street: '',
    city: '',
    postalCode: '',
    country: userCountry
  });
  const [addressStatus, setAddressStatus] = useState<string | null>(null);

  // Support form state
  const [supportForm, setSupportForm] = useState({ subject: '', message: '' });
  const [supportStatus, setSupportStatus] = useState<string | null>(null);

  // AuraCoins State
  const [auraCoinsData, setAuraCoinsData] = useState<{
    activeCoins: number;
    pendingCoins: number;
    redeemedCoins: number;
    expiredCoins: number;
    records: AuraCoinRecord[];
  }>({ activeCoins: 0, pendingCoins: 0, redeemedCoins: 0, expiredCoins: 0, records: [] });
  const [loadingCoins, setLoadingCoins] = useState(false);

  // Coupons data list
  const coupons = [
    { code: "AURA20", discount: "20% OFF", desc: "Valid on all electronic products", minOrder: "₹4,000" },
    { code: "FREESHIP", discount: "Free Delivery", desc: "No delivery fee on your order", minOrder: "None" },
    { code: "FESTIVE10", discount: "10% Cashback", desc: "Get 10% cashback directly to your wallet", minOrder: "₹8,000" }
  ];

  useEffect(() => {
    fetchUserOrders();
    fetchAuraCoins();
    loadWishlist();
    loadRecentlyViewed();
    loadNotifications();
    fetchUserReviews();
  }, [currentUser]);

  const fetchAuraCoins = async () => {
    if (!currentUser?.uid) return;
    setLoadingCoins(true);
    try {
      const res = await fetch(`/api/auracoins/user/${currentUser.uid}`);
      if (res.ok) {
        const data = await res.json();
        setAuraCoinsData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCoins(false);
    }
  };

  const fetchUserOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await fetch(`/api/orders/user/${currentUser.uid}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingOrders(false);
    }
  };

  const userKey = currentUser?.uid ? currentUser.uid : 'guest';

  const loadWishlist = () => {
    const list = JSON.parse(localStorage.getItem(`aura_wishlist_${userKey}`) || localStorage.getItem('aura_wishlist') || '[]');
    const items = products.filter(p => list.includes(p.id));
    setWishlistItems(items);
  };

  const loadRecentlyViewed = () => {
    const list = JSON.parse(localStorage.getItem(`aura_recently_viewed_${userKey}`) || localStorage.getItem('aura_recently_viewed') || '[]');
    const items = products.filter(p => list.includes(p.id));
    setRecentlyViewed(items);
  };

  const loadNotifications = () => {
    const saved = localStorage.getItem(`aura_notifications_${userKey}`);
    if (saved) {
      try {
        setNotifications(JSON.parse(saved));
        return;
      } catch (e) {}
    }
    // Generate simulated user notifications
    const mockNotes = [
      { id: '1', text: 'Welcome to your premium AuraMart member profile! Get started with coupon AURA10.', date: 'Just now', read: false },
      { id: '2', text: 'Secured payout credited to your active Auracoin rewards.', date: '1 day ago', read: true },
      { id: '3', text: 'System Update: AuraMart responsive platform v2.5 live.', date: '3 days ago', read: true }
    ];
    setNotifications(mockNotes);
  };

  const fetchUserReviews = async () => {
    setLoadingReviews(true);
    try {
      const res = await fetch(`/api/products`);
      if (res.ok) {
        const allProducts: Product[] = await res.json();
        const collectedReviews: any[] = [];
        
        for (const p of allProducts) {
          const rRes = await fetch(`/api/products/${p.id}/reviews`);
          if (rRes.ok) {
            const rData: Review[] = await rRes.json();
            const filtered = rData.filter(r => r.userId === currentUser.uid);
            filtered.forEach(r => {
              collectedReviews.push({
                ...r,
                product: p
              });
            });
          }
        }
        setMyReviews(collectedReviews);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleUpdateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressStatus(null);
    const token = localStorage.getItem('aura_token');
    try {
      const res = await fetch('/api/auth/address', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ shippingAddress: address })
      });
      if (res.ok) {
        setAddressStatus("Shipping address updated successfully.");
        onRefreshUser();
      } else {
        setAddressStatus("Failed to update shipping address.");
      }
    } catch (err) {
      setAddressStatus("Network failure. Try again.");
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsStatus(null);
    const token = localStorage.getItem('aura_token');
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ displayName })
      });
      if (res.ok) {
        setSettingsStatus("Profile updated successfully.");
        onRefreshUser();
      } else {
        setSettingsStatus("Failed to update profile settings.");
      }
    } catch (err) {
      setSettingsStatus("Network error. Try again.");
    }
  };

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSupportStatus("Support inquiry received. A customer care specialist will reach you via email within 12 hours.");
    setSupportForm({ subject: '', message: '' });
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    alert(`Copied coupon: ${code}`);
  };

  const formatCurrency = (val: number) => {
    return formatCurrencyVal(val, userCountry);
  };

  const sections = [
    { id: 'orders', name: 'Purchase Orders', icon: Package },
    { id: 'wishlist', name: 'Wishlist Catalog', icon: Heart },
    { id: 'cart', name: 'Active Cart', icon: ShoppingBag },
    { id: 'addresses', name: 'My Addresses', icon: MapPin },
    { id: 'wallet', name: 'Auracoin Rewards', icon: Coins },
    { id: 'coupons', name: 'Coupon Rewards', icon: Ticket },
    { id: 'notifications', name: 'Inbox Notifications', icon: Bell },
    { id: 'reviews', name: 'My Reviews', icon: MessageSquare },
    { id: 'recently', name: 'Recently Viewed', icon: Eye },
    { id: 'settings', name: 'Settings Details', icon: Settings },
    { id: 'seller', name: 'Become Seller', icon: Store },
    { id: 'support', name: 'Customer Care Support', icon: HelpCircle }
  ];

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 animate-fade-in select-none">
      
      {/* 1. Permanent Profile Overview Section (At First) */}
      <div className="bg-white border border-neutral-100 p-6 sm:p-8 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6 mb-6">
        <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
          <img src={profileImage} alt="User Avatar" className="h-20 w-20 rounded-full object-cover border-2 border-neutral-200 shrink-0" />
          <div className="space-y-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h2 className="font-sans font-extrabold text-xl text-neutral-900 tracking-tight">
                {currentUser.displayName || currentUser.email.split('@')[0]}
              </h2>
              <span className="inline-block px-2.5 py-0.5 bg-neutral-900 text-white rounded-md text-[9px] font-bold uppercase tracking-wider h-fit w-fit mx-auto sm:mx-0">
                {currentUser.role || 'customer'}
              </span>
            </div>
            <p className="text-xs text-neutral-400 font-mono">{currentUser.email}</p>
            <p className="text-[10px] text-neutral-400">Verified AuraMart Member</p>
          </div>
        </div>

        {/* Logout Button placed inside profile card */}
        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-all border border-red-200/60 shadow-xs shrink-0 active:scale-95 cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout Account</span>
        </button>
      </div>

      {/* Role-Specific Direct Access Banner */}
      {currentUser.role === 'admin' && (
        <div className="mb-6 p-4.5 rounded-2xl bg-neutral-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 text-white shrink-0">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm">System Administration Account</h4>
              <p className="text-xs text-neutral-300 mt-0.5">Manage platform products, incoming orders, and store configuration.</p>
            </div>
          </div>
          <button
            onClick={() => onSelectTab('admin')}
            className="px-4 py-2 rounded-xl bg-white text-neutral-950 hover:bg-neutral-100 font-extrabold text-xs transition-all shadow-sm shrink-0 cursor-pointer"
          >
            Access Admin Console &rarr;
          </button>
        </div>
      )}

      {currentUser.role === 'seller' && (
        <div className="mb-6 p-4.5 rounded-2xl bg-emerald-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 text-white shrink-0">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm">Verified Merchant Seller Account</h4>
              <p className="text-xs text-emerald-200 mt-0.5">Manage product listings, inventory levels, and store analytics.</p>
            </div>
          </div>
          <button
            onClick={() => onSelectTab('seller')}
            className="px-4 py-2 rounded-xl bg-white text-emerald-950 hover:bg-emerald-50 font-extrabold text-xs transition-all shadow-sm shrink-0 cursor-pointer"
          >
            Access Seller Dashboard &rarr;
          </button>
        </div>
      )}

      {(currentUser.role === 'delivery' || currentUser.email === 'deliveryboy@aura.com') && (
        <div className="mb-6 p-4.5 rounded-2xl bg-indigo-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 text-white shrink-0">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm">Delivery Logistics Partner</h4>
              <p className="text-xs text-indigo-200 mt-0.5">View assigned delivery runs, update shipping statuses, and track completed dropoffs.</p>
            </div>
          </div>
          <button
            onClick={() => onSelectTab('delivery')}
            className="px-4 py-2 rounded-xl bg-white text-indigo-950 hover:bg-indigo-50 font-extrabold text-xs transition-all shadow-sm shrink-0 cursor-pointer"
          >
            Access Delivery Hub &rarr;
          </button>
        </div>
      )}

      {/* 2. Key Stats Widgets Block */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <button 
          onClick={() => setActiveSection('wallet')}
          className={`bg-white border text-left p-5 rounded-2xl transition-all shadow-sm flex items-center justify-between group hover:border-amber-200 ${activeSection === 'wallet' ? 'border-amber-500 ring-1 ring-amber-500' : 'border-neutral-100'}`}
        >
          <div>
            <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider leading-none">AuraCoins Balance</p>
            <h3 className="font-sans font-extrabold text-xl text-neutral-900 mt-1.5">{auraCoinsData.activeCoins} Coins <span className="text-xs font-normal text-amber-600">(₹{auraCoinsData.activeCoins})</span></h3>
          </div>
          <Coins className={`h-7 w-7 transition-colors ${activeSection === 'wallet' ? 'text-amber-500' : 'text-amber-300 group-hover:text-amber-500'}`} />
        </button>

        <button 
          onClick={() => setActiveSection('orders')}
          className={`bg-white border text-left p-5 rounded-2xl transition-all shadow-sm flex items-center justify-between group hover:border-emerald-200 ${activeSection === 'orders' ? 'border-emerald-600 ring-1 ring-emerald-600' : 'border-neutral-100'}`}
        >
          <div>
            <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider leading-none">Completed Orders</p>
            <h3 className="font-sans font-extrabold text-xl text-neutral-900 mt-1.5">{orders.filter(o => o.status === 'Delivered').length} orders</h3>
          </div>
          <Package className={`h-7 w-7 transition-colors ${activeSection === 'orders' ? 'text-emerald-600' : 'text-neutral-300 group-hover:text-emerald-500'}`} />
        </button>

        <button 
          onClick={() => setActiveSection('wishlist')}
          className={`bg-white border text-left p-5 rounded-2xl transition-all shadow-sm flex items-center justify-between group hover:border-rose-200 ${activeSection === 'wishlist' ? 'border-rose-600 ring-1 ring-rose-600' : 'border-neutral-100'}`}
        >
          <div>
            <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider leading-none">Wishlist Items</p>
            <h3 className="font-sans font-extrabold text-xl text-neutral-900 mt-1.5">{wishlistItems.length} products</h3>
          </div>
          <Heart className={`h-7 w-7 transition-colors ${activeSection === 'wishlist' ? 'text-rose-500' : 'text-neutral-300 group-hover:text-rose-500'}`} />
        </button>
      </div>

      {/* 3. Navigation Links Grid (Below) */}
      <div className="mb-8">
        <h3 className="text-[10px] font-bold font-mono text-neutral-400 uppercase tracking-widest mb-3">
          Dashboard Service Console
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {sections.map((sec) => {
            const IconComp = sec.icon;
            let badge = null;
            if (sec.id === 'notifications') {
              badge = notifications.filter(n => !n.read).length;
            } else if (sec.id === 'wishlist') {
              badge = wishlistItems.length;
            } else if (sec.id === 'orders') {
              badge = orders.length;
            }

            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={`flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold tracking-tight transition-all text-left select-none border ${
                  activeSection === sec.id
                    ? 'bg-neutral-950 border-neutral-950 text-white shadow-sm'
                    : 'bg-white border-neutral-100 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <IconComp className="h-4 w-4" />
                  <span>{sec.name}</span>
                </div>
                {badge !== null && badge > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full font-mono text-[9px] font-bold ${activeSection === sec.id ? 'bg-indigo-600 text-white' : 'bg-neutral-100 text-neutral-600'}`}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Active Interactive Workspace Area */}
      <div className="bg-white border border-neutral-100 p-6 sm:p-8 rounded-2xl shadow-sm min-h-[400px]">
        {/* Section: Orders tracker */}
        {activeSection === 'orders' && (
          <div className="space-y-4">
            <h2 className="font-sans font-extrabold text-base text-neutral-950 mb-2">Purchase Orders history</h2>
            {loadingOrders ? (
              <div className="text-center py-12">
                <span className="text-xs text-neutral-400 font-mono animate-pulse">Syncing checkout ledger...</span>
              </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-neutral-100 bg-white rounded-2xl">
                  <ShoppingBag className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
                  <p className="font-bold text-sm text-neutral-800">No active orders placed</p>
                  <p className="text-xs text-neutral-400 max-w-xs mx-auto mt-1">Once you complete a checkout session, transaction details appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="bg-white border border-neutral-100 p-5 rounded-2xl shadow-sm space-y-4">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <p className="font-mono text-xs font-bold text-neutral-800 uppercase">{order.transactionId || order.id.slice(0, 8).toUpperCase()}</p>
                          <p className="text-[10px] text-neutral-400 font-mono mt-0.5">{new Date(order.createdAt).toLocaleDateString()}</p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${
                          order.status === 'Delivered' 
                            ? 'bg-emerald-50 text-emerald-700' 
                            : order.status === 'Shipped' 
                              ? 'bg-indigo-50 text-indigo-700' 
                              : order.status === 'Processing' 
                                ? 'bg-amber-50 text-amber-700' 
                                : 'bg-neutral-100 text-neutral-700'
                        }`}>
                          {order.status}
                        </span>
                      </div>

                      {/* Purchased items list */}
                      <div className="space-y-2 border-t border-b border-neutral-50 py-3">
                        {order.items.map((item, i) => (
                          <div key={i} className="flex justify-between text-xs font-semibold text-neutral-700">
                            <span>{item.quantity}x {item.product.name}</span>
                            <span className="font-mono">{formatCurrencyVal(item.product.price * item.quantity)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-neutral-400 uppercase tracking-wider text-[9px]">Paid sum</span>
                        <span className="text-neutral-900 text-sm font-mono">{formatCurrencyVal(order.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section: Wishlist Catalog */}
          {activeSection === 'wishlist' && (
            <div>
              <h2 className="font-sans font-extrabold text-base text-neutral-950 mb-4">Saved wishlist items</h2>
              {wishlistItems.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-neutral-100 bg-white rounded-2xl">
                  <Heart className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
                  <p className="font-bold text-sm text-neutral-800">Your wishlist is empty</p>
                  <p className="text-xs text-neutral-400 max-w-xs mx-auto mt-1">Click the heart button on any product details page to save it here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {wishlistItems.map(p => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      onAddToCart={onAddToCart}
                      onViewDetails={(prod) => window.history.pushState({}, '', `/product/${prod.id}`)}
                      userCountry={userCountry}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section: Active Cart */}
          {activeSection === 'cart' && (
            <div className="bg-white border border-neutral-100 p-6 rounded-2xl shadow-sm text-center py-12 space-y-4">
              <ShoppingBag className="h-12 w-12 text-neutral-300 mx-auto" />
              <h3 className="font-sans font-bold text-base text-neutral-900">Your shopping cart</h3>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">Manage your active basket anytime from the floating Cart drawer in the navigation bar.</p>
              <button
                onClick={() => onSelectTab('shop')}
                className="px-6 py-2.5 bg-neutral-950 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold"
              >
                Go to Catalog Shop
              </button>
            </div>
          )}

          {/* Section: Addresses */}
          {activeSection === 'addresses' && (
            <div className="bg-white border border-neutral-100 p-6 sm:p-8 rounded-2xl shadow-sm">
              <h2 className="font-sans font-bold text-base text-neutral-950 mb-6 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-neutral-400" />
                <span>Shipping Destination Address</span>
              </h2>

              {addressStatus && (
                <div className="mb-6 p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs flex items-center gap-1.5 border border-emerald-100">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{addressStatus}</span>
                </div>
              )}

              <form onSubmit={handleUpdateAddress} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-neutral-500 uppercase tracking-wider block mb-1">Receiver Name</label>
                  <input
                    type="text"
                    required
                    value={address.name}
                    onChange={e => setAddress({ ...address, name: e.target.value })}
                    className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none bg-neutral-50"
                  />
                </div>
                <div>
                  <label className="font-bold text-neutral-500 uppercase tracking-wider block mb-1">Street Address</label>
                  <input
                    type="text"
                    required
                    value={address.street}
                    onChange={e => setAddress({ ...address, street: e.target.value })}
                    className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none bg-neutral-50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-neutral-500 uppercase tracking-wider block mb-1">City / Region</label>
                    <input
                      type="text"
                      required
                      value={address.city}
                      onChange={e => setAddress({ ...address, city: e.target.value })}
                      className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none bg-neutral-50"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-neutral-500 uppercase tracking-wider block mb-1">Postal / ZIP Code</label>
                    <input
                      type="text"
                      required
                      value={address.postalCode}
                      onChange={e => setAddress({ ...address, postalCode: e.target.value })}
                      className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none bg-neutral-50"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-bold text-neutral-500 uppercase tracking-wider block mb-1">Country</label>
                  <input
                    type="text"
                    required
                    value={address.country}
                    onChange={e => setAddress({ ...address, country: e.target.value })}
                    className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none bg-neutral-50"
                  />
                </div>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-neutral-950 text-white font-bold rounded-xl text-xs"
                >
                  Save Address Change
                </button>
              </form>
            </div>
          )}

          {/* Section: Auracoins Rewards */}
          {activeSection === 'wallet' && (
            <div className="space-y-6 animate-fade-in">
              {/* Premium Gold & Amber Card */}
              <div className="bg-gradient-to-br from-amber-950 via-neutral-900 to-amber-900 text-white p-6 sm:p-8 rounded-3xl relative overflow-hidden select-none shadow-xl border border-amber-800/40">
                <div className="absolute right-0 bottom-0 translate-x-10 translate-y-10 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-widest text-amber-300/80 flex items-center gap-1">
                      <Coins className="h-3 w-3 text-amber-400" />
                      Auracoin Rewards Wallet
                    </span>
                    <div className="mt-3 flex items-baseline gap-2">
                      <h3 className="font-sans font-extrabold text-3xl sm:text-4xl text-amber-400 tracking-tight">
                        {auraCoinsData.activeCoins} <span className="text-sm font-semibold text-amber-200">Coins</span>
                      </h3>
                      <span className="text-xs text-amber-200/70 font-mono">(1 Coin = ₹1)</span>
                    </div>
                  </div>
                  <div className="h-12 w-12 bg-amber-500/20 border border-amber-500/30 rounded-2xl flex items-center justify-center font-bold text-amber-300">
                    <Coins className="h-6 w-6" />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-amber-800/40 text-xs">
                  <div>
                    <p className="text-[10px] text-amber-300/60 uppercase tracking-wider font-mono">Pending Cashback</p>
                    <p className="font-bold text-amber-200 text-sm mt-0.5">+{auraCoinsData.pendingCoins} Coins</p>
                    <p className="text-[9px] text-amber-300/50">Unlocks on delivery</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-amber-300/60 uppercase tracking-wider font-mono">Total Redeemed</p>
                    <p className="font-bold text-emerald-300 text-sm mt-0.5">₹{auraCoinsData.redeemedCoins}</p>
                    <p className="text-[9px] text-emerald-300/50">Instant checkout discount</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-amber-300/60 uppercase tracking-wider font-mono">Validity Window</p>
                    <p className="font-bold text-amber-200 text-sm mt-0.5">90 Days</p>
                    <p className="text-[9px] text-amber-300/50">Expires in 3 months</p>
                  </div>
                </div>

                <p className="mt-6 font-mono text-[10px] text-amber-400/60">Account Holder: {currentUser.displayName || currentUser.email}</p>
              </div>

              {/* Rules & Policy Box */}
              <div className="bg-amber-50/70 border border-amber-200/70 p-5 rounded-2xl">
                <h4 className="font-sans font-bold text-xs text-amber-950 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Coins className="h-4 w-4 text-amber-600" />
                  Auracoin Earning & Usage Terms
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-amber-900/90 mt-3">
                  <div className="flex items-start gap-2 bg-white/80 p-3 rounded-xl border border-amber-100">
                    <span className="font-bold text-amber-600">1.</span>
                    <p>Earn <strong>3% to 5%</strong> cashback as Auracoins on every successfully completed product purchase.</p>
                  </div>
                  <div className="flex items-start gap-2 bg-white/80 p-3 rounded-xl border border-amber-100">
                    <span className="font-bold text-amber-600">2.</span>
                    <p>Coins remain <strong>Pending</strong> during shipping and unlock automatically when status updates to <strong>Delivered</strong>.</p>
                  </div>
                  <div className="flex items-start gap-2 bg-white/80 p-3 rounded-xl border border-amber-100">
                    <span className="font-bold text-amber-600">3.</span>
                    <p>Redeem coins at checkout for instant discount: <strong>1 Auracoin = ₹1</strong> (Up to 3-10% of product price, capped at ₹100 max).</p>
                  </div>
                  <div className="flex items-start gap-2 bg-white/80 p-3 rounded-xl border border-amber-100">
                    <span className="font-bold text-amber-600">4.</span>
                    <p>Each credited Auracoin remains active for <strong>3 months (90 days)</strong> before auto-expiration.</p>
                  </div>
                </div>
              </div>

              {/* Transaction Ledger */}
              <div className="bg-white border border-neutral-100 p-5 rounded-2xl shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-sans font-bold text-xs text-neutral-800 uppercase tracking-wider">Auracoin Activity Ledger</h4>
                  <button onClick={fetchAuraCoins} className="text-[10px] font-bold text-amber-600 hover:text-amber-700">
                    Refresh Ledger
                  </button>
                </div>

                {loadingCoins ? (
                  <p className="text-xs text-neutral-400 py-4 text-center font-mono">Loading transaction records...</p>
                ) : auraCoinsData.records && auraCoinsData.records.length > 0 ? (
                  <div className="divide-y divide-neutral-100 text-xs">
                    {auraCoinsData.records.map((record) => (
                      <div key={record.id} className="py-3 flex justify-between items-center">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${
                              record.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                              record.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                              record.status === 'redeemed' ? 'bg-blue-100 text-blue-800' :
                              'bg-neutral-100 text-neutral-600'
                            }`}>
                              {record.status}
                            </span>
                            <p className="font-bold text-neutral-900">{record.description}</p>
                          </div>
                          <p className="text-[10px] text-neutral-400 font-mono">
                            {new Date(record.createdAt).toLocaleDateString()} {record.orderId ? `• Order: #${record.orderId.slice(-6)}` : ''}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className={`font-mono font-bold text-sm ${
                            record.type === 'earned' ? 'text-emerald-600' :
                            record.type === 'redeemed' ? 'text-blue-600' :
                            'text-neutral-400'
                          }`}>
                            {record.type === 'earned' ? `+${record.amount}` : `-${record.amount}`} Coins
                          </span>
                          {record.expiresAt && record.status === 'active' && (
                            <p className="text-[9px] text-neutral-400 font-mono">
                              Expires: {new Date(record.expiresAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-neutral-400">
                    <Coins className="h-8 w-8 mx-auto text-amber-200 mb-2" />
                    <p className="text-xs font-medium">No Auracoin transactions yet</p>
                    <p className="text-[10px] text-neutral-400 mt-0.5">Place an order to earn your first Auracoin cashback rewards!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section: Coupons */}
          {activeSection === 'coupons' && (
            <div className="space-y-4">
              <h2 className="font-sans font-extrabold text-base text-neutral-950 mb-2">My Coupon Rewards</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {coupons.map((coupon) => (
                  <div key={coupon.code} className="bg-white border border-dashed border-neutral-200 p-5 rounded-2xl flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-bold font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase">{coupon.discount}</span>
                      <h4 className="font-sans font-bold text-sm text-neutral-900 mt-2">{coupon.code}</h4>
                      <p className="text-[10px] text-neutral-400 mt-1">{coupon.desc}</p>
                    </div>
                    <button
                      onClick={() => handleCopy(coupon.code)}
                      className="p-2 bg-neutral-50 hover:bg-neutral-100 rounded-lg text-neutral-600 transition-colors"
                      title="Copy Code"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Notifications */}
          {activeSection === 'notifications' && (
            <div className="space-y-4">
              <h2 className="font-sans font-extrabold text-base text-neutral-950 mb-2">My Inbox notifications</h2>
              <div className="space-y-3">
                {notifications.map((note) => (
                  <div key={note.id} className="bg-white border border-neutral-100 p-4 rounded-xl flex gap-3 shadow-sm">
                    <div className="h-2 w-2 rounded-full bg-indigo-600 flex-shrink-0 mt-2 animate-pulse" style={note.read ? { display: 'none' } : {}} />
                    <div className="flex-1">
                      <p className="text-xs text-neutral-700 leading-relaxed font-semibold">{note.text}</p>
                      <span className="text-[9px] text-neutral-400 font-mono block mt-1">{note.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Reviews */}
          {activeSection === 'reviews' && (
            <div className="space-y-4">
              <h2 className="font-sans font-extrabold text-base text-neutral-950 mb-2">My verified product reviews</h2>
              {loadingReviews ? (
                <div className="text-center py-12">
                  <span className="text-xs text-neutral-400 font-mono animate-pulse">Syncing review threads...</span>
                </div>
              ) : myReviews.length === 0 ? (
                <p className="text-xs text-neutral-400 text-center py-12 bg-white border border-dashed border-neutral-100 rounded-2xl">
                  You have not published any product reviews yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {myReviews.map((rev) => (
                    <div key={rev.id} className="bg-white border border-neutral-100 p-4 rounded-xl space-y-2 shadow-sm">
                      <div className="flex justify-between items-start">
                        <h4 className="font-sans font-bold text-xs text-neutral-900">{rev.product?.name}</h4>
                        <span className="text-[10px] text-neutral-400 font-mono">{new Date(rev.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`h-3 w-3 ${s <= rev.rating ? 'fill-amber-400 stroke-amber-400' : 'text-neutral-200'}`} />
                        ))}
                      </div>
                      <p className="text-xs text-neutral-600 font-medium">{rev.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section: Recently Viewed */}
          {activeSection === 'recently' && (
            <div>
              <h2 className="font-sans font-extrabold text-base text-neutral-950 mb-4">Recently Viewed Products</h2>
              {recentlyViewed.length === 0 ? (
                <p className="text-xs text-neutral-400 text-center py-12 bg-white border border-dashed border-neutral-100 rounded-2xl">
                  You haven't viewed any product details page yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recentlyViewed.map(p => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      onAddToCart={onAddToCart}
                      onViewDetails={(prod) => window.history.pushState({}, '', `/product/${prod.id}`)}
                      userCountry={userCountry}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section: Settings */}
          {activeSection === 'settings' && (
            <div className="bg-white border border-neutral-100 p-6 sm:p-8 rounded-2xl shadow-sm">
              <h2 className="font-sans font-bold text-base text-neutral-950 mb-6 flex items-center gap-2">
                <Settings className="h-5 w-5 text-neutral-400 animate-spin-slow" />
                <span>Profile Command Settings</span>
              </h2>

              {settingsStatus && (
                <div className="mb-6 p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs flex items-center gap-1.5 border border-emerald-100 animate-fade-in">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{settingsStatus}</span>
                </div>
              )}

              <form onSubmit={handleUpdateSettings} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-neutral-500 uppercase tracking-wider block mb-1">Display Name</label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none bg-neutral-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-neutral-500 uppercase tracking-wider block mb-1">Email Address (Read-only)</label>
                  <input
                    type="email"
                    disabled
                    value={currentUser.email}
                    className="w-full p-2.5 border border-neutral-200 rounded-lg bg-neutral-100 text-neutral-400 cursor-not-allowed outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-neutral-500 uppercase tracking-wider block mb-1">Avatar Image URL</label>
                  <input
                    type="url"
                    value={profileImage}
                    onChange={e => setProfileImage(e.target.value)}
                    className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none bg-neutral-50 focus:bg-white"
                  />
                </div>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-neutral-950 text-white font-bold rounded-xl text-xs"
                >
                  Save Settings
                </button>
              </form>
            </div>
          )}

          {/* Section: Become Seller */}
          {activeSection === 'seller' && (
            <div>
              {currentUser.role === 'seller' ? (
                <div className="bg-white border border-neutral-100 p-6 sm:p-8 rounded-2xl shadow-sm text-center py-12 space-y-4">
                  <Store className="h-12 w-12 text-indigo-600 mx-auto" />
                  <h3 className="font-sans font-bold text-base text-neutral-900">You are an active seller!</h3>
                  <p className="text-xs text-neutral-400 max-w-sm mx-auto">Open your powerful seller terminal anytime using the navbar button or click below.</p>
                  <button
                    onClick={() => onSelectTab('seller')}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md"
                  >
                    Enter Seller Terminal Dashboard
                  </button>
                </div>
              ) : currentUser.isSellerPending ? (
                <div className="bg-white border border-neutral-100 p-6 sm:p-8 rounded-2xl shadow-sm text-center py-12 space-y-4 select-none">
                  <Clock className="h-12 w-12 text-amber-500 mx-auto animate-pulse" />
                  <h3 className="font-sans font-bold text-base text-neutral-900">Application Under Review</h3>
                  <p className="text-xs text-neutral-400 max-w-sm mx-auto">Our security and administrative staff is verifying your business and tax registrations. Check back soon!</p>
                </div>
              ) : (
                <SellerRegistrationFormInline
                  currentUser={currentUser}
                  onSuccess={() => {
                    onRefreshUser();
                    alert("Your application was submitted successfully and is pending review!");
                  }}
                />
              )}
            </div>
          )}

          {/* Section: Support */}
          {activeSection === 'support' && (
            <div className="bg-white border border-neutral-100 p-6 sm:p-8 rounded-2xl shadow-sm">
              <h2 className="font-sans font-bold text-base text-neutral-950 mb-6 flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-neutral-400" />
                <span>Aura Customer care Desk</span>
              </h2>

              {supportStatus && (
                <div className="mb-6 p-4 bg-indigo-50 text-indigo-700 rounded-xl text-xs flex items-center gap-1.5 border border-indigo-100">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  <span>{supportStatus}</span>
                </div>
              )}

              <form onSubmit={handleSupportSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-neutral-500 uppercase tracking-wider block mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    placeholder="E.g., Query regarding payout or tracking delivery ID"
                    value={supportForm.subject}
                    onChange={e => setSupportForm({ ...supportForm, subject: e.target.value })}
                    className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none bg-neutral-50"
                  />
                </div>
                <div>
                  <label className="font-bold text-neutral-500 uppercase tracking-wider block mb-1">Detailed Message</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Type your query in detail..."
                    value={supportForm.message}
                    onChange={e => setSupportForm({ ...supportForm, message: e.target.value })}
                    className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none bg-neutral-50 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-neutral-950 text-white font-bold rounded-xl text-xs"
                >
                  Send Support Ticket
                </button>
              </form>
            </div>
          )}

      </div>

    </div>
  );
}
