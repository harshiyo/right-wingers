import React from 'react';
import { Button } from './Button';
import { Delete, Hash, Phone, X } from 'lucide-react';

interface NumpadProps {
  onNumberClick: (number: string) => void;
  onBackspace: () => void;
  onClear: () => void;
}

export const Numpad: React.FC<NumpadProps> = ({
  onNumberClick,
  onBackspace,
  onClear
}) => {
  const numbers = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['*', '0', '#']
  ];

  return (
    <div className="rounded-2xl lg:rounded-3xl p-4 lg:p-8 text-white shadow-2xl" style={{ backgroundColor: '#800000' }}>
      {/* Header */}
      <div className="flex items-center gap-2 lg:gap-4 mb-4 lg:mb-6">
        <div className="p-2 lg:p-3 bg-white/20 rounded-lg lg:rounded-xl backdrop-blur-sm">
          <Phone className="h-5 w-5 lg:h-8 lg:w-8" />
        </div>
        <h3 className="text-lg lg:text-2xl font-bold">Touch Numpad</h3>
      </div>

      {/* Number Grid */}
      <div className="grid grid-cols-3 gap-2 lg:gap-3 mb-4 lg:mb-6">
        {numbers.flat().map((num) => (
          <Button
            key={num}
            onClick={() => onNumberClick(num)}
            className="h-12 lg:h-16 text-lg lg:text-2xl font-bold bg-white/20 hover:bg-white/30 text-white border border-white/30 rounded-lg lg:rounded-xl backdrop-blur-sm transition-all duration-200"
            variant="outline"
          >
            {num}
          </Button>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2 lg:gap-3">
        <Button
          onClick={onBackspace}
          className="h-10 lg:h-14 bg-white/20 hover:bg-white/30 text-white border border-white/30 rounded-lg lg:rounded-xl font-semibold flex items-center justify-center gap-1 lg:gap-2 backdrop-blur-sm transition-all duration-200 hover:shadow-lg"
        >
          <Delete className="h-4 w-4 lg:h-5 lg:w-5" />
          <span className="text-sm lg:text-base">Delete</span>
        </Button>
        <Button
          onClick={onClear}
          className="h-10 lg:h-14 bg-white/20 hover:bg-white/30 text-white border border-white/30 rounded-lg lg:rounded-xl font-semibold flex items-center justify-center gap-1 lg:gap-2 backdrop-blur-sm transition-all duration-200 hover:shadow-lg"
        >
          <X className="h-4 w-4 lg:h-5 lg:w-5" />
          <span className="text-sm lg:text-base">Clear All</span>
        </Button>
      </div>
    </div>
  );
}; 