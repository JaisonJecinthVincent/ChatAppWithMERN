import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function testImageUpload() {
  try {
    console.log('🖼️  Testing image upload functionality...');
    
    // Create a simple test image (1x1 pixel base64 image)
    const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    console.log('📤 Uploading test image...');
    const result = await cloudinary.uploader.upload(testImageBase64, {
      folder: 'chat-app-test',
      resource_type: 'image'
    });
    
    console.log('✅ Image uploaded successfully!');
    console.log('📋 Upload details:');
    console.log('  - Public ID:', result.public_id);
    console.log('  - URL:', result.secure_url);
    console.log('  - Format:', result.format);
    console.log('  - Size:', result.bytes, 'bytes');
    
    // Clean up - delete the test image
    console.log('\n🧹 Cleaning up test image...');
    await cloudinary.uploader.destroy(result.public_id);
    console.log('✅ Test image deleted successfully!');
    
    console.log('\n🎉 Image upload functionality is working perfectly!');
    
  } catch (error) {
    console.error('❌ Image upload test failed:');
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testImageUpload();
