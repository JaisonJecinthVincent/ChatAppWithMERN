import { useState } from 'react';
import { Download, Play, Pause, Eye, ExternalLink, File, Image, Video, Music, FileText, Archive } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const FileMessage = ({ message, onDownload, onPreview }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioRef, setAudioRef] = useState(null);

  // File type detection
  const getFileType = (filename) => {
    if (!filename) return 'unknown';
    const extension = filename.split('.').pop()?.toLowerCase();
    
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    const videoExts = ['mp4', 'webm', 'avi', 'mov', 'wmv', 'flv'];
    const audioExts = ['mp3', 'wav', 'ogg', 'aac', 'flac'];
    const docExts = ['pdf', 'doc', 'docx', 'txt', 'rtf'];
    const archiveExts = ['zip', 'rar', '7z', 'tar', 'gz'];

    if (imageExts.includes(extension)) return 'image';
    if (videoExts.includes(extension)) return 'video';
    if (audioExts.includes(extension)) return 'audio';
    if (docExts.includes(extension)) return 'document';
    if (archiveExts.includes(extension)) return 'archive';
    return 'other';
  };

  const getFileIcon = (type) => {
    switch (type) {
      case 'image': return Image;
      case 'video': return Video;
      case 'audio': return Music;
      case 'document': return FileText;
      case 'archive': return Archive;
      default: return File;
    }
  };

  const getFileColor = (type) => {
    switch (type) {
      case 'image': return 'text-blue-500';
      case 'video': return 'text-red-500';
      case 'audio': return 'text-purple-500';
      case 'document': return 'text-green-500';
      case 'archive': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleAudioToggle = () => {
    if (audioRef) {
      if (isPlaying) {
        audioRef.pause();
      } else {
        audioRef.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const fileType = getFileType(message.fileName || message.image);
  const IconComponent = getFileIcon(fileType);
  const iconColor = getFileColor(fileType);

  // If it's just an image (backward compatibility)
  if (message.image && !message.fileName) {
    return (
      <div className="max-w-sm">
        <img
          src={message.image}
          alt="Shared image"
          className="rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => onPreview && onPreview(message.image, 'image')}
        />
      </div>
    );
  }

  // File attachment display
  return (
    <div className="bg-base-200 rounded-lg p-3 max-w-sm">
      <div className="flex items-start gap-3">
        {/* File Icon/Preview */}
        <div className="flex-shrink-0">
          {fileType === 'image' && message.fileUrl ? (
            <div className="relative">
              <img
                src={message.fileUrl}
                alt={message.fileName}
                className="w-12 h-12 object-cover rounded cursor-pointer"
                onClick={() => onPreview && onPreview(message.fileUrl, 'image')}
              />
              <div className="absolute inset-0 bg-black/20 rounded flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                <Eye className="w-4 h-4 text-white" />
              </div>
            </div>
          ) : (
            <div className="w-12 h-12 bg-base-300 rounded flex items-center justify-center">
              <IconComponent className={`w-6 h-6 ${iconColor}`} />
            </div>
          )}
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate" title={message.fileName}>
            {message.fileName || 'Unknown file'}
          </div>
          
          <div className="text-xs text-base-content/60 space-y-1">
            <div>
              {formatFileSize(message.fileSize)} • {fileType}
            </div>
            <div>
              {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
            </div>
          </div>

          {/* Audio Player */}
          {fileType === 'audio' && message.fileUrl && (
            <div className="mt-2 space-y-2">
              <audio
                ref={setAudioRef}
                src={message.fileUrl}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />
              <button
                onClick={handleAudioToggle}
                className="btn btn-sm btn-primary"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span className="ml-1">{isPlaying ? 'Pause' : 'Play'}</span>
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-1 mt-2">
            {/* Download Button */}
            <button
              onClick={() => onDownload && onDownload(message.fileUrl, message.fileName)}
              className="btn btn-ghost btn-xs"
              title="Download"
            >
              <Download className="w-3 h-3" />
            </button>

            {/* Preview Button (for supported types) */}
            {(['image', 'video', 'document'].includes(fileType)) && (
              <button
                onClick={() => onPreview && onPreview(message.fileUrl, fileType)}
                className="btn btn-ghost btn-xs"
                title="Preview"
              >
                <Eye className="w-3 h-3" />
              </button>
            )}

            {/* External Link (for documents) */}
            {fileType === 'document' && (
              <button
                onClick={() => window.open(message.fileUrl, '_blank')}
                className="btn btn-ghost btn-xs"
                title="Open in new tab"
              >
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileMessage;