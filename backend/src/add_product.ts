import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function addProduct() {
  console.log("Connecting to MongoDB Atlas...");
  try {
    await client.connect();
    const db = client.db('mern-ecommerce');
    const collection = db.collection('products');

    const product = {
      id: "yofo-back-cover-oppo-reno-12-pro-5g",
      _id: "yofo-back-cover-oppo-reno-12-pro-5g",
      name: "YOFO Back Cover for Oppo Reno 12 Pro (5G)",
      brand: "YOFO",
      description: "Premium quality YOFO protective back cover for Oppo Reno 12 Pro (5G). Durable, shockproof, and sleek design.",
      price: 135,
      originalPrice: 699,
      image: [
        "https://rukminim2.flixcart.com/image/600/600/xif0q/cases-covers/back-cover/3/r/5/oppo-reno-12-pro-5g-mayankmobilesho-original-imahc49ube3xzq2a.jpeg",
        "https://rukminim2.flixcart.com/image/600/600/xif0q/cases-covers/back-cover/a/r/l/oppo-reno-12-pro-5g-mayankmobilesho-original-imahc49urhzkfgvw.jpeg",
        "https://rukminim2.flixcart.com/image/600/600/xif0q/cases-covers/back-cover/c/l/q/oppo-reno-12-pro-5g-mayankmobilesho-original-imahc49uhyvav5sw.jpeg"
      ],
      category: "Electronics",
      inventory: 50,
      rating: 4.5,
      reviewsCount: 240,
      featured: true,
      sellerId: "seller-uuid-1111",
      sellerName: "YOFO Retail",
      sellerPincode: "110001",
      sellerCity: "New Delhi",
      sellerState: "Delhi",
      availabilityRange: "nearest",
      tags: [
        "Flipkart Assured",
        "Free Delivery"
      ],
      keyFeatures: [
        "Shockproof protective bumper",
        "Raised edges for screen and camera protection",
        "Precise cutouts for Oppo Reno 12 Pro (5G)",
        "Anti-scratch matte finish"
      ],
      specs: {
        Material: "TPU + Polycarbonate",
        Type: "Back Cover",
        "Compatible Model": "Oppo Reno 12 Pro (5G)"
      },
      createdAt: new Date().toISOString()
    };

    console.log("Adding product to collection...");
    const result = await collection.updateOne(
      { id: product.id },
      { $set: product },
      { upsert: true }
    );

    if (result.upsertedCount > 0) {
      console.log(`Product added successfully! ID: ${product.id}`);
    } else {
      console.log(`Product updated successfully! ID: ${product.id}`);
    }
  } catch (error) {
    console.error("Error inserting product:", error);
  } finally {
    await client.close();
  }
}

addProduct();
