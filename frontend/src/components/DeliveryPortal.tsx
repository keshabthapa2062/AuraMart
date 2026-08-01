import React, { useState, useEffect } from 'react';
import { Truck, MapPin, Search, ShieldCheck, CheckCircle2, Camera, Phone, User, PackageCheck, AlertCircle, RefreshCw, ChevronRight, X, Clock, Calendar } from 'lucide-react';
import { Order } from '../types';

interface DeliveryPortalProps {
  userCity: string;
  userPincode: string;
  userState: string;
}

export default function DeliveryPortal({ userCity, userPincode, userState }: DeliveryPortalProps) {
  // Delivery executive available location state
  const [activeLocation, setActiveLocation] = useState<string>(userCity || 'New Delhi');
  const [activePincode, setActivePincode] = useState<string>(userPincode || '110001');

  // Orders list state
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Status Filter tab: 'all' | 'shipped' | 'out_for_delivery' | 'delivered'
  const [statusTab, setStatusTab] = useState<'shipped' | 'out_for_delivery' | 'delivered' | 'all'>('shipped');

  // Search query
  const [searchQuery, setSearchQuery] = useState('');

  // Per-order OTP input state: { [orderId]: string }
  const [otpInputs, setOtpInputs] = useState<{ [key: string]: string }>({});

  // Per-order photo upload state (base64): { [orderId]: string }
  const [photoProofs, setPhotoProofs] = useState<{ [key: string]: string }>({});

  // Verifying loading states: { [orderId]: boolean }
  const [verifyingMap, setVerifyingMap] = useState<{ [key: string]: boolean }>({});

  // Error/Success messages per order: { [orderId]: { type: 'success'|'error', text: string } }
  const [feedbackMap, setFeedbackMap] = useState<{ [key: string]: { type: 'success' | 'error'; text: string } }>({});

  // Fetch orders from delivery API
  const fetchDeliveryOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (activeLocation) params.append('city', activeLocation);
      if (activePincode) params.append('pincode', activePincode);
      if (searchQuery) params.append('search', searchQuery);

      const res = await fetch(`/api/delivery/orders?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load delivery orders');
      const data = await res.json();
      setOrders(data);
    } catch (err: any) {
      setError(err.message || 'Error fetching delivery assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveryOrders();
  }, [activeLocation, activePincode]);

  // Handle Marking Shipped Order to Out for Delivery
  const handleMarkOutForDelivery = async (orderId: string) => {
    setVerifyingMap(prev => ({ ...prev, [orderId]: true }));
    setFeedbackMap(prev => ({ ...prev, [orderId]: { type: 'success', text: 'Updating status...' } }));

    try {
      const res = await fetch(`/api/delivery/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Out for Delivery' })
      });

      const updated = await res.json();
      if (!res.ok) {
        throw new Error(updated.error || 'Failed to update order status');
      }

      setFeedbackMap(prev => ({
        ...prev,
        [orderId]: { type: 'success', text: `🛵 Package marked Out for Delivery! OTP code generated & sent to buyer.` }
      }));

      // Refresh orders list
      fetchDeliveryOrders();
    } catch (err: any) {
      setFeedbackMap(prev => ({
        ...prev,
        [orderId]: { type: 'error', text: err.message || 'Error updating status' }
      }));
    } finally {
      setVerifyingMap(prev => ({ ...prev, [orderId]: false }));
    }
  };

  // Handle Photo Proof Upload
  const handlePhotoUpload = (orderId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Image size should be less than 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoProofs(prev => ({ ...prev, [orderId]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle OTP Verification & Delivery Completion
  const handleVerifyDelivery = async (orderId: string) => {
    const otp = otpInputs[orderId]?.trim();
    if (!otp || otp.length !== 6) {
      setFeedbackMap(prev => ({
        ...prev,
        [orderId]: { type: 'error', text: 'Please enter the complete 6-digit OTP code provided by the buyer.' }
      }));
      return;
    }

    setVerifyingMap(prev => ({ ...prev, [orderId]: true }));
    setFeedbackMap(prev => ({ ...prev, [orderId]: { type: 'success', text: 'Verifying OTP code...' } }));

    try {
      const res = await fetch(`/api/orders/${orderId}/verify-delivery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          otp,
          deliveryPhoto: photoProofs[orderId] || null
        })
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Incorrect OTP code.');
      }

      setFeedbackMap(prev => ({
        ...prev,
        [orderId]: { type: 'success', text: '✅ OTP Verified! Order successfully delivered.' }
      }));

      // Refresh list to update state
      fetchDeliveryOrders();
    } catch (err: any) {
      setFeedbackMap(prev => ({
        ...prev,
        [orderId]: { type: 'error', text: err.message || 'Failed to verify OTP' }
      }));
    } finally {
      setVerifyingMap(prev => ({ ...prev, [orderId]: false }));
    }
  };

  // Filtered orders based on selected tab and search
  const filteredOrders = orders.filter(order => {
    // Filter status tab
    if (statusTab === 'shipped' && order.status !== 'Shipped' && order.status !== 'Processing') return false;
    if (statusTab === 'out_for_delivery' && order.status !== 'Out for Delivery') return false;
    if (statusTab === 'delivered' && order.status !== 'Delivered') return false;

    // Search query matching
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const addr = order.shippingAddress || {};
      const match = 
        order.id.toLowerCase().includes(q) ||
        (order.transactionId || '').toLowerCase().includes(q) ||
        (addr.name || '').toLowerCase().includes(q) ||
        (addr.phone || '').toLowerCase().includes(q) ||
        (addr.street || '').toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Executive Header Banner */}
      <div className="bg-gradient-to-r from-neutral-900 via-indigo-950 to-neutral-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden mb-8 border border-neutral-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-wider">
              <Truck className="h-3.5 w-3.5 text-indigo-400" />
              <span>Aura Marketplace Logistics Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Delivery Executive Hub 🚚
            </h1>
            <p className="text-xs sm:text-sm text-neutral-300 max-w-xl leading-relaxed">
              Accept shipped orders from local fulfillment offices, trigger handover OTP verification, and capture delivery proof upon package completion.
            </p>
          </div>

          {/* Active Delivery Zone Switcher */}
          <div className="bg-white/10 backdrop-blur-md border border-white/15 p-4 rounded-2xl shrink-0 min-w-[280px]">
            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-200 block mb-2">
              📍 Executive Available Zone
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] text-neutral-300 font-bold block mb-1">City / District</label>
                <input
                  type="text"
                  value={activeLocation}
                  onChange={(e) => setActiveLocation(e.target.value)}
                  placeholder="E.g. Delhi"
                  className="w-full text-xs p-2 rounded-lg bg-neutral-900/80 border border-neutral-700 text-white font-semibold outline-none focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="text-[9px] text-neutral-300 font-bold block mb-1">Pincode</label>
                <input
                  type="text"
                  maxLength={6}
                  value={activePincode}
                  onChange={(e) => setActivePincode(e.target.value.replace(/\D/g, ''))}
                  placeholder="E.g. 110001"
                  className="w-full text-xs p-2 rounded-lg bg-neutral-900/80 border border-neutral-700 text-indigo-300 font-mono font-bold outline-none focus:border-indigo-400"
                />
              </div>
            </div>
            <button
              onClick={fetchDeliveryOrders}
              className="w-full mt-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh Assigned Zone</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs & Search Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 bg-neutral-100 p-1.5 rounded-2xl w-full sm:w-auto overflow-x-auto border border-neutral-200/80">
          <button
            onClick={() => setStatusTab('shipped')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              statusTab === 'shipped'
                ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200/80'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            📦 Ready at Hub / Shipped ({orders.filter(o => o.status === 'Shipped' || o.status === 'Processing').length})
          </button>
          <button
            onClick={() => setStatusTab('out_for_delivery')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              statusTab === 'out_for_delivery'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            🛵 Out for Delivery ({orders.filter(o => o.status === 'Out for Delivery').length})
          </button>
          <button
            onClick={() => setStatusTab('delivered')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              statusTab === 'delivered'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            ✅ Completed ({orders.filter(o => o.status === 'Delivered').length})
          </button>
          <button
            onClick={() => setStatusTab('all')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              statusTab === 'all'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            All Orders ({orders.length})
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search order ID, phone, buyer..."
            className="w-full text-xs pl-9 pr-4 py-2.5 bg-white border border-neutral-200 rounded-xl outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
          />
        </div>
      </div>

      {/* Main Delivery Orders Cards List */}
      {loading ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-neutral-200 shadow-xs">
          <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-neutral-700">Loading delivery assignments for {activeLocation}...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 border border-red-200 rounded-3xl text-center">
          <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
          <p className="text-sm font-bold text-red-900">{error}</p>
          <button
            onClick={fetchDeliveryOrders}
            className="mt-3 px-4 py-2 bg-red-600 text-white font-bold text-xs rounded-xl shadow-xs"
          >
            Retry Loading
          </button>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-neutral-200 shadow-xs px-4">
          <PackageCheck className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-neutral-900">No Orders Found</h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
            {statusTab === 'shipped' && `There are currently no orders ready at the delivery office for ${activeLocation}.`}
            {statusTab === 'out_for_delivery' && `No active orders currently out for delivery in this zone.`}
            {statusTab === 'delivered' && `No completed deliveries recorded yet for this location.`}
            {statusTab === 'all' && `No matching orders for location "${activeLocation}". Try updating city or pincode above.`}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredOrders.map((order) => {
            const isCod = (order.paymentMethod || '').toLowerCase().includes('cod') || (order.paymentMethod || '').toLowerCase().includes('cash on delivery');
            const buyerName = order.shippingAddress?.name || order.userEmail || 'Customer Buyer';
            const buyerPhone = order.shippingAddress?.phone || '+91 9876543210';
            const feedback = feedbackMap[order.id];
            const isVerifying = verifyingMap[order.id];

            return (
              <div
                key={order.id}
                className="bg-white rounded-3xl border border-neutral-200 shadow-xs hover:shadow-md transition-shadow overflow-hidden"
              >
                {/* Header Bar */}
                <div className="p-4 sm:p-5 bg-neutral-50/80 border-b border-neutral-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-neutral-900 text-white rounded-xl shadow-xs font-mono font-bold text-xs">
                      #{order.id.slice(0, 10)}
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider block">
                        Placed: {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <span className="text-xs font-bold text-neutral-900">
                        {order.transactionId ? `Txn: ${order.transactionId}` : `Order #${order.id}`}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    {order.status === 'Shipped' && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 border border-blue-200 rounded-full text-xs font-bold">
                        📦 Shipped (At Local Hub)
                      </span>
                    )}
                    {order.status === 'Processing' && (
                      <span className="px-3 py-1 bg-amber-100 text-amber-800 border border-amber-200 rounded-full text-xs font-bold">
                        ⏳ Processing at Hub
                      </span>
                    )}
                    {order.status === 'Out for Delivery' && (
                      <span className="px-3 py-1 bg-amber-500 text-white rounded-full text-xs font-extrabold animate-pulse">
                        🛵 Out for Delivery
                      </span>
                    )}
                    {order.status === 'Delivered' && (
                      <span className="px-3 py-1 bg-emerald-600 text-white rounded-full text-xs font-bold flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Delivered
                      </span>
                    )}

                    {/* Payment Mode Badge */}
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase ${
                      isCod
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    }`}>
                      {isCod ? `COD: ₹${order.total.toLocaleString()} Due` : 'Paid Online'}
                    </span>
                  </div>
                </div>

                {/* Content Body */}
                <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  
                  {/* Column 1: Customer & Phone & Location details */}
                  <div className="space-y-3 border-b md:border-b-0 md:border-r border-neutral-100 pb-5 md:pb-0 md:pr-6">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400 block">
                      👤 Customer & Contact Information
                    </span>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5 text-xs font-bold text-neutral-900">
                        <User className="h-4 w-4 text-indigo-600 shrink-0" />
                        <span>{buyerName}</span>
                      </div>

                      <div className="flex items-center gap-2.5 text-xs font-bold text-indigo-700 bg-indigo-50/80 p-2 rounded-xl border border-indigo-100">
                        <Phone className="h-4 w-4 text-indigo-600 shrink-0" />
                        <a href={`tel:${buyerPhone}`} className="hover:underline">
                          {buyerPhone}
                        </a>
                      </div>

                      <div className="flex items-start gap-2.5 text-xs text-neutral-700">
                        <MapPin className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">{order.shippingAddress?.street || 'Local Address Street'}</p>
                          <p className="text-[11px] text-neutral-500">
                            {order.shippingAddress?.city || userCity}, {order.shippingAddress?.state || userState} - <span className="font-mono font-bold">{order.shippingAddress?.postalCode || userPincode}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Order Items Summary */}
                  <div className="space-y-3 border-b lg:border-b-0 lg:border-r border-neutral-100 pb-5 lg:pb-0 lg:pr-6">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400 block">
                      📦 Product Contents ({order.items?.length || 1} Items)
                    </span>

                    <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                      {order.items?.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-3 p-2 bg-neutral-50 rounded-xl border border-neutral-100">
                          {item.product?.image ? (
                            <img src={item.product.image} alt="" className="h-10 w-10 object-contain rounded-lg bg-white border shrink-0" />
                          ) : (
                            <div className="h-10 w-10 bg-neutral-200 rounded-lg flex items-center justify-center text-xs font-bold text-neutral-500 shrink-0">
                              IMG
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-neutral-900 truncate">{item.name || item.product?.name || 'Item'}</p>
                            <p className="text-[10px] text-neutral-500">Qty: {item.quantity || 1} &bull; ₹{(item.price || item.product?.price || 0).toLocaleString()} each</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-xs font-extrabold">
                      <span className="text-neutral-500">Total Order Value:</span>
                      <span className="text-indigo-600 text-sm">₹{order.total.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Column 3: Delivery Executive Actions */}
                  <div className="space-y-4 flex flex-col justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400 block">
                      ⚡ Action Console
                    </span>

                    {/* Feedback Alert Message */}
                    {feedback && (
                      <div className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                        feedback.type === 'error' ? 'bg-red-50 text-red-900 border border-red-200' : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                      }`}>
                        {feedback.type === 'error' ? <AlertCircle className="h-4 w-4 text-red-600 shrink-0" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
                        <span>{feedback.text}</span>
                      </div>
                    )}

                    {/* Case 1: Order is Shipped or Processing -> Mark Out for Delivery */}
                    {(order.status === 'Shipped' || order.status === 'Processing') && (
                      <div className="space-y-3 bg-blue-50/80 p-4 rounded-2xl border border-blue-200/80">
                        <p className="text-xs text-blue-950 font-semibold leading-relaxed">
                          Package is received at local hub office. Click below to accept assignment and dispatch package Out for Delivery.
                        </p>
                        <button
                          onClick={() => handleMarkOutForDelivery(order.id)}
                          disabled={isVerifying}
                          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Truck className="h-4 w-4" />
                          <span>{isVerifying ? 'Generating OTP & Updating...' : 'Accept & Dispatch Out for Delivery 🛵'}</span>
                        </button>
                      </div>
                    )}

                    {/* Case 2: Order is Out for Delivery -> Require 6-digit OTP & optional photo proof */}
                    {order.status === 'Out for Delivery' && (
                      <div className="space-y-3 bg-amber-50/90 p-4 rounded-2xl border border-amber-200/90">
                        <div className="flex items-center gap-1.5 text-amber-900 font-extrabold text-xs">
                          <ShieldCheck className="h-4 w-4 text-amber-600" />
                          <span>OTP Handover Verification</span>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-amber-800 uppercase block mb-1">
                            Enter 6-Digit Buyer OTP Code *
                          </label>
                          <input
                            type="text"
                            maxLength={6}
                            value={otpInputs[order.id] || ''}
                            onChange={(e) => setOtpInputs(prev => ({ ...prev, [order.id]: e.target.value.replace(/\D/g, '') }))}
                            placeholder="e.g. 584920"
                            className="w-full text-center font-mono text-base font-bold tracking-widest py-2 bg-white border border-amber-300 rounded-xl outline-none focus:border-amber-600 text-amber-900"
                          />
                        </div>

                        {/* Optional Delivery Photo Proof */}
                        <div>
                          <label className="text-[10px] font-bold text-neutral-600 uppercase flex items-center justify-between mb-1">
                            <span>Delivery Photo Proof (Optional)</span>
                            <span className="text-[9px] text-neutral-400">Doorstep / Handover photo</span>
                          </label>
                          
                          <div className="flex items-center gap-2">
                            <label className="flex-1 border border-dashed border-amber-300 bg-white hover:bg-amber-50/50 p-2 rounded-xl text-center cursor-pointer transition-colors text-xs font-bold text-amber-800 flex items-center justify-center gap-1.5">
                              <Camera className="h-4 w-4 text-amber-600" />
                              <span>{photoProofs[order.id] ? 'Change Photo' : 'Attach Photo Proof'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={(e) => handlePhotoUpload(order.id, e)}
                                className="hidden"
                              />
                            </label>
                          </div>

                          {photoProofs[order.id] && (
                            <div className="mt-2 relative inline-block">
                              <img src={photoProofs[order.id]} alt="Delivery Proof" className="h-16 w-16 object-cover rounded-lg border border-amber-300" />
                              <button
                                onClick={() => setPhotoProofs(prev => ({ ...prev, [order.id]: '' }))}
                                className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-0.5 hover:bg-red-700"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => handleVerifyDelivery(order.id)}
                          disabled={isVerifying || !(otpInputs[order.id]?.length === 6)}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>{isVerifying ? 'Verifying OTP Code...' : 'Verify OTP & Complete Delivery ✅'}</span>
                        </button>
                      </div>
                    )}

                    {/* Case 3: Order is Delivered -> Show Success Summary */}
                    {order.status === 'Delivered' && (
                      <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2">
                        <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-xs">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span>Delivered & Verified</span>
                        </div>
                        <p className="text-[11px] text-emerald-900 leading-snug">
                          Order marked as completed upon OTP verification. AuraCoins unlocked for customer.
                        </p>
                        {order.deliveryPhoto && (
                          <div className="mt-2">
                            <span className="text-[9px] font-bold text-emerald-700 block mb-1 uppercase">Delivery Photo Proof:</span>
                            <img src={order.deliveryPhoto} alt="Delivery Proof" className="h-16 w-16 object-cover rounded-lg border border-emerald-300" />
                          </div>
                        )}
                      </div>
                    )}

                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
