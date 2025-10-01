import { useState } from "react";
import { X, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { optimizeForMessageImage } from "../lib/cloudinaryUtils";

const MediaGallery = ({ isOpen, onClose, messages, initialImageIndex = 0 }) => {
  const [currentIndex, setCurrentIndex] = useState(initialImageIndex);
  
  // Filter messages to only include those with images
  const imageMessages = messages.filter(message => message.image);
  
  if (!isOpen || imageMessages.length === 0) return null;

  const currentMessage = imageMessages[currentIndex];
  
  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? imageMessages.length - 1 : prevIndex - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === imageMessages.length - 1 ? 0 : prevIndex + 1
    );
  };

  const downloadImage = () => {
    const link = document.createElement('a');
    link.href = currentMessage.image;
    link.download = `image-${currentMessage._id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex justify-between items-center p-4 bg-gradient-to-b from-black/50 to-transparent z-10">
        <div className="text-white">
          <p className="font-medium">{currentMessage.senderId?.fullName || "Unknown"}</p>
          <p className="text-sm text-gray-300">{formatDate(currentMessage.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadImage}
            className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
          >
            <Download className="size-5" />
          </button>
          <button
            onClick={onClose}
            className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="size-6" />
          </button>
        </div>
      </div>

      {/* Navigation Arrows */}
      {imageMessages.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 text-white hover:bg-white/20 rounded-full transition-colors z-10"
          >
            <ChevronLeft className="size-8" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 text-white hover:bg-white/20 rounded-full transition-colors z-10"
          >
            <ChevronRight className="size-8" />
          </button>
        </>
      )}

      {/* Main Image */}
      <div className="flex items-center justify-center w-full h-full p-8">
        <img
          src={optimizeForMessageImage(currentMessage.image)}
          alt="Gallery view"
          className="max-w-full max-h-full object-contain"
          loading="lazy"
        />
      </div>

      {/* Bottom Counter */}
      {imageMessages.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
          {currentIndex + 1} of {imageMessages.length}
        </div>
      )}

      {/* Message Text (if any) */}
      {currentMessage.text && (
        <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-lg max-w-md text-center">
          {currentMessage.text}
        </div>
      )}
    </div>
  );
};

export default MediaGallery;