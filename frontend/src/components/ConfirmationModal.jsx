import { X, Crown, AlertTriangle } from "lucide-react";

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", confirmButtonClass = "btn-primary" }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-base-100 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-warning/10 rounded-full">
            <AlertTriangle className="w-6 h-6 text-warning" />
          </div>
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        
        <p className="text-base-content/70 mb-6">
          {message}
        </p>
        
        <div className="flex gap-3 justify-end">
          <button 
            onClick={onClose}
            className="btn btn-ghost"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className={`btn ${confirmButtonClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
