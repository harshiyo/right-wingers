import React from 'react';
import { Store } from 'lucide-react';

export const Stores = () => {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Store Management</h1>
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-red-100 rounded-lg">
            <Store className="h-8 w-8 text-red-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Multi-Store System Active!</h2>
            <p className="text-gray-600">Franchise management system successfully configured</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h3 className="font-bold text-green-800 mb-2">✅ Store Locations</h3>
            <ul className="text-green-700 text-sm space-y-1">
              <li>• Right Wingers - Hamilton</li>
              <li>• Right Wingers - Burlington</li>
              <li>• Right Wingers - St. Catharines</li>
              <li>• Right Wingers - Oakville</li>
            </ul>
          </div>
          
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-bold text-blue-800 mb-2">👤 User Roles</h3>
            <ul className="text-blue-700 text-sm space-y-1">
              <li>• Master Admin (All stores)</li>
              <li>• Store Admin (Single store)</li>
              <li>• Employee (Limited access)</li>
            </ul>
          </div>
          
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <h3 className="font-bold text-purple-800 mb-2">🔒 Data Isolation</h3>
            <ul className="text-purple-700 text-sm space-y-1">
              <li>• Store-specific customers</li>
              <li>• Store-specific orders</li>
              <li>• Role-based permissions</li>
            </ul>
          </div>
          
          <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
            <h3 className="font-bold text-orange-800 mb-2">⚡ Features Active</h3>
            <ul className="text-orange-700 text-sm space-y-1">
              <li>• Store switching in POS</li>
              <li>• User login system</li>
              <li>• Filtered data queries</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="font-bold text-gray-800 mb-2">🚀 Next Steps</h3>
          <p className="text-gray-700 text-sm">
            The multi-store system is now fully operational! Use the POS client to test different user roles 
            and see how data is filtered by store. Each user can only access their assigned store's data.
          </p>
        </div>
      </div>
    </div>
  );
}; 