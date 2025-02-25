import mongoose from 'mongoose';

// Define the interface for the mongoose cache
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Declare the global mongoose cache
declare global {
  var mongoose: MongooseCache | undefined;
}

// Use Atlas URL directly
const MONGODB_URI = 'mongodb+srv://karshe:Hnajiib12345@ebook.ja4hp.mongodb.net/quick-links';

// Fallback only if the above URL fails
// const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quicklink';

console.log('Using MongoDB connection URL:', MONGODB_URI.replace(/(mongodb\+srv:\/\/[^:]+:)([^@]+)(@.+)/, '$1[PASSWORD_HIDDEN]$3'));

// Add better error logging
if (!process.env.MONGODB_URI) {
  console.warn('Warning: MONGODB_URI not found in environment variables, using fallback connection string');
}

// Initialize the cache
let cached: MongooseCache = global.mongoose || { conn: null, promise: null };

// Store the cached connection
if (!global.mongoose) {
  global.mongoose = cached;
}

async function connectDB(): Promise<typeof mongoose> {
  try {
    if (cached.conn) {
      console.log('Using cached MongoDB connection');
      return cached.conn;
    }

    if (!cached.promise) {
      const opts = {
        bufferCommands: false,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000, // Give up initial connection after 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      };

      console.log('Establishing new MongoDB connection to:', MONGODB_URI);
      
      cached.promise = mongoose.connect(MONGODB_URI, opts)
        .then((mongoose) => {
          console.log(`MongoDB connected successfully to: ${mongoose.connection.db!.databaseName}`);
          return mongoose;
        });
    }
    
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (err) {
    console.error('MongoDB connection error:', err);
    
    // Reset the promise so we can try again
    cached.promise = null;
    throw err;
  }
}

export default connectDB;
