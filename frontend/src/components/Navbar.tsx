import React, { useState, useRef, useEffect } from 'react';
import { ShoppingBag, Sparkles, User, Search, LogOut, Package, Settings, Store, MapPin, ChevronDown, X, Plus, Check, Truck, LocateFixed, Loader2, Tag, ArrowRight, Grid, Menu } from 'lucide-react';
import { UserProfile, Product } from '../types';
import { detectCurrentLocation } from '../utils/location';
import { matchesProductSearch } from '../utils/search';
import { getProductImageUrl, handleImageError } from '../utils/image';
import { CATEGORIES_DATA, getSubcategoriesForCategory } from '../data/categories';
import { formatCurrencyVal } from '../utils/currency';

interface NavbarProps {
  cartCount: number;
  onOpenCart: () => void;
  onOpenAssistant: () => void;
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onSelectTab: (tab: 'shop' | 'orders' | 'admin' | 'dashboard' | 'seller' | 'delivery') => void;
  currentTab: 'shop' | 'orders' | 'admin' | 'dashboard' | 'seller' | 'delivery';
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  categories: string[];
  userPincode: string;
  userCity: string;
  userState: string;
  onUpdateLocation: (pincode: string, city: string, state: string) => void;
  savedAddresses: any[];
  onAddAddress: (address: any) => void;
  products?: Product[];
  onViewProduct?: (p: Product) => void;
  selectedSubcategory?: string;
  setSelectedSubcategory?: (sub: string) => void;
}

export default function Navbar({
  cartCount,
  onOpenCart,
  onOpenAssistant,
  currentUser,
  onOpenAuth,
  onLogout,
  onSelectTab,
  currentTab,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  categories,
  userPincode,
  userCity,
  userState,
  onUpdateLocation,
  savedAddresses = [],
  onAddAddress,
  products = [],
  onViewProduct,
  selectedSubcategory = 'All',
  setSelectedSubcategory
}: NavbarProps) {
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [tempPincode, setTempPincode] = useState('');
  const [tempCity, setTempCity] = useState('');
  const [tempState, setTempState] = useState('');
  const [lookupStatus, setLookupStatus] = useState('');

  // Add Address Form state
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newStreet, setNewStreet] = useState('');
  const [newPincode, setNewPincode] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newState, setNewState] = useState('');
  const [newLookupStatus, setNewLookupStatus] = useState('');

  // GPS Detection state
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  // Search Focus & Overlay state
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute search overlay matching products
  const matchingProducts = searchQuery.trim()
    ? products.filter(p => matchesProductSearch(p, searchQuery)).slice(0, 5)
    : [];

  const totalMatchingCount = searchQuery.trim()
    ? products.filter(p => matchesProductSearch(p, searchQuery)).length
    : 0;

  // Compute matching category & subcategory suggestions
  const matchingCategorySuggestions: { category: string; subcategory?: string }[] = [];
  if (searchQuery.trim().length > 1) {
    const qLower = searchQuery.trim().toLowerCase();
    CATEGORIES_DATA.forEach(c => {
      if (c.name.toLowerCase().includes(qLower)) {
        matchingCategorySuggestions.push({ category: c.name });
      }
      c.subcategories.forEach(sub => {
        if (sub.toLowerCase().includes(qLower)) {
          matchingCategorySuggestions.push({ category: c.name, subcategory: sub });
        }
      });
    });
  }

  // Active category subcategories
  const currentSubcategories = selectedCategory !== 'All' ? getSubcategoriesForCategory(selectedCategory) : [];

  const handleDetectGPS = async () => {
    setIsDetectingLocation(true);
    setLookupStatus("📡 Detecting current GPS location...");
    try {
      const loc = await detectCurrentLocation();
      setTempPincode(loc.pincode);
      setTempCity(loc.city);
      setTempState(loc.state);
      onUpdateLocation(loc.pincode, loc.city, loc.state);
      setLookupStatus(`📍 Current Location: ${loc.city}, ${loc.state} (${loc.pincode})`);
    } catch (err: any) {
      setLookupStatus(`⚠️ ${err.message || 'GPS location error'}`);
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const handleDetectGPSForNewAddress = async () => {
    setIsDetectingLocation(true);
    setNewLookupStatus("📡 Detecting GPS...");
    try {
      const loc = await detectCurrentLocation();
      if (loc.street) setNewStreet(loc.street);
      setNewPincode(loc.pincode);
      setNewCity(loc.city);
      setNewState(loc.state);
      setNewLookupStatus(`📍 Current Location: ${loc.city}, ${loc.state}`);
    } catch (err: any) {
      setNewLookupStatus(`⚠️ ${err.message || 'GPS error'}`);
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const handlePincodeLookup = async (val: string) => {
    const cleaned = val.replace(/\D/g, '').substring(0, 6);
    setTempPincode(cleaned);
    if (cleaned.length === 6) {
      setLookupStatus("🔍 Syncing...");
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${cleaned}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data[0] && data[0].Status === "Success" && data[0].PostOffice?.[0]) {
            const office = data[0].PostOffice[0];
            setTempCity(office.District || office.Name);
            setTempState(office.State);
            setLookupStatus(`📍 ${office.District}, ${office.State}`);
          } else {
            setLookupStatus("⚠️ PIN not found.");
          }
        } else {
          setLookupStatus("⚠️ Busy. Type city.");
        }
      } catch (err) {
        setLookupStatus("");
      }
    } else {
      setLookupStatus("");
    }
  };

  const handleNewAddressPincodeLookup = async (val: string) => {
    const cleaned = val.replace(/\D/g, '').substring(0, 6);
    setNewPincode(cleaned);
    if (cleaned.length === 6) {
      setNewLookupStatus("🔍 Syncing...");
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${cleaned}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data[0] && data[0].Status === "Success" && data[0].PostOffice?.[0]) {
            const office = data[0].PostOffice[0];
            setNewCity(office.District || office.Name);
            setNewState(office.State);
            setNewLookupStatus(`📍 ${office.District}, ${office.State}`);
          } else {
            setNewLookupStatus("⚠️ PIN not found.");
          }
        } else {
          setNewLookupStatus("⚠️ PIN API error.");
        }
      } catch (err) {
        setNewLookupStatus("");
      }
    } else {
      setNewLookupStatus("");
    }
  };

  const saveLocation = () => {
    if (tempPincode.length === 6 && tempCity && tempState) {
      onUpdateLocation(tempPincode, tempCity, tempState);
      setIsLocationOpen(false);
      setLookupStatus("");
    }
  };

  const handleCreateAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPincode.length === 6 && newCity && newState && newName && newStreet) {
      const newAddr = {
        id: 'addr-' + Date.now(),
        name: newName,
        street: newStreet,
        city: newCity,
        state: newState,
        postalCode: newPincode,
        country: 'India'
      };
      onAddAddress(newAddr);
      onUpdateLocation(newPincode, newCity, newState);
      setIsAddingNew(false);
      // reset form
      setNewName('');
      setNewStreet('');
      setNewPincode('');
      setNewCity('');
      setNewState('');
      setNewLookupStatus('');
    }
  };
  const isDeliveryUser = currentUser?.role === 'delivery' || currentUser?.email === 'deliveryboy@aura.com';
  const isAdminUser = currentUser?.role === 'admin';
  const isSellerUser = currentUser?.role === 'seller';
  const isRoleRestrictedUser = isDeliveryUser || isAdminUser || isSellerUser;

  return (
    <header id="app-navbar" className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          
          {/* Logo */}
          <div 
            onClick={() => {
              if (isAdminUser) {
                onSelectTab('admin');
              } else if (isSellerUser) {
                onSelectTab('seller');
              } else if (isDeliveryUser) {
                onSelectTab('delivery');
              } else {
                onSelectTab('shop');
                setSelectedCategory('All');
              }
            }} 
            className="flex items-center gap-2 cursor-pointer select-none"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 text-white shadow-md">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <span className="font-sans font-extrabold text-lg tracking-tight text-neutral-900 block leading-none">
                AuraMart
              </span>
              <span className="font-mono text-[9px] text-amber-600 font-bold uppercase tracking-widest">
                E-Commerce
              </span>
            </div>
          </div>

          {/* Search Bar - only shown on Shop tab for non-restricted roles */}
          {!isRoleRestrictedUser && currentTab === 'shop' && (
            <div ref={searchContainerRef} className="hidden md:flex flex-1 max-w-lg relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <Search className="h-4 w-4 text-neutral-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchFocused(true);
                }}
                placeholder="Search products by name, specs, brand, category..."
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2.5 pl-10 pr-9 text-xs font-medium outline-none transition-all placeholder:text-neutral-400 focus:border-neutral-900 focus:bg-white focus:ring-2 focus:ring-neutral-900/10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 hover:text-neutral-700"
                  title="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}

              {/* Instant Search Results Dropdown Overlay */}
              {isSearchFocused && searchQuery.trim().length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-neutral-100 z-50 p-4 max-h-[80vh] overflow-y-auto animate-fade-in divide-y divide-neutral-100">
                  
                  {/* Category / Subcategory suggestions */}
                  {matchingCategorySuggestions.length > 0 && (
                    <div className="pb-3 mb-2">
                      <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Tag className="h-3 w-3 text-indigo-500" />
                        <span>Matching Categories</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {matchingCategorySuggestions.slice(0, 6).map((item, idx) => (
                          <button
                            key={`sug-${idx}`}
                            onClick={() => {
                              setSelectedCategory(item.category);
                              if (item.subcategory && setSelectedSubcategory) {
                                setSelectedSubcategory(item.subcategory);
                              }
                              setIsSearchFocused(false);
                            }}
                            className="text-xs px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-semibold hover:bg-indigo-100 transition-colors flex items-center gap-1"
                          >
                            <span>{item.category}</span>
                            {item.subcategory && (
                              <span className="text-indigo-400 font-normal">&rsaquo; {item.subcategory}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matching Products */}
                  <div className="pt-2">
                    <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Package className="h-3 w-3 text-emerald-600" />
                        <span>Matching Products ({totalMatchingCount})</span>
                      </span>
                    </div>

                    {matchingProducts.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {matchingProducts.map((p) => (
                          <div
                            key={`search-res-${p.id}`}
                            onClick={() => {
                              if (onViewProduct) onViewProduct(p);
                              setIsSearchFocused(false);
                            }}
                            className="flex items-center gap-3 p-2 rounded-xl hover:bg-neutral-50 cursor-pointer transition-colors border border-transparent hover:border-neutral-100 group"
                          >
                            <img
                              src={getProductImageUrl(p.image)}
                              alt={p.name}
                              onError={handleImageError}
                              className="w-12 h-12 rounded-lg object-cover bg-neutral-100 shrink-0 border"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold text-neutral-900 truncate group-hover:text-indigo-600 transition-colors">
                                {p.name}
                              </h4>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-600 font-medium">
                                  {p.category} {p.subcategory ? `• ${p.subcategory}` : ''}
                                </span>
                                {p.brand && (
                                  <span className="text-[10px] font-mono text-neutral-400">
                                    {p.brand}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-neutral-400 truncate mt-0.5">
                                {p.description}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-xs font-extrabold text-neutral-950 block">
                                {formatCurrencyVal(p.price)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-6 text-center text-xs text-neutral-400 font-medium">
                        No products or details match "{searchQuery}"
                      </div>
                    )}
                  </div>

                  {/* See all results link */}
                  {totalMatchingCount > 0 && (
                    <div className="pt-3 mt-2 text-center">
                      <button
                        onClick={() => {
                          setIsSearchFocused(false);
                          const el = document.getElementById('catalog-view');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors inline-flex items-center gap-1 hover:underline"
                      >
                        <span>See all {totalMatchingCount} matching products</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Right Action Items */}
          <div className="flex items-center gap-2 sm:gap-4">
            
            {/* Navigation items based on role (Desktop) */}
            <nav className="hidden md:flex items-center gap-1 bg-neutral-100 p-1 rounded-lg text-xs font-medium">
              {isAdminUser ? (
                <button
                  onClick={() => onSelectTab('admin')}
                  className="px-3.5 py-1.5 rounded-md bg-neutral-900 text-white shadow-sm font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span>Admin Console</span>
                </button>
              ) : isSellerUser ? (
                <button
                  onClick={() => onSelectTab('seller')}
                  className="px-3.5 py-1.5 rounded-md bg-emerald-700 text-white shadow-sm font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Store className="h-3.5 w-3.5" />
                  <span>Seller Dashboard</span>
                </button>
              ) : isDeliveryUser ? (
                <button
                  onClick={() => onSelectTab('delivery')}
                  className="px-3.5 py-1.5 rounded-md bg-indigo-600 text-white shadow-sm font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Truck className="h-3.5 w-3.5" />
                  <span>Delivery Hub</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => onSelectTab('shop')}
                    className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                      currentTab === 'shop'
                        ? 'bg-white text-neutral-900 shadow-sm font-bold'
                        : 'text-neutral-500 hover:text-neutral-900'
                    }`}
                  >
                    Catalog
                  </button>
                  <button
                    onClick={() => onSelectTab('orders')}
                    className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                      currentTab === 'orders'
                        ? 'bg-white text-neutral-900 shadow-sm font-bold'
                        : 'text-neutral-500 hover:text-neutral-900'
                    }`}
                  >
                    <Package className="h-3.5 w-3.5" />
                    <span>Orders</span>
                  </button>
                </>
              )}
            </nav>

            {/* Interactive Location Picker (Desktop) */}
            {!isRoleRestrictedUser && (
              <div className="relative hidden md:block">
              <button
                onClick={() => {
                  setTempPincode(userPincode);
                  setTempCity(userCity);
                  setTempState(userState);
                  setIsLocationOpen(!isLocationOpen);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-lg text-[11px] font-bold text-neutral-700 transition-colors cursor-pointer select-none"
              >
                <MapPin className="h-3.5 w-3.5 text-indigo-600" />
                <span className="max-w-[100px] truncate">
                  {userCity || "New Delhi"}
                </span>
                <span className="font-mono text-indigo-700">({userPincode})</span>
                <ChevronDown className="h-3 w-3 text-neutral-400" />
              </button>

              {isLocationOpen && (
                <div className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-white border border-neutral-200 rounded-xl shadow-xl p-4 z-50 animate-fade-in text-xs space-y-3 max-h-[450px] overflow-y-auto">
                  <div className="flex justify-between items-center border-b border-neutral-100 pb-2">
                    <span className="font-sans font-bold text-neutral-900 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-indigo-600" />
                      <span>{isAddingNew ? 'Add New Address' : 'Delivery Address'}</span>
                    </span>
                    <button
                      onClick={() => {
                        setIsLocationOpen(false);
                        setIsAddingNew(false);
                      }}
                      className="text-neutral-400 hover:text-neutral-900"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  
                  {isAddingNew ? (
                    <form onSubmit={handleCreateAddressSubmit} className="space-y-2.5">
                      <div className="flex items-center justify-between pb-1 border-b border-neutral-100">
                        <span className="text-[10px] text-neutral-500 font-semibold">Autofill from GPS</span>
                        <button
                          type="button"
                          onClick={handleDetectGPSForNewAddress}
                          disabled={isDetectingLocation}
                          className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          {isDetectingLocation ? (
                            <Loader2 className="h-3 w-3 animate-spin text-indigo-600" />
                          ) : (
                            <LocateFixed className="h-3 w-3 text-indigo-600" />
                          )}
                          <span>Detect GPS</span>
                        </button>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-0.5">Receiver Name</label>
                        <input
                          type="text"
                          required
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          placeholder="e.g. Alex Morgan"
                          className="w-full text-xs p-2 border border-neutral-200 rounded bg-neutral-50 focus:bg-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-0.5">Street Address / Line 1</label>
                        <input
                          type="text"
                          required
                          value={newStreet}
                          onChange={(e) => setNewStreet(e.target.value)}
                          placeholder="e.g. 45, Connaught Place"
                          className="w-full text-xs p-2 border border-neutral-200 rounded bg-neutral-50 focus:bg-white outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-0.5">6-Digit PIN</label>
                          <input
                            type="text"
                            maxLength={6}
                            required
                            value={newPincode}
                            onChange={(e) => handleNewAddressPincodeLookup(e.target.value)}
                            placeholder="e.g. 110001"
                            className="w-full text-xs p-2 border border-neutral-200 rounded bg-neutral-50 focus:bg-white outline-none font-mono font-bold text-indigo-600"
                          />
                        </div>
                        <div className="flex items-end pb-1.5">
                          {newLookupStatus && (
                            <span className="text-[10px] text-indigo-600 font-semibold leading-tight truncate">
                              {newLookupStatus}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-0.5">City</label>
                          <input
                            type="text"
                            required
                            value={newCity}
                            onChange={(e) => setNewCity(e.target.value)}
                            placeholder="City"
                            className="w-full text-xs p-2 border border-neutral-200 rounded bg-neutral-50 focus:bg-white outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-0.5">State</label>
                          <input
                            type="text"
                            required
                            value={newState}
                            onChange={(e) => setNewState(e.target.value)}
                            placeholder="State"
                            className="w-full text-xs p-2 border border-neutral-200 rounded bg-neutral-50 focus:bg-white outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-neutral-100">
                        <button
                          type="button"
                          onClick={() => setIsAddingNew(false)}
                          className="flex-1 py-2 border border-neutral-200 text-neutral-600 hover:bg-neutral-50 font-bold rounded-lg transition-colors text-[11px]"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={newPincode.length !== 6 || !newCity || !newState || !newName || !newStreet}
                          className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors text-[11px]"
                        >
                          Add & Save Address
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-3">
                      {/* Active Location Info badge */}
                      <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-indigo-500 block uppercase tracking-wide">Active Delivery Hub</span>
                          <span className="font-semibold text-neutral-900 text-xs">{userCity}, {userState} ({userPincode})</span>
                        </div>
                        <Check className="h-4 w-4 text-indigo-600 shrink-0" />
                      </div>

                      {/* Guest Geo Location Prompt if not logged in */}
                      {!currentUser && (
                        <div className="p-3 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl space-y-2">
                          <div className="flex items-center gap-1.5 text-indigo-900 font-bold text-xs">
                            <LocateFixed className="h-4 w-4 text-indigo-600 animate-pulse" />
                            <span>Default Address: Use Geo Location (GPS)</span>
                          </div>
                          <p className="text-[10px] text-neutral-600 leading-tight">
                            You are browsing as guest. Use GPS to detect your location for exact delivery timelines.
                          </p>
                        </div>
                      )}

                      {/* Instant GPS Current Location Detector Button */}
                      <button
                        type="button"
                        onClick={handleDetectGPS}
                        disabled={isDetectingLocation}
                        className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 text-white font-bold rounded-xl shadow-sm transition-all text-xs flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isDetectingLocation ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin text-white" />
                            <span>Detecting GPS Location...</span>
                          </>
                        ) : (
                          <>
                            <LocateFixed className="h-4 w-4 text-indigo-200" />
                            <span>Use Current Location (GPS)</span>
                          </>
                        )}
                      </button>

                      {/* List of Saved Addresses - Only shown if logged in */}
                      <div>
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">Saved Addresses</span>
                        {!currentUser ? (
                          <div className="p-3 bg-neutral-50 border border-dashed border-neutral-200 rounded-xl text-center space-y-2">
                            <p className="text-[11px] text-neutral-500 font-medium">Saved addresses are private to your user account.</p>
                            <button
                              type="button"
                              onClick={() => {
                                setIsLocationOpen(false);
                                onOpenAuth();
                              }}
                              className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-[10px] rounded-lg transition-colors cursor-pointer"
                            >
                              Log In to View Saved Addresses
                            </button>
                          </div>
                        ) : savedAddresses.length === 0 ? (
                          <div className="text-center py-4 bg-neutral-50 border border-dashed border-neutral-200 rounded-xl">
                            <p className="text-[11px] text-neutral-400">No custom delivery addresses saved yet.</p>
                          </div>
                        ) : (
                          <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                            {savedAddresses.map((addr) => {
                              const isActive = addr.postalCode === userPincode;
                              return (
                                <div
                                  key={addr.id}
                                  onClick={() => {
                                    onUpdateLocation(addr.postalCode, addr.city, addr.state);
                                    setIsLocationOpen(false);
                                  }}
                                  className={`p-2 border rounded-xl text-left cursor-pointer transition-all ${
                                    isActive
                                      ? 'bg-neutral-900 border-neutral-950 text-white shadow-sm'
                                      : 'bg-[#FAFAFA] border-neutral-150 hover:bg-neutral-50 text-neutral-700'
                                  }`}
                                >
                                  <div className="flex justify-between items-start gap-1">
                                    <p className={`font-semibold text-[11px] ${isActive ? 'text-white' : 'text-neutral-900'}`}>{addr.name}</p>
                                    {isActive && <Check className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />}
                                  </div>
                                  <p className="text-[10px] opacity-80 line-clamp-1">{addr.street}</p>
                                  <p className="text-[9px] opacity-60 font-mono">{addr.city}, {addr.state} - {addr.postalCode}</p>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Add New Address action trigger - Only if logged in */}
                      {currentUser && (
                        <button
                          onClick={() => setIsAddingNew(true)}
                          className="w-full py-2 border border-dashed border-neutral-300 hover:border-neutral-400 text-neutral-700 font-bold rounded-xl transition-all text-xs flex items-center justify-center gap-1.5 hover:bg-neutral-50 cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5 text-neutral-500" />
                          <span>Add New Address</span>
                        </button>
                      )}

                      {/* Divider for Manual PIN lookup */}
                      <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-neutral-100"></div>
                        <span className="flex-shrink mx-3 text-[9px] text-neutral-400 font-bold uppercase tracking-wider">Or Manual PIN Filter</span>
                        <div className="flex-grow border-t border-neutral-100"></div>
                      </div>

                      {/* Manual lookup controls */}
                      <div className="space-y-2">
                        <div>
                          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">6-Digit Indian PIN</label>
                          <input
                            type="text"
                            maxLength={6}
                            value={tempPincode}
                            onChange={(e) => handlePincodeLookup(e.target.value)}
                            placeholder="E.g., 110001"
                            className="w-full text-xs p-2 border border-neutral-200 rounded bg-neutral-50 focus:bg-white outline-none font-mono"
                          />
                        </div>
                        {lookupStatus && (
                          <p className="text-[10px] text-indigo-600 font-semibold">
                            {lookupStatus}
                          </p>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">City</label>
                            <input
                              type="text"
                              value={tempCity}
                              onChange={(e) => setTempCity(e.target.value)}
                              placeholder="District"
                              className="w-full text-[11px] p-2 border border-neutral-200 rounded bg-white outline-none font-sans"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">State</label>
                            <input
                              type="text"
                              value={tempState}
                              onChange={(e) => setTempState(e.target.value)}
                              placeholder="State"
                              className="w-full text-[11px] p-2 border border-neutral-200 rounded bg-white outline-none font-sans"
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={saveLocation}
                        disabled={tempPincode.length !== 6 || !tempCity || !tempState}
                        className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white font-bold rounded-lg transition-colors text-[11px]"
                      >
                        Apply Location Filter
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            )}

            {/* AI Assistant Pulsing Button */}
            {!isRoleRestrictedUser && (
              <button
                onClick={onOpenAssistant}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 transition-all shadow-sm select-none cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 text-indigo-600 animate-pulse" />
                <span>Concierge</span>
              </button>
            )}

            {/* Cart Button */}
            {!isRoleRestrictedUser && (
              <button
                onClick={onOpenCart}
                className="relative p-2 text-neutral-600 hover:text-neutral-900 transition-colors rounded-lg hover:bg-neutral-100 cursor-pointer"
                title="View Shopping Cart"
              >
                <ShoppingBag className="h-5.5 w-5.5" />
                {currentUser && cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-neutral-950 text-[10px] font-bold text-white ring-2 ring-white animate-bounce-short">
                    {cartCount}
                  </span>
                )}
              </button>
            )}

            {/* User Profile / Login / Logout (Desktop) */}
            <div className="hidden md:flex items-center gap-2">
              {currentUser ? (
                <>
                  <button
                    onClick={() => onSelectTab('dashboard')}
                    title="View Profile Dashboard"
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all select-none cursor-pointer ${
                      currentTab === 'dashboard'
                        ? 'bg-neutral-950 text-white border-neutral-950 shadow-xs'
                        : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-900'
                    }`}
                  >
                    <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      currentTab === 'dashboard' ? 'bg-white/20 text-white' : 'bg-neutral-900 text-white'
                    }`}>
                      <User className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-xs font-bold truncate max-w-[120px]">
                      {currentUser.displayName || currentUser.email.split('@')[0]}
                    </span>
                    {currentUser.role && currentUser.role !== 'customer' && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-extrabold uppercase">
                        {currentUser.role}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={onLogout}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-900 text-white hover:bg-neutral-800 transition-all shadow-sm cursor-pointer"
                    title="Logout Account"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={onOpenAuth}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-900 text-white hover:bg-neutral-800 transition-all shadow-sm cursor-pointer"
                >
                  <User className="h-3.5 w-3.5" />
                  <span>Login</span>
                </button>
              )}
            </div>

            {/* 3-Line Mobile Hamburger Menu Toggle Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-neutral-700 hover:text-neutral-950 hover:bg-neutral-100 rounded-xl transition-colors md:hidden cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6 text-neutral-900" />
              ) : (
                <Menu className="h-6 w-6 text-neutral-900" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Expandable Drawer Menu (3-Line Menu content) */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-neutral-200/80 bg-white px-4 py-4 space-y-4 shadow-xl animate-fade-in">
            {/* Navigation Tabs */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block px-1 mb-1">
                Navigation
              </span>

              {isAdminUser ? (
                <button
                  onClick={() => {
                    onSelectTab('admin');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl bg-neutral-900 text-white font-bold text-xs flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    <span>Admin Console</span>
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
                </button>
              ) : isSellerUser ? (
                <button
                  onClick={() => {
                    onSelectTab('seller');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl bg-emerald-700 text-white font-bold text-xs flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Store className="h-4 w-4" />
                    <span>Seller Dashboard</span>
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
                </button>
              ) : isDeliveryUser ? (
                <button
                  onClick={() => {
                    onSelectTab('delivery');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    <span>Delivery Hub</span>
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      onSelectTab('shop');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      currentTab === 'shop'
                        ? 'bg-neutral-900 text-white shadow-sm'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    <ShoppingBag className="h-3.5 w-3.5" />
                    <span>Catalog</span>
                  </button>
                  <button
                    onClick={() => {
                      onSelectTab('orders');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      currentTab === 'orders'
                        ? 'bg-neutral-900 text-white shadow-sm'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    <Package className="h-3.5 w-3.5" />
                    <span>My Orders</span>
                  </button>
                </div>
              )}
            </div>

            {/* Delivery Location Control on Mobile */}
            {!isRoleRestrictedUser && (
              <div className="pt-2 border-t border-neutral-100 space-y-1.5">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block px-1">
                  Delivery PIN Code & Location
                </span>
                <button
                  onClick={() => {
                    setTempPincode(userPincode);
                    setTempCity(userCity);
                    setTempState(userState);
                    setIsLocationOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs font-bold text-indigo-900 flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-indigo-600" />
                    <span>Deliver to: {userCity || "New Delhi"} ({userPincode})</span>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-indigo-500" />
                </button>
              </div>
            )}

            {/* Shopping Concierge trigger on Mobile */}
            {!isRoleRestrictedUser && (
              <div className="pt-2 border-t border-neutral-100">
                <button
                  onClick={() => {
                    onOpenAssistant();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 px-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs rounded-xl flex items-center justify-between shadow-md cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-300 animate-pulse" />
                    <span>Consult Shopping Concierge</span>
                  </div>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Account Profile / Login on Mobile */}
            <div className="pt-2 border-t border-neutral-100 space-y-2">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block px-1">
                User Account
              </span>
              {currentUser ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/80">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        <User className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-neutral-900 truncate">
                          {currentUser.displayName || currentUser.email}
                        </p>
                        <p className="text-[10px] text-neutral-500 font-mono">
                          Role: {currentUser.role || 'Customer'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        onSelectTab('dashboard');
                        setIsMobileMenuOpen(false);
                      }}
                      className="py-2 px-3 bg-neutral-900 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <User className="h-3.5 w-3.5" />
                      <span>My Profile</span>
                    </button>
                    <button
                      onClick={() => {
                        onLogout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="py-2 px-3 bg-neutral-100 text-neutral-800 hover:bg-neutral-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    onOpenAuth();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 bg-neutral-950 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <User className="h-4 w-4" />
                  <span>Log In / Sign Up</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Subcategory & Categories Nav Row - shown on Shop tab */}
        {currentTab === 'shop' && (
          <div className="py-2 border-t border-neutral-100 flex flex-col gap-2">
            {/* Mobile Search input */}
            <div className="relative md:hidden">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-neutral-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products by name, specs, details..."
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2 pl-9 pr-8 text-xs outline-none transition-all placeholder:text-neutral-400 focus:border-neutral-900 focus:bg-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-2 text-neutral-400"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            
            {/* Horizontal Scrollable Main Categories */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar select-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    if (setSelectedSubcategory) setSelectedSubcategory('All');
                  }}
                  className={`text-xs px-3.5 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-neutral-900 text-white shadow-sm font-bold'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Subcategories Row if a Category is selected */}
            {selectedCategory !== 'All' && currentSubcategories.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 no-scrollbar select-none border-t border-dashed border-neutral-200">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                  <Grid className="h-3 w-3 text-indigo-500" />
                  <span>Subcategory:</span>
                </span>
                <button
                  onClick={() => {
                    if (setSelectedSubcategory) setSelectedSubcategory('All');
                  }}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-all shrink-0 ${
                    selectedSubcategory === 'All'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                  }`}
                >
                  All {selectedCategory}
                </button>
                {currentSubcategories.map((sub) => (
                  <button
                    key={sub}
                    onClick={() => {
                      if (setSelectedSubcategory) setSelectedSubcategory(sub);
                    }}
                    className={`text-[11px] px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all shrink-0 ${
                      selectedSubcategory === sub
                        ? 'bg-indigo-600 text-white shadow-xs font-bold'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
