import React, { useState, useEffect } from 'react';
import { Package, Clock, ShieldCheck, ChevronDown, ChevronUp, MapPin, Truck } from 'lucide-react';
import { Order, UserProfile } from '../types';
import { formatCurrencyVal } from '../utils/currency';

interface OrderHistoryProps {
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
}

export default function OrderHistory({
  currentUser,
  onOpenAuth
}: OrderHistoryProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      fetchOrders();
    }
  }, [currentUser]);

  const fetchOrders = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/orders/user/${currentUser.uid}`);
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpand = (orderId: string) => {
    setExpandedOrderId(prev => (prev === orderId ? null : orderId));
  };

  if (!currentUser) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-neutral-50 text-neutral-400 mb-4">
          <Package className="h-8 w-8" />
        </div>
        <h3 className="font-sans font-bold text-lg text-neutral-900">Your Order History</h3>
        <p className="mt-1 text-sm text-neutral-500 max-w-sm mx-auto">
          Please log in to your account to load your previous order receipts and track delivery progress in real-time.
        </p>
        <button
          onClick={onOpenAuth}
          className="mt-6 px-5 py-2.5 rounded-xl bg-neutral-950 text-white font-bold text-xs hover:bg-neutral-800 transition-colors shadow-md"
        >
          Sign In / Register Account
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-neutral-100 pb-5 mb-8 gap-4">
        <div>
          <h2 className="font-sans font-extrabold text-2xl text-neutral-900 tracking-tight flex items-center gap-2">
            <Package className="h-6 w-6 text-neutral-600" />
            <span>Order History & Tracking</span>
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Access secure transaction details and follow shipping updates step-by-step.
          </p>
        </div>
        <button
          onClick={fetchOrders}
          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          Refresh Orders
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="text-center">
            <Clock className="h-8 w-8 text-indigo-600 animate-spin mx-auto mb-2" />
            <span className="text-xs text-neutral-500 font-mono">Retrieving receipt records...</span>
          </div>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-neutral-100 rounded-2xl bg-neutral-50/50">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 mb-4">
            <Package className="h-6 w-6" />
          </div>
          <h3 className="font-sans font-semibold text-neutral-900 text-sm">No orders recorded</h3>
          <p className="mt-1 text-xs text-neutral-400 max-w-xs mx-auto">
            You haven't placed any orders yet. Visit our product catalog to select your favorite premium items.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isExpanded = expandedOrderId === order.id;
            
            // Helper to see status index
            const statusSteps = ['Pending', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered'];
            const currentStatusIndex = statusSteps.indexOf(order.status) >= 0 ? statusSteps.indexOf(order.status) : 0;

            return (
              <div 
                key={order.id} 
                className="border border-neutral-100 rounded-2xl bg-white overflow-hidden shadow-xs hover:border-neutral-200 transition-all"
              >
                {/* Header row */}
                <div 
                  onClick={() => toggleExpand(order.id)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 cursor-pointer hover:bg-neutral-50/40 select-none"
                >
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
                    <div>
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider leading-none">Placed</p>
                      <p className="text-xs font-medium text-neutral-800 mt-1">
                        {new Date(order.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider leading-none">Transaction ID</p>
                      <p className="text-xs font-mono font-bold text-neutral-800 mt-1 uppercase">
                        {order.transactionId}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider leading-none">Receipt Total</p>
                      <p className="text-xs font-bold text-neutral-950 mt-1 font-sans">
                        {formatCurrencyVal(order.total)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider leading-none">Current Status</p>
                      <span className={`inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                        order.status === 'Delivered' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : order.status === 'Cancelled'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : order.status === 'Out for Delivery'
                          ? 'bg-amber-500 text-white shadow-xs'
                          : order.status === 'Shipped'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end items-center pl-2 sm:border-l sm:border-neutral-100">
                    <button className="p-1 text-neutral-400 hover:text-neutral-700">
                      {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div className="border-t border-neutral-100 p-5 sm:p-6 bg-neutral-50/30">

                    {/* Delivery OTP Display Banner (Only shown when status is Out for Delivery) */}
                    {order.status === 'Out for Delivery' && order.deliveryOtp && (
                      <div className="mb-6 p-4 bg-amber-50/90 border border-amber-200/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-xs shrink-0 mt-0.5 sm:mt-0">
                            <ShieldCheck className="h-6 w-6" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-widest block">Out For Delivery — Handover OTP</span>
                            <p className="text-xs text-amber-950 font-semibold mt-0.5">
                              {order.paymentMethod?.toLowerCase().includes('cod') || order.paymentMethod?.toLowerCase().includes('cash on delivery')
                                ? `Cash on Delivery: Payment of ₹${order.total.toLocaleString()} is due. Share this OTP with your delivery agent:`
                                : `Share this 6-digit OTP code with your delivery executive upon receiving your package:`}
                            </p>
                          </div>
                        </div>

                        <div className="bg-white px-5 py-2.5 rounded-xl border border-amber-300 shadow-xs text-center w-full sm:w-auto shrink-0">
                          <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">Your Handover OTP</span>
                          <span className="font-mono font-black text-2xl text-amber-600 tracking-widest">
                            {order.deliveryOtp}
                          </span>
                        </div>
                      </div>
                    )}
                    {/* Visual Status Tracker Step-by-step line */}
                    {order.status === 'Cancelled' ? (
                      <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-2xl text-center">
                        <span className="text-xs font-black text-red-700 uppercase tracking-wider block">✕ Order Cancelled</span>
                        <p className="text-[11px] text-red-600 mt-0.5">This shipment order was cancelled. Any pre-authorized charges have been reversed.</p>
                      </div>
                    ) : (
                      <div className="mb-8 pt-2">
                        <div className="flex items-center justify-between relative max-w-2xl mx-auto">
                          
                          {/* Gray background line */}
                          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-neutral-200 -translate-y-1/2 z-0" />
                          
                          {/* Dynamic green progress line */}
                          <div 
                            className="absolute top-1/2 left-0 h-0.5 bg-emerald-600 -translate-y-1/2 z-0 transition-all duration-500" 
                            style={{ width: `${(Math.max(0, currentStatusIndex) / (statusSteps.length - 1)) * 100}%` }}
                          />

                          {statusSteps.map((step, idx) => {
                            const isDone = idx <= currentStatusIndex;
                            const isActive = idx === currentStatusIndex;

                            return (
                              <div key={step} className="flex flex-col items-center relative z-10">
                                <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold font-mono border-2 transition-all duration-300 ${
                                  isActive
                                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-100 scale-110'
                                    : isDone
                                    ? 'bg-white border-emerald-600 text-emerald-600'
                                    : 'bg-white border-neutral-200 text-neutral-400'
                                }`}>
                                  {isDone ? '✓' : idx + 1}
                                </div>
                                <span className={`text-[10px] font-bold uppercase tracking-wider mt-2 whitespace-nowrap ${
                                  isActive 
                                    ? 'text-emerald-700 font-extrabold'
                                    : isDone
                                    ? 'text-neutral-700'
                                    : 'text-neutral-400'
                                }`}>
                                  {step}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-neutral-100">
                      {/* Left: Products summary */}
                      <div>
                        <h4 className="text-[10px] font-bold font-mono text-neutral-400 uppercase tracking-wider mb-3">
                          Items Purchased
                        </h4>
                        <div className="space-y-3">
                          {order.items.map((item) => (
                            <div key={item.product.id} className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded overflow-hidden bg-white border border-neutral-200 flex-shrink-0">
                                <img src={item.product.image} alt={item.product.name} className="h-full w-full object-cover" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-neutral-800 truncate">{item.product.name}</p>
                                <p className="text-[10px] text-neutral-400 font-mono mt-0.5">Qty: {item.quantity} x {formatCurrencyVal(item.product.price)}</p>
                              </div>
                              <span className="text-xs font-bold text-neutral-900 font-sans">{formatCurrencyVal(item.product.price * item.quantity)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Right: Shipping destination & payment */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-[10px] font-bold font-mono text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            <span>Shipping Destination</span>
                          </h4>
                          <div className="text-xs text-neutral-600 leading-relaxed bg-white p-3 rounded-xl border border-neutral-100">
                            <p className="font-semibold text-neutral-800">{order.shippingAddress.name}</p>
                            <p>{order.shippingAddress.street}</p>
                            <p>{order.shippingAddress.city}, {order.shippingAddress.postalCode}</p>
                            <p>{order.shippingAddress.country}</p>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-[10px] font-bold font-mono text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                            <Truck className="h-3.5 w-3.5" />
                            <span>Payment & Carriage</span>
                          </h4>
                          <div className="text-xs text-neutral-600 leading-relaxed bg-white p-3 rounded-xl border border-neutral-100 flex justify-between items-center">
                            <div>
                              <p className="font-semibold text-neutral-800">{order.paymentMethod}</p>
                              <p className="text-[10px] text-neutral-400">Transaction secured by Aura SecurePay</p>
                            </div>
                            <span className="font-sans font-bold text-xs text-neutral-900">{formatCurrencyVal(order.total)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
