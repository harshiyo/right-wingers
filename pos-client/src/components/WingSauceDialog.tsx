import React, { useState, useEffect } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Button } from './ui/Button';
import { cn } from '../utils/cn';

interface Sauce {
  id: string;
  name: string;
  price?: number;
  isSpicy?: boolean;
  isVegan?: boolean;
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

export const WingSauceDialog = ({ open, onClose, onSubmit, sauceLimit, wingName, sharedSauceInfo, navigationProps, existingSelections, comboSummaryPanel }: WingSauceDialogProps) => {
  const [saucesSnapshot, loadingSauces] = useCollection(
    query(collection(db, 'sauces'), orderBy('name'))
  );
  const sauces = saucesSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sauce)) || [];
  const [selectedSauces, setSelectedSauces] = useState<Map<string, Sauce>>(new Map());
  
  // Wing instruction tiles
  const [instructionTilesSnapshot] = useCollection(
    query(collection(db, 'wingInstructions'), orderBy('sortOrder'))
  );
  const instructionTiles = instructionTilesSnapshot?.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as InstructionTile))
    .filter(tile => tile.isActive) || [];
  const [selectedInstructions, setSelectedInstructions] = useState<Set<string>>(new Set());

  // Filter states
  const [activeSpicyFilter, setActiveSpicyFilter] = useState<string>('All');

  useEffect(() => {
    if (open) {
      if (existingSelections && existingSelections.sauces) {
        // Pre-populate existing selections
        const existingMap = new Map();
        existingSelections.sauces.forEach((sauce: Sauce) => {
          existingMap.set(sauce.id, sauce);
        });
        setSelectedSauces(existingMap);
      } else {
        setSelectedSauces(new Map());
      }
      
      // Reset instructions
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
      if (newMap.has(sauce.id)) {
        newMap.delete(sauce.id);
      } else {
        // Check if we can add this sauce without exceeding the limit
        const newTotalSauces = newMap.size + 1;
        if (newTotalSauces <= effectiveSauceLimit) {
          newMap.set(sauce.id, sauce);
        } else {
          // Allow addition but it will be charged as extra
          newMap.set(sauce.id, sauce);
        }
      }
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
  // const realTimeRemainingSauces = Math.max(0, (sharedSauceInfo?.totalLimit || sauceLimit) - realTimeUsedSauces);

  // Use shared sauce info if available, otherwise fall back to individual sauce limit
  const effectiveSauceLimit = sharedSauceInfo ? sharedSauceInfo.remainingSauces : sauceLimit;
  // const includedSauces = Math.min(selectedSauces.size, effectiveSauceLimit);
  const extraSauces = Math.max(0, selectedSauces.size - effectiveSauceLimit);
  const extraCharge = Array.from(selectedSauces.values())
    .slice(effectiveSauceLimit)
    .reduce((sum, sauce) => sum + (sauce.price || 0), 0);

  // Filter sauces based on spicy filter
  const filteredSauces = sauces.filter(sauce => {
    if (activeSpicyFilter === 'Spicy') {
      return sauce.isSpicy === true;
    } else if (activeSpicyFilter === 'Not Spicy') {
      return sauce.isSpicy === false;
    }
    return true; // 'All' filter
  });

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
    <div className="flex flex-col bg-white rounded-xl shadow-2xl overflow-hidden h-full">
      {comboSummaryPanel}
      
      {/* Header */}
      <div className="bg-red-600 text-white p-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{wingName}</h2>
            <p className="text-red-100 text-sm">Customize your sauces</p>
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

      {/* Main Content - Responsive Layout */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* Left Sidebar - Responsive */}
        <div className="w-full lg:w-80 bg-gray-50 lg:border-r flex flex-col max-h-[40vh] lg:max-h-none">
          {/* Selection Summary */}
          <div className="p-3 lg:p-4 border-b bg-white">
            <h3 className="font-semibold text-gray-800 mb-2 lg:mb-3 text-sm lg:text-base">Current Selection</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 lg:p-3">
              <div className="text-xs lg:text-sm text-blue-800">
                <div className="font-medium mb-1">
                  Wing Sauces
                </div>
                <div className="text-blue-600">
                  {selectedSauces.size} of {effectiveSauceLimit} sauces selected
                </div>
              </div>
            </div>
          </div>

          {/* Shared Sauce Info */}
          {sharedSauceInfo && (
            <div className="p-3 lg:p-4 border-b bg-white">
              <h3 className="font-semibold text-gray-800 mb-2 lg:mb-3 text-sm lg:text-base">Shared Pool</h3>
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2 lg:p-3">
                <div className="text-xs lg:text-sm text-indigo-800">
                  <div className="font-medium mb-1">
                    {sharedSauceInfo.totalLimit} sauces for {sharedSauceInfo.totalWings} wings
                  </div>
                  <div className="text-indigo-600 space-y-0.5 lg:space-y-1">
                    <div>Used: {realTimeUsedSauces}</div>
                    <div>Remaining: {Math.max(0, sharedSauceInfo.totalLimit - realTimeUsedSauces)}</div>
                    <div>Wing {sharedSauceInfo.wingNumber}/{sharedSauceInfo.totalWings}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Wing Summary - Consolidated */}
          {(selectedSauces.size > 0 || selectedInstructions.size > 0) && (
            <div className="p-3 lg:p-4 border-b bg-white">
              <h3 className="font-semibold text-gray-800 mb-2 lg:mb-3 text-sm lg:text-base">Your Wings</h3>
              <div className="bg-gray-50 rounded-lg p-2 lg:p-3">
                <div className="text-xs lg:text-sm text-gray-700 space-y-0.5 lg:space-y-1">
                  {selectedSauces.size > 0 && (
                    <div><span className="font-medium text-gray-800">Sauces:</span> {Array.from(selectedSauces.values()).map(s => s.name).join(', ')}</div>
                  )}
                  {selectedInstructions.size > 0 && (
                    <div><span className="font-medium text-gray-800">Instructions:</span> {Array.from(selectedInstructions).map(id => instructionTiles.find(t => t.id === id)?.label).filter(Boolean).join(', ')}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Extra Charges */}
          {extraCharge > 0 && (
            <div className="p-3 lg:p-4 border-b bg-white">
              <h3 className="font-semibold text-gray-800 mb-2 lg:mb-3 text-sm lg:text-base">Extra Charges</h3>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 lg:p-3">
                <div className="text-orange-800">
                  <div className="font-semibold text-base lg:text-lg">+${extraCharge.toFixed(2)}</div>
                  <div className="text-xs lg:text-sm">{extraSauces} additional sauce{extraSauces !== 1 ? 's' : ''}</div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons - Always Visible */}
          <div className="p-3 lg:p-4 mt-auto bg-white border-t">
            <div className="space-y-2 lg:space-y-3">
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
              >
                {navigationProps
                  ? (navigationProps.currentStep === navigationProps.totalSteps ? 'Complete Order' : 'Continue →')
                  : 'Add to Cart'}
                {extraCharge > 0 && <span className="ml-2 text-red-100">+${extraCharge.toFixed(2)}</span>}
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

        {/* Right Content - Sauces */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* All Filters on One Line */}
          <div className="p-3 lg:p-4 border-b bg-white">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Spicy Filter */}
              <div className="flex-1">
                <label className="block text-xs lg:text-sm font-semibold text-gray-700 mb-1 lg:mb-2">Spicy Level</label>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  {[
                    { key: 'All', label: 'All' },
                    { key: 'Spicy', label: 'Spicy 🔥' },
                    { key: 'Not Spicy', label: 'Not Spicy' }
                  ].map(filter => (
                    <button
                      key={filter.key}
                      onClick={() => setActiveSpicyFilter(filter.key)}
                      className={cn(
                        "flex-1 px-2 py-1.5 rounded-md text-xs lg:text-sm font-medium transition-all",
                        activeSpicyFilter === filter.key
                          ? "bg-red-600 text-white shadow-sm" 
                          : "text-gray-600 hover:text-gray-800 hover:bg-gray-200"
                      )}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sauces Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {loadingSauces ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading sauces...</p>
                </div>
              </div>
            ) : filteredSauces.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33" />
                  </svg>
                </div>
                <p className="text-lg text-gray-600 mb-2">No sauces found</p>
                <p className="text-sm text-gray-400">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {filteredSauces.map((sauce) => {
                  const isSelected = selectedSauces.has(sauce.id);
                  const selectedIndex = Array.from(selectedSauces.keys()).indexOf(sauce.id);
                  // const isIncluded = isSelected && selectedIndex < effectiveSauceLimit;
                  const isExtra = isSelected && selectedIndex >= effectiveSauceLimit;
                  
                  return (
                    <button
                      key={sauce.id}
                      onClick={() => handleSauceToggle(sauce)}
                      className={cn(
                        "group relative p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-lg text-center box-border min-h-[120px]",
                        isSelected 
                          ? isExtra 
                            ? "border-orange-400 bg-orange-50 shadow-md" 
                            : "border-green-400 bg-green-50 shadow-md"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                      )}
                    >
                      {/* Selection Indicator */}
                      <div className="absolute -top-1 -right-1">
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                          isSelected 
                            ? isExtra 
                              ? "border-orange-500 bg-orange-500" 
                              : "border-green-500 bg-green-500"
                            : "border-gray-300 bg-white opacity-0 group-hover:opacity-100"
                        )}>
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>

                      {/* Sauce Content */}
                      <div>
                        {/* Spicy Icon */}
                        <div className="flex justify-center gap-1 mb-2">
                          {sauce.isSpicy && <span className="text-xs">🔥</span>}
                          {sauce.isVegan && <span className="text-xs">🌱</span>}
                        </div>

                        {/* Sauce Name */}
                        <p className={cn(
                          "text-sm font-bold leading-tight mb-2",
                          isSelected ? "text-gray-800" : "text-gray-700"
                        )}>
                          {sauce.name}
                        </p>

                        {/* Status */}
                        <div className="flex flex-col items-center">
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full mt-1 h-5 flex items-center justify-center",
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

            {/* Special Instructions */}
            {instructionTiles.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Special Instructions
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {instructionTiles.map((instruction) => {
                    const isSelected = selectedInstructions.has(instruction.id);
                    return (
                      <button
                        key={instruction.id}
                        onClick={() => handleInstructionToggle(instruction.id)}
                        className={cn(
                          "p-3 rounded-xl border-2 transition-all duration-200 text-center hover:shadow-md",
                          isSelected 
                            ? "border-gray-800 bg-gray-800 text-white shadow-lg" 
                            : "border-gray-200 bg-white hover:border-gray-300"
                        )}
                      >
                        <p className="text-sm font-medium">
                          {instruction.label}
                        </p>
                      </button>
                    );
                  })}
                </div>
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
        className="w-full max-w-[95vw] h-[95vh] bg-red rounded-lg shadow-xl flex flex-col overflow-hidden"
        style={{
          margin: '0 auto',
          padding: '0',
        }}
      >
        <div className="flex-1 overflow-hidden">
          {content}
        </div>
      </div>
    </div>
  );
}; 