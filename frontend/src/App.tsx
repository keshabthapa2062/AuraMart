import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, 
  SlidersHorizontal, 
  ArrowRight, 
  Star, 
  CheckCircle, 
  Clock, 
  Package, 
  Info,
  ChevronDown,
  TrendingUp,
  Zap,
  RefreshCw
} from 'lucide-react';
import { Product, CartItem, UserProfile, Order } from './types';
import { formatCurrencyVal } from './utils/currency';
import { matchesProductSearch } from './utils/search';
import { CATEGORIES_WITH_ALL, CATEGORIES_DATA } from './data/categories';
import Navbar from './components/Navbar';
import ProductCard from './components/ProductCard';
import ProductDetailsModal from './components/ProductDetailsModal';
import CartDrawer from './components/CartDrawer';
import CheckoutForm from './components/CheckoutForm';
import OrderHistory from './components/OrderHistory';
import AdminDashboard from './components/AdminDashboard';
import AiAssistant from './components/AiAssistant';
import AuthModal from './components/AuthModal';
import ProductDetailsPage from './components/ProductDetailsPage';
import UserDashboard from './components/UserDashboard';
import SellerDashboard from './components/SellerDashboard';
import DeliveryPortal from './components/DeliveryPortal';
import StellaLiveRecommendations from './components/StellaLiveRecommendations';
import ProductRow from './components/ProductRow';

export default function App() {
  // Navigation & View tab
  const [currentTab, setCurrentTab] = useState<'shop' | 'orders' | 'admin' | 'dashboard' | 'seller' | 'product-details' | 'delivery'>('shop');
  const [selectedProductDetailsId, setSelectedProductDetailsId] = useState<string | null>(null);
  const [userPincode, setUserPincode] = useState<string>(() => localStorage.getItem('aura_pincode') || '110001');
  const [userCity, setUserCity] = useState<string>(() => localStorage.getItem('aura_city') || 'New Delhi');
  const [userState, setUserState] = useState<string>(() => localStorage.getItem('aura_state') || 'Delhi');
  const userCountry = 'India';
  
  // Data States
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  
  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSubcategory, setSelectedSubcategory] = useState('All');
  const [priceRange, setPriceRange] = useState<number>(200000); // INR Max
  const [sortBy, setSortBy] = useState<'default' | 'price-low' | 'price-high' | 'rating'>('default');
  const [showFilters, setShowFilters] = useState(false);

  // Cart Management
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Modals Toggles
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  // Active Authenticated User
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Saved addresses list state (strictly user-scoped, no default hardcoded entries)
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);

  const handleAddAddress = (newAddress: any) => {
    const updated = [newAddress, ...savedAddresses];
    setSavedAddresses(updated);
    const userKey = currentUser?.uid ? currentUser.uid : 'guest';
    localStorage.setItem(`aura_saved_addresses_${userKey}`, JSON.stringify(updated));

    // Also persist to backend shippingAddress if user is logged in
    const token = localStorage.getItem('aura_token');
    if (token && currentUser) {
      const shippingAddress = {
        name: newAddress.name,
        addressLine: newAddress.street,
        city: newAddress.city,
        state: newAddress.state,
        postalCode: newAddress.postalCode,
        country: 'India'
      };

      fetch('/api/auth/address', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ shippingAddress })
      })
      .then(res => {
        if (res.ok) {
          handleRefreshUser();
        }
      })
      .catch(err => {
        console.error("Error syncing new address to profile:", err);
      });
    }
  };

  // Sync profile shippingAddress to savedAddresses on user load
  useEffect(() => {
    if (currentUser && currentUser.shippingAddress && (currentUser.shippingAddress.street || currentUser.shippingAddress.addressLine)) {
      const sa = currentUser.shippingAddress;
      const isAlreadySaved = savedAddresses.some(addr => 
        addr.postalCode === sa.postalCode && 
        (addr.street === sa.addressLine || addr.street === sa.street)
      );
      if (!isAlreadySaved) {
        const userAddr = {
          id: 'addr-user-' + Date.now(),
          name: sa.name || currentUser.displayName || '',
          street: sa.addressLine || sa.street || '',
          city: sa.city || '',
          state: sa.state || '',
          postalCode: sa.postalCode || '',
          country: sa.country || 'India'
        };
        const updated = [userAddr, ...savedAddresses.filter(a => !a.id.toString().startsWith('addr-user'))];
        setSavedAddresses(updated);
        const userKey = currentUser.uid || currentUser.email || 'guest';
        localStorage.setItem(`aura_saved_addresses_${userKey}`, JSON.stringify(updated));
      }
    }
  }, [currentUser]);

  // Order Success Receipt modal state
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  // Recently viewed products tracking
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>(() => {
    const saved = localStorage.getItem('aura_recently_viewed');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (_) {
        return [];
      }
    }
    return [];
  });

  // Dynamic product recommendation for Hero section based on browsing history, search, and top offers
  const suggestedHeroProduct = useMemo(() => {
    if (recentlyViewed.length > 0) {
      return recentlyViewed[0];
    }
    if (searchQuery.trim()) {
      const match = products.find(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.category.toLowerCase().includes(searchQuery.toLowerCase()));
      if (match) return match;
    }
    return products.find(p => p.rating >= 4.8) || products[0];
  }, [recentlyViewed, searchQuery, products]);

  const handleViewProductDetails = (product: Product) => {
    setSelectedProductDetailsId(product.id);
    setCurrentTab('product-details');

    setRecentlyViewed(prev => {
      const filtered = prev.filter(p => p.id !== product.id);
      const updated = [product, ...filtered].slice(0, 10);
      localStorage.setItem('aura_recently_viewed', JSON.stringify(updated));
      return updated;
    });
  };

  // Infinite Scroll state variables
  const [itemsLimit, setItemsLimit] = useState(6);
  const [isRefreshingExplore, setIsRefreshingExplore] = useState(false);
  const [hasExploredTooMuch, setHasExploredTooMuch] = useState(false);

  // Flash sales timer
  const [flashSaleTimeLeft, setFlashSaleTimeLeft] = useState('02h 14m 35s');
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const hours = 23 - now.getHours();
      const minutes = 59 - now.getMinutes();
      const seconds = 59 - now.getSeconds();
      setFlashSaleTimeLeft(
        `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Categories list
  const categories = CATEGORIES_WITH_ALL;

  // Validate JWT on mount & load state
  useEffect(() => {
    const token = localStorage.getItem('aura_token');
    if (token) {
      fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(res => {
        if (res.ok) {
          return res.json();
        } else {
          localStorage.removeItem('aura_token');
          return null;
        }
      })
      .then(user => {
        if (user) {
          setCurrentUser(user);
        }
      })
      .catch(err => {
        console.error("Error validating persistent auth token:", err);
      });
    }

    // Load cart from LocalStorage
    const savedCart = localStorage.getItem('aura_cart');
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (e) {
        console.error("Failed to parse cart items", e);
      }
    }

    // Fetch initial products
    fetchProducts();
  }, []);

  // Synchronize delivery location and user-scoped cart/addresses with authenticated user's profile
  useEffect(() => {
    const userKey = currentUser?.uid ? currentUser.uid : 'guest';

    // 1. Load User-Scoped Cart
    const userCartKey = `aura_cart_${userKey}`;
    const savedCart = localStorage.getItem(userCartKey);
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (e) {
        setCartItems([]);
      }
    } else {
      setCartItems([]);
    }

    // 2. Load User-Scoped Addresses
    const userAddrKey = `aura_saved_addresses_${userKey}`;
    const savedAddrs = localStorage.getItem(userAddrKey);
    if (savedAddrs) {
      try {
        setSavedAddresses(JSON.parse(savedAddrs));
      } catch (_) {}
    }

    // 3. Sync delivery location
    if (currentUser) {
      if (currentUser.pincode) {
        setUserPincode(currentUser.pincode);
        localStorage.setItem(`aura_pincode_${userKey}`, currentUser.pincode);
      }
      if (currentUser.city) {
        setUserCity(currentUser.city);
        localStorage.setItem(`aura_city_${userKey}`, currentUser.city);
      }
      if (currentUser.state) {
        setUserState(currentUser.state);
        localStorage.setItem(`aura_state_${userKey}`, currentUser.state);
      }
    }
  }, [currentUser]);

  // Save Cart to local storage on changes (scoped by current user)
  const saveCartToStorage = (updatedCart: CartItem[]) => {
    setCartItems(updatedCart);
    const userKey = currentUser?.uid ? currentUser.uid : 'guest';
    localStorage.setItem(`aura_cart_${userKey}`, JSON.stringify(updatedCart));
  };

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const response = await fetch('/api/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (e) {
      console.error("Failed to fetch products:", e);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Track search queries in search history for personalized recommendations
  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      try {
        const saved = localStorage.getItem('aura_search_history');
        let history: string[] = saved ? JSON.parse(saved) : [];
        if (!history.includes(searchQuery.trim())) {
          history = [searchQuery.trim(), ...history.filter(h => h !== searchQuery.trim())].slice(0, 10);
          localStorage.setItem('aura_search_history', JSON.stringify(history));
        }
      } catch (_) {}
    }
  }, [searchQuery]);

  // Add Item to Cart (Strictly User-Scoped)
  const handleAddToCart = (product: Product, quantity = 1) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    const existing = cartItems.find(item => item.product.id === product.id);
    let updated: CartItem[];
    if (existing) {
      updated = cartItems.map(item => 
        item.product.id === product.id 
          ? { ...item, quantity: Math.min(product.inventory, item.quantity + quantity) }
          : item
      );
    } else {
      updated = [...cartItems, { product, quantity }];
    }
    saveCartToStorage(updated);
    setIsCartOpen(true); // Open drawer so user sees item was added
  };

  // Update Cart Item quantity
  const handleUpdateQuantity = (productId: string, qty: number) => {
    const updated = cartItems.map(item => 
      item.product.id === productId ? { ...item, quantity: qty } : item
    );
    saveCartToStorage(updated);
  };

  // Remove Item from Cart
  const handleRemoveItem = (productId: string) => {
    const updated = cartItems.filter(item => item.product.id !== productId);
    saveCartToStorage(updated);
  };

  const isAdminUser = currentUser?.role === 'admin';
  const isSellerUser = currentUser?.role === 'seller';
  const isDeliveryUser = currentUser?.role === 'delivery' || currentUser?.email === 'deliveryboy@aura.com';

  useEffect(() => {
    if (isAdminUser && currentTab !== 'admin' && currentTab !== 'dashboard') {
      setCurrentTab('admin');
    } else if (isSellerUser && currentTab !== 'seller' && currentTab !== 'dashboard') {
      setCurrentTab('seller');
    } else if (isDeliveryUser && currentTab !== 'delivery' && currentTab !== 'dashboard') {
      setCurrentTab('delivery');
    }
  }, [currentUser, currentTab, isAdminUser, isSellerUser, isDeliveryUser]);

  // Handle Logout
  const handleLogout = async () => {
    localStorage.removeItem('aura_token');
    localStorage.removeItem('aura_pincode');
    localStorage.removeItem('aura_city');
    localStorage.removeItem('aura_state');
    setCurrentUser(null);
    setCartItems([]);
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedSubcategory('all');
    setActiveProduct(null);
    setCurrentTab('shop');
  };

  const handleDeleteProductFromApp = (deletedProductId: string) => {
    setProducts(prev => prev.filter(p => (p.id || (p as any)._id) !== deletedProductId));
    if (activeProduct && ((activeProduct.id || (activeProduct as any)._id) === deletedProductId)) {
      setActiveProduct(null);
    }
    fetchProducts();
  };

  // Handle login/signup success
  const handleAuthSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    setIsAuthOpen(false);
    if (user.role === 'admin') {
      setCurrentTab('admin');
    } else if (user.role === 'seller') {
      setCurrentTab('seller');
    } else if (user.role === 'delivery' || user.email === 'deliveryboy@aura.com') {
      setCurrentTab('delivery');
    }
  };

  const handleRefreshUser = async () => {
    const token = localStorage.getItem('aura_token');
    if (token) {
      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const user = await res.json();
          setCurrentUser(user);
        }
      } catch (err) {
        console.error("Failed to refresh user:", err);
      }
    }
  };

  // Handle Order Success (placed order receipt)
  const handleOrderSuccess = (order: Order) => {
    setCompletedOrder(order);
    // Clear cart both in state and storage
    saveCartToStorage([]);
    setIsCheckoutOpen(false);
    // Refresh products to show updated stock values!
    fetchProducts();
  };

  const handleUpdateLocation = (pincode: string, city: string, state: string) => {
    setUserPincode(pincode);
    setUserCity(city);
    setUserState(state);
    localStorage.setItem('aura_pincode', pincode);
    localStorage.setItem('aura_city', city);
    localStorage.setItem('aura_state', state);

    // Persist location changes to the backend if authenticated
    const token = localStorage.getItem('aura_token');
    if (token) {
      fetch('/api/user/update-location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ pincode, city, state })
      })
      .then(res => {
        if (res.ok) {
          return res.json();
        }
      })
      .then(updatedUser => {
        if (updatedUser) {
          setCurrentUser(updatedUser);
        }
      })
      .catch(err => {
        console.error("Error persisting location update:", err);
      });
    }
  };

  // Proximity scoring for "nearest location" sorting
  const getProximityScore = (product: Product) => {
    const pState = product.sellerState || '';
    const pCity = product.sellerCity || '';
    const pPin = product.sellerPincode || '';
    
    if (!pCity && !pState && !pPin) return 0; // default seed products
    
    if (pPin === userPincode || (pCity && pCity.toLowerCase() === userCity.toLowerCase())) {
      return 3; // exact city/pin match
    }
    if (pState && pState.toLowerCase() === userState.toLowerCase()) {
      return 2; // state level
    }
    return 1; // within India
  };

  // Client filtering & searching
  const filteredProducts = products.filter(product => {
    const matchesSearch = matchesProductSearch(product, searchQuery);
    const matchesCategory = selectedCategory === 'All' || 
      (product.category && product.category.toLowerCase() === selectedCategory.toLowerCase());
    const matchesSubcategory = selectedSubcategory === 'All' || 
      (product.subcategory && product.subcategory.toLowerCase() === selectedSubcategory.toLowerCase());
    const matchesPrice = product.price <= priceRange;
    
    // Check product's availability Range restriction
    const range = product.availabilityRange || 'india';
    if (range === 'india') {
      return matchesSearch && matchesCategory && matchesSubcategory && matchesPrice;
    }
    
    const pState = product.sellerState || '';
    const pCity = product.sellerCity || '';
    const pPin = product.sellerPincode || '';
    
    if (range === 'state') {
      const match = pState.toLowerCase() === userState.toLowerCase();
      return match && matchesSearch && matchesCategory && matchesSubcategory && matchesPrice;
    }
    if (range === 'city') {
      const match = pCity.toLowerCase() === userCity.toLowerCase();
      return match && matchesSearch && matchesCategory && matchesSubcategory && matchesPrice;
    }
    if (range === 'nearest') {
      const sameCity = pCity.toLowerCase() === userCity.toLowerCase();
      const sameReg = pPin.substring(0, 2) === userPincode.substring(0, 2);
      const match = sameCity || sameReg;
      return match && matchesSearch && matchesCategory && matchesSubcategory && matchesPrice;
    }
    
    return matchesSearch && matchesCategory && matchesSubcategory && matchesPrice;
  });

  // Client sorting
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    // Sort primarily by nearest location (proximity scoring)
    const scoreA = getProximityScore(a);
    const scoreB = getProximityScore(b);
    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }
    
    // Secondary sorting preference
    if (sortBy === 'price-low') return a.price - b.price;
    if (sortBy === 'price-high') return b.price - a.price;
    if (sortBy === 'rating') return b.rating - a.rating;
    return 0; // default (order as returned)
  });

  // Infinite Scroll listener
  useEffect(() => {
    const handleScroll = () => {
      if (currentTab !== 'shop') return;
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 350) {
        setItemsLimit(prev => {
          if (prev < sortedProducts.length) {
            const nextVal = prev + 6;
            if (nextVal >= 18 || nextVal >= sortedProducts.length) {
              setHasExploredTooMuch(true);
            }
            return nextVal;
          }
          return prev;
        });
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentTab, sortedProducts.length]);

  const handleRefreshExplore = () => {
    setIsRefreshingExplore(true);
    setProducts(prev => {
      const shuffled = [...prev];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
    setItemsLimit(6);
    setHasExploredTooMuch(false);
    setTimeout(() => {
      setIsRefreshingExplore(false);
      const target = document.getElementById('explore-more-section');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#111111] flex flex-col font-sans overflow-x-hidden max-w-full">
      
      {/* Navigation Bar */}
      <Navbar
        cartCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAssistant={() => setIsAssistantOpen(true)}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        onSelectTab={setCurrentTab}
        currentTab={currentTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={(cat) => {
          setSelectedCategory(cat);
          setSelectedSubcategory('All');
        }}
        categories={categories}
        userPincode={userPincode}
        userCity={userCity}
        userState={userState}
        onUpdateLocation={handleUpdateLocation}
        savedAddresses={savedAddresses}
        onAddAddress={handleAddAddress}
        products={products}
        onViewProduct={handleViewProductDetails}
        selectedSubcategory={selectedSubcategory}
        setSelectedSubcategory={setSelectedSubcategory}
      />

      {/* Main Content */}
      <main className="flex-1 pb-16">
        {isCheckoutOpen ? (
          <CheckoutForm
            onClose={() => setIsCheckoutOpen(false)}
            cartItems={cartItems}
            currentUser={currentUser}
            onOpenAuth={() => setIsAuthOpen(true)}
            onOrderSuccess={handleOrderSuccess}
            userCountry="India"
          />
        ) : currentTab === 'shop' ? (
          <div>
            {/* Featured Recommendations Live Loop */}
            <StellaLiveRecommendations
              products={products}
              recentlyViewed={recentlyViewed}
              searchQuery={searchQuery}
              userCountry={userCountry}
              userCity={userCity}
              onViewDetails={handleViewProductDetails}
              onAddToCart={handleAddToCart}
              onOpenAssistant={() => setIsAssistantOpen(true)}
              currentUser={currentUser}
              onOpenAuth={() => setIsAuthOpen(true)}
            />

            {/* Desktop Horizontal Filter / Category Tabs Row */}
            <div id="catalog-view" className="w-full px-4 sm:px-6 lg:px-8 pt-12">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-100 pb-5">
                
                {/* Category selectors with side-scroll */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none select-none w-full md:w-auto shrink-0">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`text-xs px-4 py-2 rounded-xl font-medium transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-neutral-950 text-white shadow-sm'
                          : 'bg-white border border-neutral-100 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="flex md:hidden text-lg font-sans font-extrabold text-neutral-950">
                  Featured Products
                </div>

                {/* Filter / Sort Actions */}
                <div className="flex items-center gap-2 justify-between md:justify-end">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      showFilters 
                        ? 'bg-neutral-100 border-neutral-300 text-neutral-900' 
                        : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    <span>Adjustments</span>
                  </button>

                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e: any) => setSortBy(e.target.value)}
                      className="appearance-none bg-white border border-neutral-200 px-4 py-2 pr-8 rounded-xl text-xs font-semibold text-neutral-600 outline-none focus:border-neutral-900 transition-colors"
                    >
                      <option value="default">Default Sort</option>
                      <option value="price-low">Price: Low to High</option>
                      <option value="price-high">Price: High to Low</option>
                      <option value="rating">Rating: Highest</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                      <ChevronDown className="h-3 w-3 text-neutral-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Collapsible adjustments sliders */}
              {showFilters && (
                <div className="mt-4 p-5 bg-white border border-neutral-100 rounded-2xl shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-6 animate-fade-in">
                  <div>
                    <div className="flex justify-between text-xs font-bold text-neutral-600 uppercase mb-2">
                      <span>Maximum Retail Price</span>
                      <span className="font-mono text-neutral-950">{formatCurrencyVal(priceRange, 'India')}</span>
                    </div>
                    <input
                      type="range"
                      min="100"
                      max="200000"
                      step="2000"
                      value={priceRange}
                      onChange={(e) => setPriceRange(Number(e.target.value))}
                      className="w-full h-1.5 bg-neutral-100 rounded-lg appearance-none cursor-pointer accent-neutral-900"
                    />
                    <div className="flex justify-between text-[10px] text-neutral-400 mt-1">
                      <span>{formatCurrencyVal(100, 'India')}</span>
                      <span>{formatCurrencyVal(200000, 'India')}</span>
                    </div>
                  </div>

                  <div className="flex flex-col justify-center">
                    <p className="text-xs font-bold text-neutral-600 uppercase mb-1">Active filter metrics</p>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Showing matching products up to <span className="font-semibold text-neutral-800">{formatCurrencyVal(priceRange, 'India')}</span>. Refine your lookup inside category <span className="font-semibold text-neutral-800">{selectedCategory}</span>.
                    </p>
                  </div>
                </div>
              )}

              {/* Product Grid */}
              {loadingProducts ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mt-10">
                  {[1, 2, 3, 4].map(idx => (
                    <div key={idx} className="bg-white border border-neutral-100 rounded-2xl h-[300px] p-4 flex flex-col justify-between animate-pulse">
                      <div className="aspect-square w-full rounded-xl bg-neutral-100" />
                      <div className="space-y-3 mt-4 flex-1">
                        <div className="h-3.5 bg-neutral-100 rounded w-1/3" />
                        <div className="h-4 bg-neutral-100 rounded w-3/4" />
                      </div>
                      <div className="h-8 bg-neutral-100 rounded-lg mt-4" />
                    </div>
                  ))}
                </div>
              ) : sortedProducts.length === 0 ? (
                <div className="py-24 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-50 text-neutral-400 mb-4">
                    <Info className="h-6 w-6" />
                  </div>
                  <h3 className="font-sans font-bold text-base text-neutral-900">No products match your criteria</h3>
                  <p className="mt-1 text-sm text-neutral-400 max-w-sm mx-auto">
                    Try raising the price slider limit, editing your search query keywords, or looking inside a different category.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('All');
                      setPriceRange(10000);
                    }}
                    className="mt-6 px-5 py-2 bg-neutral-900 text-white font-bold text-xs rounded-xl hover:bg-neutral-800"
                  >
                    Reset Adjustments
                  </button>
                </div>
              ) : (
                <div className="space-y-12 mt-8 select-none">
                  {selectedCategory === 'All' && searchQuery === '' ? (
                    <>
                      {/* 1. Recently Viewed Row */}
                      {recentlyViewed.length > 0 && (
                        <div className="animate-fade-in">
                          <ProductRow
                            title="Recently Viewed"
                            icon={<Clock className="h-4 w-4 text-neutral-600" />}
                            badge={<span className="text-[10px] text-neutral-400 uppercase tracking-wider font-mono">{recentlyViewed.length} items</span>}
                            products={recentlyViewed}
                            onAddToCart={handleAddToCart}
                            onViewDetails={handleViewProductDetails}
                            userCountry={userCountry}
                          />
                        </div>
                      )}

                      {/* 2. Company Specific Deal Row */}
                      <div className="p-5 bg-gradient-to-r from-neutral-900 via-neutral-950 to-indigo-950 rounded-2xl text-white shadow-sm">
                        <ProductRow
                          title={<span className="text-white">Company Specific Deals</span>}
                          subtitle="Aura Premium Club • Special 15% Member Discount"
                          icon={<Sparkles className="h-4 w-4 text-amber-400" />}
                          badge={<span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">Member Perks</span>}
                          products={products.filter(p => p.name.includes("Aura") || p.name.includes("Classic") || p.rating >= 4.7)}
                          onAddToCart={handleAddToCart}
                          onViewDetails={handleViewProductDetails}
                          userCountry={userCountry}
                          extraCard={
                            <div 
                              onClick={() => setSelectedCategory('Electronics')}
                              className="w-[180px] sm:w-[220px] shrink-0 snap-start flex flex-col items-center justify-center bg-indigo-900/60 border border-indigo-700/60 rounded-2xl p-4 text-center hover:bg-indigo-900 transition-all cursor-pointer select-none"
                            >
                              <ArrowRight className="h-6 w-6 text-indigo-300 mb-2" />
                              <span className="text-xs font-bold text-white uppercase tracking-wider">View More Deals</span>
                              <span className="text-[10px] text-indigo-300 mt-0.5">Explore All Offers</span>
                            </div>
                          }
                        />
                      </div>

                      {/* 3. Top Deals Row */}
                      <div>
                        <ProductRow
                          title="Top Deals & Highest Rated"
                          icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
                          products={products.filter(p => p.rating >= 4.6)}
                          onAddToCart={handleAddToCart}
                          onViewDetails={handleViewProductDetails}
                          userCountry={userCountry}
                        />
                      </div>

                      {/* 4. Flash Sales Row with Countdown */}
                      <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-5">
                        <ProductRow
                          title="Flash Sales"
                          subtitle="Limited quantities left. Grab them before they sell out."
                          icon={
                            <div className="h-8 w-8 bg-amber-500 rounded-full flex items-center justify-center text-white shrink-0 animate-pulse">
                              <Zap className="h-4 w-4" />
                            </div>
                          }
                          action={
                            <div className="inline-flex items-center gap-1.5 bg-red-600 text-white font-mono text-[11px] font-bold px-3 py-1 rounded-xl shadow-sm">
                              <Clock className="h-3.5 w-3.5 animate-spin" />
                              <span>ENDS IN: {flashSaleTimeLeft}</span>
                            </div>
                          }
                          badgeText="-25% Off"
                          products={products.slice(0, 8)}
                          onAddToCart={handleAddToCart}
                          onViewDetails={handleViewProductDetails}
                          userCountry={userCountry}
                          renderExtraBelowCard={(product, idx) => (
                            <div className="mt-2 px-1">
                              <div className="flex justify-between text-[9px] font-bold text-neutral-400 mb-1">
                                <span>Claimed</span>
                                <span>{40 + (idx % 5) * 12}%</span>
                              </div>
                              <div className="w-full bg-neutral-200 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-red-500 h-full" style={{ width: `${40 + (idx % 5) * 12}%` }} />
                              </div>
                            </div>
                          )}
                        />
                      </div>

                      {/* 5. Product Category Specific Rows */}
                      {categories.filter(cat => cat !== 'All').map((cat) => {
                        const catProducts = products.filter(p => p.category === cat);
                        if (catProducts.length === 0) return null;
                        return (
                          <div key={`shelf-${cat}`} className="pt-2">
                            <ProductRow
                              title={`${cat} Collection`}
                              action={
                                <button
                                  onClick={() => setSelectedCategory(cat)}
                                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1 hover:underline cursor-pointer"
                                >
                                  <span>See All</span>
                                  <ArrowRight className="h-3 w-3" />
                                </button>
                              }
                              products={catProducts}
                              onAddToCart={handleAddToCart}
                              onViewDetails={handleViewProductDetails}
                              userCountry={userCountry}
                              extraCard={
                                <div 
                                  onClick={() => setSelectedCategory(cat)}
                                  className="w-[180px] sm:w-[220px] shrink-0 snap-start flex flex-col items-center justify-center bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 text-center hover:bg-indigo-100/80 transition-colors cursor-pointer select-none"
                                >
                                  <div className="h-9 w-9 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center mb-2">
                                    <ArrowRight className="h-4 w-4" />
                                  </div>
                                  <span className="font-sans font-bold text-xs text-neutral-900">Explore More</span>
                                  <span className="text-[10px] text-indigo-600 font-medium mt-0.5">{cat}</span>
                                </div>
                              }
                            />
                          </div>
                        );
                      })}
                    </>
                  ) : null}

                  {/* 6. Explore More Grid (All Products infinite scroll) */}
                  <div id="explore-more-section" className="pt-6 border-t border-neutral-100">
                    <div className="mb-6">
                      <h3 className="font-sans font-extrabold text-sm sm:text-base text-neutral-950 uppercase tracking-wider">
                        {selectedCategory === 'All' ? 'Explore More Products' : `${selectedCategory} Collection`}
                      </h3>
                      <p className="text-[10px] sm:text-xs text-neutral-400">Discover premium items customized for your active delivery location.</p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
                      {sortedProducts.slice(0, itemsLimit).map((product) => (
                        <ProductCard
                          key={`explore-${product.id}`}
                          product={product}
                          onAddToCart={handleAddToCart}
                          onViewDetails={handleViewProductDetails}
                          userCountry={userCountry}
                        />
                      ))}
                    </div>

                    {/* Infinite Scroll Load/Refresh Banner */}
                    {hasExploredTooMuch ? (
                      <div className="py-12 text-center bg-white border border-neutral-150 rounded-2xl p-6 mt-10 max-w-xl mx-auto shadow-sm animate-fade-in">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 mb-3 animate-bounce-short">
                          <Sparkles className="h-5 w-5 animate-spin" />
                        </div>
                        <h4 className="font-sans font-bold text-base text-neutral-900">You have explored everything!</h4>
                        <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto">
                          Ready to refresh the catalog and reveal brand new deals and personalized trends?
                        </p>
                        <button
                          onClick={handleRefreshExplore}
                          disabled={isRefreshingExplore}
                          className="mt-4 inline-flex items-center gap-1.5 px-5 py-2.5 bg-neutral-950 hover:bg-neutral-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                        >
                          {isRefreshingExplore ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                          <span>Refresh & Show New Things</span>
                        </button>
                      </div>
                    ) : itemsLimit < sortedProducts.length ? (
                      <div className="text-center py-10">
                        <div className="inline-flex items-center gap-1.5 text-xs text-neutral-400 font-medium">
                          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                          <span>Scrolling down loads more premium accessories...</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <p className="text-xs text-neutral-400">All available products loaded.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : currentTab === 'product-details' ? (
          <ProductDetailsPage
            productId={selectedProductDetailsId!}
            onAddToCart={handleAddToCart}
            currentUser={currentUser}
            onOpenAuth={() => setIsAuthOpen(true)}
            onSelectTab={setCurrentTab}
            onTriggerCheckout={() => {
              setIsCheckoutOpen(true);
            }}
            userCountry={userCountry}
            userPincode={userPincode}
            userCity={userCity}
            userState={userState}
            onViewProduct={(prodId) => {
              const matched = products.find(p => p.id === prodId);
              if (matched) {
                handleViewProductDetails(matched);
              } else {
                setSelectedProductDetailsId(prodId);
              }
            }}
            onDeleteProduct={(pId) => handleDeleteProductFromApp(pId)}
          />
        ) : currentTab === 'dashboard' ? (
          <UserDashboard
            currentUser={currentUser!}
            onLogout={handleLogout}
            onRefreshUser={handleRefreshUser}
            products={products}
            onAddToCart={handleAddToCart}
            onSelectTab={setCurrentTab}
            userCountry={userCountry}
          />
        ) : currentTab === 'seller' ? (
          <SellerDashboard
            currentUser={currentUser!}
            products={products}
            onRefreshProducts={fetchProducts}
            onRefreshUser={handleRefreshUser}
            userCountry={userCountry}
          />
        ) : currentTab === 'admin' ? (
          /* Admin Console Screen */
          <AdminDashboard
            currentUser={currentUser}
            products={products}
            onRefreshProducts={fetchProducts}
          />
        ) : currentTab === 'delivery' ? (
          /* Delivery Executive Hub */
          <DeliveryPortal
            userCity={userCity}
            userPincode={userPincode}
            userState={userState}
          />
        ) : (
          /* Order History Screen */
          <OrderHistory
            currentUser={currentUser}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-neutral-100 bg-white py-12 select-none mt-auto">
        <div className="w-full px-4 sm:px-6 lg:px-8 text-center sm:text-left flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <span className="font-sans font-extrabold text-neutral-950 uppercase tracking-widest text-sm">AURAMART</span>
            <p className="text-xs text-neutral-400 mt-1">Simplicity refined. Premium lifestyle and hardware accessories.</p>
          </div>
          <div className="text-xs text-neutral-400">
            © 2026 AuraMart Inc. Built with MERN full-stack architecture & MongoDB.
          </div>
        </div>
      </footer>

      {/* OVERLAY COMPONENT COORD */}
      
      {/* Product Details overlay modal */}
      <ProductDetailsModal
        product={activeProduct}
        onClose={() => setActiveProduct(null)}
        onAddToCart={handleAddToCart}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        userCountry={userCountry}
        userPincode={userPincode}
        userCity={userCity}
        userState={userState}
        onDeleteProduct={(p) => handleDeleteProductFromApp(p.id)}
      />

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
        userCountry={userCountry}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* AI advisor chat drawer */}
      <AiAssistant
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        products={products}
        currentUser={currentUser}
        userPincode={userPincode}
        userCity={userCity}
        userState={userState}
        onViewProductDetails={(p) => {
          setActiveProduct(p);
          setIsAssistantOpen(false);
        }}
      />

      {/* Order Completion Receipt Dialog overlay */}
      {completedOrder && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 sm:p-8 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-4 scale-110">
              <CheckCircle className="h-8 w-8 animate-bounce-short" />
            </div>

            <h2 className="font-sans font-extrabold text-xl text-neutral-900 tracking-tight">
              Order Placed Successfully!
            </h2>
            <p className="text-xs text-neutral-500 mt-2">
              Thank you for shopping with Aura. Your transaction has been secured, and we have registered your shipping destination.
            </p>

            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 my-5 text-left space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-neutral-400 uppercase">Transaction ID</span>
                <span className="text-xs font-mono font-bold text-neutral-800 uppercase">{completedOrder.transactionId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-neutral-400 uppercase">Total amount Paid</span>
                <span className="text-xs font-bold text-neutral-900">{formatCurrencyVal(completedOrder.total, userCountry)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-neutral-400 uppercase">Est. Delivery</span>
                <span className="text-xs font-semibold text-emerald-600">3-5 Business Days</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  setCompletedOrder(null);
                  setCurrentTab('orders');
                }}
                className="w-full py-2.5 bg-neutral-950 text-white font-bold rounded-xl text-xs hover:bg-neutral-800 shadow-md flex items-center justify-center gap-1.5"
              >
                <Package className="h-3.5 w-3.5" />
                <span>Track Order Delivery</span>
              </button>
              <button
                onClick={() => setCompletedOrder(null)}
                className="w-full py-2.5 bg-neutral-100 text-neutral-600 font-bold rounded-xl text-xs hover:bg-neutral-200"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
