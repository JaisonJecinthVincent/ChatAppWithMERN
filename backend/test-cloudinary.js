import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

console.log('Testing Cloudinary connection...');
console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME);
console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY);
console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? '***hidden***' : 'NOT SET');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function testCloudinary() {
  try {
    console.log('\n🔍 Testing Cloudinary API connection...');
    
    // Test API connectivity by getting account details
    const result = await cloudinary.api.ping();
    console.log('✅ Cloudinary ping successful:', result);
    
    // Test getting account usage (this will verify authentication)
    const usage = await cloudinary.api.usage();
    console.log('✅ Cloudinary authentication successful!');
    console.log('📊 Account usage info:');
    console.log('  - Plan:', usage.plan);
    console.log('  - Credits used:', usage.credits?.used || 'N/A');
    console.log('  - Credits limit:', usage.credits?.limit || 'N/A');
    console.log('  - Storage used:', Math.round((usage.storage?.used || 0) / 1024 / 1024), 'MB');
    
    console.log('\n🎉 Cloudinary is properly configured and working!');
    
  } catch (error) {
    console.error('❌ Cloudinary connection failed:');
    console.error('Error:', error.message);
    
    if (error.http_code) {
      console.error('HTTP Code:', error.http_code);
    }
    
    if (error.http_code === 401) {
      console.error('💡 This is likely an authentication error. Please check your API credentials.');
    } else if (error.http_code === 404) {
      console.error('💡 Cloud name might be incorrect.');
    }
    
    process.exit(1);
  }
}

testCloudinary();
