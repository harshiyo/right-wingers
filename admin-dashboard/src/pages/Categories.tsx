import React, { useState } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, addDoc, serverTimestamp, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Plus, Trash2, Edit, Tag, Grid3X3, Sparkles } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

// Common restaurant emojis
const COMMON_EMOJIS = [
  '🍕', '🍔', '🌮', '🍟', '🍗', '🥩', '🍖', '🥓',
  '🥪', '🌯', '🥙', '🍜', '🍝', '🍛', '🍚', '🍣',
  '🍱', '🥟', '🥠', '🍤', '🍙', '🍘', '🍥', '🥮',
  '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂',
  '🍮', '🍭', '🍬', '🍫', '🍩', '🍪', '🌰', '🥜',
  '🍺', '🍷', '🥤', '🧃', '🥛', '☕', '🍵', '🧋',
  '🥑', '🥦', '🥬', '🥒', '🌶️', '🌽', '🥕', '🥔',
  '🍅', '🍆', '🥑', '🥝', '🍎', '🍐', '🍊', '🍋'
];

// Auto-icon mapping based on keywords
const AUTO_ICON_MAPPING: { [key: string]: string } = {
  // Pizza variations
  'pizza': '🍕',
  'pizzas': '🍕',
  'Pizza': '🍕',
  'Pizzas': '🍕',
  
  // Wings variations
  'wings': '🍗',
  'wing': '🍗',
  'Wings': '🍗',
  'Wing': '🍗',
  
  // Dipping/Sauces variations
  'dipping': '🥣',
  'dip': '🥣',
  'sauce': '🥣',
  'sauces': '🥣',
  'Dipping': '🥣',
  'Dip': '🥣',
  'Sauce': '🥣',
  'Sauces': '🥣',
  
  // Sides variations
  'side': '🍟',
  'sides': '🍟',
  'Side': '🍟',
  'Sides': '🍟',
  'fries': '🍟',
  'Fries': '🍟',
  
  // Drinks variations
  'drink': '🥤',
  'drinks': '🥤',
  'Drink': '🥤',
  'Drinks': '🥤',
  'beverage': '🥤',
  'beverages': '🥤',
  'Beverage': '🥤',
  'Beverages': '🥤',
  
  // Desserts variations
  'dessert': '🍰',
  'desserts': '🍰',
  'Dessert': '🍰',
  'Desserts': '🍰',
  'cake': '🍰',
  'Cake': '🍰',
  'ice cream': '🍦',
  'Ice Cream': '🍦',
  
  // Burgers variations
  'burger': '🍔',
  'burgers': '🍔',
  'Burger': '🍔',
  'Burgers': '🍔',
  
  // Salads variations
  'salad': '🥗',
  'salads': '🥗',
  'Salad': '🥗',
  'Salads': '🥗',
  
  // Coffee/Tea variations
  'coffee': '☕',
  'Coffee': '☕',
  'tea': '🍵',
  'Tea': '🍵',
  
  // Beer/Alcohol variations
  'beer': '🍺',
  'Beer': '🍺',
  'wine': '🍷',
  'Wine': '🍷',
  'alcohol': '🍺',
  'Alcohol': '🍺',
  
  // Tacos variations
  'taco': '🌮',
  'tacos': '🌮',
  'Taco': '🌮',
  'Tacos': '🌮',
  
  // Pasta variations
  'pasta': '🍝',
  'Pasta': '🍝',
  'noodle': '🍜',
  'Noodle': '🍜',
  'noodles': '🍜',
  'Noodles': '🍜',
  
  // Seafood variations
  'fish': '🐟',
  'Fish': '🐟',
  'shrimp': '🍤',
  'Shrimp': '🍤',
  'seafood': '🐟',
  'Seafood': '🐟',
  
  // Meat variations
  'steak': '🥩',
  'Steak': '🥩',
  'chicken': '🍗',
  'Chicken': '🍗',
  'beef': '🥩',
  'Beef': '🥩',
  'pork': '🥓',
  'Pork': '🥓',
  
  // Vegetarian variations
  'vegetarian': '🥬',
  'Vegetarian': '🥬',
  'vegan': '🥬',
  'Vegan': '🥬',
  'vegetable': '🥬',
  'Vegetable': '🥬',
  'vegetables': '🥬',
  'Vegetables': '🥬',
  
  // Appetizers variations
  'appetizer': '🥟',
  'Appetizer': '🥟',
  'appetizers': '🥟',
  'Appetizers': '🥟',
  'starter': '🥟',
  'Starter': '🥟',
  'starters': '🥟',
  'Starters': '🥟',
  
  // Combo variations
  'combo': '🍱',
  'Combo': '🍱',
  'combos': '🍱',
  'Combos': '🍱',
  'meal': '🍱',
  'Meal': '🍱',
  'meals': '🍱',
  'Meals': '🍱',
  
  // Snacks variations
  'snack': '🍿',
  'Snack': '🍿',
  'snacks': '🍿',
  'Snacks': '🍿',
  'chips': '🍿',
  'Chips': '🍿',
  
  // Breakfast variations
  'breakfast': '🥞',
  'Breakfast': '🥞',
  'morning': '🥞',
  'Morning': '🥞',
  
  // Lunch variations
  'lunch': '🥪',
  'Lunch': '🥪',
  
  // Dinner variations
  'dinner': '🍽️',
  'Dinner': '🍽️',
  'evening': '🍽️',
  'Evening': '🍽️',
};

// Function to auto-detect icon based on category name
const getAutoIcon = (categoryName: string): string => {
  const normalizedName = categoryName.toLowerCase().trim();
  
  // Check for exact matches first
  if (AUTO_ICON_MAPPING[normalizedName]) {
    return AUTO_ICON_MAPPING[normalizedName];
  }
  
  // Check for partial matches (words within the category name)
  const words = normalizedName.split(/\s+/);
  for (const word of words) {
    if (AUTO_ICON_MAPPING[word]) {
      return AUTO_ICON_MAPPING[word];
    }
  }
  
  // Check for contains matches (for compound words)
  for (const [keyword, icon] of Object.entries(AUTO_ICON_MAPPING)) {
    if (normalizedName.includes(keyword)) {
      return icon;
    }
  }
  
  // Default icon if no match found
  return '🍽️';
};

interface Category {
  id: string;
  name: string;
  icon: string;
  createdAt: any;
}

const Categories = () => {
  const [categories, loading, error] = useCollection(collection(db, 'categories'));
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Auto-detect icon when category name changes
  const handleCategoryNameChange = (value: string) => {
    if (editingCategory) {
      setEditingCategory({...editingCategory, name: value});
      // Auto-detect icon for editing
      const autoIcon = getAutoIcon(value);
      setEditingCategory({...editingCategory, name: value, icon: autoIcon});
    } else {
      setNewCategoryName(value);
      // Auto-detect icon for new category
      const autoIcon = getAutoIcon(value);
      setNewCategoryIcon(autoIcon);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategoryName.trim() === '' || newCategoryIcon.trim() === '') return;

    await addDoc(collection(db, 'categories'), {
      name: newCategoryName,
      icon: newCategoryIcon,
      createdAt: serverTimestamp(),
    });

    setNewCategoryName('');
    setNewCategoryIcon('');
  };

  const handleDeleteCategory = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      await deleteDoc(doc(db, 'categories', id));
    }
  };
  
  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || editingCategory.name.trim() === '' || editingCategory.icon.trim() === '') return;
    
    const categoryDoc = doc(db, 'categories', editingCategory.id);
    await updateDoc(categoryDoc, {
        name: editingCategory.name,
        icon: editingCategory.icon,
    });
    
    setEditingCategory(null);
  }

  const handleEmojiSelect = (emoji: string) => {
    if (editingCategory) {
      setEditingCategory({ ...editingCategory, icon: emoji });
    } else {
      setNewCategoryIcon(emoji);
    }
    setShowEmojiPicker(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Manage Categories</h1>
              <p className="text-lg text-gray-600">Organize your menu with beautiful category management</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-r from-[#800000] to-red-700 rounded-xl">
                <Tag className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add/Edit Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-[#800000] to-red-700 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Plus className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white">
                    {editingCategory ? 'Edit Category' : 'Create New Category'}
                  </h2>
                </div>
              </div>
              
              <div className="p-6">
                <form onSubmit={handleAddCategory} className="space-y-6">
                  <div className="space-y-2">
                    <label htmlFor="categoryName" className="block text-sm font-semibold text-gray-700">
                      Category Name
                    </label>
                    <Input
                      type="text"
                      id="categoryName"
                      value={editingCategory ? editingCategory.name : newCategoryName}
                      onChange={(e) => handleCategoryNameChange(e.target.value)}
                      placeholder="e.g., Pizza"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-colors"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="categoryIcon" className="block text-sm font-semibold text-gray-700">
                      Category Icon
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        id="categoryIcon"
                        value={editingCategory ? editingCategory.icon : newCategoryIcon}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value.length <= 2) {
                            editingCategory ? setEditingCategory({...editingCategory, icon: value}) : setNewCategoryIcon(value);
                          }
                        }}
                        className="flex-1 px-4 py-3 text-2xl text-center border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-colors"
                      />
                      <button
                        type="button"
                        className="px-4 py-3 rounded-xl bg-gradient-to-r from-[#800000] to-red-700 text-white hover:from-[#700000] hover:to-red-800 transition-all duration-200 shadow-md hover:shadow-lg"
                        onClick={() => setShowEmojiPicker((v) => !v)}
                        tabIndex={-1}
                      >
                        🎨
                      </button>
                    </div>
                    
                    {/* Auto-detection indicator */}
                    {(editingCategory ? editingCategory.name : newCategoryName) && (
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Sparkles className="h-3 w-3 text-blue-500" />
                        <span>Auto-detected icon based on category name</span>
                      </div>
                    )}
                    
                    {showEmojiPicker && (
                      <div className="mt-2 p-3 bg-gray-50 rounded-lg border">
                        <p className="text-sm text-gray-600 mb-2">Popular icons:</p>
                        <div className="flex flex-wrap gap-2">
                          {['🍕', '🍗', '🥤', '🍟', '🥗', '🍰', '🍺', '☕', '🍦', '🍔', '🌮', '🍜'].map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              className="text-2xl hover:scale-110 transition-transform"
                              onClick={() => {
                                editingCategory ? setEditingCategory({...editingCategory, icon: emoji}) : setNewCategoryIcon(emoji);
                                setShowEmojiPicker(false);
                              }}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    {editingCategory && (
                      <Button 
                        type="button" 
                        onClick={() => setEditingCategory(null)} 
                        variant="secondary"
                        className="flex-1 px-6 py-3 rounded-xl font-medium"
                      >
                        Cancel
                      </Button>
                    )}
                    <Button 
                      type="submit" 
                      className="flex-1 px-6 py-3 rounded-xl font-medium bg-gradient-to-r from-[#800000] to-red-700 hover:from-[#700000] hover:to-red-800 text-white shadow-md hover:shadow-lg transition-all duration-200"
                    >
                      {editingCategory ? 'Update Category' : 'Add Category'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Category List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-[#800000] to-red-700 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Grid3X3 className="h-5 w-5 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Categories</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium text-white">
                      {categories?.docs.length || 0} categories
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                {loading && (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                    <span className="ml-3 text-gray-600">Loading categories...</span>
                  </div>
                )}
                
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-red-800 font-medium">Error: {error.message}</p>
                  </div>
                )}
                
                {categories && categories.docs.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Tag className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No categories found</h3>
                    <p className="text-gray-500">Create your first category to get started!</p>
                  </div>
                )}
                
                {categories && categories.docs.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categories.docs.map(categoryDoc => {
                      const category = { id: categoryDoc.id, ...categoryDoc.data() } as Category;
                      return (
                        <div key={category.id} className="group relative bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 p-4 hover:shadow-lg transition-all duration-200 hover:border-red-300">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-red-200 rounded-xl flex items-center justify-center text-2xl">
                                {category.icon}
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900">{category.name}</h3>
                                <p className="text-sm text-gray-500">Category</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <Button 
                                onClick={() => setEditingCategory(category)} 
                                variant="ghost" 
                                size="icon"
                                className="w-8 h-8 rounded-lg hover:bg-red-100 hover:text-red-600"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                onClick={() => handleDeleteCategory(category.id)} 
                                variant="ghost" 
                                size="icon"
                                className="w-8 h-8 rounded-lg hover:bg-red-100 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Categories; 