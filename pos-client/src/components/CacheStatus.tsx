import React from 'react';
import { Database, RefreshCw, Trash2, Zap, Clock } from 'lucide-react';

interface CacheStats {
  hasValidCache: boolean;
  cacheAge: number;
  searchCacheSize: number;
  totalCustomers: number;
  lastFetch: number | null;
  customerCacheSizeKB: number;
  searchCacheSizeKB: number;
}

interface CacheStatusProps {
  stats: CacheStats;
  onRefresh: () => void;
  onClear: () => void;
  isLoading?: boolean;
}

export const CacheStatus: React.FC<CacheStatusProps> = ({
  stats,
  onRefresh,
  onClear,
  isLoading = false
}) => {
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg p-3 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-gray-700">Cache Status</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1 text-gray-500 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Refresh cache"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onClear}
            disabled={isLoading}
            className="p-1 text-gray-500 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Clear cache"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1">
          <Zap className="h-3 w-3 text-green-600" />
          <span className="text-gray-600">
            {stats.hasValidCache ? 'Active' : 'Expired'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3 text-blue-600" />
          <span className="text-gray-600">
            {stats.cacheAge > 0 ? formatTime(stats.cacheAge) : 'Fresh'}
          </span>
        </div>
        <div className="text-gray-600">
          {stats.totalCustomers} customers
        </div>
        <div className="text-gray-600">
          {stats.searchCacheSize} searches
        </div>
        <div className="text-gray-500 text-xs">
          {stats.customerCacheSizeKB}KB stored
        </div>
        <div className="text-gray-500 text-xs">
          {stats.searchCacheSizeKB}KB search
        </div>
      </div>
      
      {stats.lastFetch && (
        <div className="text-xs text-gray-500 mt-1">
          Last fetch: {formatTime(stats.lastFetch)} ago
        </div>
      )}
    </div>
  );
};
