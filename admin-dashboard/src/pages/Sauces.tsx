import React, { useState, useMemo } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, addDoc, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Plus, Edit, Trash2, Search, ChevronLeft, ChevronRight, Tag, Grid3X3, Sparkles, Droplets } from 'lucide-react';

interface Sauce {
  id: string;
  name: string;
  description?: string;
  price?: number;
  isSpicy?: boolean;
  isVegan?: boolean;
}

const Sauces = () => {
  const [saucesSnapshot, loading] = useCollection(
    query(collection(db, 'sauces'), orderBy('name'))
  );
  const [editingSauce, setEditingSauce] = useState<Sauce | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    isSpicy: false,
    isVegan: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingDefaults, setIsCreatingDefaults] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState(''); // 'spicy', 'vegan', or ''

  // Default sauces to create
  const defaultSauces = [
    { name: 'Buffalo', description: 'Classic spicy buffalo sauce', price: 0, isSpicy: true, isVegan: true },
    { name: 'BBQ', description: 'Sweet and tangy barbecue sauce', price: 0, isSpicy: false, isVegan: true },
    { name: 'Honey BBQ', description: 'Sweet honey barbecue blend', price: 0, isSpicy: false, isVegan: false },
    { name: 'Teriyaki', description: 'Japanese-style sweet teriyaki', price: 0, isSpicy: false, isVegan: true },
    { name: 'Hot', description: 'Extra spicy cayenne pepper sauce', price: 0, isSpicy: true, isVegan: true },
    { name: 'Mild', description: 'Gentle buffalo-style sauce', price: 0, isSpicy: false, isVegan: true },
    { name: 'Garlic Parmesan', description: 'Creamy garlic and parmesan', price: 0.50, isSpicy: false, isVegan: false },
    { name: 'Lemon Pepper', description: 'Zesty lemon pepper seasoning', price: 0, isSpicy: false, isVegan: true },
    { name: 'Ranch', description: 'Cool and creamy ranch dip', price: 0.50, isSpicy: false, isVegan: false },
    { name: 'Blue Cheese', description: 'Traditional blue cheese dip', price: 0.50, isSpicy: false, isVegan: false },
    { name: 'Sriracha', description: 'Asian-style chili garlic sauce', price: 0, isSpicy: true, isVegan: true },
    { name: 'Sweet Chili', description: 'Thai-inspired sweet and spicy', price: 0, isSpicy: false, isVegan: true },
    { name: 'Carolina Gold', description: 'Mustard-based BBQ sauce', price: 0, isSpicy: false, isVegan: true },
    { name: 'Cajun Dry Rub', description: 'Spicy Louisiana-style seasoning', price: 0, isSpicy: true, isVegan: true },
    { name: 'Nashville Hot', description: 'Tennessee-style fiery hot sauce', price: 0, isSpicy: true, isVegan: true },
  ];

  const sauces = saucesSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sauce)) || [];

  // Filtered and paginated sauces
  const filteredSauces = useMemo(() => {
    return sauces.filter(sauce => {
      const matchesSearch = sauce.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (sauce.description && sauce.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      let matchesType = true;
      if (typeFilter === 'spicy') {
        matchesType = sauce.isSpicy === true;
      } else if (typeFilter === 'vegan') {
        matchesType = sauce.isVegan === true;
      }
      
      return matchesSearch && matchesType;
    });
  }, [sauces, searchQuery, typeFilter]);

  const totalPages = Math.ceil(filteredSauces.length / itemsPerPage);
  const paginatedSauces = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredSauces.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSauces, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, itemsPerPage]);

  const resetForm = () => {
    setEditingSauce(null);
    setFormData({ name: '', description: '', price: '', isSpicy: false, isVegan: false });
  };

  const handleEdit = (sauce: Sauce) => {
    setEditingSauce(sauce);
    setFormData({
      name: sauce.name,
      description: sauce.description || '',
      price: sauce.price ? sauce.price.toString() : '',
      isSpicy: sauce.isSpicy || false,
      isVegan: sauce.isVegan || false,
    });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this sauce?')) {
      await deleteDoc(doc(db, 'sauces', id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const sauceData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        price: formData.price ? parseFloat(formData.price) : 0,
        isSpicy: formData.isSpicy,
        isVegan: formData.isVegan,
      };

      if (editingSauce) {
        await updateDoc(doc(db, 'sauces', editingSauce.id), sauceData);
      } else {
        await addDoc(collection(db, 'sauces'), sauceData);
      }
      resetForm();
    } catch (error) {
      console.error('Error saving sauce:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateDefaults = async () => {
    if (!window.confirm('This will create default wing sauces. Duplicates will be skipped. Continue?')) {
      return;
    }

    setIsCreatingDefaults(true);
    try {
      const existingNames = new Set(sauces.map(s => s.name.toLowerCase()));
      const saucesToCreate = defaultSauces.filter(
        sauce => !existingNames.has(sauce.name.toLowerCase())
      );

      if (saucesToCreate.length === 0) {
        alert('All default sauces already exist!');
        return;
      }

      // Create sauces in batches to avoid overwhelming Firebase
      for (const sauce of saucesToCreate) {
        await addDoc(collection(db, 'sauces'), sauce);
      }

      alert(`Successfully created ${saucesToCreate.length} default sauces!`);
    } catch (error) {
      console.error('Error creating default sauces:', error);
      alert('Failed to create default sauces. Please try again.');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          <span className="text-lg text-gray-600">Loading sauces...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Wing Sauces</h1>
              <p className="text-lg text-gray-600">Manage your delicious wing sauce collection</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-r from-[#800000] to-red-700 rounded-xl">
                <Droplets className="h-8 w-8 text-white" />
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
                    {editingSauce ? 'Edit Sauce' : 'Create New Sauce'}
                  </h2>
                </div>
              </div>
              
              <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label htmlFor="sauceName" className="block text-sm font-semibold text-gray-700">
                      Sauce Name
                    </label>
                    <input
                      type="text"
                      id="sauceName"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Buffalo, BBQ"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-colors"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="sauceDescription" className="block text-sm font-semibold text-gray-700">
                      Description
                    </label>
                    <textarea
                      id="sauceDescription"
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Optional description"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-colors"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="saucePrice" className="block text-sm font-semibold text-gray-700">
                      Price
                    </label>
                                          <input
                        type="number"
                        step="0.01"
                        id="saucePrice"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder="Price (e.g., 0.50)"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-colors"
                      />
                  </div>
                  
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-gray-700">Options</label>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.isSpicy}
                          onChange={(e) => setFormData({ ...formData, isSpicy: e.target.checked })}
                          className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-700">🌶️ Spicy</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.isVegan}
                          onChange={(e) => setFormData({ ...formData, isVegan: e.target.checked })}
                          className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-700">🌿 Vegan</span>
                      </label>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    {editingSauce && (
                      <Button 
                        type="button" 
                        onClick={resetForm} 
                        variant="secondary"
                        className="flex-1 px-6 py-3 rounded-xl font-medium"
                      >
                        Cancel
                      </Button>
                    )}
                    <Button 
                      type="submit" 
                      disabled={isSaving || !formData.name.trim()} 
                      className="flex-1 px-6 py-3 rounded-xl font-medium bg-gradient-to-r from-[#800000] to-red-700 hover:from-[#700000] hover:to-red-800 text-white shadow-md hover:shadow-lg transition-all duration-200"
                    >
                      {isSaving ? 'Saving...' : (editingSauce ? 'Update Sauce' : 'Create Sauce')}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Sauces List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-[#800000] to-red-700 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Droplets className="h-5 w-5 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Sauces</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium text-white">
                      {paginatedSauces.length} sauces
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
                    <span className="ml-3 text-gray-600">Loading sauces...</span>
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
                            placeholder="Search sauces..."
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-colors"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                        </div>
                        <select
                          value={typeFilter}
                          onChange={(e) => setTypeFilter(e.target.value)}
                          className="px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-colors"
                        >
                          <option value="">All Types</option>
                          <option value="spicy">Spicy Only</option>
                          <option value="vegan">Vegan Only</option>
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
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredSauces.length)} of {filteredSauces.length} sauces
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
                    
                    {paginatedSauces.length === 0 && (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Droplets className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No sauces found</h3>
                        <p className="text-gray-500">Create your first sauce to get started!</p>
                      </div>
                    )}
                    
                    {paginatedSauces.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {paginatedSauces.map((sauce) => (
                          <div key={sauce.id} className="group relative bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 p-4 hover:shadow-lg transition-all duration-200 hover:border-red-300">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-red-200 rounded-xl flex items-center justify-center">
                                  <Droplets className="h-6 w-6 text-red-600" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-gray-900">{sauce.name}</h3>
                                  <p className="text-sm text-gray-500">${(sauce.price ?? 0).toFixed(2)}</p>
                                  {sauce.description && (
                                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{sauce.description}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <Button 
                                  onClick={() => handleEdit(sauce)} 
                                  variant="ghost" 
                                  size="icon"
                                  className="w-8 h-8 rounded-lg hover:bg-red-100 hover:text-red-600"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  onClick={() => handleDelete(sauce.id)} 
                                  variant="ghost" 
                                  size="icon"
                                  className="w-8 h-8 rounded-lg hover:bg-red-100 hover:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            {/* Options badges */}
                            {(sauce.isSpicy || sauce.isVegan) && (
                              <div className="flex flex-wrap gap-1 mt-3">
                                {sauce.isSpicy && <span className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded-full">🌶️ Spicy</span>}
                                {sauce.isVegan && <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">🌿 Vegan</span>}
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

export default Sauces; 