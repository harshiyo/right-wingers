import React, { useState, useEffect } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
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
    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[95vh] flex flex-col">
      {!contentOnly && (
        <div className="p-3 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold">Customize {wingName}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full">✕</button>
        </div>
      )}
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {sharedSauceInfo && sharedSauceInfo.totalWings > 1 && (
            <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg text-sm">
              <p className="text-blue-800">
                <span className="font-semibold">Shared Sauce Pool:</span> {sharedSauceInfo.totalLimit} for {sharedSauceInfo.totalWings} wings •
                <span className="font-medium"> Used:</span> {sharedSauceInfo.usedSauces} •
                <span className="font-medium"> Left:</span> {sharedSauceInfo.remainingSauces} •
                <span className="font-medium"> Wing:</span> {sharedSauceInfo.wingNumber}/{sharedSauceInfo.totalWings}
              </p>
            </div>
          )}

          <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg text-sm">
            <p className="text-green-800 font-medium">
              {effectiveSauceLimit} included • {selectedSauces.size} selected
              {extraSauces > 0 && (
                <span className="text-orange-600 font-bold"> • Extra (+${extraCharge.toFixed(2)})</span>
              )}
            </p>
          </div>

          <section>
            <h3 className="text-lg font-bold mb-3">Choose Sauces</h3>
            {loadingSauces ? (
              <div className="flex justify-center items-center py-8">
                <div className="text-base text-gray-500">Loading sauces...</div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
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
                        "p-2 rounded-lg border text-left transition-all duration-200 flex flex-col justify-between min-h-[72px]",
                        isSelected ? (
                          isIncluded 
                            ? "bg-green-100 border-green-500 shadow-sm" 
                            : "bg-orange-100 border-orange-500 shadow-sm"
                        ) : "bg-white hover:bg-gray-50 border-gray-200"
                      )}
                    >
                      <span className="font-medium text-sm">{sauce.name}</span>
                      <span className="text-xs text-gray-600">
                        {isIncluded && <span className="text-green-600 font-bold">Included</span>}
                        {isExtra && <span className="text-orange-600 font-bold">+${(sauce.price || 0).toFixed(2)}</span>}
                        {!isSelected && (sauce.price || 0) > 0 && (
                          <span>+${(sauce.price || 0).toFixed(2)}</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {!loadingInstructions && instructionTiles.length > 0 && (
            <section>
              <h3 className="text-lg font-bold mb-3">Wing Instructions</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {instructionTiles.map((instruction) => (
                  <button
                    key={instruction.id}
                    onClick={() => handleInstructionToggle(instruction.id)}
                    className={cn(
                      "p-2 rounded-lg border text-left transition-all duration-200 min-h-[48px]",
                      selectedInstructions.has(instruction.id)
                        ? `bg-${instruction.color}-100 border-${instruction.color}-500 shadow-sm`
                        : "bg-white hover:bg-gray-50 border-gray-200"
                    )}
                  >
                    <span className="font-medium text-sm">{instruction.label}</span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="p-3 border-t bg-gray-50 flex justify-between items-center gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={selectedSauces.size === 0}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium",
              selectedSauces.size === 0
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-red-600 text-white hover:bg-red-700"
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
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 z-50"
    >
      {content}
    </div>
  );
}; 