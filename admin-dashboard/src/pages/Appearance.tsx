import React, { useState, useEffect } from 'react';
import { useDocument, useCollection } from 'react-firebase-hooks/firestore';
import { doc, setDoc, collection, addDoc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Plus } from 'lucide-react';

// Add new interface for instruction tiles
interface InstructionTile {
  id: string;
  label: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
}

const Appearance = () => {
  // Login Screen Settings
  const loginSettingsRef = doc(db, 'settings', 'loginScreen');
  const [loginSnapshot, loginLoading, loginError] = useDocument(loginSettingsRef);
  const [locationName, setLocationName] = useState('');
  const [isSavingLogin, setIsSavingLogin] = useState(false);

  // Menu Screen Settings
  const menuSettingsRef = doc(db, 'settings', 'menuScreen');
  const [menuSnapshot, menuLoading, menuError] = useDocument(menuSettingsRef);
  const [gridColumns, setGridColumns] = useState(4);
  const [isSavingMenu, setIsSavingMenu] = useState(false);

  // Pizza Instruction Tiles
  const [tilesSnapshot, tilesLoading] = useCollection(
    query(collection(db, 'pizzaInstructions'), orderBy('sortOrder'))
  );
  const instructionTiles = tilesSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() } as InstructionTile)) || [];
  const [showAddTileDialog, setShowAddTileDialog] = useState(false);
  const [editingTile, setEditingTile] = useState<InstructionTile | null>(null);
  const [newTileLabel, setNewTileLabel] = useState('');
  const [newTileColor, setNewTileColor] = useState('#3B82F6');
  const [newTileSortOrder, setNewTileSortOrder] = useState(1);

  // Wing Instruction Tiles
  const [wingTilesSnapshot, wingTilesLoading] = useCollection(
    query(collection(db, 'wingInstructions'), orderBy('sortOrder'))
  );
  const wingInstructionTiles = wingTilesSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() } as InstructionTile)) || [];
  const [showAddWingTileDialog, setShowAddWingTileDialog] = useState(false);
  const [editingWingTile, setEditingWingTile] = useState<InstructionTile | null>(null);
  const [newWingTileLabel, setNewWingTileLabel] = useState('');
  const [newWingTileColor, setNewWingTileColor] = useState('#3B82F6');
  const [newWingTileSortOrder, setNewWingTileSortOrder] = useState(1);

  // Color options for tiles
  const colorOptions = [
    '#3B82F6', // Blue
    '#EF4444', // Red
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#8B5CF6', // Purple
    '#F97316', // Orange
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#EC4899', // Pink
    '#64748B', // Slate
  ];

  useEffect(() => {
    if (loginSnapshot?.exists()) {
      setLocationName(loginSnapshot.data().locationName || '');
    }
  }, [loginSnapshot]);

  useEffect(() => {
    if (menuSnapshot?.exists()) {
      const data = menuSnapshot.data();
      setGridColumns(data.gridColumns || 4);
    }
  }, [menuSnapshot]);

  const handleSaveLogin = async () => {
    setIsSavingLogin(true);
    try {
      await setDoc(loginSettingsRef, { locationName }, { merge: true });
      alert('Login screen settings saved!');
    } catch (err) {
      console.error(err);
      alert('Failed to save login screen settings.');
    } finally {
      setIsSavingLogin(false);
    }
  };
  
  const handleSaveMenu = async () => {
    setIsSavingMenu(true);
    try {
      await setDoc(menuSettingsRef, { gridColumns }, { merge: true });
      alert('Menu screen settings saved!');
    } catch (err) {
      console.error(err);
      alert('Failed to save menu screen settings.');
    } finally {
      setIsSavingMenu(false);
    }
  };

  // Pizza Instruction Tile Handlers
  const handleSaveTile = async () => {
    if (!newTileLabel.trim()) return;

    try {
      if (editingTile) {
        // Update existing tile
        await updateDoc(doc(db, 'pizzaInstructions', editingTile.id), {
          label: newTileLabel.trim(),
          color: newTileColor,
          sortOrder: newTileSortOrder,
        });
        alert('Tile updated successfully!');
      } else {
        // Create new tile
        await addDoc(collection(db, 'pizzaInstructions'), {
          label: newTileLabel.trim(),
          color: newTileColor,
          sortOrder: newTileSortOrder,
          isActive: true,
        });
        alert('Tile created successfully!');
      }

      // Reset form
      setShowAddTileDialog(false);
      setEditingTile(null);
      setNewTileLabel('');
      setNewTileColor('#3B82F6');
      setNewTileSortOrder(instructionTiles.length + 1);
    } catch (err) {
      console.error(err);
      alert('Failed to save tile.');
    }
  };

  const handleEditTile = (tile: InstructionTile) => {
    setEditingTile(tile);
    setNewTileLabel(tile.label);
    setNewTileColor(tile.color);
    setNewTileSortOrder(tile.sortOrder);
    setShowAddTileDialog(true);
  };

  const handleToggleTile = async (tileId: string, isActive: boolean) => {
    try {
      await updateDoc(doc(db, 'pizzaInstructions', tileId), { isActive });
      alert(`Tile ${isActive ? 'enabled' : 'disabled'} successfully!`);
    } catch (err) {
      console.error(err);
      alert('Failed to update tile status.');
    }
  };

  const handleDeleteTile = async (tileId: string) => {
    if (confirm('Are you sure you want to delete this tile?')) {
      try {
        await deleteDoc(doc(db, 'pizzaInstructions', tileId));
        alert('Tile deleted successfully!');
      } catch (err) {
        console.error(err);
        alert('Failed to delete tile.');
      }
    }
  };

  const handleCreateDefaults = async () => {
    const defaultTiles = [
      { label: 'Light Cheese', color: '#F59E0B', sortOrder: 1 },
      { label: 'Extra Cheese', color: '#EF4444', sortOrder: 2 },
      { label: 'Light Sauce', color: '#06B6D4', sortOrder: 3 },
      { label: 'Extra Sauce', color: '#DC2626', sortOrder: 4 },
      { label: 'Well Done', color: '#92400E', sortOrder: 5 },
      { label: 'Cut in Squares', color: '#7C3AED', sortOrder: 6 },
    ];

    try {
      // Get existing tile labels to avoid duplicates
      const existingLabels = new Set(instructionTiles.map(tile => tile.label));
      
      // Filter out tiles that already exist
      const tilesToAdd = defaultTiles.filter(tile => !existingLabels.has(tile.label));
      
      if (tilesToAdd.length === 0) {
        alert('All default pizza instruction tiles already exist!');
        return;
      }

      // Adjust sort orders based on existing tiles
      const maxSortOrder = instructionTiles.length > 0 ? Math.max(...instructionTiles.map(t => t.sortOrder)) : 0;
      
      for (let i = 0; i < tilesToAdd.length; i++) {
        const tile = tilesToAdd[i];
        await addDoc(collection(db, 'pizzaInstructions'), {
          ...tile,
          sortOrder: maxSortOrder + i + 1,
          isActive: true,
        });
      }
      
      alert(`${tilesToAdd.length} default pizza instruction tiles created successfully!`);
    } catch (err) {
      console.error(err);
      alert('Failed to create default tiles.');
    }
  };

  // Wing Instruction Tile Handlers
  const handleSaveWingTile = async () => {
    if (!newWingTileLabel.trim()) return;

    try {
      if (editingWingTile) {
        // Update existing tile
        await updateDoc(doc(db, 'wingInstructions', editingWingTile.id), {
          label: newWingTileLabel.trim(),
          color: newWingTileColor,
          sortOrder: newWingTileSortOrder,
        });
        alert('Wing tile updated successfully!');
      } else {
        // Create new tile
        await addDoc(collection(db, 'wingInstructions'), {
          label: newWingTileLabel.trim(),
          color: newWingTileColor,
          sortOrder: newWingTileSortOrder,
          isActive: true,
        });
        alert('Wing tile created successfully!');
      }

      // Reset form
      setShowAddWingTileDialog(false);
      setEditingWingTile(null);
      setNewWingTileLabel('');
      setNewWingTileColor('#3B82F6');
      setNewWingTileSortOrder(wingInstructionTiles.length + 1);
    } catch (err) {
      console.error(err);
      alert('Failed to save wing tile.');
    }
  };

  const handleEditWingTile = (tile: InstructionTile) => {
    setEditingWingTile(tile);
    setNewWingTileLabel(tile.label);
    setNewWingTileColor(tile.color);
    setNewWingTileSortOrder(tile.sortOrder);
    setShowAddWingTileDialog(true);
  };

  const handleToggleWingTile = async (tileId: string, isActive: boolean) => {
    try {
      await updateDoc(doc(db, 'wingInstructions', tileId), { isActive });
      alert(`Wing tile ${isActive ? 'enabled' : 'disabled'} successfully!`);
    } catch (err) {
      console.error(err);
      alert('Failed to update wing tile status.');
    }
  };

  const handleDeleteWingTile = async (tileId: string) => {
    if (confirm('Are you sure you want to delete this wing tile?')) {
      try {
        await deleteDoc(doc(db, 'wingInstructions', tileId));
        alert('Wing tile deleted successfully!');
      } catch (err) {
        console.error(err);
        alert('Failed to delete wing tile.');
      }
    }
  };

  const handleCreateWingDefaults = async () => {
    const defaultWingTiles = [
      { label: 'Extra Crispy', color: '#92400E', sortOrder: 1 },
      { label: 'Well Done', color: '#DC2626', sortOrder: 2 },
      { label: 'Light Sauce', color: '#06B6D4', sortOrder: 3 },
      { label: 'Extra Sauce', color: '#EF4444', sortOrder: 4 },
      { label: 'No Sauce', color: '#64748B', sortOrder: 5 },
      { label: 'Sauce on Side', color: '#8B5CF6', sortOrder: 6 },
    ];

    try {
      // Get existing tile labels to avoid duplicates
      const existingLabels = new Set(wingInstructionTiles.map(tile => tile.label));
      
      // Filter out tiles that already exist
      const tilesToAdd = defaultWingTiles.filter(tile => !existingLabels.has(tile.label));
      
      if (tilesToAdd.length === 0) {
        alert('All default wing instruction tiles already exist!');
        return;
      }

      // Adjust sort orders based on existing tiles
      const maxSortOrder = wingInstructionTiles.length > 0 ? Math.max(...wingInstructionTiles.map(t => t.sortOrder)) : 0;
      
      for (let i = 0; i < tilesToAdd.length; i++) {
        const tile = tilesToAdd[i];
        await addDoc(collection(db, 'wingInstructions'), {
          ...tile,
          sortOrder: maxSortOrder + i + 1,
          isActive: true,
        });
      }
      
      alert(`${tilesToAdd.length} default wing instruction tiles created successfully!`);
    } catch (err) {
      console.error(err);
      alert('Failed to create default wing tiles.');
    }
  };

  if (loginLoading || menuLoading) return <p>Loading settings...</p>;
  if (loginError || menuError) return <p>Error loading settings.</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-card-foreground">Appearance Customization</h1>
      </div>

      <div className="space-y-8">
        {/* Login Screen and Menu Screen Settings - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Login Screen Settings */}
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">Login Screen</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="locationName" className="block text-sm font-medium text-gray-700 mb-1">
                  Location Name
                </label>
                <Input
                  id="locationName"
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="e.g., Oakville"
                />
              </div>
              <div>
                <Button
                  onClick={handleSaveLogin}
                  disabled={isSavingLogin}
                  className="px-4 py-2 rounded-md text-white bg-[#800000] hover:bg-red-800 flex items-center disabled:bg-gray-400 w-full justify-center"
                  isLoading={isSavingLogin}
                >
                  Save Login Settings
                </Button>
              </div>
            </div>
          </div>

          {/* Menu Screen Settings */}
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
             <h2 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">Menu Screen</h2>
             <div className="space-y-4">
                <div>
                  <label htmlFor="gridColumns" className="block text-sm font-medium text-gray-700 mb-1">
                    Grid Columns
                  </label>
                  <Select
                    id="gridColumns"
                    value={gridColumns}
                    onChange={(e) => setGridColumns(Number(e.target.value))}
                  >
                    <option value={2}>2 Columns</option>
                    <option value={3}>3 Columns</option>
                    <option value={4}>4 Columns</option>
                    <option value={5}>5 Columns</option>
                  </Select>
                </div>
                <div>
                  <Button
                    onClick={handleSaveMenu}
                    disabled={isSavingMenu}
                    className="px-4 py-2 rounded-md text-white bg-[#800000] hover:bg-red-800 flex items-center disabled:bg-gray-400 w-full justify-center"
                    isLoading={isSavingMenu}
                  >
                    Save Menu Settings
                  </Button>
                </div>
             </div>
          </div>
        </div>

        {/* Pizza Instruction Tiles Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Pizza Instruction Tiles</h2>
              <p className="text-sm text-gray-600 mt-1">Manage instruction tiles displayed below toppings (max 8 tiles)</p>
            </div>
            <Button 
              onClick={() => setShowAddTileDialog(true)}
              className="flex items-center gap-2"
              disabled={instructionTiles.length >= 8}
            >
              <Plus className="h-4 w-4" />
              Add Tile
            </Button>
          </div>

          {/* Instruction Tiles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {instructionTiles
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((tile, index) => (
                <div 
                  key={tile.id}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center space-y-2 hover:border-gray-400 transition-colors"
                  style={{ borderColor: tile.isActive ? tile.color : undefined }}
                >
                  <div 
                    className="w-full h-12 rounded-md flex items-center justify-center text-white text-sm font-medium"
                    style={{ backgroundColor: tile.color }}
                  >
                    {tile.label}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditTile(tile)}
                      className="text-blue-600 hover:text-blue-800 text-xs"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleTile(tile.id, !tile.isActive)}
                      className={`text-xs ${tile.isActive ? 'text-yellow-600 hover:text-yellow-800' : 'text-green-600 hover:text-green-800'}`}
                    >
                      {tile.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => handleDeleteTile(tile.id)}
                      className="text-red-600 hover:text-red-800 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                  <div className="text-xs text-gray-500">Order: {tile.sortOrder}</div>
                </div>
              ))}
            
            {/* Empty slots */}
            {Array.from({ length: Math.max(0, 8 - instructionTiles.length) }).map((_, index) => (
              <div 
                key={`empty-${index}`}
                className="border-2 border-dashed border-gray-200 rounded-lg p-4 h-24 flex items-center justify-center text-gray-400 text-sm"
              >
                Empty Slot
              </div>
            ))}
          </div>

                      {/* Instructions & Quick Setup */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-medium text-blue-900 mb-2">Instructions</h3>
                <p className="text-sm text-blue-800">
                  To reorder tiles, use the Order field when editing. Lower numbers appear first.
                  Active tiles will be displayed on the pizza customization screen below the toppings.
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleCreateDefaults}
                  variant="outline"
                  size="sm"
                  disabled={instructionTiles.length >= 8}
                >
                  {instructionTiles.length === 0 ? 'Create Defaults' : 'Add Defaults'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Wing Instruction Tiles Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Wing Instruction Tiles</h2>
              <p className="text-sm text-gray-600 mt-1">Manage instruction tiles displayed below wing sauces (max 8 tiles)</p>
            </div>
            <Button 
              onClick={() => setShowAddWingTileDialog(true)}
              className="flex items-center gap-2"
              disabled={wingInstructionTiles.length >= 8}
            >
              <Plus className="h-4 w-4" />
              Add Tile
            </Button>
          </div>

          {/* Wing Instruction Tiles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {wingInstructionTiles
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((tile, index) => (
                <div 
                  key={tile.id}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center space-y-2 hover:border-gray-400 transition-colors"
                  style={{ borderColor: tile.isActive ? tile.color : undefined }}
                >
                  <div 
                    className="w-full h-12 rounded-md flex items-center justify-center text-white text-sm font-medium"
                    style={{ backgroundColor: tile.color }}
                  >
                    {tile.label}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditWingTile(tile)}
                      className="text-blue-600 hover:text-blue-800 text-xs"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleWingTile(tile.id, !tile.isActive)}
                      className={`text-xs ${tile.isActive ? 'text-yellow-600 hover:text-yellow-800' : 'text-green-600 hover:text-green-800'}`}
                    >
                      {tile.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => handleDeleteWingTile(tile.id)}
                      className="text-red-600 hover:text-red-800 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                  <div className="text-xs text-gray-500">Order: {tile.sortOrder}</div>
                </div>
              ))}
            
            {/* Empty slots */}
            {Array.from({ length: Math.max(0, 8 - wingInstructionTiles.length) }).map((_, index) => (
              <div 
                key={`empty-${index}`}
                className="border-2 border-dashed border-gray-200 rounded-lg p-4 h-24 flex items-center justify-center text-gray-400 text-sm"
              >
                Empty Slot
              </div>
            ))}
          </div>

          {/* Instructions & Quick Setup */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-medium text-orange-900 mb-2">Instructions</h3>
                <p className="text-sm text-orange-800">
                  To reorder tiles, use the Order field when editing. Lower numbers appear first.
                  Active tiles will be displayed on the wing customization screen below the sauces.
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleCreateWingDefaults}
                  variant="outline"
                  size="sm"
                  disabled={wingInstructionTiles.length >= 8}
                >
                  {wingInstructionTiles.length === 0 ? 'Create Defaults' : 'Add Defaults'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Add Tile Dialog */}
        {showAddTileDialog && (
          <div 
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)'
            }}
          >
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
              <div className="flex justify-between items-center p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-800">
                  {editingTile ? 'Edit Instruction Tile' : 'Add Instruction Tile'}
                </h3>
                <button 
                  onClick={() => {
                    setShowAddTileDialog(false);
                    setEditingTile(null);
                    setNewTileLabel('');
                    setNewTileColor('#3B82F6');
                    setNewTileSortOrder(instructionTiles.length + 1);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  ✕
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                {/* Label Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tile Label
                  </label>
                  <Input
                    value={newTileLabel}
                    onChange={(e) => setNewTileLabel(e.target.value)}
                    placeholder="e.g., Light Cheese, Extra Sauce"
                    maxLength={20}
                  />
                  <p className="text-xs text-gray-500 mt-1">{newTileLabel.length}/20 characters</p>
                </div>

                {/* Color Picker */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tile Color
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {colorOptions.map(color => (
                      <button
                        key={color}
                        onClick={() => setNewTileColor(color)}
                        className={`w-8 h-8 rounded-full border-2 ${newTileColor === color ? 'border-gray-800' : 'border-gray-300'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="mt-2">
                    <input
                      type="color"
                      value={newTileColor}
                      onChange={(e) => setNewTileColor(e.target.value)}
                      className="w-full h-10 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                {/* Sort Order */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Display Order
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="8"
                    value={newTileSortOrder}
                    onChange={(e) => setNewTileSortOrder(parseInt(e.target.value) || 1)}
                  />
                  <p className="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
                </div>

                {/* Preview */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preview
                  </label>
                  <div 
                    className="w-full h-12 rounded-md flex items-center justify-center text-white text-sm font-medium"
                    style={{ backgroundColor: newTileColor }}
                  >
                    {newTileLabel || 'Tile Preview'}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 p-6 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowAddTileDialog(false);
                    setEditingTile(null);
                    setNewTileLabel('');
                    setNewTileColor('#3B82F6');
                    setNewTileSortOrder(instructionTiles.length + 1);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveTile}
                  disabled={!newTileLabel.trim()}
                >
                  {editingTile ? 'Update' : 'Add'} Tile
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Add Wing Tile Dialog */}
        {showAddWingTileDialog && (
          <div 
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)'
            }}
          >
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
              <div className="flex justify-between items-center p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-800">
                  {editingWingTile ? 'Edit Wing Instruction Tile' : 'Add Wing Instruction Tile'}
                </h3>
                <button 
                  onClick={() => {
                    setShowAddWingTileDialog(false);
                    setEditingWingTile(null);
                    setNewWingTileLabel('');
                    setNewWingTileColor('#3B82F6');
                    setNewWingTileSortOrder(wingInstructionTiles.length + 1);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  ✕
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                {/* Label Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tile Label
                  </label>
                  <Input
                    value={newWingTileLabel}
                    onChange={(e) => setNewWingTileLabel(e.target.value)}
                    placeholder="e.g., Extra Crispy, Sauce on Side"
                    maxLength={20}
                  />
                  <p className="text-xs text-gray-500 mt-1">{newWingTileLabel.length}/20 characters</p>
                </div>

                {/* Color Picker */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tile Color
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {colorOptions.map(color => (
                      <button
                        key={color}
                        onClick={() => setNewWingTileColor(color)}
                        className={`w-8 h-8 rounded-full border-2 ${newWingTileColor === color ? 'border-gray-800' : 'border-gray-300'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="mt-2">
                    <input
                      type="color"
                      value={newWingTileColor}
                      onChange={(e) => setNewWingTileColor(e.target.value)}
                      className="w-full h-10 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                {/* Sort Order */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Display Order
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="8"
                    value={newWingTileSortOrder}
                    onChange={(e) => setNewWingTileSortOrder(parseInt(e.target.value) || 1)}
                  />
                  <p className="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
                </div>

                {/* Preview */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preview
                  </label>
                  <div 
                    className="w-full h-12 rounded-md flex items-center justify-center text-white text-sm font-medium"
                    style={{ backgroundColor: newWingTileColor }}
                  >
                    {newWingTileLabel || 'Wing Tile Preview'}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 p-6 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowAddWingTileDialog(false);
                    setEditingWingTile(null);
                    setNewWingTileLabel('');
                    setNewWingTileColor('#3B82F6');
                    setNewWingTileSortOrder(wingInstructionTiles.length + 1);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveWingTile}
                  disabled={!newWingTileLabel.trim()}
                >
                  {editingWingTile ? 'Update' : 'Add'} Tile
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Appearance; 