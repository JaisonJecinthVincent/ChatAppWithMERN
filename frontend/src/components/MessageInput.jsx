import { useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, X, Smile, Paperclip } from "lucide-react";
import toast from "react-hot-toast";
import EmojiPicker from "./EmojiPicker";
import FileUpload from "./FileUpload";
import MessageReplyContext from "./MessageReplyContext";
import { axiosInstance } from "../lib/axios";

const MessageInput = ({ replyingTo, onCancelReply }) => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const fileInputRef = useRef(null);
  const textInputRef = useRef(null);
  const { sendMessage } = useChatStore();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview && uploadedFiles.length === 0) return;

    try {
      // Get messageId for reply (handle both _id and messageId)
      const replyToId = replyingTo ? (replyingTo._id || replyingTo.messageId) : undefined;

      // If we have uploaded files, upload them first, then send message
      if (uploadedFiles.length > 0) {
        for (const fileInfo of uploadedFiles) {
          try {
            // First, upload the file to get the file URL
            const formData = new FormData();
            formData.append('file', fileInfo.file);

            const uploadResponse = await axiosInstance.post('/files/upload', formData, {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
              timeout: 30000, // 30 second timeout for file uploads
            });

            const uploadedFile = uploadResponse.data.file;

            // Then send the message with file information
            await sendMessage({
              text: text.trim(),
              fileUrl: uploadedFile.url,
              fileName: uploadedFile.filename,
              fileSize: uploadedFile.size,
              fileType: uploadedFile.type,
              mimeType: uploadedFile.mimeType,
              replyTo: replyToId,
            });

          } catch (fileError) {
            console.error('Failed to upload file:', fileError);
            
            // Handle specific connection errors
            if (fileError.code === 'ECONNRESET' || fileError.message?.includes('ECONNRESET')) {
              toast.error(`Connection lost while uploading ${fileInfo.name}. Please try again.`);
            } else if (fileError.code === 'ECONNABORTED') {
              toast.error(`Upload timeout for ${fileInfo.name}. File may be too large.`);
            } else {
              toast.error(`Failed to upload ${fileInfo.name}: ${fileError.response?.data?.error || fileError.message}`);
            }
          }
        }
      } else {
        // Regular message or image
        await sendMessage({
          text: text.trim(),
          image: imagePreview,
          replyTo: replyToId,
        });
      }

      // Clear form and reply
      setText("");
      setImagePreview(null);
      setUploadedFiles([]);
      setShowEmojiPicker(false);
      setShowFileUpload(false);
      onCancelReply && onCancelReply();
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message");
    }
  };

  const handleEmojiSelect = (emoji) => {
    const input = textInputRef.current;
    if (input) {
      const start = input.selectionStart;
      const end = input.selectionEnd;
      const newText = text.slice(0, start) + emoji + text.slice(end);
      setText(newText);
      
      // Focus back to input and set cursor position after emoji
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    } else {
      setText(text + emoji);
    }
  };

  const handleFilesSelected = (files) => {
    setUploadedFiles(files);
    // Hide file upload panel when files are selected
    if (files.length > 0) {
      setShowFileUpload(false);
    }
  };

  const handleRemoveFile = (fileId) => {
    setUploadedFiles(files => files.filter(f => f.id !== fileId));
  };

  return (
    <div className="p-4 w-full">
      {/* Reply Preview */}
      {replyingTo && (
        <div className="mb-3 bg-base-200 border border-base-300 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-base-content/70">
              Replying to
            </span>
            <button
              onClick={onCancelReply}
              className="btn btn-ghost btn-xs btn-circle"
              type="button"
            >
              <X size={14} />
            </button>
          </div>
          <MessageReplyContext replyTo={replyingTo} />
        </div>
      )}

      {/* Image Preview */}
      {imagePreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
            />
            <button
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300
              flex items-center justify-center"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      {/* File Upload Panel */}
      {showFileUpload && (
        <div className="mb-3 bg-base-100 border border-base-300 rounded-lg p-3">
          <FileUpload
            files={uploadedFiles}
            onFilesSelected={handleFilesSelected}
            onRemoveFile={handleRemoveFile}
            maxFiles={5}
            maxSize={10 * 1024 * 1024} // 10MB
          />
        </div>
      )}

      {/* Uploaded Files Preview */}
      {uploadedFiles.length > 0 && !showFileUpload && (
        <div className="mb-3 space-y-2">
          <div className="text-sm font-medium text-base-content/70">
            Files to send ({uploadedFiles.length}):
          </div>
          <div className="flex flex-wrap gap-2">
            {uploadedFiles.map((fileInfo) => (
              <div key={fileInfo.id} className="flex items-center gap-2 bg-base-200 rounded-lg px-3 py-2">
                <fileInfo.icon className={`w-4 h-4 ${fileInfo.color}`} />
                <span className="text-sm truncate max-w-32">{fileInfo.name}</span>
                <button
                  onClick={() => handleRemoveFile(fileInfo.id)}
                  className="text-error hover:bg-error/20 rounded p-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-2 relative">
        <div className="flex-1 flex gap-2">
          <input
            ref={textInputRef}
            type="text"
            className="w-full input input-bordered rounded-lg input-sm sm:input-md"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
          />

          {/* Quick Image Upload */}
          <button
            type="button"
            className={`hidden sm:flex btn btn-circle btn-sm
                     ${imagePreview ? "text-emerald-500" : "text-zinc-400 hover:text-zinc-300"}`}
            onClick={() => fileInputRef.current?.click()}
            title="Upload image"
          >
            <Image size={18} />
          </button>

          {/* Advanced File Upload */}
          <button
            type="button"
            className={`btn btn-circle btn-sm transition-colors
                     ${showFileUpload || uploadedFiles.length > 0 ? "text-primary" : "text-zinc-400 hover:text-zinc-300"}`}
            onClick={() => setShowFileUpload(!showFileUpload)}
            title="Upload files"
          >
            <Paperclip size={18} />
          </button>

          {/* Emoji Picker */}
          <button
            type="button"
            className={`btn btn-circle btn-sm transition-colors
                     ${showEmojiPicker ? "text-primary" : "text-zinc-400 hover:text-zinc-300"}`}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            title="Add emoji"
          >
            <Smile size={18} />
          </button>
        </div>
        
        <button
          type="submit"
          className="btn btn-sm btn-circle"
          disabled={!text.trim() && !imagePreview && uploadedFiles.length === 0}
        >
          <Send size={22} />
        </button>

        <EmojiPicker
          isOpen={showEmojiPicker}
          onEmojiSelect={handleEmojiSelect}
          onClose={() => setShowEmojiPicker(false)}
        />
      </form>
    </div>
  );
};
export default MessageInput;
