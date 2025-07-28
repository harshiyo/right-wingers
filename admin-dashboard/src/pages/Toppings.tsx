import React, { useState, useMemo } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Plus, Edit, Trash2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
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
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-card-foreground">Topping Management</h1>
        <Button 
          onClick={handleCreateDefaults}
          disabled={isCreatingDefaults}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          {isCreatingDefaults ? 'Creating...' : 'Create Defaults'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Form Column */}
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-semibold mb-4">{editingTopping ? 'Edit Topping' : 'Add New Topping'}</h2>
            <form onSubmit={handleAddOrUpdateTopping} className="space-y-4">
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Pepperoni"
                required
              />
              <Input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g., 1.50"
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                >
                  <option value="">Select Category</option>
                  {toppingCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Dietary Options</label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isVegetarian}
                      onChange={(e) => setIsVegetarian(e.target.checked)}
                      className="h-4 w-4 text-[#800000] border-gray-300 rounded focus:ring-[#800000]"
                    />
                    <span className="ml-2 text-sm text-gray-700">🌱 Vegetarian</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isVegan}
                      onChange={(e) => setIsVegan(e.target.checked)}
                      className="h-4 w-4 text-[#800000] border-gray-300 rounded focus:ring-[#800000]"
                    />
                    <span className="ml-2 text-sm text-gray-700">🌿 Vegan</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isGlutenFree}
                      onChange={(e) => setIsGlutenFree(e.target.checked)}
                      className="h-4 w-4 text-[#800000] border-gray-300 rounded focus:ring-[#800000]"
                    />
                    <span className="ml-2 text-sm text-gray-700">🌾 Gluten-Free</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isKeto}
                      onChange={(e) => setIsKeto(e.target.checked)}
                      className="h-4 w-4 text-[#800000] border-gray-300 rounded focus:ring-[#800000]"
                    />
                    <span className="ml-2 text-sm text-gray-700">🥩 Keto</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={isSaving} className="px-4 py-2 rounded-md text-white bg-[#800000] hover:bg-red-800 flex items-center disabled:bg-gray-400 w-full justify-center">
                  <Plus className="h-5 w-5 mr-2" />
                  {isSaving ? 'Saving...' : (editingTopping ? 'Update Topping' : 'Add Topping')}
                </Button>
                {editingTopping && (
                  <Button type="button" onClick={cancelEdit} variant="secondary">
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* List Column */}
        <div className="md:col-span-2">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Available Toppings</h2>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>
                  Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredToppings.length)} - {Math.min(currentPage * itemsPerPage, filteredToppings.length)} of {filteredToppings.length}
                </span>
              </div>
            </div>

            {/* Filters */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search toppings..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent"
              >
                <option value="">All Categories</option>
                {toppingCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* Items per page */}
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent"
              >
                <option value={5}>5 per page</option>
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
              </select>
            </div>

            {loading ? (
              <p>Loading toppings...</p>
            ) : paginatedToppings.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  {filteredToppings.length === 0 
                    ? (searchQuery || categoryFilter ? 'No toppings match your filters.' : 'No toppings found.') 
                    : 'No toppings on this page.'}
                </p>
              </div>
            ) : (
              <>
                <ul className="space-y-2">
                  {paginatedToppings.map(topping => (
                    <li key={topping.id} className="flex items-center justify-between p-4 bg-[#f9f9f9] rounded-lg border border-gray-200">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-800">{topping.name}</span>
                          {topping.price !== undefined && (topping.price ?? 0) > 0 && (
                            <span className="text-sm text-gray-500">${(topping.price ?? 0).toFixed(2)}</span>
                          )}
                          {topping.category && (
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                              {topping.category}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          {topping.isVegetarian && <span className="text-xs">🌱</span>}
                          {topping.isVegan && <span className="text-xs">🌿</span>}
                          {topping.isGlutenFree && <span className="text-xs">🌾</span>}
                          {topping.isKeto && <span className="text-xs">🥩</span>}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button onClick={() => handleEdit(topping)} variant="ghost" size="icon">
                          <Edit className="h-5 w-5" />
                        </Button>
                        <Button onClick={() => handleDelete(topping.id)} variant="ghost" size="icon">
                          <Trash2 className="h-5 w-5 text-destructive" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-center space-x-2">
                    <Button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      variant="outline"
                      size="sm"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    {getPageNumbers().map((page) => (
                      <Button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        className={currentPage === page ? "bg-[#800000] hover:bg-red-800" : ""}
                      >
                        {page}
                      </Button>
                    ))}

                    <Button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      variant="outline"
                      size="sm"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Toppings; 