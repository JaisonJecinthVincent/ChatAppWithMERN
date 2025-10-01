import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    // Enhanced MongoDB connection with optimized settings for high concurrency
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Connection Pool Settings - Optimized for 16GB RAM + high concurrency
      maxPoolSize: 100, // Increased from 50 - Maximum number of connections
      minPoolSize: 10,  // Increased from 5 - Minimum number of connections
      maxIdleTimeMS: 20000, // Reduced from 30s - Close connections after 20 seconds of inactivity
      
      // Performance Settings - Optimized for fast connections
      serverSelectionTimeoutMS: 3000, // Reduced from 5s - Faster server selection
      socketTimeoutMS: 30000, // Reduced from 45s - Faster socket timeout
      connectTimeoutMS: 5000, // Reduced from 10s - Faster connection attempts
      
      // Heartbeat Settings
      heartbeatFrequencyMS: 5000, // Reduced from 10s - More frequent health checks
      
      // Read/Write Settings
      retryWrites: true, // Retry writes on transient errors
      w: 'majority', // Write concern
      readPreference: 'primaryPreferred', // Read from primary when possible
      
      // Compression
      compressors: ['snappy', 'zlib'], // Enable compression
    });

    // Add connection event handlers for better error tracking
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
      if (err.message.includes('ECONNRESET')) {
        console.log('🔄 MongoDB: Connection reset detected, mongoose will auto-reconnect');
      }
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });

    console.log(`MongoDB connected: ${conn.connection.host}`);
    
    // Connection event handlers for monitoring
    mongoose.connection.on('connected', () => {
      console.log('✅ Mongoose connected to MongoDB');
    });
    
    mongoose.connection.on('error', (err) => {
      console.error('❌ Mongoose connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ Mongoose disconnected from MongoDB');
    });
    
    // Log connection pool statistics periodically
    setInterval(() => {
      const stats = mongoose.connection.db?.stats();
      if (stats) {
        console.log(`📊 MongoDB Pool Stats - Active: ${mongoose.connection.readyState}, Collections: ${Object.keys(mongoose.connection.collections).length}`);
      }
    }, 30000); // Log every 30 seconds
    
  } catch (error) {
    console.log("❌ MongoDB connection error:", error);
    process.exit(1); // Exit if cannot connect to database
  }
};
