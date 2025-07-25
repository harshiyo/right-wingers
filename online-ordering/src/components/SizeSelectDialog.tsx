import { Dialog } from "./ui/Dialog";
import { cn } from "../utils/cn";
import { useState } from "react";

interface SizeSelectDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (size: string) => void;
  itemName: string;
  availableSizes: string[];
  defaultSize?: string;
  sizePricing: {
    [key: string]: number;
  };
  contentOnly?: boolean;
}

export function SizeSelectDialog({
  open,
  onClose,
  onSubmit,
  itemName,
  availableSizes,
  defaultSize = "medium",
  sizePricing,
  contentOnly = false
}: SizeSelectDialogProps) {
  const [selectedSize, setSelectedSize] = useState<string>(defaultSize);

  const handleAddToCart = () => {
    onSubmit(selectedSize);
    onClose();
  };

  const content = (
    <div className="p-4">
      {!contentOnly && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Select Size - {itemName}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {availableSizes.map((size) => {
          const sizeKey = size.toLowerCase();
          return (
            <button
              key={size}
              onClick={() => setSelectedSize(sizeKey)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 p-3 rounded-lg border text-sm font-medium transition-colors",
                selectedSize === sizeKey
                  ? "bg-red-50 border-red-200 text-red-900 ring-2 ring-red-500"
                  : "bg-white border-gray-200 text-gray-900 hover:bg-gray-50"
              )}
            >
              <span className="text-lg font-semibold">{size}</span>
              <span className="text-sm font-normal text-gray-600">
                ${sizePricing[sizeKey].toFixed(2)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-800"
        >
          Cancel
        </button>
        <button
          onClick={handleAddToCart}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
        >
          Add to Cart
        </button>
      </div>
    </div>
  );

  if (contentOnly) {
    return content;
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="max-w-md w-full mx-auto"
    >
      {content}
    </Dialog>
  );
} 