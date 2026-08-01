import { MongoClient, Db, ObjectId } from 'mongodb';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

interface BaseDoc {
  id?: string;
  _id?: string;
  [key: string]: any;
}

const uri = process.env.MONGODB_URI;

let client: MongoClient | null = null;
let dbInstance: Db | null = null;
let isConnected = false;
let mongoFailed = false;

// Attempt MongoDB connection with 1500ms fast fail/timeout
async function getDb(): Promise<Db | null> {
  if (mongoFailed) return null;
  if (dbInstance) return dbInstance;

  try {
    if (!client) {
      client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 1500,
        connectTimeoutMS: 1500,
      });
    }
    if (!isConnected) {
      await client.connect();
      isConnected = true;
      console.log("Connected successfully to MongoDB Atlas database.");
    }
    dbInstance = client.db('mern-ecommerce');
    return dbInstance;
  } catch (err: any) {
    mongoFailed = true;
    console.warn(`[Database] MongoDB unavailable (${err.message}). Falling back to local File Store (/data-store).`);
    return null;
  }
}

function buildMongoQuery(query: any): any {
  if (!query || typeof query !== 'object' || Array.isArray(query)) return query;
  const newQuery: any = { ...query };
  const targetId = newQuery.id || newQuery._id;
  if (targetId && typeof targetId === 'string') {
    delete newQuery.id;
    delete newQuery._id;
    const conditions: any[] = [
      { id: targetId },
      { _id: targetId }
    ];
    if (ObjectId.isValid(targetId) && targetId.length === 24) {
      try {
        conditions.push({ _id: new ObjectId(targetId) });
      } catch (e) {
        // ignore
      }
    }
    if (Object.keys(newQuery).length > 0) {
      return { ...newQuery, $or: conditions };
    } else {
      return { $or: conditions };
    }
  }
  return newQuery;
}

function matchesQuery(doc: any, query: any): boolean {
  if (!query || Object.keys(query).length === 0) return true;
  for (const [key, val] of Object.entries(query)) {
    if (key.startsWith('$')) continue;
    if (key === 'id' || key === '_id') {
      const docId = doc.id !== undefined ? doc.id : doc._id;
      const docUnderscoreId = doc._id !== undefined ? doc._id : doc.id;
      if (String(docId) !== String(val) && String(docUnderscoreId) !== String(val)) {
        return false;
      }
      continue;
    }
    if (doc[key] !== val) return false;
  }
  return true;
}

export class FileCollection<T extends BaseDoc> {
  private collectionName: string;
  private filePath: string;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
    const dataDir = path.join(process.cwd(), 'data-store');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.filePath = path.join(dataDir, `${collectionName}.json`);
  }

  private readData(): T[] {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error(`Error reading file store for ${this.collectionName}:`, e);
    }
    return [];
  }

  private writeData(data: T[]): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error(`Error writing file store for ${this.collectionName}:`, e);
    }
  }

  async find(query: any = {}): Promise<T[]> {
    const items = this.readData();
    return items.filter(item => matchesQuery(item, query));
  }

  async findOne(query: any): Promise<T | null> {
    const items = this.readData();
    return items.find(item => matchesQuery(item, query)) || null;
  }

  async insertOne(doc: T): Promise<T> {
    const items = this.readData();
    const newDoc = { ...doc };

    if (!newDoc.id && !newDoc._id) {
      const id = crypto.randomUUID();
      newDoc.id = id;
      newDoc._id = id;
    } else if (newDoc.id && !newDoc._id) {
      newDoc._id = newDoc.id;
    } else if (!newDoc.id && newDoc._id) {
      newDoc.id = newDoc._id;
    }

    items.push(newDoc as T);
    this.writeData(items);
    return newDoc as T;
  }

  async updateOne(query: any, update: any): Promise<boolean> {
    const items = this.readData();
    const index = items.findIndex(item => matchesQuery(item, query));
    if (index === -1) return false;

    const $set = update.$set || update;
    items[index] = { ...items[index], ...$set };
    this.writeData(items);
    return true;
  }

  async deleteOne(query: any): Promise<boolean> {
    const items = this.readData();
    const index = items.findIndex(item => matchesQuery(item, query));
    if (index === -1) return false;

    items.splice(index, 1);
    this.writeData(items);
    return true;
  }

  async deleteMany(query: any = {}): Promise<number> {
    const items = this.readData();
    const initialCount = items.length;
    const remaining = items.filter(item => !matchesQuery(item, query));
    this.writeData(remaining);
    return initialCount - remaining.length;
  }
}

export class HybridCollection<T extends BaseDoc> {
  private collectionName: string;
  private fileStore: FileCollection<T>;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
    this.fileStore = new FileCollection<T>(collectionName);
  }

  async find(query: any = {}): Promise<T[]> {
    const database = await getDb();
    if (!database) return this.fileStore.find(query);

    try {
      const col = database.collection(this.collectionName);
      const mongoQuery = buildMongoQuery(query);
      return (await col.find(mongoQuery).toArray()) as unknown as T[];
    } catch (e) {
      return this.fileStore.find(query);
    }
  }

  async findOne(query: any): Promise<T | null> {
    const database = await getDb();
    if (!database) return this.fileStore.findOne(query);

    try {
      const col = database.collection(this.collectionName);
      const mongoQuery = buildMongoQuery(query);
      return (await col.findOne(mongoQuery)) as unknown as T | null;
    } catch (e) {
      return this.fileStore.findOne(query);
    }
  }

  async insertOne(doc: T): Promise<T> {
    const database = await getDb();
    const newDoc = { ...doc };
    if (!newDoc.id && !newDoc._id) {
      const id = crypto.randomUUID();
      newDoc.id = id;
      newDoc._id = id;
    } else if (newDoc.id && !newDoc._id) {
      newDoc._id = newDoc.id;
    } else if (!newDoc.id && newDoc._id) {
      newDoc.id = newDoc._id;
    }

    if (!database) return this.fileStore.insertOne(newDoc);

    try {
      const col = database.collection(this.collectionName);
      await col.insertOne({ ...newDoc } as any);
      return newDoc as T;
    } catch (e) {
      return this.fileStore.insertOne(doc);
    }
  }

  async updateOne(query: any, update: any): Promise<boolean> {
    const database = await getDb();
    if (!database) return this.fileStore.updateOne(query, update);

    try {
      const col = database.collection(this.collectionName);
      const mongoQuery = buildMongoQuery(query);
      const hasOperator = Object.keys(update).some(k => k.startsWith('$'));
      const updateDoc = hasOperator ? update : { $set: update };
      const result = await col.updateOne(mongoQuery, updateDoc);
      return result.modifiedCount > 0 || result.matchedCount > 0;
    } catch (e) {
      return this.fileStore.updateOne(query, update);
    }
  }

  async deleteOne(query: any): Promise<boolean> {
    const database = await getDb();
    if (!database) return this.fileStore.deleteOne(query);

    try {
      const col = database.collection(this.collectionName);
      const mongoQuery = buildMongoQuery(query);
      const result = await col.deleteOne(mongoQuery);
      return result.deletedCount ? result.deletedCount > 0 : true;
    } catch (e) {
      return this.fileStore.deleteOne(query);
    }
  }

  async deleteMany(query: any = {}): Promise<number> {
    const database = await getDb();
    if (!database) return this.fileStore.deleteMany(query);

    try {
      const col = database.collection(this.collectionName);
      const mongoQuery = buildMongoQuery(query);
      const result = await col.deleteMany(mongoQuery);
      return result.deletedCount || 0;
    } catch (e) {
      return this.fileStore.deleteMany(query);
    }
  }
}

// Instantiate database collections
export const db = {
  users: new HybridCollection<any>('users'),
  adminUsers: new HybridCollection<any>('users_admin'),
  buyerUsers: new HybridCollection<any>('users_buyers'),
  sellerUsers: new HybridCollection<any>('users_sellers'),
  auraCoins: new HybridCollection<any>('auracoins'),
  products: new HybridCollection<any>('products'),
  orders: new HybridCollection<any>('orders'),
  reviews: new HybridCollection<any>('reviews'),
  sellerApplications: new HybridCollection<any>('seller_applications'),
  paymentOffers: new HybridCollection<any>('payment_offers'),
  aiConfigs: new HybridCollection<any>('ai_configs'),
  otps: new HybridCollection<any>('otps'),
};
