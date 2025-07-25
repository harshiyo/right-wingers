import React, { useState, useMemo } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, addDoc, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Plus, Edit, Trash2, Search, ChevronLeft, ChevronRight } from 'lucide-react';

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
  const [itemsPerPage, setItemsPerPage] = useState(10);
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
      <div className="flex items-center justify-center h-64 text-lg text-muted-foreground">
        Loading sauces...
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-card-foreground">Wing Sauces</h1>
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
        {/* Form Section */}
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-semibold mb-4">{editingSauce ? 'Edit Sauce' : 'Add New Sauce'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Buffalo, BBQ"
                required
              />
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
              />
              <Input
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                type="number"
                step="0.01"
                placeholder="Price (e.g., 0.50)"
              />
              <div className="flex gap-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.isSpicy}
                    onChange={(e) => setFormData({ ...formData, isSpicy: e.target.checked })}
                  />
                  <span className="text-sm">Spicy</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.isVegan}
                    onChange={(e) => setFormData({ ...formData, isVegan: e.target.checked })}
                  />
                  <span className="text-sm">Vegan</span>
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={isSaving || !formData.name.trim()} className="px-4 py-2 rounded-md text-white bg-[#800000] hover:bg-red-800 flex items-center disabled:bg-gray-400 w-full justify-center">
                  <Plus className="h-5 w-5 mr-2" />
                  {isSaving ? 'Saving...' : editingSauce ? 'Update Sauce' : 'Add Sauce'}
                </Button>
                {editingSauce && (
                  <Button type="button" onClick={resetForm} variant="secondary">
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>
        
        {/* List Section */}
        <div className="md:col-span-2">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Available Sauces</h2>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>
                  Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredSauces.length)} - {Math.min(currentPage * itemsPerPage, filteredSauces.length)} of {filteredSauces.length}
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
                  placeholder="Search sauces..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent"
              >
                <option value="">All Types</option>
                <option value="spicy">Spicy Only</option>
                <option value="vegan">Vegan Only</option>
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

            {paginatedSauces.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  {filteredSauces.length === 0 
                    ? (searchQuery || typeFilter ? 'No sauces match your filters.' : 'No sauces found.') 
                    : 'No sauces on this page.'}
                </p>
              </div>
            ) : (
              <>
                <ul className="space-y-3">
                  {paginatedSauces.map((sauce) => (
                    <li
                      key={sauce.id}
                      className="flex justify-between items-center bg-[#f9f9f9] rounded-lg p-3 border border-gray-200 hover:bg-accent transition-all"
                    >
                      <div>
                        <div className="font-semibold text-card-foreground">{sauce.name}</div>
                        {sauce.description && (
                          <div className="text-sm text-muted-foreground mt-0.5">{sauce.description}</div>
                        )}
                        {sauce.price !== undefined && sauce.price > 0 && (
                          <div className="text-sm text-gray-600 mt-0.5">Price: ${sauce.price.toFixed(2)}</div>
                        )}
                        <div className="flex gap-2 mt-1">
                          {sauce.isSpicy && (
                            <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-medium">
                              Spicy
                            </span>
                          )}
                          {sauce.isVegan && (
                            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
                              Vegan
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => handleEdit(sauce)} variant="ghost" size="icon">
                          <Edit className="h-5 w-5" />
                        </Button>
                        <Button onClick={() => handleDelete(sauce.id)} variant="ghost" size="icon">
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

export default Sauces; 