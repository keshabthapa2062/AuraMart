import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Briefcase, Store, Phone, Mail, Globe, MapPin, CreditCard, Send, ShieldCheck, AlertCircle } from 'lucide-react';

interface SellerRegistrationFormProps {
  currentUser: UserProfile;
  onSuccess: () => void;
}

export default function SellerRegistrationForm({
  currentUser,
  onSuccess
}: SellerRegistrationFormProps) {
  const [formData, setFormData] = useState({
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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        {/* Section 1: Store Basics */}
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

        {/* Section 2: Contact Information */}
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

        {/* Section 3: Location */}
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

        {/* Section 4: Bank, UPI & Tax Details */}
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

        {/* Security / Verification Badge */}
        <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100 flex gap-3 select-none">
          <ShieldCheck className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-neutral-500 leading-relaxed">
            By submitting this form, you certify that all business registrations and credentials provided are legitimate. After Admin review, your buyer account will be granted full access to the seller terminal.
          </p>
        </div>

        {/* Submit */}
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
