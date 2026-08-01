import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  CreditCard, 
  ShieldCheck, 
  ShoppingBag, 
  ArrowLeft, 
  CheckCircle, 
  Clock, 
  MapPin, 
  Search, 
  Sparkles, 
  Wallet, 
  Coins,
  Globe, 
  ChevronDown,
  LocateFixed,
  Loader2
} from 'lucide-react';
import { CartItem, ShippingAddress, UserProfile, Order } from '../types';
import { formatCurrencyVal } from '../utils/currency';
import { detectCurrentLocation } from '../utils/location';

interface CheckoutFormProps {
  onClose: () => void;
  cartItems: CartItem[];
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  onOrderSuccess: (order: Order) => void;
  userCountry: string;
}

const allCountries = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria",
  "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan",
  "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia",
  "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica",
  "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt",
  "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon",
  "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guyana", "Haiti",
  "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
  "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan", "Laos", "Latvia",
  "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia",
  "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco",
  "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand",
  "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Palestine",
  "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia",
  "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia",
  "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan",
  "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania",
  "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda",
  "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam",
  "Yemen", "Zambia", "Zimbabwe"
];

const postalCodeDatabase: Record<string, { city: string; country: string }> = {
  // India (6 digits)
  "110001": { city: "Connaught Place, New Delhi", country: "India" },
  "400001": { city: "Fort, Mumbai", country: "India" },
  "560001": { city: "MG Road, Bengaluru", country: "India" },
  "700001": { city: "Dharamtala, Kolkata", country: "India" },
  "600001": { city: "George Town, Chennai", country: "India" },
  // Nepal (5 digits)
  "44600": { city: "Thamel, Kathmandu", country: "Nepal" },
  "33700": { city: "Lakeside, Pokhara", country: "Nepal" },
  "44700": { city: "Jawalakhel, Lalitpur", country: "Nepal" },
  "44800": { city: "Durbar Square, Bhaktapur", country: "Nepal" },
  // USA (5 digits)
  "94103": { city: "SoMa, San Francisco, CA", country: "United States" },
  "10001": { city: "Midtown, New York, NY", country: "United States" },
  "90210": { city: "Beverly Hills, Los Angeles, CA", country: "United States" },
  "60601": { city: "Loop, Chicago, IL", country: "United States" },
  "98101": { city: "Downtown, Seattle, WA", country: "United States" },
  // UK
  "SW1A 1AA": { city: "Buckingham Palace, London", country: "United Kingdom" },
  "M1 1AE": { city: "Piccadilly, Manchester", country: "United Kingdom" },
};

export default function CheckoutForm({
  onClose,
  cartItems,
  currentUser,
  onOpenAuth,
  onOrderSuccess,
  userCountry
}: CheckoutFormProps) {
  // Shipping details state
  const [address, setAddress] = useState<ShippingAddress>({
    name: currentUser?.displayName || '',
    street: currentUser?.shippingAddress?.street || '',
    city: currentUser?.shippingAddress?.city || '',
    postalCode: currentUser?.shippingAddress?.postalCode || '',
    country: currentUser?.shippingAddress?.country || userCountry || 'India'
  });

  // Credit card details state
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  // UPI details state
  const [upiId, setUpiId] = useState('');

  // Mobile Wallet state (eSewa / Khalti)
  const [walletNumber, setWalletNumber] = useState('');

  // Payment Selection state
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState('card');
  const [saveDetails, setSaveDetails] = useState(true);

  // Search & Autocomplete Country
  const [countrySearch, setCountrySearch] = useState(address.country);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Verification helper messages
  const [postalLookupMessage, setPostalLookupMessage] = useState<string | null>(null);
  const [saveStatusMessage, setSaveStatusMessage] = useState<string | null>(null);

  // GPS Auto-detect state
  const [isDetectingGps, setIsDetectingGps] = useState(false);

  const handleDetectGps = async () => {
    setIsDetectingGps(true);
    setPostalLookupMessage("📡 Detecting current GPS location...");
    try {
      const loc = await detectCurrentLocation();
      setAddress(prev => ({
        ...prev,
        street: loc.street || prev.street || '',
        postalCode: loc.pincode,
        city: `${loc.city}, ${loc.state}`,
        country: loc.country || 'India'
      }));
      setCountrySearch(loc.country || 'India');
      setPostalLookupMessage(`📍 GPS Location Found: ${loc.city}, ${loc.state} (${loc.pincode})`);
    } catch (err: any) {
      setPostalLookupMessage(`⚠️ ${err.message || 'Unable to detect GPS location'}`);
    } finally {
      setIsDetectingGps(false);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seller specific payment details states
  const [sellerCountry, setSellerCountry] = useState<string>('India');
  const [sellerStoreName, setSellerStoreName] = useState<string>('Aura Boutique');
  const [sellerUpi, setSellerUpi] = useState<string>('aura@upi');
  const [sellerBankDetails, setSellerBankDetails] = useState<string>('Aura Bank - A/C 999988887777');
  const [loadingSeller, setLoadingSeller] = useState<boolean>(false);

  // AuraCoins Redemption State (3-10% of product price, capped at 100 coins max, 1 coin = ₹1)
  const [activeAuraCoins, setActiveAuraCoins] = useState<number>(0);
  const [useAuraCoins, setUseAuraCoins] = useState<boolean>(false);
  const [coinsToRedeem, setCoinsToRedeem] = useState<number>(0);

  const subtotal = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const maxCoinsAllowed = Math.min(100, Math.floor(subtotal * 0.10));

  // Calculate payment offer discount (₹50 OFF on UPI and Paytm)
  const isUpiOrPaytm = selectedPaymentMethodId === 'upi' || selectedPaymentMethodId === 'paytm';
  const offerDiscount = isUpiOrPaytm ? 50 : 0;
  const appliedOfferName = isUpiOrPaytm
    ? (selectedPaymentMethodId === 'upi' ? '₹50 Instant Discount (UPI Offer)' : '₹50 Instant Discount (Paytm Offer)')
    : '';

  const appliedCoins = useAuraCoins ? Math.min(coinsToRedeem || maxCoinsAllowed, activeAuraCoins, maxCoinsAllowed) : 0;
  const finalPayableTotal = Math.max(0, subtotal - appliedCoins - offerDiscount);

  useEffect(() => {
    if (currentUser?.uid) {
      fetch(`/api/auracoins/user/${currentUser.uid}`)
        .then(res => res.json())
        .then(data => {
          if (data && typeof data.activeCoins === 'number') {
            setActiveAuraCoins(data.activeCoins);
            setCoinsToRedeem(Math.min(data.activeCoins, maxCoinsAllowed));
          }
        })
        .catch(err => console.error("Error fetching AuraCoins balance:", err));
    }
  }, [currentUser, subtotal]);

  // Close country dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCountryDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch product seller details to make payment methods dependent on the seller
  useEffect(() => {
    const firstSellerItem = cartItems.find(item => item.product.sellerId);
    if (firstSellerItem && firstSellerItem.product.sellerId) {
      setLoadingSeller(true);
      fetch(`/api/seller/${firstSellerItem.product.sellerId}/payment-methods`)
        .then(res => res.json())
        .then(data => {
          if (data && data.country) {
            setSellerCountry(data.country);
            setSellerStoreName(data.storeName);
            if (data.upi) setSellerUpi(data.upi);
            if (data.bankDetails) setSellerBankDetails(data.bankDetails);
          }
        })
        .catch(err => console.error("Error loading seller payment details:", err))
        .finally(() => setLoadingSeller(false));
    } else {
      setSellerCountry('India');
      setSellerStoreName('Aura Store');
    }
  }, [cartItems]);

  // Pre-load saved shipping & payment details from LocalStorage or user state
  useEffect(() => {
    if (currentUser) {
      const userKey = currentUser.uid || currentUser.email || 'guest';
      // Load saved address
      const savedAddressStr = localStorage.getItem(`aura_saved_address_${userKey}`) || localStorage.getItem('aura_saved_address');
      if (savedAddressStr) {
        try {
          const parsed = JSON.parse(savedAddressStr);
          setAddress(parsed);
          setCountrySearch(parsed.country);
        } catch (e) {
          console.error("Failed to parse saved address:", e);
        }
      } else if (currentUser.shippingAddress) {
        setAddress({
          name: currentUser.displayName || '',
          street: currentUser.shippingAddress.street || '',
          city: currentUser.shippingAddress.city || '',
          postalCode: currentUser.shippingAddress.postalCode || '',
          country: currentUser.shippingAddress.country || userCountry || 'India'
        });
        setCountrySearch(currentUser.shippingAddress.country || userCountry || 'India');
      }

      // Load saved payment methods
      const savedPaymentStr = localStorage.getItem(`aura_saved_payment_details_${userKey}`) || localStorage.getItem('aura_saved_payment_details');
      if (savedPaymentStr) {
        try {
          const parsed = JSON.parse(savedPaymentStr);
          if (parsed.cardNumber) setCardNumber(parsed.cardNumber);
          if (parsed.expiry) setExpiry(parsed.expiry);
          if (parsed.cvv) setCvv(parsed.cvv);
          if (parsed.upiId) setUpiId(parsed.upiId);
          if (parsed.walletNumber) setWalletNumber(parsed.walletNumber);
          if (parsed.paymentMethodId) setSelectedPaymentMethodId(parsed.paymentMethodId);
        } catch (e) {
          console.error("Failed to parse saved payments:", e);
        }
      }

      // Overwrite with preferred payment method chosen on the Product Details Page if available
      const preferredMethodId = localStorage.getItem('aura_preferred_payment_method');
      if (preferredMethodId) {
        setSelectedPaymentMethodId(preferredMethodId);
      }
    }
  }, [currentUser, userCountry]);

  // Set country when chosen from dropdown
  const handleCountrySelect = (countryName: string) => {
    setAddress(prev => ({ ...prev, country: countryName }));
    setCountrySearch(countryName);
    setShowCountryDropdown(false);
  };

  // Perform Address Lookup based on Postal Code
  const handlePostalCodeLookup = async (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;

    setPostalLookupMessage("🔍 Querying global postal databases...");

    try {
      const isIndia = /^\d{6}$/.test(cleanCode) || address.country.toLowerCase() === 'india';
      
      if (isIndia && /^\d{6}$/.test(cleanCode)) {
        // Fetch from real Indian Pincode API
        const res = await fetch(`https://api.postalpincode.in/pincode/${cleanCode}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data[0] && data[0].Status === "Success" && data[0].PostOffice && data[0].PostOffice[0]) {
            const office = data[0].PostOffice[0];
            const cityState = `${office.Name}, ${office.District}, ${office.State}`;
            setAddress(prev => ({
              ...prev,
              postalCode: cleanCode,
              city: cityState,
              country: "India"
            }));
            setCountrySearch("India");
            setPostalLookupMessage(`📍 Found Address: ${cityState}, India (modify if required)`);
            return;
          }
        }
      }

      // Check global zip mapping
      const countryToCode: Record<string, string> = {
        "united states": "us",
        "united kingdom": "gb",
        "canada": "ca",
        "australia": "au",
        "germany": "de",
        "france": "fr",
        "spain": "es",
        "italy": "it",
        "brazil": "br",
        "mexico": "mx",
        "belgium": "be",
        "switzerland": "ch",
        "japan": "jp",
        "singapore": "sg",
        "nepal": "np"
      };

      const selectedCountryLower = address.country.toLowerCase();
      let isoCode = 'us'; // Default fallback ISO
      for (const [name, code] of Object.entries(countryToCode)) {
        if (selectedCountryLower.includes(name)) {
          isoCode = code;
          break;
        }
      }

      // Query Zippopotam.us
      const zippoRes = await fetch(`https://api.zippopotam.us/${isoCode}/${cleanCode}`);
      if (zippoRes.ok) {
        const data = await zippoRes.json();
        if (data && data.places && data.places[0]) {
          const place = data.places[0];
          const placeName = place["place name"];
          const state = place["state abbreviation"] || place["state"];
          const cityState = `${placeName}, ${state}`;
          const countryResolved = data.country || address.country;
          
          setAddress(prev => ({
            ...prev,
            postalCode: cleanCode,
            city: cityState,
            country: countryResolved
          }));
          setCountrySearch(countryResolved);
          setPostalLookupMessage(`📍 Found Address: ${cityState}, ${countryResolved} (modify if required)`);
          return;
        }
      }

      // Fallback if APIs don't resolve / return data
      // Check pre-defined mock DB
      const matched = postalCodeDatabase[cleanCode] || postalCodeDatabase[cleanCode.toUpperCase()];
      if (matched) {
        setAddress(prev => ({
          ...prev,
          postalCode: cleanCode,
          city: matched.city,
          country: matched.country
        }));
        setCountrySearch(matched.country);
        setPostalLookupMessage(`📍 Found Address: ${matched.city}, ${matched.country}`);
      } else {
        // Dynamic smart fallback format matcher
        let simulatedCity = "Metro Hub";
        let simulatedCountry = address.country || "India";

        if (/^\d{6}$/.test(cleanCode)) {
          simulatedCity = "Sector 29, Gurugram, Haryana";
          simulatedCountry = "India";
        } else if (/^\d{5}$/.test(cleanCode)) {
          if (address.country.toLowerCase().includes('nepal')) {
            simulatedCity = "New Road, Kathmandu";
            simulatedCountry = "Nepal";
          } else {
            simulatedCity = "Pacific Heights, Seattle, WA";
            simulatedCountry = "United States";
          }
        } else if (/^[A-Z0-9]{3,4}\s?[A-Z0-9]{3}$/i.test(cleanCode)) {
          simulatedCity = "Kensington, London";
          simulatedCountry = "United Kingdom";
        }

        setAddress(prev => ({
          ...prev,
          postalCode: cleanCode,
          city: simulatedCity,
          country: simulatedCountry
        }));
        setCountrySearch(simulatedCountry);
        setPostalLookupMessage(`📍 Address Autofilled: ${simulatedCity}, ${simulatedCountry} (modify if required)`);
      }
    } catch (err) {
      console.error("Postal Lookup failed:", err);
      setPostalLookupMessage("⚠️ Network lookup failed (please type city/state manually)");
    }
  };

  // State for interactive payment processing animation
  const [processingPaymentModal, setProcessingPaymentModal] = useState(false);
  const [paymentProgressStage, setPaymentProgressStage] = useState(1);
  const [dbOffers, setDbOffers] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/payment-offers')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setDbOffers(data);
      })
      .catch(err => console.error("Error loading payment offers:", err));
  }, []);

  // Filter country selection list
  const filteredCountries = allCountries.filter(c => 
    c.toLowerCase().includes(countrySearch.toLowerCase())
  );

  // Dynamic Payment Methods list per country (Filtered to remove empty slots)
  const getPaymentMethodsForCountry = (countryName: string) => {
    const defaultMethods = [
      { id: 'upi', name: 'Unified Payments Interface (UPI)', icon: '📱', desc: 'Pay instantly via GPay / PhonePe / Paytm / UPI', badge: '₹50 Instant OFF' },
      { id: 'paytm', name: 'Paytm Wallet / UPI', icon: '🔷', desc: 'Instant checkout via Paytm Wallet or UPI', badge: '₹50 Instant OFF' },
      { id: 'card', name: 'Credit/Debit Card', icon: '💳', desc: 'Secure RuPay, Visa, or MasterCard credit/debit cards', badge: '' },
      { id: 'netbanking', name: 'Net Banking', icon: '🏛️', desc: 'Direct secure transfer from major Indian banks (SBI, HDFC, ICICI, etc.)', badge: '' },
      { id: 'cod', name: 'Cash on Delivery (COD)', icon: '💵', desc: 'Pay hard cash at your doorstep upon delivery in INR. Requires OTP verification.', badge: 'OTP Handover' }
    ];

    // Filter out any null or empty objects so no empty slots exist
    return defaultMethods.filter(m => Boolean(m && m.id && m.name && m.name.trim() !== ''));
  };

  const methodsList = getPaymentMethodsForCountry(sellerCountry);

  // When seller country changes, ensure previously selected payment method is still valid, else default to the first one
  useEffect(() => {
    const currentMethods = getPaymentMethodsForCountry(sellerCountry);
    if (!currentMethods.some(m => m.id === selectedPaymentMethodId)) {
      setSelectedPaymentMethodId(currentMethods[0].id);
    }
  }, [sellerCountry]);

  // Auto-format card number
  const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    val = val.substring(0, 16);
    const matches = val.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      setCardNumber(parts.join(' '));
    } else {
      setCardNumber(val);
    }
  };

  // Auto-format expiry date (MM/YY)
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    val = val.substring(0, 4);
    if (val.length >= 2) {
      setExpiry(`${val.substring(0, 2)}/${val.substring(2, 4)}`);
    } else {
      setExpiry(val);
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    // Basic Address Validation
    if (!address.name || !address.street || !address.city || !address.postalCode || !address.country) {
      setError("Please complete all shipping destination fields.");
      return;
    }

    // Dynamic Payment Validation
    let formattedPaymentMethod = "Mock Checkout";
    if (selectedPaymentMethodId === 'card') {
      if (cardNumber.replace(/\s/g, '').length < 16) {
        setError("Please enter a valid 16-digit card number.");
        return;
      }
      if (expiry.length < 5) {
        setError("Please enter a valid expiry date (MM/YY).");
        return;
      }
      if (cvv.length < 3) {
        setError("Please enter a valid 3-digit CVV security code.");
        return;
      }
      formattedPaymentMethod = `Aura Signature Card (ending in ${cardNumber.substring(cardNumber.length - 4)})`;
    } else if (selectedPaymentMethodId === 'upi') {
      if (!upiId.includes('@')) {
        setError("Please enter a valid UPI address format (e.g., user@upi).");
        return;
      }
      formattedPaymentMethod = `UPI Instant Pay (${upiId})`;
    } else if (selectedPaymentMethodId === 'esewa') {
      if (walletNumber.length < 10) {
        setError("Please enter a valid 10-digit eSewa ID mobile number.");
        return;
      }
      formattedPaymentMethod = `eSewa Mobile Wallet (${walletNumber})`;
    } else if (selectedPaymentMethodId === 'khalti') {
      if (walletNumber.length < 10) {
        setError("Please enter a valid 10-digit Khalti ID mobile number.");
        return;
      }
      formattedPaymentMethod = `Khalti Wallet (${walletNumber})`;
    } else if (selectedPaymentMethodId === 'cod') {
      formattedPaymentMethod = `Cash on Delivery (COD) in ${address.country}`;
    } else if (selectedPaymentMethodId === 'netbanking') {
      formattedPaymentMethod = `Indian Net Banking Transfer`;
    } else {
      formattedPaymentMethod = `${selectedPaymentMethodId.toUpperCase()} Checkout`;
    }

    setIsSubmitting(true);
    setError(null);

    // If online payment, show 3-second interactive animated processing modal
    const isOnline = selectedPaymentMethodId !== 'cod';
    if (isOnline) {
      setProcessingPaymentModal(true);
      setPaymentProgressStage(1);

      await new Promise(r => setTimeout(r, 1000));
      setPaymentProgressStage(2);

      await new Promise(r => setTimeout(r, 1200));
      setPaymentProgressStage(3);

      await new Promise(r => setTimeout(r, 800));
    }

    // If checked, trigger persistence
    if (saveDetails) {
      try {
        const token = localStorage.getItem('aura_token');
        // Save to backend database
        await fetch('/api/auth/address', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ shippingAddress: address })
        });

        // Save locally to localStorage
        const userKey = currentUser ? (currentUser.uid || currentUser.email) : 'guest';
        localStorage.setItem(`aura_saved_address_${userKey}`, JSON.stringify(address));
        localStorage.setItem(`aura_saved_payment_details_${userKey}`, JSON.stringify({
          cardNumber,
          expiry,
          cvv,
          upiId,
          walletNumber,
          paymentMethodId: selectedPaymentMethodId
        }));
      } catch (err) {
        console.error("Error backing up address details:", err);
      }
    }

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUser.uid,
          userEmail: currentUser.email,
          items: cartItems,
          total: subtotal,
          offerDiscount,
          appliedOffer: appliedOfferName,
          shippingAddress: address,
          paymentMethod: formattedPaymentMethod,
          redeemCoins: appliedCoins
        })
      });

      if (response.ok) {
        const orderData: Order = await response.json();
        onOrderSuccess(orderData);
      } else {
        const err = await response.json();
        setError(err.error || "Failed to process payment. Try again.");
      }
    } catch (err) {
      setError("Network connection issue. Please verify backend connection.");
    } finally {
      setIsSubmitting(false);
      setProcessingPaymentModal(false);
    }
  };

  if (!currentUser) {
    return (
      <div id="checkout-auth-boundary" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 mb-4">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h3 className="font-sans font-bold text-lg text-neutral-900">Secure Checkout</h3>
          <p className="mt-2 text-sm text-neutral-500">
            Please log in or register a free account to complete your shipping address and complete your checkout securely.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <button
              onClick={onOpenAuth}
              className="w-full py-2.5 bg-neutral-900 text-white font-bold rounded-xl text-xs hover:bg-neutral-800"
            >
              Sign In to Continue
            </button>
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-neutral-100 text-neutral-600 font-bold rounded-xl text-xs hover:bg-neutral-200"
            >
              Back to Catalog
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderPaymentFields = () => {
    switch (selectedPaymentMethodId) {
      case 'card':
        return (
          <div className="space-y-4 animate-fade-in">
            {/* Visual Signature Card Mock Graphic */}
            <div className="bg-gradient-to-br from-neutral-900 via-neutral-800 to-indigo-950 p-5 rounded-xl text-white relative overflow-hidden shadow-lg border border-neutral-700/50 select-none">
              <div className="absolute top-0 right-0 w-36 h-36 bg-white/5 rounded-full -mr-10 -mt-10 blur-xl" />
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono tracking-widest uppercase text-white/50">AuraMart Premium</span>
                  <p className="text-xs font-semibold text-indigo-400">Signature Card</p>
                </div>
                <div className="bg-neutral-800/40 p-1.5 rounded-lg border border-white/10">
                  <CreditCard className="h-6 w-6 text-indigo-300" />
                </div>
              </div>
              <div className="mt-8">
                <p className="font-mono text-lg tracking-widest text-neutral-100 min-h-[28px]">
                  {cardNumber || "•••• •••• •••• ••••"}
                </p>
              </div>
              <div className="flex justify-between mt-6 items-end">
                <div>
                  <p className="text-[8px] font-mono uppercase text-white/40 leading-none">Cardholder</p>
                  <p className="text-xs font-mono truncate max-w-[150px] font-semibold text-neutral-200">{address.name || "YOUR NAME"}</p>
                </div>
                <div className="flex gap-4">
                  <div>
                    <p className="text-[8px] font-mono uppercase text-white/40 leading-none">Expiry</p>
                    <p className="text-xs font-mono font-semibold text-neutral-200">{expiry || "MM/YY"}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-mono uppercase text-white/40 leading-none">CVV</p>
                    <p className="text-xs font-mono font-semibold text-neutral-200">{cvv || "•••"}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-neutral-500 uppercase">Card Number</label>
                <div className="relative">
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={handleCardChange}
                    placeholder="4000 1234 5678 9010"
                    className="mt-1 w-full text-xs p-2.5 border border-neutral-200 rounded-lg bg-neutral-50 focus:bg-white focus:border-neutral-900 outline-none font-mono"
                  />
                  <CreditCard className="absolute right-3 top-3.5 h-4 w-4 text-neutral-400" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:col-span-1">
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase">Expiry (MM/YY)</label>
                  <input
                    type="text"
                    value={expiry}
                    onChange={handleExpiryChange}
                    placeholder="12/28"
                    className="mt-1 w-full text-xs p-2.5 border border-neutral-200 rounded-lg bg-neutral-50 focus:bg-white focus:border-neutral-900 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase">CVV</label>
                  <input
                    type="password"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').substring(0, 3))}
                    placeholder="382"
                    className="mt-1 w-full text-xs p-2.5 border border-neutral-200 rounded-lg bg-neutral-50 focus:bg-white focus:border-neutral-900 outline-none font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'upi':
        return (
          <div className="space-y-3 animate-fade-in bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">📱</span>
              <p className="text-xs font-bold text-neutral-900">Enter UPI Virtual Payment Address</p>
            </div>
            <div>
              <label className="text-[10px] font-bold text-neutral-500 uppercase">UPI Address (VPA)</label>
              <input
                type="text"
                placeholder="e.g. username@okhdfcbank"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value.trim())}
                className="mt-1 w-full text-xs p-2.5 border border-neutral-200 rounded-lg bg-white focus:border-neutral-900 outline-none font-mono"
              />
              <p className="text-[9px] text-neutral-400 mt-1">
                Accepts all major platforms. Securely routed to seller's VPA: <strong className="text-neutral-700">{sellerUpi}</strong>
              </p>
            </div>
          </div>
        );

      case 'esewa':
        return (
          <div className="space-y-3 animate-fade-in bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">🟢</span>
              <p className="text-xs font-bold text-neutral-900">eSewa Mobile Wallet Checkout</p>
            </div>
            <div>
              <label className="text-[10px] font-bold text-neutral-500 uppercase">eSewa Registered Mobile ID</label>
              <input
                type="text"
                maxLength={10}
                placeholder="98XXXXXXXX"
                value={walletNumber}
                onChange={(e) => setWalletNumber(e.target.value.replace(/\D/g, ''))}
                className="mt-1 w-full text-xs p-2.5 border border-neutral-200 rounded-lg bg-white focus:border-neutral-900 outline-none font-mono"
              />
              <p className="text-[9px] text-neutral-400 mt-1">An instant mobile OTP validation token request will be dispatched.</p>
            </div>
          </div>
        );

      case 'khalti':
        return (
          <div className="space-y-3 animate-fade-in bg-purple-50/50 p-4 rounded-xl border border-purple-100">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">🟣</span>
              <p className="text-xs font-bold text-neutral-900">Khalti Digital Payment Gate</p>
            </div>
            <div>
              <label className="text-[10px] font-bold text-neutral-500 uppercase">Khalti registered phone number</label>
              <input
                type="text"
                maxLength={10}
                placeholder="98XXXXXXXX"
                value={walletNumber}
                onChange={(e) => setWalletNumber(e.target.value.replace(/\D/g, ''))}
                className="mt-1 w-full text-xs p-2.5 border border-neutral-200 rounded-lg bg-white focus:border-neutral-900 outline-none font-mono"
              />
            </div>
          </div>
        );

      case 'netbanking':
        return (
          <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 text-center animate-fade-in">
            <p className="text-xs font-semibold text-neutral-700">Choose Net Banking Gateway Account</p>
            <p className="text-[10px] text-neutral-400 mt-1">Clearing instantly to seller account: <strong className="text-neutral-700">{sellerBankDetails}</strong></p>
            <div className="grid grid-cols-3 gap-2 mt-3">
              {["SBI", "HDFC", "ICICI", "Axis", "Kotak", "PNB"].map(bank => (
                <button
                  type="button"
                  key={bank}
                  className="p-2 border border-neutral-200 rounded-lg text-xs bg-white hover:bg-neutral-100 font-semibold"
                  onClick={() => alert(`Selected gateway: ${bank}. Click pay below to finalize.`)}
                >
                  {bank}
                </button>
              ))}
            </div>
          </div>
        );

      case 'cod':
        return (
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-neutral-700 animate-fade-in flex items-start gap-2.5">
            <span className="text-base mt-0.5">💵</span>
            <div>
              <p className="text-xs font-bold text-amber-900">Payment Due on Delivery</p>
              <p className="text-[10px] text-amber-800 mt-0.5">Please ensure exact change is prepared at your shipping destination address for delivery agent collection.</p>
            </div>
          </div>
        );

      default:
        return (
          <div className="p-4 bg-neutral-50 rounded-xl text-center">
            <p className="text-xs text-neutral-500">Secure gateway selected. Complete payment below.</p>
          </div>
        );
    }
  };

  return (
    <div id="checkout-root-page" className="w-full px-4 sm:px-6 lg:px-8 py-8 animate-fade-in select-none">
      <div 
        id="checkout-form-container"
        className="w-full bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden flex flex-col lg:flex-row"
      >
        {/* Left Side: Shipping & Payment (Form) */}
        <form onSubmit={handleSubmitOrder} className="w-full lg:w-3/5 p-6 sm:p-8 border-r border-neutral-100 flex flex-col justify-between">
          <div>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 text-xs font-bold text-neutral-500 hover:text-neutral-900 mb-5 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Cart</span>
            </button>

            <h2 className="font-sans font-bold text-xl text-neutral-900 tracking-tight flex items-center gap-2 mb-6">
              <ShieldCheck className="h-5.5 w-5.5 text-neutral-950" />
              <span>Secure Shipping & Payment</span>
            </h2>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 rounded-xl text-xs text-red-600 font-semibold border border-red-100 animate-pulse">
                {error}
              </div>
            )}

            {/* Section 1: Shipping Address */}
            <div className="space-y-4">
              <div className="border-b border-neutral-100 pb-2 flex flex-wrap justify-between items-center gap-2">
                <h3 className="text-xs font-bold font-mono text-neutral-400 uppercase tracking-wider">
                  01. Shipping Destination
                </h3>
                <button
                  type="button"
                  onClick={handleDetectGps}
                  disabled={isDetectingGps}
                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 text-indigo-700 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {isDetectingGps ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                      <span>Detecting...</span>
                    </>
                  ) : (
                    <>
                      <LocateFixed className="h-3.5 w-3.5 text-indigo-600" />
                      <span>Use Current Location</span>
                    </>
                  )}
                </button>
              </div>

              {postalLookupMessage && (
                <div className="p-2 bg-indigo-50/70 border border-indigo-100 rounded-lg text-[11px] font-medium text-indigo-800">
                  {postalLookupMessage}
                </div>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase">Recipient Name</label>
                  <input
                    type="text"
                    required
                    value={address.name}
                    onChange={(e) => setAddress({ ...address, name: e.target.value })}
                    placeholder="E.g., Alex Morgan"
                    className="mt-1 w-full text-xs p-2.5 border border-neutral-200 rounded-lg bg-neutral-50 focus:bg-white focus:border-neutral-900 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase">Street Address</label>
                  <input
                    type="text"
                    required
                    value={address.street}
                    onChange={(e) => setAddress({ ...address, street: e.target.value })}
                    placeholder="E.g., 123 Retail Lane, Apt 4B"
                    className="mt-1 w-full text-xs p-2.5 border border-neutral-200 rounded-lg bg-neutral-50 focus:bg-white focus:border-neutral-900 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase">City / State</label>
                  <input
                    type="text"
                    required
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    placeholder="E.g., San Francisco"
                    className="mt-1 w-full text-xs p-2.5 border border-neutral-200 rounded-lg bg-neutral-50 focus:bg-white focus:border-neutral-900 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 uppercase">Postal Code</label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        required
                        value={address.postalCode}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAddress({ ...address, postalCode: val });
                          if (val.length >= 5) {
                            handlePostalCodeLookup(val);
                          }
                        }}
                        onBlur={(e) => handlePostalCodeLookup(e.target.value)}
                        placeholder="E.g., 110001 or 44600"
                        className="mt-1 w-full text-xs p-2.5 pr-8 border border-neutral-200 rounded-lg bg-neutral-50 focus:bg-white focus:border-neutral-900 outline-none font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => handlePostalCodeLookup(address.postalCode)}
                        title="Click to lookup address details"
                        className="absolute right-2 top-[13px] text-[10px] bg-neutral-900 text-white font-bold px-1.5 py-0.5 rounded hover:bg-neutral-800"
                      >
                        Find
                      </button>
                    </div>
                  </div>

                  {/* Searchable Country Selector Dropdown */}
                  <div className="relative" ref={dropdownRef}>
                    <label className="text-[10px] font-bold text-neutral-500 uppercase flex items-center gap-1">
                      <Globe className="h-3 w-3 text-neutral-400" />
                      Country
                    </label>
                    <div className="relative mt-1">
                      <input
                        type="text"
                        required
                        value={countrySearch}
                        onChange={(e) => {
                          setCountrySearch(e.target.value);
                          setAddress({ ...address, country: e.target.value });
                        }}
                        onFocus={() => setShowCountryDropdown(true)}
                        placeholder="Search/Select Country"
                        className="w-full text-xs p-2.5 border border-neutral-200 rounded-lg bg-neutral-50 focus:bg-white focus:border-neutral-900 outline-none pr-8"
                      />
                      <ChevronDown className="absolute right-2.5 top-3 h-4 w-4 text-neutral-400 cursor-pointer pointer-events-none" />
                    </div>

                    {showCountryDropdown && (
                      <div className="absolute z-50 left-0 right-0 mt-1 max-h-44 overflow-y-auto bg-white border border-neutral-200 rounded-lg shadow-lg">
                        {filteredCountries.length > 0 ? (
                          filteredCountries.map(country => (
                            <div
                              key={country}
                              className="px-3 py-2 text-xs hover:bg-neutral-100 cursor-pointer text-neutral-800 font-medium"
                              onClick={() => handleCountrySelect(country)}
                            >
                              {country === 'India' ? '🇮🇳 India' : 
                               country === 'Nepal' ? '🇳🇵 Nepal' : 
                               country === 'United States' ? '🇺🇸 United States' : 
                               country === 'United Kingdom' ? '🇬🇧 United Kingdom' : country}
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-xs text-neutral-400 italic">
                            Press Enter for "{countrySearch}"
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {postalLookupMessage && (
                <div className="mt-1 p-2 bg-emerald-50 rounded-lg text-[11px] text-emerald-700 font-semibold border border-emerald-100 animate-pulse flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{postalLookupMessage}</span>
                </div>
              )}
            </div>

            {/* Section 2: Seller-Specific Payment Selection */}
            <div className="space-y-4 mt-8">
              <h3 className="text-xs font-bold font-mono text-neutral-400 uppercase tracking-wider border-b border-neutral-50 pb-2 flex items-center justify-between">
                <span>02. Seller Payment Methods</span>
                <span className="text-[9px] text-indigo-600 font-semibold flex items-center gap-0.5">
                  <Globe className="h-3 w-3" />
                  {sellerStoreName} ({sellerCountry}) Gateway
                </span>
              </h3>
              <p className="text-[10px] text-indigo-600 font-medium">
                Payment channels are defined dynamically based on the origin country of product seller <strong>{sellerStoreName}</strong> ({sellerCountry}).
              </p>

              {/* Grid of options (No empty slots) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {methodsList.map((m) => (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => setSelectedPaymentMethodId(m.id)}
                    className={`flex items-start justify-between p-3.5 rounded-xl border text-left transition-all ${
                      selectedPaymentMethodId === m.id
                        ? 'border-neutral-900 bg-neutral-950 text-white shadow-md'
                        : 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-700'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="text-xl">{m.icon}</span>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-bold leading-snug">{m.name}</p>
                          {m.badge && (
                            <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wider ${
                              selectedPaymentMethodId === m.id
                                ? 'bg-emerald-500 text-white'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}>
                              {m.badge}
                            </span>
                          )}
                        </div>
                        <p className={`text-[9px] mt-0.5 leading-normal ${selectedPaymentMethodId === m.id ? 'text-neutral-300' : 'text-neutral-400'}`}>
                          {m.desc}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Selected Method Dynamic Fields */}
              <div className="mt-4 p-4 border border-neutral-100 bg-neutral-50/50 rounded-2xl">
                {renderPaymentFields()}
              </div>

              {/* Checkbox: Save Address and Payment Details */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="save-details-checkbox"
                  checked={saveDetails}
                  onChange={(e) => setSaveDetails(e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300 text-neutral-950 focus:ring-neutral-950 cursor-pointer"
                />
                <label htmlFor="save-details-checkbox" className="text-xs font-medium text-neutral-600 select-none cursor-pointer">
                  Save shipping address and payment parameters securely for subsequent transactions.
                </label>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-neutral-100 pt-5 flex flex-col gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 h-12 bg-neutral-950 text-white rounded-xl text-sm font-semibold hover:bg-neutral-800 transition-all shadow-md active:scale-98"
            >
              <span>{isSubmitting ? "Processing Transaction..." : `Confirm Payment (${formatCurrencyVal(finalPayableTotal, userCountry)})`}</span>
            </button>
          </div>
        </form>

        {/* Right Side: Order Summary */}
        <div className="w-full lg:w-2/5 p-6 sm:p-8 bg-neutral-50 flex flex-col justify-between">
          <div>
            <h3 className="font-sans font-bold text-sm text-neutral-900 flex items-center gap-2 mb-6">
              <ShoppingBag className="h-4.5 w-4.5 text-neutral-500" />
              <span>Checkout Order Cart</span>
            </h3>

            {/* List of items */}
            <div className="space-y-4 pr-1">
              {cartItems.map((item) => (
                <div key={item.product.id} className="flex items-center gap-3.5 pb-4 border-b border-neutral-200/50 last:border-0 last:pb-0">
                  <div className="h-14 w-14 rounded-lg overflow-hidden border border-neutral-200 flex-shrink-0">
                    <img src={Array.isArray(item.product.image) ? item.product.image[0] : item.product.image} alt={item.product.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-neutral-900 truncate leading-tight">
                      {item.product.name}
                    </p>
                    <p className="text-[10px] text-neutral-400 font-mono mt-0.5">
                      Qty: {item.quantity} x {formatCurrencyVal(item.product.price, userCountry)}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs font-bold text-neutral-900 font-sans">
                      {formatCurrencyVal(item.product.price * item.quantity, userCountry)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing blocks & AuraCoins */}
          <div className="border-t border-neutral-200 pt-6 mt-6">
            {/* AuraCoins Redemption Banner */}
            <div className="mb-4 bg-amber-50/80 border border-amber-200/80 p-3.5 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-amber-600" />
                  <span className="text-xs font-bold text-amber-950">AuraCoins Reward</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                  Balance: {activeAuraCoins} Coins
                </span>
              </div>
              
              {activeAuraCoins > 0 ? (
                <div className="mt-2.5 space-y-2">
                  <label className="flex items-center gap-2 text-xs font-medium text-amber-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useAuraCoins}
                      onChange={(e) => setUseAuraCoins(e.target.checked)}
                      className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <span>Redeem AuraCoins for instant discount (1 Coin = ₹1)</span>
                  </label>
                  
                  {useAuraCoins && (
                    <div className="pl-6 pt-1 text-[11px] text-amber-800 space-y-1">
                      <p>
                        Usable Coins for this order: <strong>{appliedCoins}</strong> (Max allowed 3-10%: {maxCoinsAllowed} coins, up to ₹100 cap)
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-amber-800 mt-1">
                  You have 0 active AuraCoins. Complete this order to earn <strong>4% AuraCoins</strong> after delivery!
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs text-neutral-500">
                <span>Total Items price</span>
                <span className="font-mono">{formatCurrencyVal(subtotal, userCountry)}</span>
              </div>
              
              {offerDiscount > 0 && (
                <div className="flex justify-between items-center text-xs text-emerald-600 font-semibold">
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-emerald-500" />
                    Payment Offer ({appliedOfferName})
                  </span>
                  <span className="font-mono">-₹{offerDiscount}</span>
                </div>
              )}

              {appliedCoins > 0 && (
                <div className="flex justify-between items-center text-xs text-amber-700 font-semibold">
                  <span className="flex items-center gap-1">
                    <Coins className="h-3 w-3" />
                    AuraCoins Discount ({appliedCoins} coins)
                  </span>
                  <span className="font-mono">-₹{appliedCoins}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-xs text-neutral-500">
                <span>Shipping fee</span>
                <span className="text-emerald-600 font-bold uppercase">Free</span>
              </div>
              <div className="flex justify-between items-center text-xs text-neutral-500">
                <span>AuraCoins Cashback (Pending)</span>
                <span className="text-amber-600 font-bold font-mono">+{Math.round(finalPayableTotal * 0.04)} Coins (4%)</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-neutral-200 mt-2">
                <span className="font-sans font-bold text-sm text-neutral-900">
                  {selectedPaymentMethodId === 'cod' ? 'Payable on Delivery:' : 'Amount Due:'}
                </span>
                <span className="font-sans font-extrabold text-xl text-neutral-950">
                  {formatCurrencyVal(finalPayableTotal, userCountry)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Payment Processing & Completion Animation Modal */}
      {processingPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-white p-6 sm:p-8 rounded-3xl shadow-2xl text-center border border-neutral-100 flex flex-col items-center select-none">
            <div className="relative mb-5 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
              <div className="absolute font-mono font-black text-sm text-indigo-600">
                {paymentProgressStage === 1 && '33%'}
                {paymentProgressStage === 2 && '66%'}
                {paymentProgressStage === 3 && '100%'}
              </div>
            </div>

            <h3 className="font-sans font-extrabold text-base text-neutral-900">
              {paymentProgressStage === 1 && "Connecting Bank Gateway..."}
              {paymentProgressStage === 2 && "Validating Credentials..."}
              {paymentProgressStage === 3 && "Payment Successful!"}
            </h3>

            <p className="text-xs text-neutral-500 mt-1.5 max-w-xs leading-relaxed">
              {paymentProgressStage === 1 && "Establishing end-to-end encrypted connection with payment server..."}
              {paymentProgressStage === 2 && `Processing payment of ₹${finalPayableTotal.toLocaleString()} for ${selectedPaymentMethodId.toUpperCase()}...`}
              {paymentProgressStage === 3 && "Order confirmed! Generating receipt and dispatching notification email..."}
            </p>

            <div className="flex gap-2 mt-5">
              <div className={`h-1.5 w-7 rounded-full transition-all duration-300 ${paymentProgressStage >= 1 ? 'bg-indigo-600' : 'bg-neutral-200'}`} />
              <div className={`h-1.5 w-7 rounded-full transition-all duration-300 ${paymentProgressStage >= 2 ? 'bg-indigo-600' : 'bg-neutral-200'}`} />
              <div className={`h-1.5 w-7 rounded-full transition-all duration-300 ${paymentProgressStage >= 3 ? 'bg-emerald-500' : 'bg-neutral-200'}`} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
