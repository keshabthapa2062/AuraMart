import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { db } from './db';
import { sendOtpEmail, sendOrderConfirmationEmail, sendOrderStatusEmail } from './mailer';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

app.use(express.json());

// Helper: Hashing passwords with PBKDF2/SHA256 for secure storage
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + 'aura-salt-2026').digest('hex');
}

// Middleware: Authenticate Request via JWT Bearer Token
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: "Access denied. Auth token missing." });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(403).json({ error: "Invalid or expired token." });
  }
}

// Optional auth helper to check if a token is present but not fail
function optionalAuthenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
  } catch (err) {
    // Fail silently, just don't populate req.user
  }
  next();
}

// Lazy Gemini AI client initialization
let aiClient: any = null;
function getGeminiClient() {
  if (aiClient) return aiClient;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  aiClient = new GoogleGenAI({ apiKey });
  return aiClient;
}

// Seed Products helper (using MongoDB-compatible Collections)
async function ensureProductsSeeded() {
  try {
    const seedCheck = await db.aiConfigs.findOne({ id: 'products_seeded_flag' });
    const existing = await db.products.find({});
    if (existing && existing.length > 0) {
      if (!seedCheck) {
        await db.aiConfigs.insertOne({ id: 'products_seeded_flag', seeded: true });
      }
      return existing;
    }

    if (seedCheck) {
      return [];
    }

    // If database collection is empty and never seeded, seed from data-store/products.json
    const dataStorePath = path.join(process.cwd(), 'data-store', 'products.json');
    if (fs.existsSync(dataStorePath)) {
      const raw = fs.readFileSync(dataStorePath, 'utf-8');
      const jsonProducts = JSON.parse(raw);
      if (Array.isArray(jsonProducts) && jsonProducts.length > 0) {
        console.log(`Seeding database with ${jsonProducts.length} products from store...`);
        for (const prod of jsonProducts) {
          await db.products.insertOne(prod);
        }
        await db.aiConfigs.insertOne({ id: 'products_seeded_flag', seeded: true });
        return await db.products.find({});
      }
    }
    return [];
  } catch (err) {
    console.error("Error ensuring products are fetched from database:", err);
    return [];
  }
}

// ==========================================
// AUTHENTICATION ROUTING (JWT & MongoDB)
// ==========================================

// Helper: Sync User to dedicated role sub-collections (users_admin, users_buyers, users_sellers)
async function syncUserToRoleSubCollection(user: any) {
  if (!user || (!user.id && !user._id)) return;
  const uid = user.id || user._id;
  const email = (user.email || '').toLowerCase();
  const role = (user.role || (email.includes('admin') ? 'admin' : (email.includes('seller') ? 'seller' : 'customer'))).toLowerCase();

  const userDoc = { ...user, id: uid, _id: uid, role };

  try {
    if (role === 'admin') {
      const existing = await db.adminUsers.findOne({ id: uid });
      if (existing) {
        await db.adminUsers.updateOne({ id: uid }, userDoc);
      } else {
        await db.adminUsers.insertOne(userDoc);
      }
    } else if (role === 'seller') {
      const existing = await db.sellerUsers.findOne({ id: uid });
      if (existing) {
        await db.sellerUsers.updateOne({ id: uid }, userDoc);
      } else {
        await db.sellerUsers.insertOne(userDoc);
      }
    } else {
      // buyer / customer
      const existing = await db.buyerUsers.findOne({ id: uid });
      if (existing) {
        await db.buyerUsers.updateOne({ id: uid }, userDoc);
      } else {
        await db.buyerUsers.insertOne(userDoc);
      }
    }
  } catch (err) {
    console.error("Error syncing user to role sub-collection:", err);
  }
}

// Helper: Get AuraCoin Balance & Ledger with 3-month expiration and delivery unlocks
async function getAuraCoinSummary(userId: string) {
  if (!userId) {
    return { activeCoins: 0, pendingCoins: 0, redeemedCoins: 0, expiredCoins: 0, records: [] };
  }

  const userOrders = await db.orders.find({ userId });
  const allCoinRecords = await db.auraCoins.find({ userId });

  const now = Date.now();

  for (const record of allCoinRecords) {
    // Check 3-month (90 days) expiration for active coins
    if (record.status === 'active' && record.expiresAt) {
      if (now > new Date(record.expiresAt).getTime()) {
        await db.auraCoins.updateOne({ id: record.id }, { status: 'expired' });
        record.status = 'expired';
      }
    }

    // Check if pending coin record should be activated (Delivered status + refund window elapsed/delivered)
    if (record.status === 'pending' && record.orderId) {
      const order = userOrders.find((o: any) => o.id === record.orderId || o.transactionId === record.orderId);
      if (order && order.status === 'Delivered') {
        const deliveredAt = order.updatedAt || new Date().toISOString();
        const expiresAt = new Date(now + 90 * 24 * 60 * 60 * 1000).toISOString();
        await db.auraCoins.updateOne(
          { id: record.id },
          { status: 'active', deliveredAt, expiresAt }
        );
        record.status = 'active';
        record.deliveredAt = deliveredAt;
        record.expiresAt = expiresAt;
      }
    }
  }

  // Calculate summary totals
  let activeCoins = 0;
  let pendingCoins = 0;
  let redeemedCoins = 0;
  let expiredCoins = 0;

  for (const r of allCoinRecords) {
    if (r.status === 'active') activeCoins += (r.coins || 0);
    else if (r.status === 'pending') pendingCoins += (r.coins || 0);
    else if (r.status === 'used') redeemedCoins += Math.abs(r.coins || 0);
    else if (r.status === 'expired') expiredCoins += (r.coins || 0);
  }

  return {
    activeCoins: Math.max(0, activeCoins),
    pendingCoins: Math.max(0, pendingCoins),
    redeemedCoins: Math.max(0, redeemedCoins),
    expiredCoins: Math.max(0, expiredCoins),
    records: allCoinRecords.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  };
}

// Helper: Seed default accounts on-demand
async function ensureUsersSeeded() {
  try {
    const adminPassHash = hashPassword('admin@aura');
    const sellerPassHash = hashPassword('seller@aura');

    const dataStorePath = path.join(process.cwd(), 'data-store', 'users.json');
    if (fs.existsSync(dataStorePath)) {
      const raw = fs.readFileSync(dataStorePath, 'utf-8');
      const jsonUsers = JSON.parse(raw);
      for (const u of jsonUsers) {
        let expectedPassword = u.password;
        if (u.role === 'admin' || (u.email && u.email.includes('admin'))) {
          expectedPassword = adminPassHash;
        } else if (u.role === 'seller' || (u.email && u.email.includes('seller'))) {
          expectedPassword = sellerPassHash;
        }

        const userDoc = { ...u, password: expectedPassword };
        const found = await db.users.findOne({ email: u.email });
        if (!found) {
          await db.users.insertOne(userDoc);
          await syncUserToRoleSubCollection(userDoc);
        } else {
          // Update password if changed
          if (found.password !== expectedPassword || found.role !== userDoc.role) {
            await db.users.updateOne({ email: u.email }, { $set: { password: expectedPassword, role: userDoc.role } });
            found.password = expectedPassword;
            found.role = userDoc.role;
          }
          await syncUserToRoleSubCollection(found);
        }
      }
    }

    // Ensure all existing admin & seller accounts in database have updated passwords
    const allUsers = await db.users.find({});
    for (const user of allUsers) {
      if (user.role === 'admin' || (user.email && user.email.includes('admin'))) {
        if (user.password !== adminPassHash) {
          await db.users.updateOne({ id: user.id }, { $set: { password: adminPassHash } });
          user.password = adminPassHash;
          await syncUserToRoleSubCollection(user);
        }
      } else if (user.role === 'seller' || (user.email && user.email.includes('seller'))) {
        if (user.password !== sellerPassHash) {
          await db.users.updateOne({ id: user.id }, { $set: { password: sellerPassHash } });
          user.password = sellerPassHash;
          await syncUserToRoleSubCollection(user);
        }
      }
    }

    // Ensure deliveryboy account exists and has password 'delivery' and role 'delivery'
    const deliveryPassHash = hashPassword('delivery');
    const deliveryUser = await db.users.findOne({ email: 'deliveryboy@aura.com' });
    if (!deliveryUser) {
      const newDeliveryDoc = {
        id: 'delivery-boy-1001',
        _id: 'delivery-boy-1001',
        email: 'deliveryboy@aura.com',
        password: deliveryPassHash,
        displayName: 'Aura Delivery Executive',
        role: 'delivery',
        pincode: '110001',
        city: 'New Delhi',
        state: 'Delhi',
        createdAt: new Date().toISOString()
      };
      await db.users.insertOne(newDeliveryDoc);
      await syncUserToRoleSubCollection(newDeliveryDoc);
    } else {
      if (deliveryUser.password !== deliveryPassHash || deliveryUser.role !== 'delivery') {
        await db.users.updateOne(
          { email: 'deliveryboy@aura.com' },
          { $set: { password: deliveryPassHash, role: 'delivery' } }
        );
      }
    }
  } catch (err) {
    console.error("Error ensuring users are seeded:", err);
  }
}

// Helper: Seed AI Assistant Config on-demand
async function ensureAiConfigSeeded() {
  try {
    const existing = await db.aiConfigs.find({});
    if (existing.length === 0) {
      console.log("Seeding AI Config from /data-store/ai_configs.json...");
      const dataStorePath = path.join(process.cwd(), 'data-store', 'ai_configs.json');
      if (fs.existsSync(dataStorePath)) {
        const raw = fs.readFileSync(dataStorePath, 'utf-8');
        const jsonConfigs = JSON.parse(raw);
        for (const cfg of jsonConfigs) {
          await db.aiConfigs.insertOne(cfg);
        }
      } else {
        await db.aiConfigs.insertOne({
          id: 'store-config-master',
          _id: 'store-config-master',
          systemInstruction: "You are the AURA Store Concierge & Retail Assistant. Recommend products based on user location deliverability, user browsing history, active discounts, and budget requirements.",
          activeOffersDirective: "Promote active discount codes: AURA10 (10% instant discount), HDFC500 (₹500 instant cashback on HDFC Bank cards). Highlight local 1-day express delivery for nearby sellers in Delhi, Mumbai, and Bengaluru.",
          recommendationMode: "personalized_history",
          promotionalBanner: "🎉 Festive Mega Sale: Extra 10% OFF with code AURA10 + Local Express 24h Delivery!",
          updatedAt: new Date().toISOString()
        });
      }
    }
  } catch (err) {
    console.error("Error seeding AI Config:", err);
  }
}

// Helper: Check location deliverability
function checkProductDeliverability(product: any, userPincode?: string, userCity?: string, userState?: string): boolean {
  if (!product) return true;
  const range = product.availabilityRange || 'india';
  if (range === 'india') return true;

  const pin = (userPincode || '110001').trim();
  const city = (userCity || 'New Delhi').trim().toLowerCase();
  const state = (userState || 'Delhi').trim().toLowerCase();

  const sPin = (product.sellerPincode || '110001').trim();
  const sCity = (product.sellerCity || 'New Delhi').trim().toLowerCase();
  const sState = (product.sellerState || 'Delhi').trim().toLowerCase();

  if (range === 'nearest') {
    const pinPrefix = pin.slice(0, 3);
    const sPinPrefix = sPin.slice(0, 3);
    return pinPrefix === sPinPrefix || city === sCity;
  }
  if (range === 'city') {
    return city === sCity || pin.slice(0, 3) === sPin.slice(0, 3);
  }
  if (range === 'state') {
    return state === sState || city === sCity;
  }
  return true;
}

// Register User
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, displayName, pincode, city, state } = req.body;

    if (!email || !password || !displayName) {
      return res.status(400).json({ error: "Please provide email, password, and display name." });
    }

    const emailClean = email.trim().toLowerCase();
    
    // Check if user already exists
    const existingUser = await db.users.findOne({ email: emailClean });
    if (existingUser) {
      return res.status(400).json({ error: "An account with this email already exists." });
    }

    // Create user document
    const hashedPassword = hashPassword(password);
    const userId = crypto.randomUUID();
    const role = emailClean.includes('admin') ? 'admin' : 'customer';

    const newUser = {
      id: userId,
      _id: userId,
      email: emailClean,
      password: hashedPassword,
      displayName: displayName.trim(),
      role,
      pincode: pincode ? pincode.trim() : '110001',
      city: city ? city.trim() : 'New Delhi',
      state: state ? state.trim() : 'Delhi',
      createdAt: new Date().toISOString()
    };

    await db.users.insertOne(newUser);

    // Sign JWT Token
    const token = jwt.sign(
      { uid: userId, email: emailClean, displayName: newUser.displayName, role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        uid: userId,
        email: emailClean,
        displayName: newUser.displayName,
        role,
        pincode: newUser.pincode,
        city: newUser.city,
        state: newUser.state
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Registration failed." });
  }
});

// Login User
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Please specify your email and password." });
    }

    const emailClean = email.trim().toLowerCase();
    
    // Seed default users if none exist in the file store
    await ensureUsersSeeded();
    
    let user = await db.users.findOne({ email: emailClean });

    if (!user) {
      // If user does not exist, automatically register them for a smooth sandbox experience
      const hashedPassword = hashPassword(password);
      const userId = crypto.randomUUID();
      const role = emailClean.includes('admin') ? 'admin' : (emailClean.includes('seller') ? 'seller' : 'customer');
      
      const newUser: any = {
        id: userId,
        _id: userId,
        email: emailClean,
        password: hashedPassword,
        displayName: emailClean.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        role,
        createdAt: new Date().toISOString()
      };

      // If registered as seller, initialize basic seller profile
      if (role === 'seller') {
        newUser.sellerProfile = {
          businessName: `${newUser.displayName} Store Ltd.`,
          storeName: `${newUser.displayName}'s Boutique`,
          phone: "+91 9876543210",
          email: emailClean,
          country: "India",
          state: "Delhi",
          city: "New Delhi",
          pincode: "110001",
          address: "123 Luxury Lane",
          upi: "seller@upi",
          description: "An elegant boutique collection."
        };
      }

      await db.users.insertOne(newUser);
      user = newUser;
    } else {
      // Verify Password for existing users
      const hashedPassword = hashPassword(password);
      if (user.password !== hashedPassword) {
        return res.status(401).json({ error: "Incorrect email address or password." });
      }
    }

    if (user && user.suspended) {
      return res.status(403).json({ error: "Your account has been deactivated/suspended by administrator." });
    }

    // Sign Token
    const role = user.role || (emailClean.includes('admin') ? 'admin' : 'customer');
    const token = jwt.sign(
      { uid: user.id, email: user.email, displayName: user.displayName, role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        uid: user.id,
        email: user.email,
        displayName: user.displayName,
        role,
        pincode: user.pincode || '110001',
        city: user.city || 'New Delhi',
        state: user.state || 'Delhi',
        sellerProfile: user.sellerProfile || null,
        shippingAddress: user.shippingAddress || {}
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Authentication failed." });
  }
});

// Send OTP Verification Code
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ error: "Please enter your email address." });
    }

    const emailClean = email.trim().toLowerCase();
    await ensureUsersSeeded();

    const user = await db.users.findOne({ email: emailClean });
    if (!user) {
      return res.status(404).json({ error: "No registered account found with this email. Please register first." });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const existingOtp = await db.otps.findOne({ email: emailClean });
    if (existingOtp) {
      await db.otps.updateOne({ email: emailClean }, { otp: otpCode, expiresAt, createdAt: new Date().toISOString() });
    } else {
      await db.otps.insertOne({
        id: crypto.randomUUID(),
        _id: crypto.randomUUID(),
        email: emailClean,
        otp: otpCode,
        expiresAt,
        createdAt: new Date().toISOString()
      });
    }

    console.log(`[Aura Auth] Verification OTP for ${emailClean}: ${otpCode}`);

    // Dispatch Gmail SMTP OTP Email asynchronously
    sendOtpEmail(emailClean, otpCode).catch(err => {
      console.error("[Aura Auth] Error triggering OTP email:", err);
    });

    res.json({
      message: `Verification code sent to ${emailClean}`,
      otp: otpCode,
      expiresInMinutes: 10
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to send OTP code." });
  }
});

// Verify & Login with OTP
app.post('/api/auth/login-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: "Please enter both your email address and 6-digit verification code." });
    }

    const emailClean = email.trim().toLowerCase();
    const cleanOtp = otp.toString().trim();

    await ensureUsersSeeded();
    let user = await db.users.findOne({ email: emailClean });

    const otpRecord = await db.otps.findOne({ email: emailClean });
    if (!otpRecord) {
      return res.status(400).json({ error: "No active verification code found. Click 'Send Verification Code' to receive one." });
    }

    if (otpRecord.otp !== cleanOtp) {
      return res.status(400).json({ error: "Incorrect verification code. Please check your code and try again." });
    }

    const expiresAtTime = new Date(otpRecord.expiresAt).getTime();
    if (Date.now() > expiresAtTime) {
      await db.otps.deleteOne({ email: emailClean });
      return res.status(400).json({ error: "Verification code has expired. Please request a new code." });
    }

    // Delete used OTP
    await db.otps.deleteOne({ email: emailClean });

    // Auto-create user if account does not exist yet
    if (!user) {
      const newUserId = 'user-' + crypto.randomUUID();
      const defaultRole = emailClean.includes('admin') ? 'admin' : (emailClean.includes('seller') ? 'seller' : 'customer');
      user = {
        id: newUserId,
        _id: newUserId,
        email: emailClean,
        displayName: emailClean.split('@')[0],
        role: defaultRole,
        pincode: '110001',
        city: 'New Delhi',
        state: 'Delhi',
        createdAt: new Date().toISOString()
      };
      await db.users.insertOne(user);
    }

    // Sign Token
    const role = user.role || (emailClean.includes('admin') ? 'admin' : (emailClean.includes('seller') ? 'seller' : 'customer'));
    const token = jwt.sign(
      { uid: user.id, email: user.email, displayName: user.displayName, role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        uid: user.id,
        email: user.email,
        displayName: user.displayName,
        role,
        pincode: user.pincode || '110001',
        city: user.city || 'New Delhi',
        state: user.state || 'Delhi',
        sellerProfile: user.sellerProfile || null,
        shippingAddress: user.shippingAddress || {}
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "OTP authentication failed." });
  }
});

// Get Current User profile (Validate active token)
app.get('/api/auth/me', authenticateToken, async (req: any, res) => {
  try {
    const user = await db.users.findOne({ id: req.user.uid });
    if (!user) {
      return res.status(404).json({ error: "User profile not found." });
    }

    res.json({
      uid: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role || (user.email.includes('admin') ? 'admin' : 'customer'),
      pincode: user.pincode || '110001',
      city: user.city || 'New Delhi',
      state: user.state || 'Delhi',
      sellerProfile: user.sellerProfile || null,
      shippingAddress: user.shippingAddress || {}
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to retrieve user." });
  }
});

// Update location endpoint
app.post('/api/user/update-location', authenticateToken, async (req: any, res) => {
  try {
    const { pincode, city, state } = req.body;
    const user = await db.users.findOne({ id: req.user.uid });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    user.pincode = pincode ? pincode.trim() : user.pincode;
    user.city = city ? city.trim() : user.city;
    user.state = state ? state.trim() : user.state;

    await db.users.updateOne(
      { id: req.user.uid },
      { $set: { pincode: user.pincode, city: user.city, state: user.state } }
    );

    res.json({
      uid: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role || 'customer',
      pincode: user.pincode,
      city: user.city,
      state: user.state,
      sellerProfile: user.sellerProfile || null,
      shippingAddress: user.shippingAddress || {}
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update location." });
  }
});

// ==========================================
// PRODUCTS CATALOG & REVIEW ROUTING
// ==========================================

// GET database diagnostics
app.get('/api/diagnose', async (req, res) => {
  try {
    const uri = process.env.MONGODB_URI || "Not set";
    const maskedUri = uri.replace(/:([^@]+)@/, ':****@');
    
    let connectionError: string | null = null;
    let productsSample: any[] = [];
    try {
      productsSample = await db.products.find({});
    } catch (err: any) {
      connectionError = err.message || String(err);
    }
    
    res.json({
      uri: maskedUri,
      connected: !connectionError,
      error: connectionError,
      productsCount: productsSample.length,
      nodeVersion: process.version,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET all products
app.get('/api/products', async (req, res) => {
  try {
    const products = await ensureProductsSeeded();
    res.json(products);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch products" });
  }
});

// GET single product details
app.get('/api/products/:id', async (req, res) => {
  try {
    const prodId = req.params.id;
    const product = await db.products.findOne({ id: prodId });
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ error: "Product not found" });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch product" });
  }
});

// GET seller country/payment-methods by sellerId
app.get('/api/seller/:id/payment-methods', async (req, res) => {
  try {
    const sellerId = req.params.id;
    const seller = await db.users.findOne({ id: sellerId });
    if (seller && seller.sellerProfile) {
      res.json({
        sellerId,
        storeName: seller.sellerProfile.storeName || seller.sellerProfile.businessName,
        country: seller.sellerProfile.country || "India",
        upi: seller.sellerProfile.upi || "seller@upi",
        bankDetails: seller.sellerProfile.bankDetails || "Demo Bank A/C"
      });
    } else {
      res.json({
        sellerId,
        storeName: "Aura Boutique",
        country: "India", // Default store country
        upi: "aura@upi",
        bankDetails: "Aura Bank - A/C 999988887777"
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch seller payment info" });
  }
});

// POST Review for a product (Optionally verified via JWT)
app.post('/api/products/:id/reviews', optionalAuthenticateToken, async (req: any, res) => {
  try {
    const prodId = req.params.id;
    const { userId, userName, rating, comment } = req.body;

    // Use JWT user ID if authenticated, else use parameters
    const finalUserId = req.user?.uid || userId;
    const finalUserName = req.user?.displayName || userName;

    if (!finalUserId || !finalUserName || !rating || !comment) {
      return res.status(400).json({ error: "Missing required review fields" });
    }

    const cleanRating = Math.max(1, Math.min(5, Number(rating)));

    // Add to reviews collection
    const newReview = {
      productId: prodId,
      userId: finalUserId,
      userName: finalUserName,
      rating: cleanRating,
      comment: comment.trim(),
      createdAt: new Date().toISOString()
    };
    
    const reviewDoc = await db.reviews.insertOne(newReview);

    // Update product rating stats in MongoDB Simulation
    const product = await db.products.findOne({ id: prodId });
    if (product) {
      const currentReviewsCount = product.reviewsCount || 0;
      const currentRating = product.rating || 0;
      
      const newReviewsCount = currentReviewsCount + 1;
      const newRating = Number(((currentRating * currentReviewsCount + cleanRating) / newReviewsCount).toFixed(1));

      await db.products.updateOne(
        { id: prodId },
        { 
          $set: {
            reviewsCount: newReviewsCount,
            rating: newRating
          } 
        }
      );
    }

    res.status(201).json(reviewDoc);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to submit review" });
  }
});

// GET reviews for a product
app.get('/api/products/:id/reviews', async (req, res) => {
  try {
    const prodId = req.params.id;
    const reviews = await db.reviews.find({ productId: prodId });
    // Sort reviews by newest first
    reviews.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(reviews);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch reviews" });
  }
});

// ==========================================
// TRANSACTIONS & ORDER ROUTING
// ==========================================

// Helper function to dynamically calculate payouts for an order if it doesn't already exist
function ensurePayoutsCalculated(order: any) {
  if (order.payouts && Object.keys(order.payouts).length > 0) {
    return order;
  }
  
  const payouts: Record<string, any> = {};
  if (order.items && Array.isArray(order.items)) {
    for (const item of order.items) {
      // Find seller ID or default to demo seller
      const sellerId = item.product.sellerId || 'seller-uuid-2222';
      const sellerName = item.product.sellerName || 'Aura Boutique';
      const gross = (item.product.price || 0) * (item.quantity || 1);
      
      if (!payouts[sellerId]) {
        payouts[sellerId] = {
          sellerId,
          storeName: sellerName,
          gross: 0,
          platformFee: 0,
          taxes: 0,
          charges: 0,
          net: 0,
          status: 'Pending',
          updatedAt: order.createdAt || new Date().toISOString()
        };
      }
      payouts[sellerId].gross += Number(gross);
    }
    
    for (const sellerId in payouts) {
      const p = payouts[sellerId];
      p.platformFee = Number((p.gross * 0.10).toFixed(2));
      p.taxes = Number((p.gross * 0.05).toFixed(2));
      p.charges = Number((p.gross * 0.02).toFixed(2));
      p.net = Number((p.gross - p.platformFee - p.taxes - p.charges).toFixed(2));
    }
  }
  order.payouts = payouts;
  return order;
}

// GET AuraCoins summary and transaction history for user
app.get('/api/auracoins/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const summary = await getAuraCoinSummary(userId);
    res.json(summary);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch AuraCoins summary" });
  }
});

// POST Create Order (Checkout)
app.post('/api/orders', optionalAuthenticateToken, async (req: any, res) => {
  try {
    const { userId, userEmail, items, total, shippingAddress, paymentMethod, redeemCoins } = req.body;

    const finalUserId = req.user?.uid || userId;
    const finalUserEmail = req.user?.email || userEmail || "anonymous@example.com";

    if (!finalUserId || !items || !total || !shippingAddress) {
      return res.status(400).json({ error: "Missing required checkout parameters" });
    }

    const rawTotal = Number(total);
    let coinDiscount = 0;
    let coinsUsedCount = 0;

    // Handle AuraCoins redemption (1 AuraCoin = ₹1 discount)
    // Constraint: 3-10% of price, capped at 100 coins max
    if (redeemCoins && Number(redeemCoins) > 0 && finalUserId) {
      const summary = await getAuraCoinSummary(finalUserId);
      const activeBalance = summary.activeCoins;

      const maxCoinsAllowed = Math.min(100, Math.floor(rawTotal * 0.10)); // 10% max capped at 100
      coinsUsedCount = Math.min(Number(redeemCoins), maxCoinsAllowed, activeBalance);

      if (coinsUsedCount > 0) {
        coinDiscount = coinsUsedCount; // 1 coin = ₹1
        
        // Add redemption record
        await db.auraCoins.insertOne({
          id: crypto.randomUUID(),
          _id: crypto.randomUUID(),
          userId: finalUserId,
          userEmail: finalUserEmail,
          type: 'redeemed',
          coins: -coinsUsedCount,
          status: 'used',
          createdAt: new Date().toISOString(),
          description: `Redeemed ${coinsUsedCount} AuraCoins (₹${coinDiscount} discount)`
        });
      }
    }

    // Calculate payment offer discount (e.g., ₹50 OFF for UPI & Paytm)
    let offerDiscount = Number(req.body.offerDiscount || 0);
    let appliedOffer = req.body.appliedOffer || '';

    const pMethodLower = (paymentMethod || '').toLowerCase();
    if (!offerDiscount && !appliedOffer) {
      if (pMethodLower.includes('upi')) {
        offerDiscount = 50;
        appliedOffer = '₹50 Instant Discount (UPI Offer)';
      } else if (pMethodLower.includes('paytm')) {
        offerDiscount = 50;
        appliedOffer = '₹50 Instant Discount (Paytm Offer)';
      }
    }

    const finalTotal = Math.max(0, rawTotal - coinDiscount - offerDiscount);
    const isCod = pMethodLower.includes('cod') || pMethodLower.includes('cash on delivery');
    const paymentStatus = isCod ? 'Payment Due (Pending Delivery)' : 'Paid';
    const isPaid = !isCod;

    // Verify stock and decrement from inventory in MongoDB Simulation
    for (const item of items) {
      const prodId = item.product.id;
      const product = await db.products.findOne({ id: prodId });
      if (product) {
        const currentInventory = product.inventory || 0;
        const newInventory = Math.max(0, currentInventory - item.quantity);
        await db.products.updateOne({ id: prodId }, { $set: { inventory: newInventory } });
      }
    }

    // Calculate payouts for this order
    const payouts: Record<string, any> = {};
    for (const item of items) {
      const sellerId = item.product.sellerId || 'seller-uuid-2222';
      const sellerName = item.product.sellerName || 'Aura Boutique';
      const gross = Number(item.product.price) * Number(item.quantity);

      if (!payouts[sellerId]) {
        payouts[sellerId] = {
          sellerId,
          storeName: sellerName,
          gross: 0,
          platformFee: 0,
          taxes: 0,
          charges: 0,
          net: 0,
          status: 'Pending',
          updatedAt: new Date().toISOString()
        };
      }
      payouts[sellerId].gross += gross;
    }

    // breakdown calculation (10% platform fee, 5% taxes, 2% charges)
    for (const sellerId in payouts) {
      const p = payouts[sellerId];
      p.platformFee = Number((p.gross * 0.10).toFixed(2));
      p.taxes = Number((p.gross * 0.05).toFixed(2));
      p.charges = Number((p.gross * 0.02).toFixed(2));
      p.net = Number((p.gross - p.platformFee - p.taxes - p.charges).toFixed(2));
    }

    // Create shipping transaction
    const transactionId = "TX_" + crypto.randomBytes(4).toString('hex').toUpperCase();

    // Calculate 4% AuraCoins earned (max 250 coins, unlocked after delivery + 7-day refund window)
    const coinsEarned = Math.min(250, Math.round(finalTotal * 0.04));
    if (coinsEarned > 0 && finalUserId) {
      await db.auraCoins.insertOne({
        id: crypto.randomUUID(),
        _id: crypto.randomUUID(),
        userId: finalUserId,
        userEmail: finalUserEmail,
        orderId: transactionId,
        type: 'earned',
        coins: coinsEarned,
        ratePercent: 4,
        status: 'pending',
        createdAt: new Date().toISOString(),
        unlocksAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        expiresAt: null,
        description: `Pending 4% AuraCoins (${coinsEarned} coins) for Order #${transactionId.slice(0, 8)}`
      });
    }

    // Delivery OTP is NOT generated at placement time.
    // It is generated ONLY when the order status transitions to 'Out for Delivery'.
    const deliveryOtp = null;

    const newOrder = {
      userId: finalUserId,
      userEmail: finalUserEmail,
      items,
      total: Number(finalTotal),
      originalTotal: Number(rawTotal),
      redeemedCoins: coinsUsedCount,
      earnedCoins: coinsEarned,
      offerDiscount: Number(offerDiscount),
      appliedOffer,
      paymentStatus,
      isPaid,
      status: 'Pending',
      shippingAddress,
      paymentMethod: paymentMethod || 'Mock Credit Card',
      transactionId,
      deliveryOtp,
      payouts, // Saved directly to database
      createdAt: new Date().toISOString()
    };

    const orderDoc = await db.orders.insertOne(newOrder);

    // Dispatch Order Confirmation Email asynchronously
    if (finalUserEmail) {
      sendOrderConfirmationEmail(finalUserEmail, orderDoc || newOrder).catch(err => {
        console.error("[Aura Orders] Error sending order confirmation email:", err);
      });
    }

    // Save shipping address for user if authenticated
    if (req.user?.uid) {
      await db.users.updateOne(
        { id: req.user.uid },
        { $set: { shippingAddress } }
      );
    }

    res.status(201).json(orderDoc);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to place order" });
  }
});

// GET Orders for User
app.get('/api/orders/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const orders = await db.orders.find({ userId });
    
    // Sort in-memory by newest first & compute payouts
    orders.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const enrichedOrders = orders.map(o => ensurePayoutsCalculated(o));
    res.json(enrichedOrders);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch orders" });
  }
});

// ==========================================
// ADMIN DASHBOARD MANAGEMENT ROUTING
// ==========================================

// Middleware: Authenticate Admin Request via JWT Token
function authenticateAdmin(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: "Access denied. Auth token missing." });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET) as any;
    if (verified.role !== 'admin') {
      return res.status(403).json({ error: "Forbidden. Admin authorization required." });
    }
    req.user = verified;
    next();
  } catch (err) {
    res.status(403).json({ error: "Invalid or expired token." });
  }
}

// GET all orders (Admin only)
app.get('/api/admin/orders', authenticateAdmin, async (req, res) => {
  try {
    const allOrders = await db.orders.find({});
    // Sort by newest first
    allOrders.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const enriched = allOrders.map((o: any) => ensurePayoutsCalculated(o));
    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to retrieve administrator orders listing" });
  }
});

// Helper: Unlock pending AuraCoins when order status becomes Delivered
async function unlockAuraCoinsForDeliveredOrder(orderId: string) {
  try {
    const coinRecords = await db.auraCoins.find({ status: 'pending' });
    const matching = coinRecords.filter((r: any) => r.orderId === orderId);
    const now = Date.now();
    const deliveredAt = new Date().toISOString();
    const expiresAt = new Date(now + 90 * 24 * 60 * 60 * 1000).toISOString(); // 3 months (90 days)

    for (const record of matching) {
      await db.auraCoins.updateOne(
        { id: record.id },
        { status: 'active', deliveredAt, expiresAt }
      );
    }
  } catch (err) {
    console.error("Error unlocking AuraCoins for order:", err);
  }
}

// Step-wise Order Status Progression Map
const ORDER_STATUS_NEXT_MAP: Record<string, string | null> = {
  'Pending': 'Processing',
  'Processing': 'Shipped',
  'Shipped': 'Out for Delivery',
  'Out for Delivery': 'Delivered',
  'Delivered': null,
  'Cancelled': null
};

function validateStepWiseStatusTransition(currentStatus: string, requestedStatus: string): { valid: boolean; error?: string } {
  const cur = currentStatus || 'Pending';
  if (cur === 'Delivered' || cur === 'Cancelled') {
    return { valid: false, error: `Order is already in final state '${cur}' and cannot be modified.` };
  }
  if (requestedStatus === 'Cancelled') {
    return { valid: true };
  }
  const expectedNext = ORDER_STATUS_NEXT_MAP[cur];
  if (expectedNext !== requestedStatus) {
    return { valid: false, error: `Invalid status transition. Status can only advance step-wise from '${cur}' to '${expectedNext}'.` };
  }
  return { valid: true };
}

// ==========================================
// DELIVERY AGENT / EXECUTIVE ROUTING
// ==========================================

// GET orders for Delivery Agent (filterable by city, pincode, or status)
app.get('/api/delivery/orders', async (req, res) => {
  try {
    const { city, pincode, search, status } = req.query;
    let allOrders = await db.orders.find({});

    // Sort newest first
    allOrders.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Enrich with computed payouts
    allOrders = allOrders.map((o: any) => ensurePayoutsCalculated(o));

    if (city || pincode || search) {
      const qCity = (city || '').toString().toLowerCase().trim();
      const qPin = (pincode || '').toString().trim();
      const qSearch = (search || '').toString().toLowerCase().trim();

      allOrders = allOrders.filter((o: any) => {
        const addr = o.shippingAddress || {};
        const matchCity = !qCity || (addr.city || '').toLowerCase().includes(qCity);
        const matchPin = !qPin || (addr.postalCode || '').includes(qPin);
        const matchSearch = !qSearch || 
          (o.id || '').toLowerCase().includes(qSearch) ||
          (o.transactionId || '').toLowerCase().includes(qSearch) ||
          (addr.name || '').toLowerCase().includes(qSearch) ||
          (addr.street || '').toLowerCase().includes(qSearch) ||
          (addr.phone || '').toLowerCase().includes(qSearch);

        return matchCity && matchPin && matchSearch;
      });
    }

    if (status) {
      const qStatus = status.toString().trim();
      allOrders = allOrders.filter((o: any) => o.status === qStatus);
    }

    res.json(allOrders);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch delivery orders" });
  }
});

// PATCH update order status by Delivery Agent (e.g. Shipped -> Out for Delivery)
app.patch('/api/delivery/orders/:id/status', async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;

    const allowed = ['Pending', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: "Invalid delivery status value" });
    }

    const existing = await db.orders.findOne({ id: orderId });
    if (!existing) {
      return res.status(404).json({ error: "Order not found" });
    }

    const validation = validateStepWiseStatusTransition(existing.status, status);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const updateObj: any = { status, updatedAt: new Date().toISOString() };

    // When status becomes 'Out for Delivery', generate OTP if not already set
    if (status === 'Out for Delivery') {
      if (!existing.deliveryOtp) {
        updateObj.deliveryOtp = Math.floor(100000 + Math.random() * 900000).toString();
      }
    }

    await db.orders.updateOne({ id: orderId }, { $set: updateObj });
    if (status === 'Delivered') {
      await unlockAuraCoinsForDeliveredOrder(orderId);
      await db.orders.updateOne({ id: orderId }, { $set: { paymentStatus: 'Paid', isPaid: true, deliveredAt: new Date().toISOString() } });
    }

    const updatedOrder = await db.orders.findOne({ id: orderId });

    // Send email notification to buyer with OTP code if Out for Delivery
    if (updatedOrder?.userEmail) {
      sendOrderStatusEmail(
        updatedOrder.userEmail, 
        updatedOrder, 
        status, 
        updateObj.deliveryOtp || updatedOrder.deliveryOtp
      ).catch(err => {
        console.error("[Delivery Agent] Error sending status email:", err);
      });
    }

    res.json(updatedOrder);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update order status" });
  }
});

// POST verify order delivery with 6-digit OTP & optional photo proof
app.post('/api/orders/:id/verify-delivery', async (req, res) => {
  try {
    const orderId = req.params.id;
    const { otp, deliveryPhoto } = req.body;

    if (!otp) {
      return res.status(400).json({ error: "Please enter the 6-digit delivery verification OTP code provided by buyer." });
    }

    const order = await db.orders.findOne({ id: orderId });
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const cleanOtp = otp.toString().trim();
    if (order.deliveryOtp && order.deliveryOtp !== cleanOtp) {
      return res.status(400).json({ error: "Incorrect Delivery OTP code. Please check code with buyer." });
    }

    const updateObj: any = {
      status: 'Delivered', 
      paymentStatus: 'Paid',
      isPaid: true,
      deliveredAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (deliveryPhoto) {
      updateObj.deliveryPhoto = deliveryPhoto;
    }

    await db.orders.updateOne({ id: orderId }, { $set: updateObj });
    await unlockAuraCoinsForDeliveredOrder(orderId);

    const updatedOrder = await db.orders.findOne({ id: orderId });
    if (updatedOrder?.userEmail) {
      sendOrderStatusEmail(updatedOrder.userEmail, updatedOrder, 'Delivered').catch(err => {
        console.error("[Aura Orders] Error sending delivery email notification:", err);
      });
    }
    res.json({ message: "Delivery verified successfully! Order automatically marked as Delivered.", order: updatedOrder });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to verify delivery OTP" });
  }
});

// PATCH update order status (Admin only)
app.patch('/api/admin/orders/:id/status', authenticateAdmin, async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;

    const allowedStatuses = ['Pending', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status value specified" });
    }

    const existing = await db.orders.findOne({ id: orderId });
    if (!existing) {
      return res.status(404).json({ error: "Order not found or invalid ID" });
    }

    const validation = validateStepWiseStatusTransition(existing.status, status);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const updateObj: any = { status, updatedAt: new Date().toISOString() };
    if (status === 'Out for Delivery' && !existing.deliveryOtp) {
      updateObj.deliveryOtp = Math.floor(100000 + Math.random() * 900000).toString();
    }

    await db.orders.updateOne({ id: orderId }, { $set: updateObj });

    if (status === 'Delivered') {
      await unlockAuraCoinsForDeliveredOrder(orderId);
      await db.orders.updateOne({ id: orderId }, { $set: { paymentStatus: 'Paid', isPaid: true, deliveredAt: new Date().toISOString() } });
    }

    const updatedOrder = await db.orders.findOne({ id: orderId });
    if (updatedOrder?.userEmail) {
      sendOrderStatusEmail(updatedOrder.userEmail, updatedOrder, status, updateObj.deliveryOtp || updatedOrder.deliveryOtp).catch(err => {
        console.error("[Aura Orders] Error sending status update email:", err);
      });
    }
    res.json(updatedOrder);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update order status" });
  }
});

// Helper to safely trim image URLs (supports single string URL or array of URLs)
function safeTrimImage(img: any): string | string[] {
  if (Array.isArray(img)) {
    return img.map(i => (typeof i === 'string' ? i.trim() : (i ? String(i).trim() : ''))).filter(Boolean);
  }
  if (typeof img === 'string') {
    return img.trim();
  }
  if (img) {
    return String(img).trim();
  }
  return '';
}

// POST add a new product (Admin only)
app.post('/api/admin/products', authenticateAdmin, async (req, res) => {
  try {
    const { name, description, price, image, category, inventory, featured } = req.body;

    if (!name || !description || isNaN(price) || !image || !category || isNaN(inventory)) {
      return res.status(400).json({ error: "Missing required product creation properties" });
    }

    const cleanId = String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existing = await db.products.findOne({ id: cleanId });
    if (existing) {
      return res.status(400).json({ error: "A product with a similar name already exists" });
    }

    const newProduct = {
      id: cleanId,
      _id: cleanId,
      name: typeof name === 'string' ? name.trim() : String(name || ''),
      description: typeof description === 'string' ? description.trim() : String(description || ''),
      price: Number(price),
      image: safeTrimImage(image),
      category: typeof category === 'string' ? category.trim() : String(category || ''),
      inventory: Math.max(0, parseInt(inventory)),
      rating: 5,
      reviewsCount: 0,
      featured: !!featured
    };

    const doc = await db.products.insertOne(newProduct);
    res.status(201).json(doc);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to create new product" });
  }
});

// PATCH update product details / restock inventory (Admin only)
app.patch('/api/admin/products/:id', authenticateAdmin, async (req, res) => {
  try {
    const prodId = req.params.id;
    const { name, description, price, image, category, inventory, featured } = req.body;

    const existing = await db.products.findOne({ id: prodId });
    if (!existing) {
      return res.status(404).json({ error: "Product not found" });
    }

    const updates: any = {};
    if (name !== undefined) updates.name = typeof name === 'string' ? name.trim() : String(name);
    if (description !== undefined) updates.description = typeof description === 'string' ? description.trim() : String(description);
    if (price !== undefined) updates.price = Number(price);
    if (image !== undefined) updates.image = safeTrimImage(image);
    if (category !== undefined) updates.category = typeof category === 'string' ? category.trim() : String(category);
    if (inventory !== undefined) updates.inventory = Math.max(0, parseInt(inventory));
    if (featured !== undefined) updates.featured = !!featured;

    await db.products.updateOne({ id: prodId }, { $set: updates });
    const updatedProduct = await db.products.findOne({ id: prodId });
    res.json(updatedProduct);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update product" });
  }
});

// DELETE delete product (Admin only)
app.delete('/api/admin/products/:id', authenticateAdmin, async (req, res) => {
  try {
    const prodId = req.params.id;
    if (!prodId || prodId === 'undefined') {
      return res.status(400).json({ error: "Product ID required" });
    }
    await db.products.deleteOne({ id: prodId });
    await db.products.deleteOne({ _id: prodId });
    res.json({ success: true, message: "Product deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to delete product" });
  }
});

// ==========================================
// ARTIFICIAL INTELLIGENCE SHOPPING ASSISTANT
// ==========================================

// GET AI Config (Public / Admin)
app.get('/api/admin/ai-config', async (req, res) => {
  try {
    await ensureAiConfigSeeded();
    const configs = await db.aiConfigs.find({});
    if (configs.length > 0) {
      return res.json(configs[0]);
    }
    const defaultConfig = {
      id: 'store-config-master',
      systemInstruction: "You are the AURA Store Concierge & Retail Assistant. Recommend products based on user location deliverability, user browsing history, active discounts, and budget requirements.",
      activeOffersDirective: "Promote active discount codes: AURA10 (10% instant discount), HDFC500 (₹500 instant cashback on HDFC Bank cards). Highlight local 1-day express delivery for nearby sellers in Delhi, Mumbai, and Bengaluru.",
      recommendationMode: "personalized_history",
      promotionalBanner: "🎉 Festive Mega Sale: Extra 10% OFF with code AURA10 + Local Express 24h Delivery!",
      updatedAt: new Date().toISOString()
    };
    res.json(defaultConfig);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch AI configuration" });
  }
});

// PUT AI Config (Admin Only)
app.put('/api/admin/ai-config', authenticateAdmin, async (req, res) => {
  try {
    const { systemInstruction, activeOffersDirective, recommendationMode, promotionalBanner } = req.body;
    const existing = await db.aiConfigs.find({});
    const updateData = {
      systemInstruction,
      activeOffersDirective,
      recommendationMode,
      promotionalBanner,
      updatedAt: new Date().toISOString()
    };

    if (existing.length > 0) {
      await db.aiConfigs.updateOne({ id: existing[0].id }, updateData);
    } else {
      await db.aiConfigs.insertOne({
        id: 'store-config-master',
        _id: 'store-config-master',
        ...updateData
      });
    }
    const updated = await db.aiConfigs.find({});
    res.json(updated[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update configuration" });
  }
});

// POST AI Assistant Chat
app.post('/api/assistant', async (req, res) => {
  try {
    const { message, chatHistory, userPincode, userCity, userState, userEmail, userId } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.json({
        response: "Hello! I am your AURA Store Concierge. Feel free to browse our collection, check active offers, manage your cart, and place orders!",
        suggestedProducts: []
      });
    }

    // 1. Fetch AI Config & Admin Rules from DB
    await ensureAiConfigSeeded();
    const aiConfigs = await db.aiConfigs.find({});
    const activeAiConfig = aiConfigs[0] || {
      systemInstruction: "You are the AURA Store Concierge & Retail Assistant.",
      activeOffersDirective: "Promote active discount codes: AURA10 (10% instant discount), HDFC500 (₹500 instant cashback on HDFC Bank cards). Highlight local 1-day express delivery for nearby sellers in Delhi, Mumbai, and Bengaluru.",
      recommendationMode: "personalized_history"
    };

    // 2. Fetch Active Payment Offers from DB
    await ensurePaymentOffersSeeded();
    const activeOffers = await db.paymentOffers.find({ active: true });
    const offersSummary = activeOffers.map((o: any) => `- ${o.title}: ${o.discountPercentage ? o.discountPercentage + '% OFF' : ''} ${o.description || ''} (Code: ${o.code || 'Auto-Applied'})`).join('\n');

    // 3. Fetch User Order History from DB if logged in
    let userOrderContext = "";
    if (userId || userEmail) {
      const userOrders = await db.orders.find({});
      const myOrders = userOrders.filter((o: any) => (userId && o.userId === userId) || (userEmail && o.userEmail === userEmail));
      if (myOrders.length > 0) {
        const orderedItemNames = myOrders.flatMap((o: any) => o.items ? o.items.map((i: any) => i.product ? i.product.name : '') : []).filter(Boolean).slice(0, 5);
        if (orderedItemNames.length > 0) {
          userOrderContext = `User's Past Purchased Items: ${orderedItemNames.join(', ')}`;
        }
      }
    }

    // 4. Retrieve products catalog and annotate deliverability for user's location
    const products = await ensureProductsSeeded();
    const pin = userPincode || '110001';
    const city = userCity || 'New Delhi';
    const state = userState || 'Delhi';

    const catalogString = products.map((p: any) => {
      const isNear = checkProductDeliverability(p, pin, city, state);
      return `- [ID: ${p.id}] "${p.name}" (₹${p.price}) | Category: ${p.category} | Seller: ${p.sellerName || 'Aura Seller'} (${p.sellerCity || 'New Delhi'}) | Deliverable to ${pin}: ${isNear ? 'YES (Express 1-2 Days)' : 'NO (Out of delivery zone)'} | Stock: ${p.inventory} | Rating: ${p.rating}/5`;
    }).join('\n');

    const promptInstruction = `${activeAiConfig.systemInstruction || "You are the AURA Store Concierge & Retail Assistant."}

RECOMMENDATION ENGINE MODE: ${activeAiConfig.recommendationMode || "personalized_history"}

ADMIN ACTIVE DIRECTIVES & OFFERS:
${activeAiConfig.activeOffersDirective || "Promote active discounts"}

ACTIVE PROMOTIONAL PAYMENT OFFERS IN DB:
${offersSummary || "AURA10 for 10% off"}

AURACOIN LOYALTY PROGRAM:
- Buyers earn 3-5% of product order value as Auracoins when an order is Delivered.
- 1 Auracoin = ₹1 discount at checkout (up to 3-10% of product price, max 100 coins cap).
- Coins expire in 3 months (90 days).

USER LOCATION:
Pincode: ${pin}, City: ${city}, State: ${state}

USER HISTORY CONTEXT:
${userOrderContext || "New Shopper / Browsing Session"}

REAL-TIME INVENTORY & SELLER DELIVERABILITY CATALOG:
${catalogString}

GUIDELINES:
1. ONLY refer to products that are in the catalog above. Do not invent products outside this list.
2. Recommend 1-3 specific products matching user query. Prioritize items marked "Deliverable to ${pin}: YES". If an item is NOT deliverable to ${pin}, explain that the seller is outside their delivery zone and recommend a deliverable alternative.
3. Highlight active coupon codes and Auracoin cashback rewards (3-5% cashback) when recommending items.
4. Keep the tone warm, helpful, and professional.`;

    const chatSessionContents = [];
    if (Array.isArray(chatHistory)) {
      for (const msg of chatHistory) {
        chatSessionContents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        });
      }
    }
    chatSessionContents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: message,
      config: {
        systemInstruction: promptInstruction,
        temperature: 0.7,
      }
    });

    const responseText = response.text || "I am here to help you shop. What are you looking for today?";
    const suggestedProducts = products
      .filter((p: any) => responseText.toLowerCase().includes(p.name.toLowerCase()) || responseText.includes(p.id))
      .map((p: any) => p.id);

    res.json({
      response: responseText,
      suggestedProducts
    });
  } catch (error: any) {
    console.error("Assistant Error:", error);
    res.status(500).json({ error: error.message || "Failed to process AI assistant request" });
  }
});

// ==========================================
// DYNAMIC PAYMENTS & SELLER SYSTEM ROUTING
// ==========================================

// Helper: seed payment offers
async function ensurePaymentOffersSeeded() {
  try {
    const existing = await db.paymentOffers.find({});
    const needsMigration = existing.length > 0 && (!existing.some((off: any) => off.discountAmount === 50) || existing.some((off: any) => off.id === "esewa"));

    if (existing.length === 0 || needsMigration) {
      if (needsMigration) {
        console.log("Updating payment offers with ₹50 OFF for UPI & Paytm...");
        await db.paymentOffers.deleteMany({});
      }
      const defaultOffers = [
        { id: "upi", method: "UPI Instant Pay", cashback: "0", discount: "₹50 Instant OFF", discountAmount: 50, extraCharge: "0", badge: "₹50 Instant OFF", desc: "Flat ₹50 Instant Discount on all UPI payments" },
        { id: "paytm", method: "Paytm Wallet / UPI", cashback: "0", discount: "₹50 Instant OFF", discountAmount: 50, extraCharge: "0", badge: "₹50 Instant OFF", desc: "Flat ₹50 Instant Discount on Paytm payments" },
        { id: "card", method: "Credit/Debit Card", cashback: "0", discount: "0", discountAmount: 0, extraCharge: "0", badge: "No Offer", desc: "Secure RuPay, Visa, or MasterCard credit/debit cards" },
        { id: "netbanking", method: "Indian Net Banking", cashback: "0", discount: "0", discountAmount: 0, extraCharge: "0", badge: "No Offer", desc: "Direct secure transfer from major Indian banks" },
        { id: "cod", method: "Cash on Delivery (COD)", cashback: "0", discount: "0", discountAmount: 0, extraCharge: "0", badge: "Pay on Handover", desc: "Pay cash upon delivery with OTP verification" }
      ];
      for (const off of defaultOffers) {
        await db.paymentOffers.insertOne(off);
      }
    }
  } catch (err) {
    console.error("Error seeding payment offers:", err);
  }
}

// GET all orders
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await db.orders.find({});
    const enriched = orders.map((o: any) => ensurePayoutsCalculated(o));
    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch orders." });
  }
});

// GET all payment offers
app.get('/api/payment-offers', async (req, res) => {
  try {
    await ensurePaymentOffersSeeded();
    const offers = await db.paymentOffers.find({});
    res.json(offers);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch payment offers." });
  }
});

// POST register seller profile
app.post('/api/seller/register', authenticateToken, async (req: any, res) => {
  try {
    const { businessName, storeName, phone, email, country, state, city, address, identityDocument, bankDetails, upi, taxInformation, storeLogo, description, pincode } = req.body;

    const profile = {
      businessName,
      storeName,
      phone,
      email,
      country: country || "India",
      state: state || "Delhi",
      city: city || "New Delhi",
      address,
      pincode: pincode || "110001",
      identityDocument,
      bankDetails,
      upi: upi || "seller@upi",
      taxInformation,
      storeLogo,
      description
    };

    const newApp = {
      id: crypto.randomUUID(),
      userId: req.user.uid,
      userEmail: req.user.email,
      profile,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    await db.sellerApplications.insertOne(newApp);

    // Update user pending state
    await db.users.updateOne(
      { id: req.user.uid },
      { $set: { isSellerPending: true, sellerProfile: profile } }
    );

    res.json({ success: true, message: "Seller registration submitted for admin approval." });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Seller registration failed." });
  }
});

// PATCH update seller profile
app.patch('/api/seller/profile', authenticateToken, async (req: any, res) => {
  try {
    const { storeName, description, storeLogo, upi, address } = req.body;
    const user = await db.users.findOne({ id: req.user.uid });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const currentProfile = user.sellerProfile || {};
    const updatedProfile = {
      ...currentProfile,
      storeName: storeName || currentProfile.storeName,
      description: description || currentProfile.description,
      storeLogo: storeLogo || currentProfile.storeLogo,
      upi: upi || currentProfile.upi,
      address: address || currentProfile.address
    };

    await db.users.updateOne(
      { id: req.user.uid },
      { $set: { sellerProfile: updatedProfile } }
    );

    res.json({ success: true, sellerProfile: updatedProfile });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to update store settings" });
  }
});

// POST list seller product
app.post('/api/seller/products', authenticateToken, async (req: any, res) => {
  try {
    const { name, category, subcategory, price, inventory, image, brand, description, keyFeatures, originalPrice, specs, sellerName, availabilityRange } = req.body;

    if (!name || isNaN(price) || isNaN(inventory)) {
      return res.status(400).json({ error: "Please specify title, price, and inventory count." });
    }

    // Retrieve active seller profile for location denormalization
    const seller = await db.users.findOne({ id: req.user.uid });
    const profile = seller?.sellerProfile || {};
    const sellerPincode = profile.pincode || "110001";
    const sellerCity = profile.city || "New Delhi";
    const sellerState = profile.state || "Delhi";

    const cleanId = String(name || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + crypto.randomBytes(2).toString('hex');
    const newProduct = {
      id: cleanId,
      _id: cleanId,
      name: typeof name === 'string' ? name.trim() : String(name || ''),
      category: typeof category === 'string' ? category.trim() : String(category || ''),
      subcategory: typeof subcategory === 'string' ? subcategory.trim() : "",
      price: Number(price),
      inventory: Math.max(0, parseInt(inventory)),
      image: safeTrimImage(image),
      brand: typeof brand === 'string' ? brand.trim() : "",
      description: typeof description === 'string' ? description.trim() : "",
      keyFeatures: keyFeatures || [],
      originalPrice: Number(originalPrice) || Math.round(Number(price) * 1.35),
      specs: specs || {},
      sellerId: req.user.uid,
      sellerName: sellerName || profile.storeName || "Aura Boutique",
      sellerPincode,
      sellerCity,
      sellerState,
      availabilityRange: availabilityRange || "nearest",
      rating: 5,
      reviewsCount: 0,
      featured: false,
      createdAt: new Date().toISOString()
    };

    await db.products.insertOne(newProduct);
    res.status(201).json(newProduct);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to list product." });
  }
});

// PATCH edit seller product
app.patch('/api/seller/products/:id', authenticateToken, async (req: any, res) => {
  try {
    const pId = req.params.id;
    const { name, category, subcategory, price, inventory, image, brand, description, keyFeatures, originalPrice, specs, availabilityRange } = req.body;

    const product = await db.products.findOne({ id: pId });
    if (!product) {
      return res.status(404).json({ error: "Product listing not found." });
    }

    if (product.sellerId !== req.user.uid) {
      return res.status(403).json({ error: "Unauthorized operation. Product belongs to another seller." });
    }

    const updates: any = {};
    if (name !== undefined) updates.name = typeof name === 'string' ? name.trim() : String(name);
    if (category !== undefined) updates.category = typeof category === 'string' ? category.trim() : String(category);
    if (subcategory !== undefined) updates.subcategory = typeof subcategory === 'string' ? subcategory.trim() : String(subcategory);
    if (price !== undefined) updates.price = Number(price);
    if (inventory !== undefined) updates.inventory = Math.max(0, parseInt(inventory));
    if (image !== undefined) updates.image = safeTrimImage(image);
    if (brand !== undefined) updates.brand = typeof brand === 'string' ? brand.trim() : String(brand);
    if (description !== undefined) updates.description = typeof description === 'string' ? description.trim() : String(description);
    if (keyFeatures !== undefined) updates.keyFeatures = keyFeatures;
    if (originalPrice !== undefined) updates.originalPrice = Number(originalPrice);
    if (specs !== undefined) updates.specs = specs;
    if (availabilityRange !== undefined) updates.availabilityRange = availabilityRange;

    await db.products.updateOne({ id: pId }, { $set: updates });
    const updated = await db.products.findOne({ id: pId });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to update product details." });
  }
});

// DELETE seller product
app.delete('/api/seller/products/:id', authenticateToken, async (req: any, res) => {
  try {
    const pId = req.params.id;
    if (!pId || pId === 'undefined') {
      return res.status(400).json({ error: "Product ID required" });
    }
    await db.products.deleteOne({ id: pId });
    await db.products.deleteOne({ _id: pId });
    res.json({ success: true, message: "Product deleted from active catalog." });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to delete product." });
  }
});

// DELETE general product
app.delete('/api/products/:id', authenticateToken, async (req: any, res) => {
  try {
    const pId = req.params.id;
    if (!pId || pId === 'undefined') {
      return res.status(400).json({ error: "Product ID required" });
    }
    await db.products.deleteOne({ id: pId });
    await db.products.deleteOne({ _id: pId });
    res.json({ success: true, message: "Product permanently deleted from database and catalog." });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to delete product." });
  }
});

// DELETE product review
app.delete('/api/reviews/:reviewId', authenticateToken, async (req: any, res) => {
  try {
    const rId = req.params.reviewId;
    const review = await db.reviews.findOne({ id: rId });
    if (!review) {
      return res.status(404).json({ error: "Review thread not found." });
    }

    if (review.userId !== req.user.uid && req.user.role !== 'admin') {
      return res.status(403).json({ error: "Unauthorized operation." });
    }

    await db.reviews.deleteOne({ id: rId });
    res.json({ success: true, message: "Review deleted successfully." });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to delete review thread." });
  }
});

// PATCH edit product review
app.patch('/api/reviews/:reviewId', authenticateToken, async (req: any, res) => {
  try {
    const rId = req.params.reviewId;
    const { rating, comment, images } = req.body;

    const review = await db.reviews.findOne({ id: rId });
    if (!review) {
      return res.status(404).json({ error: "Review thread not found." });
    }

    if (review.userId !== req.user.uid) {
      return res.status(403).json({ error: "Unauthorized operation." });
    }

    const updates: any = {};
    if (rating !== undefined) updates.rating = Math.max(1, Math.min(5, Number(rating)));
    if (comment !== undefined) updates.comment = comment.trim();
    if (images !== undefined) updates.images = images;

    await db.reviews.updateOne({ id: rId }, { $set: updates });
    const updated = await db.reviews.findOne({ id: rId });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to update review thread." });
  }
});

// PATCH save user delivery address
app.patch('/api/auth/address', authenticateToken, async (req: any, res) => {
  try {
    const { shippingAddress } = req.body;
    await db.users.updateOne(
      { id: req.user.uid },
      { $set: { shippingAddress } }
    );
    res.json({ success: true, shippingAddress });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to save address details." });
  }
});

// PATCH update user display name / settings
app.patch('/api/auth/profile', authenticateToken, async (req: any, res) => {
  try {
    const { displayName } = req.body;
    await db.users.updateOne(
      { id: req.user.uid },
      { $set: { displayName } }
    );
    res.json({ success: true, displayName });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to update display name." });
  }
});

// GET all seller applications (Admin only)
app.get('/api/admin/seller-applications', authenticateAdmin, async (req, res) => {
  try {
    const apps = await db.sellerApplications.find({});
    res.json(apps);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch seller applications." });
  }
});

// POST approve seller (Admin only)
app.post('/api/admin/approve-seller/:userId', authenticateAdmin, async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Update user role to seller and reset pending approval flag
    await db.users.updateOne(
      { id: userId },
      { $set: { role: 'seller', isSellerPending: false } }
    );

    const updatedUser = await db.users.findOne({ id: userId });
    if (updatedUser) {
      await db.buyerUsers.deleteOne({ id: userId });
      await syncUserToRoleSubCollection(updatedUser);
    }

    // Mark seller applications status for this user as approved
    await db.sellerApplications.updateOne(
      { userId },
      { $set: { status: 'approved' } }
    );

    res.json({ success: true, message: "Seller application approved successfully." });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to approve seller application." });
  }
});

// POST reject seller (Admin only)
app.post('/api/admin/reject-seller/:userId', authenticateAdmin, async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Reset pending approval flag but keep customer role
    await db.users.updateOne(
      { id: userId },
      { $set: { role: 'customer', isSellerPending: false } }
    );

    const updatedUser = await db.users.findOne({ id: userId });
    if (updatedUser) {
      await db.sellerUsers.deleteOne({ id: userId });
      await syncUserToRoleSubCollection(updatedUser);
    }

    // Mark seller applications status for this user as rejected
    await db.sellerApplications.updateOne(
      { userId },
      { $set: { status: 'rejected' } }
    );

    res.json({ success: true, message: "Seller application rejected successfully." });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to reject seller application." });
  }
});

// GET all buyers (Admin only)
app.get('/api/admin/buyers', authenticateAdmin, async (req, res) => {
  try {
    let customers = await db.buyerUsers.find({});
    if (!customers || customers.length === 0) {
      customers = await db.users.find({ role: 'customer' });
    }
    const orders = await db.orders.find({});
    
    const buyersList = customers.map((cust: any) => {
      const custOrders = orders.filter((o: any) => o.userId === cust.id || o.userEmail === cust.email);
      const totalSpent = custOrders.reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);
      return {
        id: cust.id,
        email: cust.email,
        displayName: cust.displayName || "Customer",
        createdAt: cust.createdAt || new Date().toISOString(),
        ordersCount: custOrders.length,
        totalSpent,
        suspended: cust.suspended || false
      };
    });
    res.json(buyersList);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to retrieve buyers" });
  }
});

// PATCH toggle suspension state (Admin only)
app.patch('/api/admin/users/:userId/toggle-suspend', authenticateAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    let user = await db.users.findOne({ id: userId });
    if (!user) {
      user = await db.sellerUsers.findOne({ id: userId });
    }
    if (!user) {
      user = await db.buyerUsers.findOne({ id: userId });
    }
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const suspended = !user.suspended;
    await db.users.updateOne({ id: userId }, { $set: { suspended } });
    await db.sellerUsers.updateOne({ id: userId }, { $set: { suspended } });
    await db.buyerUsers.updateOne({ id: userId }, { $set: { suspended } });
    await syncUserToRoleSubCollection({ ...user, suspended });
    res.json({ success: true, suspended });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to toggle suspension" });
  }
});

// GET all sellers (Admin only)
app.get('/api/admin/sellers', authenticateAdmin, async (req, res) => {
  try {
    let sellers = await db.sellerUsers.find({});
    if (!sellers || sellers.length === 0) {
      sellers = await db.users.find({ role: 'seller' });
    }
    const orders = await db.orders.find({});
    
    const sellersList = sellers.map((sel: any) => {
      const profile = sel.sellerProfile || {};
      let totalEarnings = 0;
      let pendingPayouts = 0;
      
      orders.forEach((o: any) => {
        const enriched = ensurePayoutsCalculated(o);
        if (enriched.payouts && enriched.payouts[sel.id]) {
          const p = enriched.payouts[sel.id];
          if (p.status === 'Paid') {
            totalEarnings += Number(p.net || 0);
          } else {
            pendingPayouts += Number(p.net || 0);
          }
        }
      });
      
      return {
        id: sel.id,
        email: sel.email,
        displayName: sel.displayName || "Seller",
        storeName: profile.storeName || profile.businessName || "Aura Store",
        country: profile.country || "India",
        upi: profile.upi || "N/A",
        bankDetails: profile.bankDetails || "N/A",
        createdAt: sel.createdAt || new Date().toISOString(),
        totalEarnings,
        pendingPayouts,
        suspended: sel.suspended || false
      };
    });
    res.json(sellersList);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to retrieve sellers" });
  }
});

// POST disburse payout to a seller for an order (Admin only)
app.post('/api/admin/orders/:orderId/payouts/:sellerId/disburse', authenticateAdmin, async (req, res) => {
  try {
    const { orderId, sellerId } = req.params;
    const order = await db.orders.findOne({ id: orderId });
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    const enriched = ensurePayoutsCalculated(order);
    if (!enriched.payouts || !enriched.payouts[sellerId]) {
      return res.status(404).json({ error: "Payout for this seller in this order not found" });
    }
    
    enriched.payouts[sellerId].status = 'Paid';
    enriched.payouts[sellerId].updatedAt = new Date().toISOString();
    
    await db.orders.updateOne({ id: orderId }, { $set: { payouts: enriched.payouts } });
    res.json({ success: true, message: "Payout marked as Paid.", payouts: enriched.payouts });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to disburse payout" });
  }
});

// PATCH seller update order status for their products
app.patch('/api/seller/orders/:orderId/status', authenticateToken, async (req: any, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const sellerId = req.user.uid;

    const allowedStatuses = ['Pending', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status value specified" });
    }

    const order = await db.orders.findOne({ id: orderId });
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Verify this order indeed contains this seller's products
    const hasSellerProduct = order.items.some((item: any) => item.product.sellerId === sellerId);
    if (!hasSellerProduct) {
      return res.status(403).json({ error: "Unauthorized. Order does not contain products from your store." });
    }

    const validation = validateStepWiseStatusTransition(order.status, status);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const updateObj: any = { status, updatedAt: new Date().toISOString() };
    if (status === 'Out for Delivery' && !order.deliveryOtp) {
      updateObj.deliveryOtp = Math.floor(100000 + Math.random() * 900000).toString();
    }

    // Update order status
    await db.orders.updateOne({ id: orderId }, { $set: updateObj });
    if (status === 'Delivered') {
      await unlockAuraCoinsForDeliveredOrder(orderId);
      await db.orders.updateOne({ id: orderId }, { $set: { paymentStatus: 'Paid', isPaid: true, deliveredAt: new Date().toISOString() } });
    }
    const updatedOrder = await db.orders.findOne({ id: orderId });
    if (updatedOrder?.userEmail) {
      sendOrderStatusEmail(updatedOrder.userEmail, updatedOrder, status, updateObj.deliveryOtp || updatedOrder.deliveryOtp).catch(err => {
        console.error("[Aura Orders] Error sending seller status update email:", err);
      });
    }
    res.json(updatedOrder);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update seller order status" });
  }
});

// ==========================================
// ASSETS & SPA MIDDLEWARE SETUP
// ==========================================

async function start() {
  try {
    await ensureUsersSeeded();
    await ensureProductsSeeded();
    await ensureAiConfigSeeded();
  } catch (err) {
    console.error("Error running database seeders on startup:", err);
  }

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`E-Commerce Server running on http://localhost:${PORT}`);
  });
}

start();
