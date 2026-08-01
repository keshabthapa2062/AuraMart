import React, { useState, useEffect } from 'react';
import { CATEGORIES_DATA, getSubcategoriesForCategory } from '../data/categories';
import { 
  Store, 
  Settings, 
  ShoppingBag, 
  TrendingUp, 
  Package, 
  BarChart3, 
  CreditCard, 
  Truck, 
  RefreshCcw, 
  MessageSquare, 
  HelpCircle,
  Plus,
  Trash2,
  Edit,
  Check,
  AlertCircle,
  ArrowRight,
  Send,
  Users,
  DollarSign,
  Clock,
  ShieldAlert,
  Upload,
  X
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  AreaChart, 
  Area 
} from 'recharts';
import { UserProfile, Product, Order } from '../types';
import { formatCurrencyVal } from '../utils/currency';
import { getProductImageUrl, handleImageError } from '../utils/image';
import ConfirmDeleteModal from './ConfirmDeleteModal';

interface SellerDashboardProps {
  currentUser: UserProfile;
  products: Product[];
  onRefreshProducts: () => void;
  onRefreshUser: () => void;
  userCountry: string;
}

export default function SellerDashboard({
  currentUser,
  products,
  onRefreshProducts,
  onRefreshUser,
  userCountry
}: SellerDashboardProps) {
  const [activeSection, setActiveSection] = useState<string>('home');
  const [sellerProducts, setSellerProducts] = useState<Product[]>([]);
  const [sellerOrders, setSellerOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  
  // Delete Product Modal state
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);
  
  // Create / Edit Product Form State
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    category: 'Electronics',
    subcategory: '',
    price: 0,
    inventory: 10,
    image: '',
    brand: currentUser.sellerProfile?.storeName || 'Aura Certified',
    description: '',
    keyFeaturesStr: '',
    originalPrice: 0,
    specsStr: 'Brand: Aura',
    availabilityRange: 'india'
  });
  const [productImages, setProductImages] = useState<string[]>([]);
  const [newImageUrlInput, setNewImageUrlInput] = useState('');

  const handleDeviceImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const availableSlots = 10 - productImages.length;
    if (availableSlots <= 0) {
      alert("Maximum 10 images allowed per product.");
      return;
    }
    const filesToRead = files.slice(0, availableSlots);
    filesToRead.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setProductImages(prev => {
            if (prev.length >= 10) return prev;
            return [...prev, event.target!.result as string];
          });
        }
      };
      reader.readAsDataURL(file as Blob);
    });
  };

  const handleAddImageUrl = () => {
    if (!newImageUrlInput.trim()) return;
    if (productImages.length >= 10) {
      alert("Maximum 10 images allowed per product.");
      return;
    }
    setProductImages(prev => [...prev, newImageUrlInput.trim()]);
    setNewImageUrlInput('');
  };
  const [productFormError, setProductFormError] = useState<string | null>(null);
  const [productFormSuccess, setProductFormSuccess] = useState<string | null>(null);

  // Store Settings Form State
  const [storeSettings, setStoreSettings] = useState({
    storeName: currentUser.sellerProfile?.storeName || '',
    description: currentUser.sellerProfile?.description || '',
    storeLogo: currentUser.sellerProfile?.storeLogo || '',
    upi: currentUser.sellerProfile?.upi || '',
    address: currentUser.sellerProfile?.address || '',
    bankDetails: currentUser.sellerProfile?.bankDetails || '',
    phone: currentUser.sellerProfile?.phone || ''
  });
  const [settingsStatus, setSettingsStatus] = useState<string | null>(null);

  // Simulated Chat State
  const [chatMessages, setChatMessages] = useState<any[]>([
    { id: 1, sender: 'customer', name: 'Kabir Dev', text: 'Hi, is this premium audio headset compatible with standard Type-C inputs?', time: '2 mins ago' }
  ]);
  const [typedMessage, setTypedMessage] = useState('');

  // Shipping & Return state
  const [shippingRate, setShippingRate] = useState('Free Shipping');
  const [dispatchTime, setDispatchTime] = useState('Within 24 Hours');
  const [returnDays, setReturnDays] = useState('30 Days easy replacement');

  useEffect(() => {
    // Filter products belonging to this seller
    const filtered = products.filter(p => p.sellerId === currentUser.uid);
    setSellerProducts(filtered);
    fetchSellerOrders();
  }, [products, currentUser]);

  const fetchSellerOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const allOrders: Order[] = await res.json();
        const collected: any[] = [];
        
        allOrders.forEach(ord => {
          ord.items.forEach(item => {
            if (item.product.sellerId === currentUser.uid) {
              const orderPayouts = ord.payouts || {};
              const myPayout = orderPayouts[currentUser.uid] || null;

              collected.push({
                orderId: ord.id,
                transactionId: ord.transactionId,
                userEmail: ord.userEmail,
                product: item.product,
                quantity: item.quantity,
                total: item.product.price * item.quantity,
                status: ord.status,
                shippingAddress: ord.shippingAddress,
                createdAt: ord.createdAt,
                payout: myPayout
              });
            }
          });
        });
        setSellerOrders(collected);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleUpdateSellerOrderStatus = async (orderId: string, newStatus: string) => {
    const token = localStorage.getItem('aura_token');
    if (!token) return;
    try {
      const res = await fetch(`/api/seller/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchSellerOrders();
        alert("Fulfillment delivery status successfully synchronized!");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update delivery status");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStoreSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsStatus(null);
    const token = localStorage.getItem('aura_token');
    try {
      const res = await fetch('/api/seller/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(storeSettings)
      });
      if (res.ok) {
        setSettingsStatus("Storefront profile settings updated successfully.");
        onRefreshUser();
      } else {
        setSettingsStatus("Failed to update storefront settings.");
      }
    } catch (err) {
      setSettingsStatus("Connection error. Try again.");
    }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProductFormError(null);
    setProductFormSuccess(null);

    if (productImages.length < 1) {
      setProductFormError("Minimum 1 photo is required per product.");
      return;
    }
    if (productImages.length > 10) {
      setProductFormError("Maximum 10 photos allowed per product.");
      return;
    }

    const token = localStorage.getItem('aura_token');
    const url = isEditingProduct 
      ? `/api/seller/products/${editProductId}`
      : '/api/seller/products';
    const method = isEditingProduct ? 'PATCH' : 'POST';

    const payload = {
      ...productForm,
      image: productImages.length === 1 ? productImages[0] : productImages
    };

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setProductFormSuccess(isEditingProduct ? "Listing updated successfully!" : "Listing published successfully!");
        setProductForm({
          name: '',
          category: 'Electronics',
          subcategory: '',
          price: 0,
          inventory: 10,
          image: '',
          brand: currentUser.sellerProfile?.storeName || 'Aura Certified',
          description: '',
          keyFeaturesStr: '',
          originalPrice: 0,
          specsStr: 'Brand: Aura',
          availabilityRange: 'india'
        });
        setProductImages([]);
        setIsEditingProduct(false);
        setEditProductId(null);
        onRefreshProducts();
      } else {
        setProductFormError(data.error || "Failed to save product details.");
      }
    } catch (err) {
      setProductFormError("Connection error while listing product.");
    }
  };

  const handleEditProductClick = (p: Product) => {
    setIsEditingProduct(true);
    setEditProductId(p.id);
    const existingImgs = Array.isArray(p.image) ? p.image : (p.image ? [p.image] : []);
    setProductImages(existingImgs);
    setProductForm({
      name: p.name,
      category: p.category,
      subcategory: p.subcategory || '',
      price: p.price,
      inventory: p.inventory || 10,
      image: Array.isArray(p.image) ? p.image[0] : p.image,
      brand: p.brand || currentUser.sellerProfile?.storeName || 'Aura Certified',
      description: p.description,
      keyFeaturesStr: p.keyFeatures ? p.keyFeatures.join('\n') : '',
      originalPrice: p.originalPrice || p.price,
      specsStr: p.specs ? Object.entries(p.specs).map(([k, v]) => `${k}: ${v}`).join('\n') : 'Brand: Aura',
      availabilityRange: p.availabilityRange || 'india'
    });
    setActiveSection('manage');
  };

  const handleDeleteProductClick = (productOrId: Product | string) => {
    if (typeof productOrId === 'string') {
      const found = products.find(p => (p.id || (p as any)._id) === productOrId) || sellerProducts.find(p => (p.id || (p as any)._id) === productOrId);
      if (found) {
        setProductToDelete(found);
      } else {
        setProductToDelete({ id: productOrId, name: 'Selected Listing' } as any);
      }
    } else {
      setProductToDelete(productOrId);
    }
  };

  const executeDeleteProduct = async () => {
    if (!productToDelete) return;
    const pId = productToDelete.id || (productToDelete as any)._id;
    if (!pId || pId === 'undefined') return;

    setIsDeletingProduct(true);
    const token = localStorage.getItem('aura_token');
    try {
      const res = await fetch(`/api/seller/products/${encodeURIComponent(pId)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        setSellerProducts(prev => prev.filter(p => (p.id || (p as any)._id) !== pId));
        onRefreshProducts();
        setProductToDelete(null);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete listing.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeletingProduct(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim()) return;
    const newMsg = {
      id: chatMessages.length + 1,
      sender: 'seller',
      name: currentUser.sellerProfile?.storeName || 'Store Manager',
      text: typedMessage,
      time: 'Just now'
    };
    setChatMessages([...chatMessages, newMsg]);
    setTypedMessage('');
  };

  // Compute Unique Buyers dynamic list
  const buyerMap: Record<string, any> = {};
  sellerOrders.forEach(so => {
    const email = so.userEmail;
    if (!buyerMap[email]) {
      buyerMap[email] = {
        email,
        name: so.shippingAddress?.name || "Customer",
        phone: so.shippingAddress?.phone || "N/A",
        address: `${so.shippingAddress?.addressLine || ''}, ${so.shippingAddress?.city || ''}, ${so.shippingAddress?.country || ''}`,
        totalSpent: 0,
        ordersCount: 0,
        lastPurchase: so.createdAt
      };
    }
    buyerMap[email].totalSpent += so.total;
    buyerMap[email].ordersCount += 1;
    if (new Date(so.createdAt) > new Date(buyerMap[email].lastPurchase)) {
      buyerMap[email].lastPurchase = so.createdAt;
    }
  });
  const uniqueBuyers = Object.values(buyerMap);

  // Compute total sales metrics
  const totalGrossRevenue = sellerOrders.reduce((acc, curr) => acc + curr.total, 0);
  const platformFee = Number((totalGrossRevenue * 0.10).toFixed(2));
  const taxesAmount = Number((totalGrossRevenue * 0.05).toFixed(2));
  const bankCharges = Number((totalGrossRevenue * 0.02).toFixed(2));
  const netEarnings = Number((totalGrossRevenue - platformFee - taxesAmount - bankCharges).toFixed(2));

  let disbursedEarnings = 0;
  let outstandingPayout = 0;

  sellerOrders.forEach(so => {
    if (so.payout) {
      if (so.payout.status === 'Paid') {
        disbursedEarnings += Number(so.payout.net || 0);
      } else {
        outstandingPayout += Number(so.payout.net || 0);
      }
    } else {
      // fallback if payouts was missing
      outstandingPayout += Number((so.total * 0.83).toFixed(2));
    }
  });

  // Recharts Data
  const salesByProductData = sellerProducts.slice(0, 5).map(prod => {
    const ordersForProd = sellerOrders.filter(so => so.product.id === prod.id);
    const revenue = ordersForProd.reduce((sum, o) => sum + o.total, 0);
    return {
      name: prod.name.substring(0, 10) + '...',
      Sales: revenue,
      Stock: prod.inventory || 0
    };
  });

  const areaChartData = sellerOrders.slice(-8).map((o, index) => ({
    name: `Ord #${index+1}`,
    Revenue: o.total,
    Payout: o.payout ? o.payout.net : (o.total * 0.83)
  }));

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-neutral-50">
      
      {/* Sidebar navigation */}
      <div className="w-full md:w-64 bg-neutral-900 text-white shrink-0">
        <div className="p-6 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <img
              src={currentUser.sellerProfile?.storeLogo || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=100&auto=format&fit=crop&q=80"}
              alt="Logo"
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-xl object-cover bg-neutral-800"
            />
            <div>
              <h2 className="font-sans font-black text-sm tracking-tight text-neutral-100 line-clamp-1">
                {currentUser.sellerProfile?.storeName || "Aura Merchant"}
              </h2>
              <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded text-[9px] font-mono font-bold tracking-wider uppercase block mt-0.5 w-max">
                VERIFIED SELLER
              </span>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="p-4 space-y-1 text-xs font-bold">
          <button
            onClick={() => setActiveSection('home')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
              activeSection === 'home' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
            }`}
          >
            <Store className="h-4 w-4" />
            <span>Merchant Overview</span>
          </button>
          <button
            onClick={() => setActiveSection('products')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
              activeSection === 'products' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
            }`}
          >
            <Package className="h-4 w-4" />
            <span>My Inventory ({sellerProducts.length})</span>
          </button>
          <button
            onClick={() => setActiveSection('manage')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
              activeSection === 'manage' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
            }`}
          >
            <Plus className="h-4 w-4" />
            <span>List New Product</span>
          </button>
          <button
            onClick={() => setActiveSection('orders')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
              activeSection === 'orders' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Store Deliveries ({sellerOrders.length})</span>
          </button>
          <button
            onClick={() => setActiveSection('buyers')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
              activeSection === 'buyers' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Buyer Directory ({uniqueBuyers.length})</span>
          </button>
          <button
            onClick={() => setActiveSection('reports')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
              activeSection === 'reports' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Revenue & Reports</span>
          </button>
          <div className="pt-4 pb-2 px-4 text-[10px] font-black tracking-widest text-neutral-500 uppercase">Configuration</div>
          <button
            onClick={() => setActiveSection('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
              activeSection === 'settings' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
            }`}
          >
            <Settings className="h-4 w-4" />
            <span>Storefront Settings</span>
          </button>
          <button
            onClick={() => setActiveSection('shipping')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
              activeSection === 'shipping' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
            }`}
          >
            <Truck className="h-4 w-4" />
            <span>Shipping Policy</span>
          </button>
          <button
            onClick={() => setActiveSection('returns')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
              activeSection === 'returns' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
            }`}
          >
            <RefreshCcw className="h-4 w-4" />
            <span>Returns & Refunds</span>
          </button>
          <button
            onClick={() => setActiveSection('chat')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer relative ${
              activeSection === 'chat' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>Buyer Live Chat</span>
            <span className="absolute right-3 h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
          </button>
          <button
            onClick={() => setActiveSection('support')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
              activeSection === 'support' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
            }`}
          >
            <HelpCircle className="h-4 w-4" />
            <span>Help Desk Support</span>
          </button>
        </nav>
      </div>

      {/* Main dashboard body */}
      <div className="flex-1 p-6 md:p-10">
        
        {/* Banner with alert if payment details are missing */}
        {(!currentUser.sellerProfile?.upi || !currentUser.sellerProfile?.bankDetails) && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-900 rounded-2xl flex items-start gap-3.5 text-xs shadow-sm">
            <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold">Payout Information Incomplete</h4>
              <p className="text-red-700 mt-0.5 font-medium">
                Please configure your UPI Address and bank accounts in the <strong>Storefront Settings</strong> tab to receive disbursed funds from Aura administration.
              </p>
            </div>
            <button 
              onClick={() => setActiveSection('settings')}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors ml-auto shrink-0"
            >
              Configure
            </button>
          </div>
        )}

        <div className="w-full px-4 sm:px-6 lg:px-8 space-y-8">
          
          {/* Section: Home */}
          {activeSection === 'home' && (
            <div className="space-y-8 animate-fade-in text-xs">
              
              {/* Header metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 border border-neutral-100 rounded-2xl shadow-sm">
                  <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">My Gross Sales</h4>
                  <p className="text-2xl font-black font-sans text-neutral-900 font-mono">
                    {formatCurrencyVal(totalGrossRevenue, userCountry)}
                  </p>
                  <p className="text-[9px] text-neutral-400 mt-1">Total orders volume checked out</p>
                </div>
                <div className="bg-white p-5 border border-neutral-100 rounded-2xl shadow-sm">
                  <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">My Net Earnings (83%)</h4>
                  <p className="text-2xl font-black font-sans text-indigo-600 font-mono">
                    {formatCurrencyVal(netEarnings, userCountry)}
                  </p>
                  <p className="text-[9px] text-indigo-500 mt-1">Deducted 17% platform & escrow fees</p>
                </div>
                <div className="bg-white p-5 border border-neutral-100 rounded-2xl shadow-sm">
                  <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Disbursed (Settled)</h4>
                  <p className="text-2xl font-black font-sans text-emerald-600 font-mono">
                    {formatCurrencyVal(disbursedEarnings, userCountry)}
                  </p>
                  <p className="text-[9px] text-emerald-600 mt-1">Transferred by Admin to your Bank/UPI</p>
                </div>
                <div className="bg-white p-5 border border-neutral-100 rounded-2xl shadow-sm bg-amber-50/20 border-amber-100">
                  <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Pending Payout</h4>
                  <p className="text-2xl font-black font-sans text-amber-700 font-mono">
                    {formatCurrencyVal(outstandingPayout, userCountry)}
                  </p>
                  <p className="text-[9px] text-amber-600 mt-1">Awaiting admin transaction release</p>
                </div>
              </div>

              {/* Middle analytics visualization layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Orders Overview */}
                <div className="bg-white border border-neutral-100 p-6 rounded-2xl shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-sans font-bold text-xs text-neutral-800 uppercase tracking-wider">Pipeline Deliveries</h4>
                    <button onClick={() => setActiveSection('orders')} className="text-indigo-600 font-bold hover:underline flex items-center gap-1">
                      <span>View All</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                  {sellerOrders.length === 0 ? (
                    <p className="text-xs text-neutral-400 text-center py-10">Your store has not processed any customer orders yet.</p>
                  ) : (
                    <div className="divide-y divide-neutral-100">
                      {sellerOrders.slice(0, 4).map((o, idx) => (
                        <div key={idx} className="py-3.5 flex justify-between items-center gap-4">
                          <div>
                            <p className="font-bold text-neutral-900">{o.product.name} (x{o.quantity})</p>
                            <p className="text-[10px] text-neutral-400 font-mono">Customer: {o.userEmail} • {new Date(o.createdAt).toLocaleDateString()}</p>
                          </div>
                          <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${
                            o.status === 'Delivered' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                              : o.status === 'Shipped' 
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' 
                              : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}>
                            {o.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick product stock overview */}
                <div className="bg-white border border-neutral-100 p-6 rounded-2xl shadow-sm">
                  <h4 className="font-sans font-bold text-xs text-neutral-800 uppercase tracking-wider mb-4">Product Stock Levels</h4>
                  <div className="h-60">
                    {salesByProductData.length === 0 ? (
                      <p className="text-xs text-neutral-400 text-center py-10">No stock levels graphics available.</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={salesByProductData}>
                          <XAxis dataKey="name" fontSize={9} axisLine={false} tickLine={false} />
                          <YAxis fontSize={9} axisLine={false} tickLine={false} />
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: '10px' }} />
                          <Bar dataKey="Stock" fill="#6366f1" name="Units in Stock" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section: My Products (Inventory Table) */}
          {activeSection === 'products' && (
            <div className="bg-white border border-neutral-100 p-6 rounded-2xl shadow-sm animate-fade-in text-xs">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-neutral-100 pb-4">
                <div>
                  <h3 className="font-sans font-bold text-neutral-950 text-base">Store Catalog & Stocklevels</h3>
                  <p className="text-xs text-neutral-500">Listed products on active sale. Modify prices, description, specs, or check catalog status.</p>
                </div>
                <button
                  onClick={() => setActiveSection('manage')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl shadow transition-colors flex items-center gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  <span>List New Product</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 text-neutral-400 font-bold border-b border-neutral-100 uppercase tracking-wider">
                      <th className="p-4">Listing</th>
                      <th className="p-4">Category</th>
                      <th className="p-4 text-right">Price</th>
                      <th className="p-4 text-center">Stock units</th>
                      <th className="p-4 pr-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {sellerProducts.map(p => (
                      <tr key={p.id} className="hover:bg-neutral-50/50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={getProductImageUrl(p.image)}
                              alt={p.name}
                              referrerPolicy="no-referrer"
                              onError={handleImageError}
                              className="w-10 h-10 rounded-lg object-cover bg-neutral-100 border"
                            />
                            <div>
                              <div className="font-bold text-neutral-950 text-sm">{p.name}</div>
                              <div className="text-[10px] text-neutral-400 font-mono mt-0.5">{p.id || p._id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 font-medium text-neutral-600">{p.category}</td>
                        <td className="p-4 text-right font-black text-neutral-900 font-mono">
                          {formatCurrencyVal(p.price, userCountry)}
                        </td>
                        <td className="p-4 text-center">
                          {(p.inventory || 0) === 0 ? (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded">Out of Stock</span>
                          ) : (p.inventory || 0) < 5 ? (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded">Only {p.inventory} units</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded">{p.inventory} In stock</span>
                          )}
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEditProductClick(p)}
                              className="p-1.5 hover:bg-neutral-100 rounded text-neutral-600 transition-colors"
                              title="Edit Listing"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProductClick(p.id || p._id)}
                              className="p-1.5 hover:bg-red-50 rounded text-red-600 transition-colors"
                              title="Delete Listing"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {sellerProducts.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center p-8 text-neutral-400">You have no listed products currently.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section: List/Edit Product Form */}
          {activeSection === 'manage' && (
            <div className="bg-white border border-neutral-100 p-6 sm:p-8 rounded-2xl shadow-sm animate-fade-in text-xs">
              <h3 className="font-sans font-bold text-base text-neutral-950 mb-4 flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-neutral-400" />
                <span>{isEditingProduct ? "Modify Active Listing Details" : "Register New Product Listing"}</span>
              </h3>

              {productFormError && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4" />
                  <span>{productFormError}</span>
                </div>
              )}

              {productFormSuccess && (
                <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl text-xs flex items-center gap-1.5 animate-fade-in">
                  <Check className="h-4 w-4" />
                  <span>{productFormSuccess}</span>
                </div>
              )}

              <form onSubmit={handleProductSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-neutral-500 uppercase tracking-wider block mb-1">Product Title</label>
                    <input
                      type="text"
                      required
                      value={productForm.name}
                      onChange={e => setProductForm({ ...productForm, name: e.target.value })}
                      placeholder="E.g., Anodized Space headphones"
                      className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none bg-neutral-50"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-neutral-500 uppercase tracking-wider block mb-1">Main Category</label>
                    <select
                      value={productForm.category}
                      onChange={e => {
                        const newCat = e.target.value;
                        const subs = getSubcategoriesForCategory(newCat);
                        setProductForm({ 
                          ...productForm, 
                          category: newCat,
                          subcategory: subs.length > 0 ? subs[0] : ''
                        });
                      }}
                      className="w-full p-2.5 border border-neutral-200 rounded-lg bg-neutral-50 outline-none text-xs font-semibold"
                    >
                      {CATEGORIES_DATA.map(cat => (
                        <option key={cat.name} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-neutral-500 uppercase tracking-wider block mb-1">Subcategory</label>
                    <select
                      value={productForm.subcategory}
                      onChange={e => setProductForm({ ...productForm, subcategory: e.target.value })}
                      className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none bg-neutral-50 text-xs font-semibold"
                    >
                      <option value="">None / General</option>
                      {getSubcategoriesForCategory(productForm.category).map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-neutral-500 uppercase tracking-wider block mb-1">Manufacturer Brand</label>
                    <input
                      type="text"
                      required
                      value={productForm.brand}
                      onChange={e => setProductForm({ ...productForm, brand: e.target.value })}
                      placeholder="E.g., Sony, Aura Craft"
                      className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none bg-neutral-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="font-bold text-neutral-500 uppercase tracking-wider block mb-1">Price (INR ₹)</label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      required
                      value={productForm.price || ''}
                      onChange={e => setProductForm({ ...productForm, price: parseFloat(e.target.value) })}
                      className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none bg-neutral-50"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-neutral-500 uppercase tracking-wider block mb-1">Original Price / MSRP (INR ₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      required
                      value={productForm.originalPrice || ''}
                      onChange={e => setProductForm({ ...productForm, originalPrice: parseFloat(e.target.value) })}
                      placeholder="Optional"
                      className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none bg-neutral-50"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-neutral-500 uppercase tracking-wider block mb-1">Initial Stock Units</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={productForm.inventory}
                      onChange={e => setProductForm({ ...productForm, inventory: parseInt(e.target.value) })}
                      className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none bg-neutral-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-neutral-500 uppercase tracking-wider block mb-1">Product Availability Zone</label>
                    <select
                      value={productForm.availabilityRange}
                      onChange={e => setProductForm({ ...productForm, availabilityRange: e.target.value })}
                      className="w-full p-2.5 border border-neutral-200 rounded-lg bg-neutral-50 outline-none font-semibold text-neutral-800"
                    >
                      <option value="india"> Whole India (All customers)</option>
                      <option value="state"> My State Only (Local region)</option>
                      <option value="city"> My City Only (Metro region)</option>
                      <option value="nearest"> Nearest City (Within same region)</option>
                    </select>
                    <p className="text-[10px] text-neutral-400 mt-1">
                      Constrains where this item is offered based on the buyer's registered PIN code or active location context.
                    </p>
                  </div>
                  <div>
                    <label className="font-bold text-neutral-500 uppercase tracking-wider block mb-1">Shipping & Dispatch Origin</label>
                    <div className="p-2.5 bg-neutral-50 border border-neutral-100 rounded-lg text-neutral-600 font-mono text-[11px]">
                      📍 {currentUser.sellerProfile?.city || "Mumbai"}, {currentUser.sellerProfile?.state || "Maharashtra"} ({currentUser.sellerProfile?.pincode || "400001"})
                    </div>
                    <p className="text-[10px] text-neutral-400 mt-1">
                      Derived from your verified corporate storefront headquarters registration.
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-bold text-neutral-500 uppercase tracking-wider block">
                      Product Media Photos ({productImages.length}/10 - Min 1, Max 10)
                    </label>
                    <span className="text-[10px] text-neutral-400 font-medium">Upload from Device or Add URL</span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-2">
                      {/* Device File Upload */}
                      <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-all shadow-sm">
                        <Upload className="h-4 w-4" />
                        <span>Upload Photos from Device</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleDeviceImageUpload}
                          className="hidden"
                        />
                      </label>

                      {/* URL Entry */}
                      <div className="flex-[1.5] flex gap-2">
                        <input
                          type="url"
                          placeholder="Or paste image URL (https://...)"
                          value={newImageUrlInput}
                          onChange={e => setNewImageUrlInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddImageUrl(); } }}
                          className="flex-1 p-2 border border-neutral-200 rounded-lg text-xs outline-none bg-neutral-50"
                        />
                        <button
                          type="button"
                          onClick={handleAddImageUrl}
                          className="px-3 py-2 bg-neutral-900 text-white rounded-lg text-xs font-bold hover:bg-neutral-800 transition-colors"
                        >
                          Add URL
                        </button>
                      </div>
                    </div>

                    {/* Image Thumbnails Gallery */}
                    {productImages.length > 0 ? (
                      <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 p-3 bg-neutral-50 border border-neutral-200 rounded-xl">
                        {productImages.map((imgUrl, idx) => (
                          <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-neutral-200 group bg-white shadow-xs">
                            <img
                              src={imgUrl}
                              alt={`Product media ${idx + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80'; }}
                            />
                            {idx === 0 && (
                              <span className="absolute top-1 left-1 bg-indigo-600 text-white text-[7px] font-bold px-1 rounded uppercase">
                                Main
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => setProductImages(prev => prev.filter((_, i) => i !== idx))}
                              className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-90 hover:opacity-100 shadow-sm"
                              title="Remove photo"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 border border-dashed border-neutral-300 rounded-xl text-center bg-neutral-50/50">
                        <p className="text-xs text-neutral-400">No photos added yet. Minimum 1 photo required (up to 10 max).</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="font-bold text-neutral-500 uppercase tracking-wider block mb-1">Detailed Description</label>
                  <textarea
                    required
                    rows={3}
                    value={productForm.description}
                    onChange={e => setProductForm({ ...productForm, description: e.target.value })}
                    placeholder="Provide highlights, material details, dimensions, warranty information..."
                    className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none bg-neutral-50 resize-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-neutral-500 uppercase tracking-wider block mb-1">Bullet Specifications (Key Features, one per line)</label>
                  <textarea
                    rows={3}
                    value={productForm.keyFeaturesStr}
                    onChange={e => setProductForm({ ...productForm, keyFeaturesStr: e.target.value })}
                    placeholder="Anodized physical body&#10;Up to 30 hours battery&#10;Hi-Res sound certification"
                    className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none bg-neutral-50 resize-none font-mono text-[11px]"
                  />
                </div>

                <div className="flex gap-4">
                  {isEditingProduct && (
                    <>
                      {editProductId && (
                        <button
                          type="button"
                          onClick={() => {
                            const pId = editProductId;
                            setIsEditingProduct(false);
                            setEditProductId(null);
                            handleDeleteProductClick(pId);
                          }}
                          className="px-5 py-3 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Delete Listing</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => { setIsEditingProduct(false); setEditProductId(null); }}
                        className="px-6 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-xl transition-colors cursor-pointer"
                      >
                        Cancel Editing
                      </button>
                    </>
                  )}
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-extrabold rounded-xl shadow transition-colors cursor-pointer"
                  >
                    {isEditingProduct ? "Update product matrix" : "Publish to Catalog"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Section: Orders */}
          {activeSection === 'orders' && (
            <div className="bg-white border border-neutral-100 p-6 sm:p-8 rounded-2xl shadow-sm animate-fade-in text-xs space-y-6">
              <div>
                <h3 className="font-sans font-bold text-neutral-950 text-base">Store Deliveries Fulfillment</h3>
                <p className="text-xs text-neutral-500">Every order item belonging to your store displays here. Sync your dispatch timeline to Processing, Shipped, or Delivered.</p>
              </div>

              {loadingOrders ? (
                <p className="text-neutral-400 text-center py-6">Syncing fulfillment records...</p>
              ) : sellerOrders.length === 0 ? (
                <p className="text-xs text-neutral-400 text-center py-6">No order logs correspond to your storefront.</p>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {sellerOrders.map((o, idx) => (
                    <div key={idx} className="py-6 flex flex-col lg:flex-row justify-between gap-6">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded">
                            {o.transactionId || `ORDER-${o.orderId.substring(0,8).toUpperCase()}`}
                          </span>
                          <span className="text-neutral-300">|</span>
                          <span className="text-neutral-500 font-medium">Placed: {new Date(o.createdAt).toLocaleString()}</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <img
                            src={Array.isArray(o.product.image) ? o.product.image[0] : o.product.image}
                            alt={o.product.name}
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded object-cover border"
                          />
                          <div>
                            <div className="font-bold text-neutral-900">{o.product.name}</div>
                            <div className="text-neutral-400 font-mono text-[10px]">
                              Qty: {o.quantity} × {formatCurrencyVal(o.product.price, userCountry)}
                            </div>
                          </div>
                        </div>

                        {/* Delivery address details */}
                        <div className="p-2.5 bg-neutral-50 border border-neutral-100 rounded-xl text-neutral-600 max-w-xl">
                          <div className="font-bold text-neutral-400 text-[9px] uppercase tracking-wider mb-0.5">Shipping consignee</div>
                          <div className="font-bold text-neutral-900">{o.shippingAddress?.name} ({o.userEmail})</div>
                          <div className="text-[11px] mt-0.5">
                            {o.shippingAddress?.addressLine}, {o.shippingAddress?.city}, {o.shippingAddress?.state} - {o.shippingAddress?.postalCode}, {o.shippingAddress?.country} • {o.shippingAddress?.phone}
                          </div>
                        </div>
                      </div>

                      <div className="lg:w-64 flex flex-col justify-between items-end lg:border-l lg:pl-6">
                        <div className="text-right">
                          <div className="text-[10px] text-neutral-400 uppercase tracking-wider">Order Value</div>
                          <div className="text-lg font-black font-sans text-neutral-900 font-mono">
                            {formatCurrencyVal(o.total, userCountry)}
                          </div>
                        </div>

                        {/* Step-Wise Order Status Controls */}
                        <div className="mt-4 w-full text-right space-y-2">
                          <label className="block text-neutral-400 text-[10px] uppercase tracking-wider mb-1 font-bold">Fulfillment Status</label>
                          
                          {/* Current Status Badge */}
                          <div className="flex items-center justify-end gap-2 mb-2">
                            <span className={`px-2.5 py-1 text-xs font-black rounded-lg border uppercase tracking-wider ${
                              o.status === 'Delivered' 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : o.status === 'Cancelled'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : o.status === 'Out for Delivery'
                                ? 'bg-amber-500 text-white border-amber-600'
                                : o.status === 'Shipped' 
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                                : o.status === 'Processing' 
                                ? 'bg-amber-50 text-amber-700 border-amber-200' 
                                : 'bg-neutral-100 text-neutral-700 border-neutral-200'
                            }`}>
                              {o.status}
                            </span>
                          </div>

                          {/* Step-wise Actions */}
                          {o.status !== 'Delivered' && o.status !== 'Cancelled' ? (
                            <div className="flex flex-col gap-1.5 items-end">
                              {o.status === 'Pending' && (
                                <button
                                  onClick={() => handleUpdateSellerOrderStatus(o.orderId, 'Processing')}
                                  className="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                                >
                                  Advance to Processing →
                                </button>
                              )}
                              {o.status === 'Processing' && (
                                <button
                                  onClick={() => handleUpdateSellerOrderStatus(o.orderId, 'Shipped')}
                                  className="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                                >
                                  Advance to Shipped →
                                </button>
                              )}
                              {o.status === 'Shipped' && (
                                <button
                                  onClick={() => handleUpdateSellerOrderStatus(o.orderId, 'Out for Delivery')}
                                  className="w-full px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                                >
                                  Mark Out for Delivery →
                                </button>
                              )}
                              {o.status === 'Out for Delivery' && (
                                <button
                                  onClick={() => handleUpdateSellerOrderStatus(o.orderId, 'Delivered')}
                                  className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                                >
                                  Mark as Delivered ✓
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  if (confirm("Are you sure you want to cancel this order?")) {
                                    handleUpdateSellerOrderStatus(o.orderId, 'Cancelled');
                                  }
                                }}
                                className="text-[10px] text-red-600 hover:text-red-700 font-bold underline cursor-pointer mt-1"
                              >
                                Cancel Order
                              </button>
                            </div>
                          ) : (
                            <div className="text-[10px] text-neutral-400 font-semibold italic">
                              {o.status === 'Delivered' ? '✓ Order Completed (Final)' : '✕ Order Cancelled'}
                            </div>
                          )}

                          {o.deliveryOtp && o.status === 'Out for Delivery' && (
                            <div className="mt-2 text-right">
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg inline-block font-mono">
                                🔑 Verification OTP: {o.deliveryOtp}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section: Buyer Directory */}
          {activeSection === 'buyers' && (
            <div className="bg-white border border-neutral-100 p-6 rounded-2xl shadow-sm animate-fade-in text-xs space-y-6">
              <div>
                <h3 className="font-sans font-bold text-neutral-950 text-base">Verified Customer Directory</h3>
                <p className="text-xs text-neutral-500">Every customer who purchased products listed by your storefront. View spending volume and shipping records.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 text-neutral-400 font-bold border-b border-neutral-100 uppercase tracking-wider">
                      <th className="p-4 pl-6">Buyer Name</th>
                      <th className="p-4">Contact Details</th>
                      <th className="p-4">Delivery Area</th>
                      <th className="p-4 text-center">Fulfillments</th>
                      <th className="p-4 text-right">Aggregate value</th>
                      <th className="p-4 pr-6 text-right">Last checkout date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {uniqueBuyers.map((ub, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50/50 transition-colors">
                        <td className="p-4 pl-6 font-bold text-neutral-950 flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs uppercase border border-indigo-100">
                            {ub.name.charAt(0)}
                          </span>
                          <span>{ub.name}</span>
                        </td>
                        <td className="p-4 text-neutral-600">
                          <div>{ub.email}</div>
                          <div className="text-[10px] text-neutral-400 mt-0.5">{ub.phone}</div>
                        </td>
                        <td className="p-4 text-neutral-500 max-w-xs truncate">{ub.address}</td>
                        <td className="p-4 text-center font-bold text-neutral-700">{ub.ordersCount} shipments</td>
                        <td className="p-4 text-right font-black font-mono text-neutral-900">{formatCurrencyVal(ub.totalSpent, userCountry)}</td>
                        <td className="p-4 pr-6 text-right text-neutral-400">{new Date(ub.lastPurchase).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {uniqueBuyers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center p-8 text-neutral-400">No buyer profiles corresponds to your store.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section: Revenue & Analytics Reports */}
          {activeSection === 'reports' && (
            <div className="bg-white border border-neutral-100 p-6 sm:p-8 rounded-2xl shadow-sm space-y-6 animate-fade-in text-xs">
              <div>
                <h3 className="font-sans font-bold text-neutral-950 text-base">Storefront Earnings & Revenue breakdown</h3>
                <p className="text-xs text-neutral-500">Analyze overall transaction breakdown, platform commission cuts, taxes, and actual payouts.</p>
              </div>

              {/* Breakdown metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-neutral-900 text-white p-4 rounded-xl">
                  <div className="text-[9px] font-bold text-neutral-400 uppercase mb-1">Gross Sales (Total)</div>
                  <p className="text-lg font-black font-mono">{formatCurrencyVal(totalGrossRevenue, userCountry)}</p>
                </div>
                <div className="border border-neutral-100 p-4 rounded-xl text-red-700 bg-red-50/20">
                  <div className="text-[9px] font-bold text-red-500 uppercase mb-1">Platform cuts (10%)</div>
                  <p className="text-lg font-black font-mono">-{formatCurrencyVal(platformFee, userCountry)}</p>
                </div>
                <div className="border border-neutral-100 p-4 rounded-xl text-neutral-600">
                  <div className="text-[9px] font-bold text-neutral-400 uppercase mb-1">Taxes (5%)</div>
                  <p className="text-lg font-black font-mono">-{formatCurrencyVal(taxesAmount, userCountry)}</p>
                </div>
                <div className="border border-neutral-100 p-4 rounded-xl text-neutral-600">
                  <div className="text-[9px] font-bold text-neutral-400 uppercase mb-1">Gateway cuts (2%)</div>
                  <p className="text-lg font-black font-mono">-{formatCurrencyVal(bankCharges, userCountry)}</p>
                </div>
                <div className="border border-emerald-200 p-4 rounded-xl text-emerald-800 bg-emerald-50/40">
                  <div className="text-[9px] font-bold text-emerald-600 uppercase mb-1">Net Earnings (83%)</div>
                  <p className="text-lg font-black font-mono">{formatCurrencyVal(netEarnings, userCountry)}</p>
                </div>
              </div>

              {/* Area chart analytics */}
              <div className="border border-neutral-100 p-6 rounded-2xl bg-neutral-50/30">
                <h4 className="font-bold text-neutral-800 mb-4 uppercase text-[10px] tracking-wider">Storefront Sales Growth</h4>
                <div className="h-64">
                  {areaChartData.length === 0 ? (
                    <p className="text-neutral-400 text-center py-10">No checkout history to graph metrics.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={areaChartData}>
                        <XAxis dataKey="name" fontSize={9} axisLine={false} tickLine={false} />
                        <YAxis fontSize={9} axisLine={false} tickLine={false} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                        <Area type="monotone" dataKey="Revenue" stroke="#4f46e5" fill="#e0e7ff" name="Gross Order Value (₹)" />
                        <Area type="monotone" dataKey="Payout" stroke="#10b981" fill="#ecfdf5" name="Net Payout Share (₹)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Detailed Payouts Statement Ledger */}
              <div className="border border-neutral-100 rounded-xl overflow-hidden mt-6">
                <div className="bg-neutral-50 px-5 py-4 border-b border-neutral-100">
                  <h4 className="font-bold text-neutral-900">Weekly Payout Disbursal Statement</h4>
                  <p className="text-[10px] text-neutral-500 mt-0.5">Track every order payout share and its disbursement status by Aura administration.</p>
                </div>

                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-neutral-50/50 text-neutral-400 font-bold border-b border-neutral-100 text-[10px] uppercase">
                        <th className="p-4 pl-6">Order ID</th>
                        <th className="p-4">Customer Email</th>
                        <th className="p-4 text-right">Gross Sold</th>
                        <th className="p-4 text-right">Deductions (17%)</th>
                        <th className="p-4 text-right">Net Share (83%)</th>
                        <th className="p-4 text-center">Disbursement status</th>
                        <th className="p-4 pr-6 text-right">Fulfillment date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {sellerOrders.map((so, idx) => {
                        const payout = so.payout || {
                          gross: so.total,
                          platformFee: so.total * 0.10,
                          taxes: so.total * 0.05,
                          charges: so.total * 0.02,
                          net: so.total * 0.83,
                          status: 'Pending'
                        };
                        const isPaid = payout.status === 'Paid';

                        return (
                          <tr key={idx} className="hover:bg-neutral-50/30 transition-colors">
                            <td className="p-4 pl-6">
                              <span className="font-mono font-black text-neutral-950 bg-neutral-100 px-1.5 py-0.5 rounded text-[11px]">
                                {so.transactionId || `ORDER-${so.orderId.substring(0,8).toUpperCase()}`}
                              </span>
                            </td>
                            <td className="p-4 text-neutral-600 font-mono text-[11px]">{so.userEmail}</td>
                            <td className="p-4 text-right font-mono text-neutral-600">{formatCurrencyVal(payout.gross, userCountry)}</td>
                            <td className="p-4 text-right font-mono text-red-500">-{formatCurrencyVal(payout.platformFee + payout.taxes + payout.charges, userCountry)}</td>
                            <td className="p-4 text-right font-black font-mono text-emerald-700 bg-emerald-50/10">{formatCurrencyVal(payout.net, userCountry)}</td>
                            <td className="p-4 text-center">
                              {isPaid ? (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-black rounded-full uppercase tracking-wider">Paid</span>
                              ) : (
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-black rounded-full uppercase tracking-wider">Pending</span>
                              )}
                            </td>
                            <td className="p-4 pr-6 text-right text-neutral-400 font-medium">{new Date(so.createdAt).toLocaleDateString()}</td>
                          </tr>
                        );
                      })}
                      {sellerOrders.length === 0 && (
                        <tr>
                          <td colSpan={7} className="text-center p-8 text-neutral-400">No payout statements available.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Section: Store Settings */}
          {activeSection === 'settings' && (
            <div className="bg-white border border-neutral-100 p-6 sm:p-8 rounded-2xl shadow-sm text-xs animate-fade-in">
              <h3 className="font-sans font-bold text-base text-neutral-950 mb-6 flex items-center gap-1.5">
                <Settings className="h-5 w-5 text-neutral-400" />
                <span>Storefront Custom Branding & Payout Options</span>
              </h3>

              {settingsStatus && (
                <div className="mb-6 p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs flex items-center gap-1.5 border border-emerald-100 animate-fade-in">
                  <Check className="h-4 w-4" />
                  <span>{settingsStatus}</span>
                </div>
              )}

              <form onSubmit={handleUpdateStoreSettings} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-neutral-500 uppercase tracking-wider block mb-1">Public Store / Brand Name</label>
                    <input
                      type="text"
                      required
                      value={storeSettings.storeName}
                      onChange={e => setStoreSettings({ ...storeSettings, storeName: e.target.value })}
                      className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none bg-neutral-50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-neutral-500 uppercase tracking-wider block mb-1">Contact Telephone</label>
                    <input
                      type="tel"
                      required
                      value={storeSettings.phone}
                      onChange={e => setStoreSettings({ ...storeSettings, phone: e.target.value })}
                      className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none bg-neutral-50 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-neutral-500 uppercase tracking-wider block mb-1">Brand Bio / Description</label>
                  <textarea
                    required
                    rows={3}
                    value={storeSettings.description}
                    onChange={e => setStoreSettings({ ...storeSettings, description: e.target.value })}
                    className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none bg-neutral-50 resize-none focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-neutral-500 uppercase tracking-wider block mb-1">Store Logo Icon URL</label>
                    <input
                      type="url"
                      required
                      value={storeSettings.storeLogo}
                      onChange={e => setStoreSettings({ ...storeSettings, storeLogo: e.target.value })}
                      className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none bg-neutral-50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-neutral-500 uppercase tracking-wider block mb-1">Fulfillment Warehouse Address</label>
                    <input
                      type="text"
                      required
                      value={storeSettings.address}
                      onChange={e => setStoreSettings({ ...storeSettings, address: e.target.value })}
                      className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none bg-neutral-50 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="p-4 bg-indigo-50/30 border border-indigo-100 rounded-2xl space-y-4">
                  <h4 className="font-extrabold text-neutral-900 text-xs">Payout Remittance Remittance Accounts</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-indigo-700 uppercase tracking-wider block mb-1 text-[10px]">Recipient UPI Address ID</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. storename@upi"
                        value={storeSettings.upi}
                        onChange={e => setStoreSettings({ ...storeSettings, upi: e.target.value })}
                        className="w-full p-2.5 border border-indigo-200 rounded-lg outline-none bg-neutral-50 focus:bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-indigo-700 uppercase tracking-wider block mb-1 text-[10px]">Bank Account Transfer details</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Aura Bank - Account 999988887777, IFSC URB0001"
                        value={storeSettings.bankDetails}
                        onChange={e => setStoreSettings({ ...storeSettings, bankDetails: e.target.value })}
                        className="w-full p-2.5 border border-indigo-200 rounded-lg outline-none bg-neutral-50 focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl text-xs transition-colors shadow-md cursor-pointer"
                >
                  Save Storefront settings
                </button>
              </form>
            </div>
          )}

          {/* Section: Shipping Settings */}
          {activeSection === 'shipping' && (
            <div className="bg-white border border-neutral-100 p-6 sm:p-8 rounded-2xl shadow-sm space-y-4 text-xs animate-fade-in">
              <h2 className="font-sans font-bold text-base text-neutral-950 flex items-center gap-1.5">
                <Truck className="h-5 w-5 text-neutral-400" />
                <span>Active Shipping Customization</span>
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="font-bold text-neutral-500 uppercase tracking-wider block mb-1">Domestic Shipping Rates</label>
                  <input
                    type="text"
                    value={shippingRate}
                    onChange={e => setShippingRate(e.target.value)}
                    className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none bg-neutral-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-neutral-500 uppercase tracking-wider block mb-1">Standard Dispatch Window</label>
                  <input
                    type="text"
                    value={dispatchTime}
                    onChange={e => setDispatchTime(e.target.value)}
                    className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none bg-neutral-50 focus:bg-white"
                  />
                </div>

                <button
                  onClick={() => alert("Shipping parameters saved successfully.")}
                  className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-xs cursor-pointer hover:bg-indigo-500 transition-colors"
                >
                  Save Shipping Config
                </button>
              </div>
            </div>
          )}

          {/* Section: Returns Policy */}
          {activeSection === 'returns' && (
            <div className="bg-white border border-neutral-100 p-6 sm:p-8 rounded-2xl shadow-sm space-y-4 text-xs animate-fade-in">
              <h2 className="font-sans font-bold text-base text-neutral-950 flex items-center gap-1.5">
                <RefreshCcw className="h-5 w-5 text-neutral-400" />
                <span>Storefront Returns & Refund terms</span>
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="font-bold text-neutral-500 uppercase tracking-wider block mb-1">Returns Term Window</label>
                  <input
                    type="text"
                    value={returnDays}
                    onChange={e => setReturnDays(e.target.value)}
                    className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none bg-neutral-50 focus:bg-white"
                  />
                </div>

                <button
                  onClick={() => alert("Returns policy terms registered successfully.")}
                  className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-xs cursor-pointer hover:bg-indigo-500 transition-colors"
                >
                  Save Return Policy
                </button>
              </div>
            </div>
          )}

          {/* Section: Customer Chat */}
          {activeSection === 'chat' && (
            <div className="bg-white border border-neutral-100 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[500px] text-xs animate-fade-in">
              {/* Header profile */}
              <div className="p-4 bg-neutral-50 border-b border-neutral-100 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-neutral-800">Kabir Dev (Active buyer)</span>
              </div>

              {/* Message thread */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className={`max-w-[70%] text-xs p-3 rounded-2xl shadow-sm ${
                    msg.sender === 'seller' 
                      ? 'bg-indigo-600 text-white ml-auto' 
                      : 'bg-neutral-100 text-neutral-700 mr-auto'
                  }`}>
                    <div className="font-bold text-[10px] mb-1">{msg.name}</div>
                    <p className="leading-relaxed font-semibold">{msg.text}</p>
                    <span className="text-[8px] opacity-70 block text-right mt-1 font-mono">{msg.time}</span>
                  </div>
                ))}
              </div>

              {/* Chat Input form */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-neutral-100 flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Type an instant helpful reply..."
                  value={typedMessage}
                  onChange={e => setTypedMessage(e.target.value)}
                  className="flex-1 text-xs px-3.5 border border-neutral-200 rounded-xl outline-none focus:border-neutral-900 bg-neutral-50/50"
                />
                <button
                  type="submit"
                  className="p-3 bg-neutral-950 hover:bg-neutral-800 text-white rounded-xl transition-all shadow cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          )}

          {/* Section: Help & Support */}
          {activeSection === 'support' && (
            <div className="bg-white border border-neutral-100 p-6 sm:p-8 rounded-2xl shadow-sm space-y-6 text-xs animate-fade-in">
              <h2 className="font-sans font-extrabold text-base text-neutral-950">Aura Seller Help Desk</h2>
              <div className="space-y-4 text-neutral-600">
                <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-1">
                  <h4 className="font-bold text-neutral-800">How do Payouts work?</h4>
                  <p className="leading-relaxed font-medium">Platform payouts are released directly by Aura Admin to your registered UPI Address or Bank transfer account. Aura Admin deducts a total of 17% (10% platform commission + 5% taxes + 2% processing/handling fee) per checkout item transaction.</p>
                </div>
                <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-1">
                  <h4 className="font-bold text-neutral-800">Can I sell globally on Aura?</h4>
                  <p className="leading-relaxed font-medium">Yes! Aura handles secure customs dispatch, currency updates (INR, NPR, USD, GBP, EUR, etc.) dynamically based on location metrics.</p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Product Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={productToDelete !== null}
        product={productToDelete}
        onClose={() => setProductToDelete(null)}
        onConfirm={executeDeleteProduct}
        isDeleting={isDeletingProduct}
      />
    </div>
  );
}
