import fs from 'fs';
import path from 'path';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function migrate() {
  console.log("Starting data migration to MongoDB Atlas...");
  console.log("Database URI:", uri.replace(/:([^@]+)@/, ':****@')); // Hide password in logs

  try {
    await client.connect();
    console.log("Connected successfully to MongoDB Atlas server.");
    const db = client.db('mern-ecommerce');

    const collectionsToMigrate = [
      { file: 'users.json', collection: 'users' },
      { file: 'users_admin.json', collection: 'users_admin' },
      { file: 'users_buyers.json', collection: 'users_buyers' },
      { file: 'users_sellers.json', collection: 'users_sellers' },
      { file: 'auracoins.json', collection: 'auracoins' },
      { file: 'products.json', collection: 'products' },
      { file: 'orders.json', collection: 'orders' },
      { file: 'reviews.json', collection: 'reviews' },
      { file: 'seller_applications.json', collection: 'seller_applications' },
      { file: 'payment_offers.json', collection: 'payment_offers' },
      { file: 'ai_configs.json', collection: 'ai_configs' },
      { file: 'otps.json', collection: 'otps' }
    ];

    const dataStoreDir = path.join(process.cwd(), 'data-store');

    for (const item of collectionsToMigrate) {
      const filePath = path.join(dataStoreDir, item.file);
      console.log(`Processing file: ${item.file} -> Collection: ${item.collection}`);

      if (!fs.existsSync(filePath)) {
        console.log(`Warning: File ${item.file} does not exist. Skipping...`);
        continue;
      }

      const fileData = fs.readFileSync(filePath, 'utf-8');
      let docs: any[] = [];
      try {
        docs = JSON.parse(fileData);
      } catch (err) {
        console.error(`Error parsing JSON in ${item.file}:`, err);
        continue;
      }

      if (!Array.isArray(docs)) {
        console.error(`Error: Data in ${item.file} is not an array. Skipping...`);
        continue;
      }

      console.log(`Found ${docs.length} documents in ${item.file}.`);

      // Clear existing collection
      console.log(`Clearing collection "${item.collection}"...`);
      await db.collection(item.collection).deleteMany({});

      if (docs.length > 0) {
        // Map and deduplicate by id/_id
        const seenIds = new Set<string>();
        const sanitizedDocs: any[] = [];

        for (const doc of docs) {
          const newDoc = { ...doc };
          let docId = newDoc.id || newDoc._id;
          if (!docId) {
            docId = crypto.randomUUID();
          }
          newDoc.id = docId;
          newDoc._id = docId;

          if (!seenIds.has(docId)) {
            seenIds.add(docId);
            sanitizedDocs.push(newDoc);
          }
        }

        // Insert documents
        console.log(`Inserting ${sanitizedDocs.length} unique documents into "${item.collection}"...`);
        const result = await db.collection(item.collection).insertMany(sanitizedDocs);
        console.log(`Successfully inserted ${result.insertedCount} documents.`);
      } else {
        console.log(`Collection "${item.collection}" cleared (no documents to insert).`);
      }
      console.log("-----------------------------------------");
    }

    console.log("All data migrated successfully to MongoDB Atlas!");
  } catch (error) {
    console.error("Migration failed with error:", error);
  } finally {
    await client.close();
    console.log("MongoDB connection closed.");
  }
}

migrate();
