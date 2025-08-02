import React, { useState, useEffect } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { X, Star, Zap, Flame, Check } from 'lucide-react';
import { cn } from '../utils/cn';

interface Sauce {
  id: string;
  name: string;
  price?: number;
}

interface InstructionTile {
  id: string;
  label: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
}

interface WingSauceDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (result: { type: string; sauces: Sauce[]; size: string; extraCharge: number; sauceLimit: number; instructions?: string[] }) => void;
  sauceLimit: number;
  wingName: string;
  sharedSauceInfo?: {
    totalLimit: number;
    usedSauces: number;
    remainingSauces: number;
    wingNumber: number;
    totalWings: number;
  };
  existingSelections?: any;
  contentOnly?: boolean;
}

export const WingSauceDialog = ({ open, onClose, onSubmit, sauceLimit, wingName, sharedSauceInfo, existingSelections, contentOnly = false }: WingSauceDialogProps) => {
  const [saucesSnapshot, loadingSauces] = useCollection(
    query(collection(db, 'sauces'), orderBy('name'))
  );
  const sauces = saucesSnapshot?.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Sauce)) || [];
  const [selectedSauces, setSelectedSauces] = useState<Map<string, Sauce>>(new Map());
  
  // Wing instruction tiles
  const [instructionTilesSnapshot, loadingInstructions] = useCollection(
    query(collection(db, 'wingInstructions'), orderBy('sortOrder'))
  );
  const instructionTiles = instructionTilesSnapshot?.docs
    .map((doc: any) => ({ id: doc.id, ...doc.data() } as InstructionTile))
    .filter((tile: InstructionTile) => tile.isActive) || [];
  const [selectedInstructions, setSelectedInstructions] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      if (existingSelections && existingSelections.sauces) {
        const existingMap = new Map();
        existingSelections.sauces.forEach((sauce: Sauce) => {
          existingMap.set(sauce.id, sauce);
        });
        setSelectedSauces(existingMap);
      } else {
        setSelectedSauces(new Map());
      }
      
      if (existingSelections && existingSelections.instructions) {
        setSelectedInstructions(new Set(existingSelections.instructions));
      } else {
        setSelectedInstructions(new Set());
      }
    }
  }, [open, existingSelections]);

  const handleSauceToggle = (sauce: Sauce) => {
    setSelectedSauces(prev => {
      const newMap = new Map(prev);
      if (newMap.has(sauce.id)) newMap.delete(sauce.id);
      else newMap.set(sauce.id, sauce);
      return newMap;
    });
  };

  const handleInstructionToggle = (instructionId: string) => {
    setSelectedInstructions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(instructionId)) {
        newSet.delete(instructionId);
      } else {
        newSet.add(instructionId);
      }
      return newSet;
    });
  };

  // Calculate real-time sauce usage for shared pool display
  const currentlySelectedIncluded = Math.min(selectedSauces.size, sharedSauceInfo?.remainingSauces || sauceLimit);
  const realTimeUsedSauces = (sharedSauceInfo?.usedSauces || 0) + currentlySelectedIncluded;
  const realTimeRemainingSauces = Math.max(0, (sharedSauceInfo?.totalLimit || sauceLimit) - realTimeUsedSauces);

  // Use shared sauce info if available, otherwise fall back to individual sauce limit
  const effectiveSauceLimit = sharedSauceInfo ? sharedSauceInfo.remainingSauces : sauceLimit;
  const includedSauces = Math.min(selectedSauces.size, effectiveSauceLimit);
  const extraSauces = Math.max(0, selectedSauces.size - effectiveSauceLimit);
  const extraCharge = Array.from(selectedSauces.values())
    .slice(effectiveSauceLimit)
    .reduce((sum, sauce) => sum + (sauce.price || 0), 0);

  const handleSubmit = () => {
    onSubmit({ 
      type: 'wings',
      sauces: Array.from(selectedSauces.values()),
      size: 'regular',
      extraCharge,
      sauceLimit: effectiveSauceLimit,
      instructions: Array.from(selectedInstructions)
    });
  };

  if (!open) return null;

  const content = (
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
      {/* Header */}
      {!contentOnly && (
        <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-red-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Customize {wingName}</h2>
              <p className="text-sm text-gray-600">Choose your perfect sauces</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <div className="p-4 space-y-4 h-full flex flex-col">
          {/* Shared Sauce Info - Compact */}
          {sharedSauceInfo && sharedSauceInfo.totalWings > 1 && (
            <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-blue-800">Shared Pool: {sharedSauceInfo.totalLimit} sauces</span>
                <span className="text-blue-600">Used: {sharedSauceInfo.usedSauces} | Left: {sharedSauceInfo.remainingSauces}</span>
              </div>
            </div>
          )}

          {/* Sauce Summary - Compact */}
          <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-green-600" />
                <span className="text-sm font-semibold text-green-800">
                  {effectiveSauceLimit} included • {selectedSauces.size} selected
                </span>
              </div>
              {extraSauces > 0 && (
                <span className="text-sm font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                  +${extraCharge.toFixed(2)}
                </span>
              )}
            </div>
          </div>

          {/* Sauces Grid - 5 per row */}
          <div className="flex-1 overflow-y-auto">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Available Sauces</h3>
            {loadingSauces ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                <p className="mt-2 text-gray-500 text-sm">Loading sauces...</p>
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-2">
                {sauces.map((sauce) => {
                  const isSelected = selectedSauces.has(sauce.id);
                  const selectedIndex = Array.from(selectedSauces.keys()).indexOf(sauce.id);
                  const isIncluded = isSelected && selectedIndex < effectiveSauceLimit;
                  const isExtra = isSelected && selectedIndex >= effectiveSauceLimit;
                  
                  return (
                    <button
                      key={sauce.id}
                      onClick={() => handleSauceToggle(sauce)}
                      className={cn(
                        "p-2 rounded-lg border-2 transition-all duration-200 flex flex-col justify-between min-h-[60px] group relative overflow-hidden",
                        isSelected ? (
                          isIncluded 
                            ? "bg-green-100 border-green-500 shadow-sm" 
                            : "bg-orange-100 border-orange-500 shadow-sm"
                        ) : "bg-white hover:bg-gray-50 border-gray-200"
                      )}
                    >
                      {/* Selection indicator */}
                      {isSelected && (
                        <div className="absolute top-1 right-1">
                          <div className="bg-green-500 text-white rounded-full p-0.5">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        </div>
                      )}
                      
                      <div className="text-center">
                        <span className="font-bold text-xs text-gray-900 leading-tight">{sauce.name}</span>
                        <div className="mt-1">
                          <span className={cn(
                            "text-xs px-1.5 py-0.5 rounded-full",
                            isSelected 
                              ? isExtra 
                                ? "bg-orange-100 text-orange-700" 
                                : "bg-green-100 text-green-700"
                              : selectedSauces.size >= effectiveSauceLimit
                                ? "bg-orange-100 text-orange-700"
                                : "bg-gray-100 text-gray-500"
                          )}>
                            {isSelected 
                              ? (isExtra ? "Extra" : "Included") 
                              : selectedSauces.size >= effectiveSauceLimit 
                                ? "Extra" 
                                : "Included"
                            }
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Wing Instructions */}
          {!loadingInstructions && instructionTiles.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">Wing Instructions</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {instructionTiles.map((instruction) => (
                  <button
                    key={instruction.id}
                    onClick={() => handleInstructionToggle(instruction.id)}
                    className={cn(
                      "p-2 rounded-lg border-2 transition-all duration-200 min-h-[48px] flex items-center justify-center text-center",
                      selectedInstructions.has(instruction.id)
                        ? `bg-${instruction.color}-100 border-${instruction.color}-500 shadow-sm`
                        : "bg-white hover:bg-gray-50 border-gray-200"
                    )}
                  >
                    <span className="font-medium text-xs leading-tight">{instruction.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={selectedSauces.size === 0}
          className={cn(
            "px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-200 shadow-lg",
            selectedSauces.size === 0
              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
              : "bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800"
          )}
        >
          {extraSauces > 0 ? `Add Sauces (+$${extraCharge.toFixed(2)})` : 'Add Sauces'}
        </button>
      </div>
    </div>
  );

  if (contentOnly) {
    return content;
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      {content}
    </div>
  );
}; 