// Database indexing script for improved query performance
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const createIndexes = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });

    console.log('✅ Connected to MongoDB for indexing');

    const db = mongoose.connection.db;

    // Helper function to safely create indexes
    const safeCreateIndex = async (collection, indexSpec, options = {}) => {
      try {
        await db.collection(collection).createIndex(indexSpec, options);
        console.log(`✅ Created index on ${collection}:`, indexSpec);
      } catch (error) {
        if (error.code === 85) { // IndexOptionsConflict
          console.log(`⚠️ Index already exists on ${collection}:`, indexSpec);
        } else {
          console.error(`❌ Error creating index on ${collection}:`, error.message);
        }
      }
    };

    // User collection indexes
    console.log('📊 Creating User indexes...');
    await safeCreateIndex('users', { email: 1 }, { unique: true });
    await safeCreateIndex('users', { fullName: 'text', email: 'text' });
    await safeCreateIndex('users', { createdAt: -1 });

    // Message collection indexes
    console.log('📊 Creating Message indexes...');
    await safeCreateIndex('messages', { senderId: 1, receiverId: 1 });
    await safeCreateIndex('messages', { receiverId: 1, senderId: 1 });
    await safeCreateIndex('messages', { createdAt: -1 });
    await safeCreateIndex('messages', { 
      senderId: 1, 
      receiverId: 1, 
      createdAt: -1 
    }); // Compound index for conversation queries

    // Group collection indexes
    console.log('📊 Creating Group indexes...');
    await safeCreateIndex('groups', { members: 1 });
    await safeCreateIndex('groups', { createdBy: 1 });
    await safeCreateIndex('groups', { createdAt: -1 });
    
    // Check if text index exists before creating
    try {
      const existingIndexes = await db.collection('groups').indexes();
      const hasTextIndex = existingIndexes.some(idx => idx.key && idx.key._fts);
      
      if (!hasTextIndex) {
        await safeCreateIndex('groups', { name: 'text', description: 'text' });
      } else {
        console.log('⚠️ Text index already exists on groups collection');
      }
    } catch (error) {
      console.log('⚠️ Could not check existing indexes for groups');
    }

    // List all indexes
    console.log('\n📋 Current indexes:');
    
    try {
      const userIndexes = await db.collection('users').indexes();
      console.log('Users:', userIndexes.map(idx => idx.name));
      
      const messageIndexes = await db.collection('messages').indexes();
      console.log('Messages:', messageIndexes.map(idx => idx.name));
      
      const groupIndexes = await db.collection('groups').indexes();
      console.log('Groups:', groupIndexes.map(idx => idx.name));
    } catch (error) {
      console.log('⚠️ Could not list all indexes');
    }

    console.log('\n✅ Index creation completed!');

  } catch (error) {
    console.error('❌ Error connecting to database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
};

createIndexes();