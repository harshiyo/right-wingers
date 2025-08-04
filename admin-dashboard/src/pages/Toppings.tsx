import React, { useState, useMemo } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Plus, Edit, Trash2, Search, ChevronLeft, ChevronRight, Tag, Grid3X3, Sparkles, Utensils } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

interface Topping {
  id: string;
  name: string;
  price?: number;
  category?: string;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  isKeto?: boolean;
}

const Toppings = () => {
  const [toppingsSnapshot, loading, error] = useCollection(
    query(collection(db, 'toppings'), orderBy('name'))
  );

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [isVegetarian, setIsVegetarian] = useState(false);
  const [isVegan, setIsVegan] = useState(false);
  const [isGlutenFree, setIsGlutenFree] = useState(false);
  const [isKeto, setIsKeto] = useState(false);
  const [editingTopping, setEditingTopping] = useState<Topping | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingDefaults, setIsCreatingDefaults] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Predefined categories
  const toppingCategories = [
    'Meats',
    'Vegetables', 
    'Cheeses',
    'Sauces & Spreads',
    'Seasonings & Herbs',
    'Premium'
  ];

  // Default toppings to create
  const defaultToppings = [
    // Meats
    { name: 'Pepperoni', price: 1.50, category: 'Meats', isVegetarian: false, isVegan: false, isGlutenFree: true, isKeto: true },
    { name: 'Bacon Bits', price: 1.25, category: 'Meats', isVegetarian: false, isVegan: false, isGlutenFree: true, isKeto: true },
    { name: 'Real Bacon', price: 1.75, category: 'Meats', isVegetarian: false, isVegan: false, isGlutenFree: true, isKeto: true },
    { name: 'Ground Beef', price: 1.50, category: 'Meats', isVegetarian: false, isVegan: false, isGlutenFree: true, isKeto: true },
    { name: 'Chicken', price: 1.75, category: 'Meats', isVegetarian: false, isVegan: false, isGlutenFree: true, isKeto: true },
    { name: 'Italian Sausage', price: 1.50, category: 'Meats', isVegetarian: false, isVegan: false, isGlutenFree: true, isKeto: true },
    { name: 'Hot Italian Sausage', price: 1.50, category: 'Meats', isVegetarian: false, isVegan: false, isGlutenFree: true, isKeto: true },
    { name: 'Ham', price: 1.50, category: 'Meats', isVegetarian: false, isVegan: false, isGlutenFree: true, isKeto: true },

    // Vegetables
    { name: 'Mushrooms', price: 1.25, category: 'Vegetables', isVegetarian: true, isVegan: true, isGlutenFree: true, isKeto: true },
    { name: 'Green Peppers', price: 1.25, category: 'Vegetables', isVegetarian: true, isVegan: true, isGlutenFree: true, isKeto: true },
    { name: 'Hot Peppers', price: 1.25, category: 'Vegetables', isVegetarian: true, isVegan: true, isGlutenFree: true, isKeto: true },
    { name: 'Red Peppers', price: 1.25, category: 'Vegetables', isVegetarian: true, isVegan: true, isGlutenFree: true, isKeto: true },
    { name: 'Sundried Tomatoes', price: 1.75, category: 'Vegetables', isVegetarian: true, isVegan: true, isGlutenFree: true, isKeto: true },
    { name: 'Tomatoes', price: 1.25, category: 'Vegetables', isVegetarian: true, isVegan: true, isGlutenFree: true, isKeto: true },
    { name: 'Green Olives', price: 1.25, category: 'Vegetables', isVegetarian: true, isVegan: true, isGlutenFree: true, isKeto: true },
    { name: 'Black Olives', price: 1.25, category: 'Vegetables', isVegetarian: true, isVegan: true, isGlutenFree: true, isKeto: true },
    { name: 'Pineapple', price: 1.25, category: 'Vegetables', isVegetarian: true, isVegan: true, isGlutenFree: true, isKeto: false },
    { name: 'Pesto', price: 1.50, category: 'Vegetables', isVegetarian: true, isVegan: false, isGlutenFree: true, isKeto: true },
    { name: 'Jalapeno', price: 1.00, category: 'Vegetables', isVegetarian: true, isVegan: true, isGlutenFree: true, isKeto: true },
    { name: 'Onions', price: 1.00, category: 'Vegetables', isVegetarian: true, isVegan: true, isGlutenFree: true, isKeto: true },
    { name: 'Feta Cheese', price: 1.75, category: 'Vegetables', isVegetarian: true, isVegan: false, isGlutenFree: true, isKeto: true },
  ];

  const toppings = toppingsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() } as Topping)) || [];

  // Filtered and paginated toppings
  const filteredToppings = useMemo(() => {
    return toppings.filter(topping => {
      const matchesSearch = topping.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !categoryFilter || topping.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [toppings, searchQuery, categoryFilter]);

  const totalPages = Math.ceil(filteredToppings.length / itemsPerPage);
  const paginatedToppings = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredToppings.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredToppings, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, itemsPerPage]);

  const handleAddOrUpdateTopping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      alert('Topping name is required.');
      return;
    }
    
    setIsSaving(true);
    const toppingData = {
      name,
      price: price ? parseFloat(price) : 0,
      category: category || 'Other',
      isVegetarian,
      isVegan,
      isGlutenFree,
      isKeto,
    };

    try {
      if (editingTopping) {
        const toppingDoc = doc(db, 'toppings', editingTopping.id);
        await updateDoc(toppingDoc, toppingData);
      } else {
        await addDoc(collection(db, 'toppings'), toppingData);
      }
      // Reset form
      setName('');
      setPrice('');
      setCategory('');
      setIsVegetarian(false);
      setIsVegan(false);
      setIsGlutenFree(false);
      setIsKeto(false);
      setEditingTopping(null);
    } catch (err) {
      console.error(err);
      alert('Failed to save topping.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleEdit = (topping: Topping) => {
    setEditingTopping(topping);
    setName(topping.name);
    setPrice(topping.price ? topping.price.toString() : '');
    setCategory(topping.category || '');
    setIsVegetarian(topping.isVegetarian || false);
    setIsVegan(topping.isVegan || false);
    setIsGlutenFree(topping.isGlutenFree || false);
    setIsKeto(topping.isKeto || false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this topping?')) {
      await deleteDoc(doc(db, 'toppings', id));
    }
  };
  
  const cancelEdit = () => {
    setEditingTopping(null);
    setName('');
    setPrice('');
    setCategory('');
    setIsVegetarian(false);
    setIsVegan(false);
    setIsGlutenFree(false);
    setIsKeto(false);
  };

  const handleCreateDefaults = async () => {
    if (!window.confirm('This will create default toppings. Duplicates will be skipped. Continue?')) {
      return;
    }

    setIsCreatingDefaults(true);
    try {
      const existingNames = new Set(toppings.map(t => t.name.toLowerCase()));
      const toppingsToCreate = defaultToppings.filter(
        topping => !existingNames.has(topping.name.toLowerCase())
      );

      if (toppingsToCreate.length === 0) {
        alert('All default toppings already exist!');
        return;
      }

      // Create toppings in batches to avoid overwhelming Firebase
      for (const topping of toppingsToCreate) {
        await addDoc(collection(db, 'toppings'), topping);
      }

      alert(`Successfully created ${toppingsToCreate.length} default toppings!`);
    } catch (error) {
      console.error('Error creating default toppings:', error);
      alert('Failed to create default toppings. Please try again.');
    } finally {
      setIsCreatingDefaults(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  if (error) return <p>Error: {error.message}</p>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Topping Management</h1>
              <p className="text-lg text-gray-600">Customize your menu with delicious toppings and ingredients</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-r from-[#800000] to-red-700 rounded-xl">
                <Utensils className="h-8 w-8 text-white" />
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
                    {editingTopping ? 'Edit Topping' : 'Create New Topping'}
                  </h2>
                </div>
              </div>
              
              <div className="p-6">
                <form onSubmit={handleAddOrUpdateTopping} className="space-y-6">
                  <div className="space-y-2">
                    <label htmlFor="toppingName" className="block text-sm font-semibold text-gray-700">
                      Topping Name
                    </label>
                    <Input
                      type="text"
                      id="toppingName"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Pepperoni"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-colors"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="toppingPrice" className="block text-sm font-semibold text-gray-700">
                      Price
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      id="toppingPrice"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="e.g., 1.50"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-colors"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="toppingCategory" className="block text-sm font-semibold text-gray-700">
                      Category
                    </label>
                    <select
                      id="toppingCategory"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)} 
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-colors"
                    >
                      <option value="">Select Category</option>
                      {toppingCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-gray-700">Dietary Options</label>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={isVegetarian}
                          onChange={(e) => setIsVegetarian(e.target.checked)}
                          className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-700">🌱 Vegetarian</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={isVegan}
                          onChange={(e) => setIsVegan(e.target.checked)}
                          className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-700">🌿 Vegan</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={isGlutenFree}
                          onChange={(e) => setIsGlutenFree(e.target.checked)}
                          className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-700">🌾 Gluten-Free</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={isKeto}
                          onChange={(e) => setIsKeto(e.target.checked)}
                          className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-700">🥩 Keto</span>
                      </label>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    {editingTopping && (
                      <Button 
                        type="button" 
                        onClick={cancelEdit} 
                        variant="secondary"
                        className="flex-1 px-6 py-3 rounded-xl font-medium"
                      >
                        Cancel
                      </Button>
                    )}
                    <Button 
                      type="submit" 
                      disabled={isSaving || !name.trim()} 
                      className="flex-1 px-6 py-3 rounded-xl font-medium bg-gradient-to-r from-[#800000] to-red-700 hover:from-[#700000] hover:to-red-800 text-white shadow-md hover:shadow-lg transition-all duration-200"
                    >
                      {isSaving ? 'Saving...' : (editingTopping ? 'Update Topping' : 'Create Topping')}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Toppings List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-[#800000] to-red-700 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Utensils className="h-5 w-5 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Toppings</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium text-white">
                      {paginatedToppings.length} toppings
                    </span>
                    <Button 
                      onClick={handleCreateDefaults}
                      disabled={isCreatingDefaults}
                      className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg flex items-center gap-2 transition-all"
                    >
                      <Plus className="h-4 w-4" />
                      {isCreatingDefaults ? 'Creating...' : 'Create Defaults'}
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                {loading && (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                    <span className="ml-3 text-gray-600">Loading toppings...</span>
                  </div>
                )}
                
                {!loading && (
                  <>
                    {/* Search and Filters */}
                    <div className="mb-6 space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search toppings..."
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-colors"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                        </div>
                        <select
                          value={categoryFilter}
                          onChange={(e) => setCategoryFilter(e.target.value)}
                          className="px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-colors"
                        >
                          <option value="">All Categories</option>
                          {toppingCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                        <select
                          value={itemsPerPage}
                          onChange={(e) => setItemsPerPage(Number(e.target.value))}
                          className="px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-colors"
                        >
                          <option value={5}>5 per page</option>
                          <option value={10}>10 per page</option>
                          <option value={20}>20 per page</option>
                        </select>
                      </div>
                    </div>
                    
                    {/* Pagination Info */}
                    <div className="flex justify-between items-center mb-4 text-sm text-gray-600">
                      <span>
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredToppings.length)} of {filteredToppings.length} toppings
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-1 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-lg">
                          Page {currentPage} of {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                    
                    {paginatedToppings.length === 0 && (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Utensils className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No toppings found</h3>
                        <p className="text-gray-500">Create your first topping to get started!</p>
                      </div>
                    )}
                    
                    {paginatedToppings.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {paginatedToppings.map(topping => (
                          <div key={topping.id} className="group relative bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 p-4 hover:shadow-lg transition-all duration-200 hover:border-red-300">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-red-200 rounded-xl flex items-center justify-center">
                                  <Utensils className="h-6 w-6 text-red-600" />
                                </div>
                                                                 <div>
                                   <h3 className="font-semibold text-gray-900">{topping.name}</h3>
                                   <p className="text-sm text-gray-500">${(topping.price ?? 0).toFixed(2)}</p>
                                   {topping.category && (
                                    <span className="inline-block px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full mt-1">
                                      {topping.category}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <Button 
                                  onClick={() => handleEdit(topping)} 
                                  variant="ghost" 
                                  size="icon" 
                                  className="w-8 h-8 rounded-lg hover:bg-red-100 hover:text-red-600"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  onClick={() => handleDelete(topping.id)} 
                                  variant="ghost" 
                                  size="icon" 
                                  className="w-8 h-8 rounded-lg hover:bg-red-100 hover:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            {/* Dietary badges */}
                            {(topping.isVegetarian || topping.isVegan || topping.isGlutenFree || topping.isKeto) && (
                              <div className="flex flex-wrap gap-1 mt-3">
                                {topping.isVegetarian && <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">🌱 Veg</span>}
                                {topping.isVegan && <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">🌿 Vegan</span>}
                                {topping.isGlutenFree && <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">🌾 GF</span>}
                                {topping.isKeto && <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full">🥩 Keto</span>}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Toppings; 