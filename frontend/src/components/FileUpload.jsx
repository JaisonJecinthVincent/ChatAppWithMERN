import { useState, useRef, useCallback } from 'react';
import { Upload, X, File, Image, Video, FileText, Music, Archive } from 'lucide-react';
import toast from 'react-hot-toast';

const FileUpload = ({ onFilesSelected, onRemoveFile, files = [], maxFiles = 5, maxSize = 10 * 1024 * 1024 }) => { // 10MB default
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Supported file types with their icons and categories
  const fileTypes = {
    image: {
      extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
      icon: Image,
      color: 'text-blue-500',
      maxSize: 10 * 1024 * 1024, // 10MB for images
    },
    video: {
      extensions: ['mp4', 'webm', 'avi', 'mov', 'wmv', 'flv'],
      icon: Video,
      color: 'text-red-500',
      maxSize: 50 * 1024 * 1024, // 50MB for videos
    },
    audio: {
      extensions: ['mp3', 'wav', 'ogg', 'aac', 'flac'],
      icon: Music,
      color: 'text-purple-500',
      maxSize: 20 * 1024 * 1024, // 20MB for audio
    },
    document: {
      extensions: ['pdf', 'doc', 'docx', 'txt', 'rtf'],
      icon: FileText,
      color: 'text-green-500',
      maxSize: 25 * 1024 * 1024, // 25MB for documents
    },
    archive: {
      extensions: ['zip', 'rar', '7z', 'tar', 'gz'],
      icon: Archive,
      color: 'text-yellow-500',
      maxSize: 100 * 1024 * 1024, // 100MB for archives
    },
    other: {
      extensions: [],
      icon: File,
      color: 'text-gray-500',
      maxSize: 10 * 1024 * 1024, // 10MB for other files
    }
  };

  const getFileType = (filename) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    for (const [type, config] of Object.entries(fileTypes)) {
      if (config.extensions.includes(extension)) {
        return { type, ...config };
      }
    }
    return { type: 'other', ...fileTypes.other };
  };

  const validateFile = (file) => {
    const fileInfo = getFileType(file.name);
    
    // Check file size
    if (file.size > fileInfo.maxSize) {
      toast.error(`File "${file.name}" is too large. Max size: ${formatFileSize(fileInfo.maxSize)}`);
      return false;
    }

    // Check if we're at max files limit
    if (files.length >= maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return false;
    }

    return true;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const processFiles = (fileList) => {
    const newFiles = [];
    
    Array.from(fileList).forEach(file => {
      if (validateFile(file)) {
        const fileInfo = getFileType(file.name);
        const fileWithInfo = {
          file,
          id: Date.now() + Math.random(),
          name: file.name,
          size: file.size,
          type: fileInfo.type,
          icon: fileInfo.icon,
          color: fileInfo.color,
          preview: null
        };

        // Generate preview for images
        if (fileInfo.type === 'image') {
          const reader = new FileReader();
          reader.onload = (e) => {
            fileWithInfo.preview = e.target.result;
            // Update the file in parent component
            onFilesSelected([...files.filter(f => f.id !== fileWithInfo.id), fileWithInfo]);
          };
          reader.readAsDataURL(file);
        }

        newFiles.push(fileWithInfo);
      }
    });

    if (newFiles.length > 0) {
      onFilesSelected([...files, ...newFiles]);
    }
  };

  // Drag and drop handlers
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = e.dataTransfer.files;
    processFiles(droppedFiles);
  }, [files]);

  const handleFileSelect = (e) => {
    processFiles(e.target.files);
    // Reset input
    e.target.value = '';
  };

  const handleRemoveFile = (fileId) => {
    onRemoveFile(fileId);
  };

  return (
    <div className="space-y-3">
      {/* Drag & Drop Area */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-4 text-center transition-all duration-200
          ${isDragOver 
            ? 'border-primary bg-primary/10 scale-105' 
            : 'border-base-300 hover:border-base-400'
          }
          ${files.length > 0 ? 'min-h-[80px]' : 'min-h-[120px]'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.rar"
        />
        
        <div className="flex flex-col items-center gap-2">
          <Upload className={`w-8 h-8 ${isDragOver ? 'text-primary' : 'text-base-content/50'}`} />
          <div className="text-sm">
            <span className="font-medium">Click to upload</span> or drag and drop
          </div>
          <div className="text-xs text-base-content/60">
            Images, videos, documents, audio files (Max {maxFiles} files)
          </div>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {files.map((fileInfo) => {
            const IconComponent = fileInfo.icon;
            return (
              <div key={fileInfo.id} className="flex items-center gap-3 p-2 bg-base-200 rounded-lg">
                {/* File Preview/Icon */}
                <div className="flex-shrink-0">
                  {fileInfo.preview ? (
                    <img 
                      src={fileInfo.preview} 
                      alt={fileInfo.name}
                      className="w-10 h-10 object-cover rounded"
                    />
                  ) : (
                    <div className="w-10 h-10 flex items-center justify-center bg-base-300 rounded">
                      <IconComponent className={`w-5 h-5 ${fileInfo.color}`} />
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{fileInfo.name}</div>
                  <div className="text-xs text-base-content/60">
                    {formatFileSize(fileInfo.size)} • {fileInfo.type}
                  </div>
                </div>

                {/* Remove Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile(fileInfo.id);
                  }}
                  className="btn btn-ghost btn-sm btn-circle text-error hover:bg-error/20"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FileUpload;