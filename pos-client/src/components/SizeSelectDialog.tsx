import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { cn } from '../utils/cn';

interface SizeSelectDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (result: string | { size: string }) => void;
  availableSizes: string[];
  defaultSize?: string;
  itemName: string;
  dialogTitle?: string;
  sizePrices?: { [key: string]: number };
  navigationProps?: {
    currentStep: number;
    totalSteps: number;
    canGoBack: boolean;
    canGoNext: boolean;
    onGoBack: () => void;
    onGoNext: () => void;
  };
  existingSelections?: any;
  comboSummaryPanel?: React.ReactNode;
}

export const SizeSelectDialog = ({ open, onClose, onSubmit, availableSizes, defaultSize, itemName, sizePrices, navigationProps, existingSelections, comboSummaryPanel }: SizeSelectDialogProps) => {
  const [selectedSize, setSelectedSize] = useState(defaultSize || (availableSizes[0] || ''));

  useEffect(() => {
    if (open) {
      if (existingSelections && existingSelections.size) {
        setSelectedSize(existingSelections.size);
      } else {
        setSelectedSize(defaultSize || (availableSizes[0] || ''));
      }
    }
  }, [open, existingSelections, defaultSize, availableSizes]);

  const handleSubmit = () => {
    onSubmit({ size: selectedSize });
  };

  if (!open) return null;

  const content = (
    <div className="flex flex-col bg-white rounded-xl shadow-2xl overflow-hidden h-full">
      {comboSummaryPanel}
      
      {/* Header */}
      <div className="bg-red-600 text-white p-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Select Size for {itemName}</h2>
            <p className="text-red-100 text-sm">Choose your preferred size</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-red-500 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Size Selection */}
        <div className="flex-1 p-6">
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Choose Size</h3>
            <p className="text-sm text-gray-600">Select your preferred size option</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {availableSizes.map(size => (
              <button
                key={size}
                onClick={() => setSelectedSize(size)}
                className={cn(
                  "group relative p-6 rounded-xl border-2 transition-all duration-200 hover:shadow-lg text-center box-border min-h-[120px]",
                  selectedSize === size 
                    ? "border-red-500 bg-red-50 shadow-md" 
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                )}
              >
                {/* Selection Indicator */}
                <div className="absolute -top-1 -right-1">
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                    selectedSize === size
                      ? "border-red-500 bg-red-500" 
                      : "border-gray-300 bg-white opacity-0 group-hover:opacity-100"
                  )}>
                    {selectedSize === size && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>

                {/* Size Content */}
                <div className="flex flex-col items-center justify-center h-full">
                  <div className={cn(
                    "text-2xl font-bold mb-2",
                    selectedSize === size ? "text-red-800" : "text-gray-700"
                  )}>
                    {size}
                  </div>
                  {sizePrices && sizePrices[size] && (
                    <div className={cn(
                      "text-lg font-semibold",
                      selectedSize === size ? "text-red-600" : "text-gray-500"
                    )}>
                      ${sizePrices[size].toFixed(2)}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t bg-white">
          <div className="space-y-3">
            {navigationProps?.canGoBack && (
              <Button 
                variant="outline" 
                size="sm"
                className="w-full text-xs lg:text-sm" 
                onClick={navigationProps.onGoBack}
              >
                ← Back
              </Button>
            )}
            <Button 
              size="sm"
              className="w-full bg-red-600 hover:bg-red-700 font-semibold text-xs lg:text-sm" 
              onClick={handleSubmit}
              disabled={!selectedSize}
            >
              {navigationProps
                ? (navigationProps.currentStep === navigationProps.totalSteps ? 'Complete Order' : 'Continue →')
                : 'Add to Cart'}
            </Button>
            {navigationProps && (
              <div className="bg-gray-100 p-2 lg:p-3 rounded-lg text-center">
                <div className="text-xs lg:text-sm text-gray-600">Step</div>
                <div className="font-bold text-gray-800 text-sm lg:text-base">{navigationProps.currentStep}/{navigationProps.totalSteps}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div 
      className="fixed inset-0 z-50 flex justify-center items-center p-2 sm:p-4"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)'
      }}
    >
      <div
        className="w-full max-w-md bg-red rounded-lg shadow-xl flex flex-col overflow-hidden"
        style={{
          margin: '0 auto',
          padding: '0',
        }}
      >
        {content}
      </div>
    </div>
  );
}; 