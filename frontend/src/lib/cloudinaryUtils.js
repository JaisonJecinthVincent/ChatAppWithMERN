// Cloudinary image optimization utility
export const getOptimizedImageUrl = (cloudinaryUrl, options = {}) => {
  if (!cloudinaryUrl || !cloudinaryUrl.includes('cloudinary.com')) {
    return cloudinaryUrl; // Return as-is if not a Cloudinary URL
  }

  const {
    width = 400,
    height = 400,
    quality = 'auto',
    format = 'auto',
    crop = 'fill',
    gravity = 'face'
  } = options;

  // Extract the public ID from the Cloudinary URL
  const urlParts = cloudinaryUrl.split('/');
  const uploadIndex = urlParts.findIndex(part => part === 'upload');
  
  if (uploadIndex === -1) return cloudinaryUrl;

  // Insert transformations after 'upload'
  const transformations = `w_${width},h_${height},c_${crop},g_${gravity},q_${quality},f_${format}`;
  
  // Rebuild URL with transformations
  const baseUrl = urlParts.slice(0, uploadIndex + 1).join('/');
  const publicId = urlParts.slice(uploadIndex + 1).join('/');
  
  return `${baseUrl}/${transformations}/${publicId}`;
};

// Specific optimization presets
export const optimizeForProfilePic = (url) => 
  getOptimizedImageUrl(url, { 
    width: 80, 
    height: 80, 
    crop: 'fill', 
    gravity: 'face',
    quality: '80'
  });

export const optimizeForMessageImage = (url) => 
  getOptimizedImageUrl(url, { 
    width: 600, 
    height: 400, 
    crop: 'limit', 
    quality: '85'
  });

export const optimizeForGroupPic = (url) => 
  getOptimizedImageUrl(url, { 
    width: 120, 
    height: 120, 
    crop: 'fill', 
    quality: '80'
  });