import React, { useState, useEffect } from 'react';
import { CATEGORIES_DATA, getSubcategoriesForCategory } from '../data/categories';
import { 
  Package, 
  Settings, 
  Plus, 
  Trash2, 
  Edit3, 
  Layers, 
  TrendingUp, 
  DollarSign, 
  Truck, 
  Clock, 
  CheckCircle, 
  X, 
  Save, 
  RefreshCw,
  ShoppingBag,
  Info,
  Users,
  Store,
  CreditCard,
  Ban,
  UserCheck,
  AlertCircle,
  Sparkles,
  Bot,
  Upload
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend 
} from 'recharts';
import { Product, Order, UserProfile } from '../types';
import { formatCurrencyVal } from '../utils/currency';
import { getProductImageUrl, handleImageError } from '../utils/image';
import ConfirmDeleteModal from './ConfirmDeleteModal';

interface AdminDashboardProps {
  currentUser: UserProfile | null;
  products: Product[];
  onRefreshProducts: () => void;
}

interface BuyerInfo {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  ordersCount: number;
  totalSpent: number;
  suspended: boolean;
}

interface SellerInfo {
  id: string;
  email: string;
  displayName: string;
  storeName: string;
  country: string;
  upi: string;
  bankDetails: string;
  createdAt: string;
  totalEarnings: number;
  pendingPayouts: number;
  suspended?: boolean;
}

interface SellerApplication {
  id: string;
  userId: string;
  businessName: string;
  storeName: string;
  email: string;
  phone: string;
  country: string;
  upi: string;
  bankDetails: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export default function AdminDashboard({
  currentUser,
  products,
  onRefreshProducts
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'buyers' | 'sellers' | 'payments' | 'ai-config'>('products');
  
  // Core states
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // New admin list states
  const [buyers, setBuyers] = useState<BuyerInfo[]>([]);
  const [sellers, setSellers] = useState<SellerInfo[]>([]);
  const [applications, setApplications] = useState<SellerApplication[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);

  // AI Assistant Config state
  const [aiConfig, setAiConfig] = useState({
    systemInstruction: '',
    activeOffersDirective: '',
    recommendationMode: 'personalized_history',
    promotionalBanner: ''
  });
  const [loadingAiConfig, setLoadingAiConfig] = useState(false);
  const [savingAiConfig, setSavingAiConfig] = useState(false);
  const [aiConfigSuccess, setAiConfigSuccess] = useState(false);

  // Products modal / edit state
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: 0,
    image: '',
    category: 'Mobiles',
    subcategory: '',
    inventory: 10,
    featured: false
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Active user country for currency formatting
  const userCountry = currentUser?.shippingAddress?.country || 'USA';

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchOrders();
      fetchAdminLists();
      fetchAiConfig();
    }
  }, [currentUser]);

  const fetchAiConfig = async () => {
    setLoadingAiConfig(true);
    try {
      const res = await fetch('/api/admin/ai-config');
      if (res.ok) {
        const data = await res.json();
        setAiConfig({
          systemInstruction: data.systemInstruction || '',
          activeOffersDirective: data.activeOffersDirective || '',
          recommendationMode: data.recommendationMode || 'personalized_history',
          promotionalBanner: data.promotionalBanner || ''
        });
      }
    } catch (err) {
      console.error("Error fetching AI config:", err);
    } finally {
      setLoadingAiConfig(false);
    }
  };

  const handleSaveAiConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('aura_token');
    if (!token) return;
    setSavingAiConfig(true);
    setAiConfigSuccess(false);
    try {
      const res = await fetch('/api/admin/ai-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(aiConfig)
      });
      if (res.ok) {
        setAiConfigSuccess(true);
        setTimeout(() => setAiConfigSuccess(false), 3500);
      } else {
        alert("Failed to update AI configuration");
      }
    } catch (err) {
      console.error("Error saving AI config:", err);
    } finally {
      setSavingAiConfig(false);
    }
  };

  const fetchOrders = async () => {
    const token = localStorage.getItem('aura_token');
    if (!token) return;
    setLoadingOrders(true);
    try {
      const res = await fetch('/api/admin/orders', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error("Error retrieving admin orders:", err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchAdminLists = async () => {
    const token = localStorage.getItem('aura_token');
    if (!token) return;
    setLoadingLists(true);
    try {
      // Fetch buyers
      const buyersRes = await fetch('/api/admin/buyers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (buyersRes.ok) {
        setBuyers(await buyersRes.json());
      }

      // Fetch sellers
      const sellersRes = await fetch('/api/admin/sellers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (sellersRes.ok) {
        setSellers(await sellersRes.json());
      }

      // Fetch applications
      const appsRes = await fetch('/api/admin/seller-applications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (appsRes.ok) {
        setApplications(await appsRes.json());
      }
    } catch (err) {
      console.error("Error fetching admin lists:", err);
    } finally {
      setLoadingLists(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    const token = localStorage.getItem('aura_token');
    if (!token) return;
    setUpdatingOrderId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus as any } : o));
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update order status");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleToggleSuspendUser = async (userId: string) => {
    const token = localStorage.getItem('aura_token');
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}/toggle-suspend`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBuyers(prev => prev.map(b => b.id === userId ? { ...b, suspended: data.suspended } : b));
        setSellers(prev => prev.map(s => s.id === userId ? { ...s, suspended: data.suspended } : s));
      }
    } catch (err) {
      console.error("Error toggling suspend user:", err);
    }
  };

  const handleApproveSeller = async (userId: string) => {
    const token = localStorage.getItem('aura_token');
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/approve-seller/${userId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert("Seller verification request approved successfully!");
        fetchAdminLists();
      }
    } catch (err) {
      console.error("Error approving seller:", err);
    }
  };

  const handleRejectSeller = async (userId: string) => {
    const token = localStorage.getItem('aura_token');
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/reject-seller/${userId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert("Seller verification request rejected.");
        fetchAdminLists();
      }
    } catch (err) {
      console.error("Error rejecting seller:", err);
    }
  };

  const handleDisbursePayout = async (orderId: string, sellerId: string) => {
    const token = localStorage.getItem('aura_token');
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/payouts/${sellerId}/disburse`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert("Payout disbursed and marked as PAID!");
        fetchOrders();
        fetchAdminLists();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to disburse payout");
      }
    } catch (err) {
      console.error("Error disbursing payout:", err);
    }
  };

  const handleDeleteProductClick = (product: Product) => {
    setProductToDelete(product);
  };

  const executeDeleteProduct = async () => {
    if (!productToDelete) return;
    const prodId = productToDelete.id || (productToDelete as any)._id;
    if (!prodId) return;

    setIsDeletingProduct(true);
    const token = localStorage.getItem('aura_token');
    if (!token) return;

    try {
      const res = await fetch(`/api/admin/products/${encodeURIComponent(prodId)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        onRefreshProducts();
        setProductToDelete(null);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete product");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeletingProduct(false);
    }
  };

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

  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setProductImages([]);
    setProductForm({
      name: '',
      description: '',
      price: 0,
      image: '',
      category: 'Electronics',
      inventory: 10,
      featured: false
    });
    setFormError(null);
    setIsProductModalOpen(true);
  };

  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    const existingImgs = Array.isArray(p.image) ? p.image : (p.image ? [p.image] : []);
    setProductImages(existingImgs);
    setProductForm({
      name: p.name,
      description: p.description,
      price: p.price,
      image: Array.isArray(p.image) ? p.image[0] : p.image,
      category: p.category,
      inventory: p.inventory || 0,
      featured: p.featured || false
    });
    setFormError(null);
    setIsProductModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (productImages.length < 1) {
      setFormError("Minimum 1 photo is required per product.");
      return;
    }
    if (productImages.length > 10) {
      setFormError("Maximum 10 photos allowed per product.");
      return;
    }

    setFormSubmitting(true);

    const token = localStorage.getItem('aura_token');
    if (!token) return;

    try {
      const url = editingProduct 
        ? `/api/admin/products/${editingProduct.id}` 
        : `/api/admin/products`;
      const method = editingProduct ? 'PATCH' : 'POST';

      const payload = {
        ...productForm,
        image: productImages.length === 1 ? productImages[0] : productImages
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsProductModalOpen(false);
        onRefreshProducts();
      } else {
        const data = await res.json();
        setFormError(data.error || "Something went wrong.");
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to save product.");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Compute platform financial summary
  let grossSales = 0;
  let platformCommission = 0;
  let collectedTaxes = 0;
  let processingCharges = 0;
  let totalDisbursed = 0;
  let totalPendingPayout = 0;

  orders.forEach((o: any) => {
    if (o.payouts) {
      Object.keys(o.payouts).forEach(sellerId => {
        const p = o.payouts[sellerId];
        grossSales += Number(p.gross || 0);
        platformCommission += Number(p.platformFee || 0);
        collectedTaxes += Number(p.taxes || 0);
        processingCharges += Number(p.charges || 0);
        if (p.status === 'Paid') {
          totalDisbursed += Number(p.net || 0);
        } else {
          totalPendingPayout += Number(p.net || 0);
        }
      });
    }
  });

  const chartData = [
    { name: 'Sellers Earnings', value: totalDisbursed + totalPendingPayout, fill: '#6366f1' },
    { name: 'Platform Commission (10%)', value: platformCommission, fill: '#10b981' },
    { name: 'Taxes Collected (5%)', value: collectedTaxes, fill: '#f59e0b' },
    { name: 'Payment Charges (2%)', value: processingCharges, fill: '#ef4444' }
  ];

  const barChartData = sellers.slice(0, 5).map(sel => ({
    name: sel.storeName.substring(0, 12),
    Earnings: sel.totalEarnings,
    Pending: sel.pendingPayouts
  }));

  const pendingApps = applications.filter(app => app.status === 'pending');

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      {/* Admin header */}
      <div className="bg-neutral-900 text-white py-12 px-6 shadow-md">
        <div className="w-full px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2 text-indigo-400 font-mono text-xs font-semibold tracking-wider uppercase">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
              AURA EXECUTIVE PORTAL
            </div>
            <h1 className="text-3xl font-black font-sans tracking-tight">
              Administrative Control Console
            </h1>
            <p className="text-sm text-neutral-400 mt-1 max-w-xl">
              Site-wide governance, verification of seller profiles, user management, and transactional payouts flow supervision.
            </p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => { fetchOrders(); fetchAdminLists(); }}
              className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 border border-neutral-700"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh Portal</span>
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-lg shadow-indigo-900/20"
            >
              <Plus className="h-4 w-4" />
              <span>Add Catalog Product</span>
            </button>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 mt-8">
        {/* Verification banner alert */}
        {pendingApps.length > 0 && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3.5 text-amber-900 text-sm shadow-sm animate-fade-in">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-bold">Pending Seller Approvals</h4>
              <p className="text-xs text-amber-700 mt-0.5">
                There are <strong>{pendingApps.length}</strong> seller registration requests awaiting identity validation and verification.
              </p>
            </div>
            <button 
              onClick={() => setActiveTab('sellers')}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
            >
              Verify Now
            </button>
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex border-b border-neutral-200 overflow-x-auto pb-px mb-8 gap-1 scrollbar-none">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-5 py-3.5 text-xs font-extrabold tracking-tight border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'products'
                ? 'border-neutral-900 text-neutral-950 font-black'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Package className="h-4 w-4" />
            <span>Master Catalog ({products.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-5 py-3.5 text-xs font-extrabold tracking-tight border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'orders'
                ? 'border-neutral-900 text-neutral-950 font-black'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Customer Transactions ({orders.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('buyers')}
            className={`px-5 py-3.5 text-xs font-extrabold tracking-tight border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'buyers'
                ? 'border-neutral-900 text-neutral-950 font-black'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Buyer Management ({buyers.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('sellers')}
            className={`px-5 py-3.5 text-xs font-extrabold tracking-tight border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'sellers'
                ? 'border-neutral-900 text-neutral-950 font-black'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Store className="h-4 w-4" />
            <span>Sellers Directory {pendingApps.length > 0 && <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[10px] font-mono rounded-full ml-1">{pendingApps.length}</span>}</span>
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-5 py-3.5 text-xs font-extrabold tracking-tight border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'payments'
                ? 'border-neutral-900 text-neutral-950 font-black'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <CreditCard className="h-4 w-4" />
            <span>Payouts & Platform Revenue</span>
          </button>
          <button
            onClick={() => setActiveTab('ai-config')}
            className={`px-5 py-3.5 text-xs font-extrabold tracking-tight border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'ai-config'
                ? 'border-indigo-600 text-indigo-950 font-black bg-indigo-50/50'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Sparkles className="h-4 w-4 text-indigo-600" />
            <span>Retail Concierge Config</span>
          </button>
        </div>

        {/* Tab Contents: catalog products */}
        {activeTab === 'products' && (
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
            <div className="p-6 border-b border-neutral-100 bg-neutral-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-sans font-bold text-neutral-950 text-base">Master Catalog Matrix</h3>
                <p className="text-xs text-neutral-500">Edit, inspect, and remove physical goods published across all storefronts.</p>
              </div>
              <span className="px-3 py-1 bg-neutral-200 text-neutral-800 text-[10px] font-mono rounded-full font-bold">
                {products.length} Products Active
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-50 text-neutral-400 font-bold border-b border-neutral-100 uppercase tracking-wider">
                    <th className="p-4 pl-6">Product Details</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Merchant / Seller ID</th>
                    <th className="p-4 text-right">Price</th>
                    <th className="p-4 text-center">Stock Status</th>
                    <th className="p-4 text-center">Featured</th>
                    <th className="p-4 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {products.map(p => {
                    const isLowStock = (p.inventory || 0) < 5;
                    const isOutOfStock = (p.inventory || 0) === 0;

                    return (
                      <tr key={p.id} className="hover:bg-neutral-50/50 transition-colors">
                        <td className="p-4 pl-6">
                          <div className="flex items-center gap-3">
                            <img
                              src={getProductImageUrl(p.image)}
                              alt={p.name}
                              referrerPolicy="no-referrer"
                              onError={handleImageError}
                              className="w-12 h-12 rounded-lg object-cover bg-neutral-100 border border-neutral-100"
                            />
                            <div>
                              <div className="font-bold text-neutral-950 text-sm">{p.name}</div>
                              <div className="text-neutral-400 mt-0.5 line-clamp-1 max-w-xs">{p.description}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-neutral-600 font-medium">{p.category}</td>
                        <td className="p-4 font-mono text-[11px] text-neutral-500">
                          {p.sellerName || "Official Aura Store"}
                          <div className="text-[9px] text-neutral-400">{p.sellerId || "admin-system"}</div>
                        </td>
                        <td className="p-4 text-right font-black text-neutral-900 font-mono text-sm">
                          {formatCurrencyVal(p.price, userCountry)}
                        </td>
                        <td className="p-4 text-center">
                          {isOutOfStock ? (
                            <span className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded-md">Out Of Stock</span>
                          ) : isLowStock ? (
                            <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-md">Only {p.inventory} left</span>
                          ) : (
                            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-md">{p.inventory} In Stock</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {p.featured ? (
                            <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-extrabold rounded border border-indigo-100">Yes</span>
                          ) : (
                            <span className="text-neutral-400 text-[10px] font-medium">-</span>
                          )}
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditModal(p)}
                              className="p-1.5 hover:bg-neutral-100 text-neutral-600 rounded-lg transition-colors"
                              title="Edit product"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProductClick(p)}
                              className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors cursor-pointer"
                              title="Delete product"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {products.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center p-8 text-neutral-400">No products available in the master catalog.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab Contents: transactions */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden animate-fade-in">
            <div className="p-6 border-b border-neutral-100 bg-neutral-50/50 flex justify-between items-center">
              <div>
                <h3 className="font-sans font-bold text-neutral-950 text-base">Global Order Transactions</h3>
                <p className="text-xs text-neutral-500">Every checkout is processed here. Buyers pay Aura Admin directly, pending seller payout disbursement.</p>
              </div>
              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-mono rounded-full font-bold">
                {orders.length} Orders Logged
              </span>
            </div>

            {loadingOrders ? (
              <div className="p-12 text-center text-neutral-500 flex flex-col items-center gap-2">
                <RefreshCw className="h-6 w-6 animate-spin text-neutral-400" />
                <span className="text-xs">Loading order registers...</span>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {orders.map(o => (
                  <div key={o.id} className="p-6 hover:bg-neutral-50/50 transition-colors flex flex-col lg:flex-row justify-between gap-6 text-xs">
                    <div className="flex-1 space-y-4">
                      {/* Top banner header */}
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono text-sm font-black text-neutral-900 bg-neutral-100 px-2 py-1 rounded">
                          {o.transactionId || `ORDER-${o.id.substring(0, 8).toUpperCase()}`}
                        </span>
                        <span className="text-neutral-400 font-medium">|</span>
                        <span className="text-neutral-500 font-medium">Placed on: {new Date(o.createdAt).toLocaleString()}</span>
                        <span className="text-neutral-400 font-medium">|</span>
                        <span className="font-bold text-neutral-700 bg-neutral-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider text-[9px] border border-neutral-200">
                          {o.paymentMethod}
                        </span>
                      </div>

                      {/* Items row */}
                      <div className="space-y-2">
                        {o.items.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-3">
                            <img
                              src={Array.isArray(item.product.image) ? item.product.image[0] : item.product.image}
                              alt={item.product.name}
                              referrerPolicy="no-referrer"
                              className="w-9 h-9 rounded object-cover border"
                            />
                            <div>
                              <div className="font-bold text-neutral-900">{item.product.name}</div>
                              <div className="text-neutral-400 font-mono text-[10px]">
                                Qty: {item.quantity} × {formatCurrencyVal(item.product.price, userCountry)} • Seller ID: {item.product.sellerId || "admin"}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Customer contact address */}
                      <div className="p-3 bg-neutral-50 rounded-xl max-w-xl border border-neutral-100">
                        <div className="font-bold text-neutral-800 text-[10px] uppercase tracking-wider text-neutral-500 mb-1">Shipping Consignee Details</div>
                        <div className="text-neutral-900 font-semibold">{o.shippingAddress.name} ({o.userEmail})</div>
                        <div className="text-neutral-500 mt-0.5">
                          {o.shippingAddress.addressLine}, {o.shippingAddress.city}, {o.shippingAddress.state} - {o.shippingAddress.postalCode}, {o.shippingAddress.country} • {o.shippingAddress.phone}
                        </div>
                      </div>
                    </div>

                    {/* Financial split right pane */}
                    <div className="lg:w-80 flex flex-col justify-between items-end border-t lg:border-t-0 lg:border-l border-neutral-200 pt-4 lg:pt-0 lg:pl-6 text-right">
                      <div>
                        <div className="text-neutral-400 font-bold text-[9px] uppercase tracking-wider mb-0.5">Total Paid to Admin</div>
                        <div className="font-black font-sans text-neutral-950 text-xl">{formatCurrencyVal(o.total, userCountry)}</div>
                      </div>

                      {/* Order status controls */}
                      <div className="mt-4 w-full text-right space-y-2">
                        <label className="block text-neutral-400 font-bold text-[9px] uppercase tracking-wider mb-1">Fulfillment Status</label>
                        
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

                        {/* Next Step & Cancel Controls */}
                        {o.status !== 'Delivered' && o.status !== 'Cancelled' ? (
                          <div className="flex flex-col gap-1.5 items-end">
                            {o.status === 'Pending' && (
                              <button
                                disabled={updatingOrderId === o.id}
                                onClick={() => handleUpdateOrderStatus(o.id, 'Processing')}
                                className="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                              >
                                Advance to Processing →
                              </button>
                            )}
                            {o.status === 'Processing' && (
                              <button
                                disabled={updatingOrderId === o.id}
                                onClick={() => handleUpdateOrderStatus(o.id, 'Shipped')}
                                className="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                              >
                                Advance to Shipped →
                              </button>
                            )}
                            {o.status === 'Shipped' && (
                              <button
                                disabled={updatingOrderId === o.id}
                                onClick={() => handleUpdateOrderStatus(o.id, 'Out for Delivery')}
                                className="w-full px-3 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                              >
                                Mark Out for Delivery →
                              </button>
                            )}
                            {o.status === 'Out for Delivery' && (
                              <button
                                disabled={updatingOrderId === o.id}
                                onClick={() => handleUpdateOrderStatus(o.id, 'Delivered')}
                                className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                              >
                                Mark as Delivered ✓
                              </button>
                            )}
                            <button
                              disabled={updatingOrderId === o.id}
                              onClick={() => {
                                if (confirm("Are you sure you want to cancel this order?")) {
                                  handleUpdateOrderStatus(o.id, 'Cancelled');
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
                {orders.length === 0 && (
                  <div className="p-12 text-center text-neutral-400">No checkout transactions have been recorded on this portal yet.</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab Contents: Buyers */}
        {activeTab === 'buyers' && (
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden animate-fade-in">
            <div className="p-6 border-b border-neutral-100 bg-neutral-50/50 flex justify-between items-center">
              <div>
                <h3 className="font-sans font-bold text-neutral-950 text-base">Verified Buyer Directory</h3>
                <p className="text-xs text-neutral-500">Monitor registered customers, inspect cumulative checkout totals, and suspend/reactivate access.</p>
              </div>
            </div>

            {loadingLists ? (
              <div className="p-12 text-center text-neutral-500 flex flex-col items-center gap-2">
                <RefreshCw className="h-6 w-6 animate-spin text-neutral-400" />
                <span className="text-xs">Accessing consumer data registries...</span>
              </div>
            ) : (
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 text-neutral-400 font-bold border-b border-neutral-100 uppercase tracking-wider">
                      <th className="p-4 pl-6">Buyer Name</th>
                      <th className="p-4">Contact Email</th>
                      <th className="p-4">Register Date</th>
                      <th className="p-4 text-center">Checkout Count</th>
                      <th className="p-4 text-right">Aggregate Spent</th>
                      <th className="p-4 pr-6 text-right">Account Governance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {buyers.map(b => (
                      <tr key={b.id} className={`hover:bg-neutral-50/30 transition-colors ${b.suspended ? 'bg-red-50/30' : ''}`}>
                        <td className="p-4 pl-6 font-bold text-neutral-950 flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center font-bold text-neutral-600 text-xs uppercase border border-neutral-200">
                            {b.displayName.charAt(0)}
                          </span>
                          <span>{b.displayName}</span>
                        </td>
                        <td className="p-4 text-neutral-600 font-mono text-[11px]">{b.email}</td>
                        <td className="p-4 text-neutral-500">{new Date(b.createdAt).toLocaleDateString()}</td>
                        <td className="p-4 text-center font-bold text-neutral-700">{b.ordersCount} orders</td>
                        <td className="p-4 text-right font-black text-neutral-900 font-mono">{formatCurrencyVal(b.totalSpent, userCountry)}</td>
                        <td className="p-4 pr-6 text-right">
                          <button
                            onClick={() => handleToggleSuspendUser(b.id)}
                            className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all inline-flex items-center gap-1 border cursor-pointer ${
                              b.suspended
                                ? 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200'
                                : 'bg-white hover:bg-neutral-100 text-neutral-700 border-neutral-200'
                            }`}
                          >
                            {b.suspended ? (
                              <>
                                <Ban className="h-3 w-3" />
                                <span>Suspended</span>
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-3 w-3" />
                                <span>Active</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {buyers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center p-8 text-neutral-400">No buyer profiles registered yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab Contents: Sellers & Verification */}
        {activeTab === 'sellers' && (
          <div className="space-y-8 animate-fade-in text-xs">
            {/* 1. Pending applications table */}
            <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
              <div className="p-6 border-b border-neutral-100 bg-amber-50/50">
                <h3 className="font-sans font-bold text-neutral-950 text-base flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                  Seller Verification Requests
                </h3>
                <p className="text-xs text-neutral-500">Validate business credentials, bank specifications, and UPI handles before approving active seller status.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 text-neutral-400 font-bold border-b border-neutral-100 uppercase tracking-wider">
                      <th className="p-4 pl-6">Store / Business Details</th>
                      <th className="p-4">Contact Info</th>
                      <th className="p-4">Region</th>
                      <th className="p-4">Payout Destination (UPI/Bank)</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 pr-6 text-right">Verification Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {applications.filter(app => app.status === 'pending').map(app => (
                      <tr key={app.id} className="hover:bg-neutral-50/30 transition-colors bg-amber-50/10">
                        <td className="p-4 pl-6">
                          <div className="font-bold text-neutral-900 text-sm">{app.storeName}</div>
                          <div className="text-neutral-400 mt-0.5">{app.businessName}</div>
                        </td>
                        <td className="p-4">
                          <div>{app.email}</div>
                          <div className="text-neutral-400 mt-0.5">{app.phone}</div>
                        </td>
                        <td className="p-4 font-medium text-neutral-600">{app.country}</td>
                        <td className="p-4 font-mono text-[11px] text-neutral-500">
                          <div>UPI: <span className="text-neutral-800 font-semibold">{app.upi}</span></div>
                          <div className="mt-0.5">Bank: <span className="text-neutral-800 font-semibold">{app.bankDetails}</span></div>
                        </td>
                        <td className="p-4 text-center">
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-black rounded-full uppercase tracking-wider">Pending</span>
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleRejectSeller(app.userId)}
                              className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-lg transition-colors cursor-pointer"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => handleApproveSeller(app.userId)}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors shadow-sm cursor-pointer"
                            >
                              Approve
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {applications.filter(app => app.status === 'pending').length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center p-8 text-neutral-400 font-medium bg-neutral-50/20">No pending seller registration requests.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. Active sellers directory */}
            <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
              <div className="p-6 border-b border-neutral-100 bg-neutral-50/50">
                <h3 className="font-sans font-bold text-neutral-950 text-base">Active Storefront Directory</h3>
                <p className="text-xs text-neutral-500">Currently active authorized sellers. Orders placed on their items pay to admin, awaiting payout disbursement.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 text-neutral-400 font-bold border-b border-neutral-100 uppercase tracking-wider">
                      <th className="p-4 pl-6">Merchant Store</th>
                      <th className="p-4">Business Email</th>
                      <th className="p-4">Geographic Origin</th>
                      <th className="p-4">Registered Accounts</th>
                      <th className="p-4 text-right">Total Net Earned</th>
                      <th className="p-4 text-right font-bold text-amber-600">Pending Disbursal</th>
                      <th className="p-4 pr-6 text-right">Account Governance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {sellers.map(sel => (
                      <tr key={sel.id} className={`hover:bg-neutral-50/30 transition-colors ${sel.suspended ? 'bg-red-50/30' : ''}`}>
                        <td className="p-4 pl-6">
                          <div className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-[10px] uppercase">
                              {sel.storeName.substring(0, 2)}
                            </span>
                            <div>
                              <div className="font-bold text-neutral-900">{sel.storeName}</div>
                              <div className="text-[10px] text-neutral-400 mt-0.5 font-mono">{sel.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-neutral-600 font-mono text-[11px]">{sel.email}</td>
                        <td className="p-4 text-neutral-500 font-medium">{sel.country}</td>
                        <td className="p-4">
                          <div className="text-[11px] font-mono text-neutral-500">Bank: {sel.bankDetails}</div>
                          <div className="text-[10px] text-neutral-400">UPI: {sel.upi}</div>
                        </td>
                        <td className="p-4 text-right font-black text-neutral-950 font-mono">
                          {formatCurrencyVal(sel.totalEarnings, userCountry)}
                        </td>
                        <td className="p-4 text-right font-black text-amber-600 font-mono">
                          {formatCurrencyVal(sel.pendingPayouts, userCountry)}
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <button
                            onClick={() => handleToggleSuspendUser(sel.id)}
                            className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all inline-flex items-center gap-1 border cursor-pointer ${
                              sel.suspended
                                ? 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200'
                                : 'bg-white hover:bg-neutral-100 text-neutral-700 border-neutral-200'
                            }`}
                          >
                            {sel.suspended ? (
                              <>
                                <Ban className="h-3 w-3" />
                                <span>Deactivated / Suspended</span>
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-3 w-3 text-emerald-600" />
                                <span>Active Seller</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {sellers.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center p-8 text-neutral-400">No active sellers directory profiles.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab Contents: Payments & Payouts */}
        {activeTab === 'payments' && (
          <div className="space-y-8 animate-fade-in text-xs">
            {/* Metrics cards widgets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm">
                <div className="text-neutral-400 font-bold text-[10px] uppercase tracking-wider mb-1">Gross Collected (Admin)</div>
                <div className="text-xl font-black font-sans text-neutral-950 font-mono">{formatCurrencyVal(grossSales, userCountry)}</div>
                <div className="text-[9px] text-neutral-500 mt-1">Total checkouts paid to Admin</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm">
                <div className="text-emerald-600 font-bold text-[10px] uppercase tracking-wider mb-1">Platform Cuts (10%)</div>
                <div className="text-xl font-black font-sans text-emerald-700 font-mono">{formatCurrencyVal(platformCommission, userCountry)}</div>
                <div className="text-[9px] text-emerald-600 mt-1">Direct Aura administration profits</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm">
                <div className="text-amber-600 font-bold text-[10px] uppercase tracking-wider mb-1">Taxes Collected (5%)</div>
                <div className="text-xl font-black font-sans text-amber-700 font-mono">{formatCurrencyVal(collectedTaxes, userCountry)}</div>
                <div className="text-[9px] text-amber-600 mt-1">Aura statutory escrow hold</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm">
                <div className="text-red-600 font-bold text-[10px] uppercase tracking-wider mb-1">Processing Charges (2%)</div>
                <div className="text-xl font-black font-sans text-red-700 font-mono">{formatCurrencyVal(processingCharges, userCountry)}</div>
                <div className="text-[9px] text-red-600 mt-1">Payment gateway settlement costs</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm bg-indigo-50/30 border-indigo-100">
                <div className="text-indigo-600 font-bold text-[10px] uppercase tracking-wider mb-1">Pending Payouts</div>
                <div className="text-xl font-black font-sans text-indigo-700 font-mono">{formatCurrencyVal(totalPendingPayout, userCountry)}</div>
                <div className="text-[9px] text-indigo-500 mt-1">Remaining to disburse to sellers</div>
              </div>
            </div>

            {/* Double grid for charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Pie chart representing split */}
              <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm">
                <h4 className="font-sans font-bold text-neutral-950 mb-4 text-sm">Site-Wide Financial Shares</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrencyVal(Number(value), userCountry)} />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bar chart representing top sellers earnings */}
              <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm">
                <h4 className="font-sans font-bold text-neutral-950 mb-4 text-sm">Merchant Store Earnings Matrix</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData}>
                      <XAxis dataKey="name" stroke="#888888" fontSize={9} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888888" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
                      <Tooltip formatter={(value) => formatCurrencyVal(Number(value), userCountry)} />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <Bar dataKey="Earnings" fill="#6366f1" radius={[4, 4, 0, 0]} name="Disbursed Revenue (₹)" />
                      <Bar dataKey="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Pending Disbursal (₹)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Payouts queue table */}
            <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
              <div className="p-6 border-b border-neutral-100 bg-neutral-50/50">
                <h3 className="font-sans font-bold text-neutral-950 text-base">Fulfillment & Disbursal Ledger</h3>
                <p className="text-xs text-neutral-500">Whenever buyers purchase items, they pay Aura Admin. Disburse remaining funds to the respective seller below after the 17% overall fee deduction.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 text-neutral-400 font-bold border-b border-neutral-100 uppercase tracking-wider">
                      <th className="p-4 pl-6">Order ID / Date</th>
                      <th className="p-4">Merchant Store</th>
                      <th className="p-4 text-right">Gross Sold</th>
                      <th className="p-4 text-right">Admin Fee (10%)</th>
                      <th className="p-4 text-right">Escrow Holds (7%)</th>
                      <th className="p-4 text-right">Net Seller Share (83%)</th>
                      <th className="p-4 text-center">Payout Status</th>
                      <th className="p-4 pr-6 text-right">Disbursal Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {orders.flatMap(o => {
                      if (!o.payouts) return [];
                      return Object.keys(o.payouts).map(sellerId => {
                        const p = o.payouts[sellerId];
                        return {
                          orderId: o.id,
                          transactionId: o.transactionId,
                          createdAt: o.createdAt,
                          sellerId,
                          ...p
                        };
                      });
                    }).map((payout, idx) => {
                      // Lookup seller's payout details from user profiles
                      const matchingSeller = sellers.find(s => s.id === payout.sellerId);
                      const payoutUpi = matchingSeller?.upi || payout.upi || "N/A";
                      const payoutBank = matchingSeller?.bankDetails || payout.bankDetails || "N/A";

                      return (
                        <tr key={idx} className="hover:bg-neutral-50/50 transition-colors">
                          <td className="p-4 pl-6">
                            <span className="font-mono font-black text-neutral-900 bg-neutral-100 px-1.5 py-0.5 rounded">
                              {payout.transactionId || payout.orderId.substring(0, 8).toUpperCase()}
                            </span>
                            <div className="text-[10px] text-neutral-400 mt-1">{new Date(payout.createdAt).toLocaleDateString()}</div>
                          </td>
                          <td className="p-4">
                            <div className="font-bold text-neutral-900">{payout.storeName}</div>
                            <div className="text-[10px] text-neutral-400 font-mono mt-0.5">UPI: {payoutUpi}</div>
                          </td>
                          <td className="p-4 text-right font-mono text-neutral-600">{formatCurrencyVal(payout.gross, userCountry)}</td>
                          <td className="p-4 text-right font-mono text-red-600">-{formatCurrencyVal(payout.platformFee, userCountry)}</td>
                          <td className="p-4 text-right font-mono text-neutral-500">-{formatCurrencyVal(payout.taxes + payout.charges, userCountry)}</td>
                          <td className="p-4 text-right font-black font-mono text-emerald-700 bg-emerald-50/20">{formatCurrencyVal(payout.net, userCountry)}</td>
                          <td className="p-4 text-center">
                            {payout.status === 'Paid' ? (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-black rounded-full uppercase tracking-wider">Paid</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-black rounded-full uppercase tracking-wider">Pending</span>
                            )}
                          </td>
                          <td className="p-4 pr-6 text-right">
                            {payout.status === 'Paid' ? (
                              <span className="text-neutral-400 font-bold text-[10px] italic">Settled on UPI/Bank</span>
                            ) : (
                              <button
                                onClick={() => handleDisbursePayout(payout.orderId, payout.sellerId)}
                                className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white font-extrabold rounded-lg transition-colors shadow-sm cursor-pointer"
                              >
                                Send {formatCurrencyVal(payout.net, userCountry)}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {orders.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center p-8 text-neutral-400">No payouts due currently.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab Contents: AI Assistant Concierge Config */}
        {activeTab === 'ai-config' && (
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden animate-fade-in">
            <div className="p-6 border-b border-neutral-100 bg-indigo-50/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-md">
                  <Bot className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-sans font-bold text-neutral-950 text-base flex items-center gap-2">
                    <span>Retail Recommendation & Shopping Concierge</span>
                    <span className="px-2 py-0.5 bg-indigo-600 text-white font-mono text-[9px] uppercase tracking-wider rounded-full font-extrabold">Active Assistant Engine</span>
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Configure real-time system rules, active promotional directives, recommendation strategies, and site banners stored in database (`aiConfigs`).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={fetchAiConfig}
                className="px-3.5 py-1.5 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Reload Config</span>
              </button>
            </div>

            {aiConfigSuccess && (
              <div className="m-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <span>Retail Configuration updated and synced to database! Live recommendations updated instantly.</span>
              </div>
            )}

            <form onSubmit={handleSaveAiConfig} className="p-6 space-y-6">
              {/* Promotional Banner Message */}
              <div>
                <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Site-Wide Promotional Header Banner</span>
                </label>
                <input
                  type="text"
                  required
                  value={aiConfig.promotionalBanner}
                  onChange={e => setAiConfig({ ...aiConfig, promotionalBanner: e.target.value })}
                  placeholder="E.g., 🎉 Festive Sale: Extra 10% OFF with code AURA10 + Local 24h Express Delivery!"
                  className="w-full p-3 border border-neutral-200 rounded-xl outline-none focus:border-indigo-600 bg-neutral-50/50 focus:bg-white text-xs font-medium"
                />
                <p className="mt-1 text-[11px] text-neutral-500">
                  Displayed dynamically across storefront headers and inside the Customer Chat Assistant.
                </p>
              </div>

              {/* Recommendation Strategy Mode */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider mb-2">
                    Recommendation Strategy Engine
                  </label>
                  <select
                    value={aiConfig.recommendationMode}
                    onChange={e => setAiConfig({ ...aiConfig, recommendationMode: e.target.value })}
                    className="w-full p-3 border border-neutral-200 rounded-xl outline-none focus:border-indigo-600 bg-neutral-50/50 focus:bg-white text-xs font-semibold"
                  >
                    <option value="personalized_history">Personalized Order History & Browsing Context</option>
                    <option value="festive_discounts">Festive Discounts & Active Offer Priority</option>
                    <option value="express_local">Nearby Seller Express Delivery Priority</option>
                    <option value="strict_budget">Strict Budget & Best Value Filter</option>
                  </select>
                </div>

                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80 text-xs">
                  <span className="font-bold text-neutral-900 block mb-1">Active Rules Summary:</span>
                  <ul className="list-disc pl-4 text-neutral-600 text-[11px] space-y-1">
                    <li>Database collection: <code className="bg-white px-1 py-0.5 rounded font-mono text-[10px] text-indigo-600">aiConfigs</code></li>
                    <li>Evaluates deliverability to user's pincode & city.</li>
                    <li>Analyzes buyer's past purchased products in <code className="bg-white px-1 py-0.5 rounded font-mono text-[10px] text-indigo-600">orders</code>.</li>
                  </ul>
                </div>
              </div>

              {/* System Instruction */}
              <div>
                <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider mb-2">
                  Retail Concierge Core Persona & Guidance
                </label>
                <textarea
                  required
                  rows={4}
                  value={aiConfig.systemInstruction}
                  onChange={e => setAiConfig({ ...aiConfig, systemInstruction: e.target.value })}
                  placeholder="Define assistant persona, tone, greeting style, and advice scope..."
                  className="w-full p-3 border border-neutral-200 rounded-xl outline-none focus:border-indigo-600 bg-neutral-50/50 focus:bg-white text-xs font-mono leading-relaxed"
                />
              </div>

              {/* Active Offers & Rules Directive */}
              <div>
                <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider mb-2">
                  Active Promotional Directives & Bank Cashback Rules
                </label>
                <textarea
                  required
                  rows={3}
                  value={aiConfig.activeOffersDirective}
                  onChange={e => setAiConfig({ ...aiConfig, activeOffersDirective: e.target.value })}
                  placeholder="Enter active discount codes, card cashback rules, or special event instructions..."
                  className="w-full p-3 border border-neutral-200 rounded-xl outline-none focus:border-indigo-600 bg-neutral-50/50 focus:bg-white text-xs font-mono leading-relaxed"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingAiConfig}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 active:scale-98"
                >
                  <Save className="h-4 w-4" />
                  <span>{savingAiConfig ? "Saving to Database..." : "Save AI Concierge Settings"}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Products creation & editing modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsProductModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-neutral-900 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="font-sans font-extrabold text-xl text-neutral-950 mb-4 tracking-tight">
              {editingProduct ? "Revise Product Properties" : "Post a New Catalog Product"}
            </h2>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-xs flex items-center gap-1.5 border border-red-100">
                <Info className="h-4 w-4" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-neutral-500 uppercase tracking-wider block mb-1">Product Title</label>
                <input
                  type="text"
                  required
                  placeholder="E.g., ErgoDock Wooden Stand"
                  value={productForm.name}
                  onChange={e => setProductForm({...productForm, name: e.target.value})}
                  className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none focus:border-neutral-900 bg-neutral-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="font-bold text-neutral-500 uppercase tracking-wider block mb-1">Detailed Description</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain benefits, materials, physical sizes, etc..."
                  value={productForm.description}
                  onChange={e => setProductForm({...productForm, description: e.target.value})}
                  className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none focus:border-neutral-900 bg-neutral-50 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-neutral-500 uppercase tracking-wider block mb-1">Price (₹ INR)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={productForm.price}
                    onChange={e => setProductForm({...productForm, price: parseFloat(e.target.value)})}
                    className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none focus:border-neutral-900 bg-neutral-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-neutral-500 uppercase tracking-wider block mb-1">Initial Stock (Units)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={productForm.inventory}
                    onChange={e => setProductForm({...productForm, inventory: parseInt(e.target.value)})}
                    className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none focus:border-neutral-900 bg-neutral-50 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-neutral-500 uppercase tracking-wider block mb-1">Category</label>
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
                    className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none bg-neutral-50 text-xs font-semibold"
                  >
                    {CATEGORIES_DATA.map(cat => (
                      <option key={cat.name} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-neutral-500 uppercase tracking-wider block mb-1">Subcategory</label>
                  <select
                    value={productForm.subcategory}
                    onChange={e => setProductForm({...productForm, subcategory: e.target.value})}
                    className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none bg-neutral-50 text-xs font-semibold"
                  >
                    <option value="">None / General</option>
                    {getSubcategoriesForCategory(productForm.category).map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold text-neutral-500 uppercase tracking-wider block">
                    Product Media ({productImages.length}/10 - Min 1, Max 10)
                  </label>
                </div>
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <label className="cursor-pointer flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-all shadow-sm">
                      <Upload className="h-3.5 w-3.5" />
                      <span>Upload Device Photos</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleDeviceImageUpload}
                        className="hidden"
                      />
                    </label>
                    <div className="flex-1 flex gap-1.5">
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

                  {productImages.length > 0 ? (
                    <div className="grid grid-cols-5 gap-2 p-2 bg-neutral-50 border border-neutral-200 rounded-xl">
                      {productImages.map((imgUrl, idx) => (
                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-neutral-200 group bg-white shadow-xs">
                          <img
                            src={imgUrl}
                            alt={`Product media ${idx + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80'; }}
                          />
                          {idx === 0 && (
                            <span className="absolute top-0.5 left-0.5 bg-indigo-600 text-white text-[6px] font-bold px-1 rounded uppercase">
                              Main
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => setProductImages(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute top-0.5 right-0.5 p-0.5 bg-red-600 text-white rounded-full opacity-90 hover:opacity-100 shadow-sm"
                            title="Remove photo"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-2 border border-dashed border-neutral-300 rounded-lg text-center bg-neutral-50/50">
                      <p className="text-[10px] text-neutral-400">No photos added yet. Minimum 1 photo required (up to 10 max).</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 select-none">
                <input
                  type="checkbox"
                  id="featured-toggle"
                  checked={productForm.featured}
                  onChange={e => setProductForm({...productForm, featured: e.target.checked})}
                  className="h-4 w-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="featured-toggle" className="font-bold text-neutral-700 cursor-pointer">
                  Feature this item on homepage hero/highlights
                </label>
              </div>

              <div className="pt-4 flex gap-3">
                {editingProduct && (
                  <button
                    type="button"
                    onClick={() => {
                      const prod = editingProduct;
                      setIsProductModalOpen(false);
                      handleDeleteProductClick(prod);
                    }}
                    className="px-4 py-3 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 rounded-xl font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Delete Product"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="flex-1 py-3 bg-neutral-50 border border-neutral-200 hover:bg-neutral-100 text-neutral-700 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="flex-1 py-3 bg-neutral-950 text-white hover:bg-neutral-800 rounded-xl font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  <span>{formSubmitting ? "Saving changes..." : editingProduct ? "Save Changes" : "Create Product"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
