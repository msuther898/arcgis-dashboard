import { useState, useMemo, useCallback } from 'react';
import { ContentFilters } from './ContentFilters';
import { ContentRow } from './ContentRow';
import { formatBytes, formatCost, calculateMonthlyCost, calculateMonthlyCredits } from '../../utils/formatters';

export function ContentTable({ items, token, isLoading, onStatsUpdate }) {
  const [filters, setFilters] = useState({
    hasClickrays: false,
    type: null,
    sharing: null,
    owner: null,
    search: '',
  });

  const [sortConfig, setSortConfig] = useState({ key: 'modified', direction: 'desc' });
  const [serviceStatsMap, setServiceStatsMap] = useState({});

  const handleServiceStats = useCallback((itemId, stats) => {
    setServiceStatsMap((prev) => {
      const updated = { ...prev, [itemId]: stats };
      if (onStatsUpdate) {
        onStatsUpdate(updated);
      }
      return updated;
    });
  }, [onStatsUpdate]);

  // Get unique owners for filter
  const owners = useMemo(() => {
    if (!items) return [];
    const ownerSet = new Set(items.map((i) => i.owner).filter(Boolean));
    return Array.from(ownerSet).sort();
  }, [items]);

  // Get unique types for filter
  const types = useMemo(() => {
    if (!items) return [];
    const typeSet = new Set(items.map((i) => i.type).filter(Boolean));
    return Array.from(typeSet).sort();
  }, [items]);

  const filteredAndSortedItems = useMemo(() => {
    if (!items) return [];

    let result = items.filter((item) => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!item.title?.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      if (filters.type && item.type !== filters.type) {
        return false;
      }
      if (filters.sharing && item.access !== filters.sharing) {
        return false;
      }
      if (filters.owner && item.owner !== filters.owner) {
        return false;
      }
      if (filters.hasClickrays) {
        const stats = serviceStatsMap[item.id];
        if (!stats?.hasClickrays) {
          return false;
        }
      }
      return true;
    });

    // Sort
    result.sort((a, b) => {
      let aVal, bVal;

      switch (sortConfig.key) {
        case 'title':
          aVal = a.title?.toLowerCase() || '';
          bVal = b.title?.toLowerCase() || '';
          break;
        case 'owner':
          aVal = a.owner?.toLowerCase() || '';
          bVal = b.owner?.toLowerCase() || '';
          break;
        case 'modified':
          aVal = a.modified || 0;
          bVal = b.modified || 0;
          break;
        case 'size':
          aVal = a.size || 0;
          bVal = b.size || 0;
          break;
        case 'numViews':
          aVal = a.numViews || 0;
          bVal = b.numViews || 0;
          break;
        case 'credits':
          aVal = calculateMonthlyCredits(a.size, a.type);
          bVal = calculateMonthlyCredits(b.size, b.type);
          break;
        case 'type':
          aVal = a.type?.toLowerCase() || '';
          bVal = b.type?.toLowerCase() || '';
          break;
        default:
          aVal = a[sortConfig.key] || '';
          bVal = b[sortConfig.key] || '';
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [items, filters, serviceStatsMap, sortConfig]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalSize = filteredAndSortedItems.reduce((sum, i) => sum + (i.size || 0), 0);
    const totalViews = filteredAndSortedItems.reduce((sum, i) => sum + (i.numViews || 0), 0);
    const totalCredits = filteredAndSortedItems.reduce(
      (sum, i) => sum + calculateMonthlyCredits(i.size, i.type),
      0
    );
    const totalCost = filteredAndSortedItems.reduce(
      (sum, i) => sum + calculateMonthlyCost(i.size, i.type),
      0
    );
    return { totalSize, totalViews, totalCredits, totalCost };
  }, [filteredAndSortedItems]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const SortHeader = ({ label, sortKey }) => (
    <th
      className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
      onClick={() => handleSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortConfig.key === sortKey && (
          <span className="text-blue-500">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
        )}
      </div>
    </th>
  );

  return (
    <div>
      <ContentFilters
        filters={filters}
        onFilterChange={setFilters}
        owners={owners}
        types={types}
      />

      {/* Summary stats */}
      <div className="flex flex-wrap gap-4 mb-4 text-sm">
        <div className="bg-white px-3 py-2 rounded border">
          <span className="text-gray-500">Total Size:</span>{' '}
          <span className="font-medium">{formatBytes(totals.totalSize)}</span>
        </div>
        <div className="bg-white px-3 py-2 rounded border">
          <span className="text-gray-500">Total Views:</span>{' '}
          <span className="font-medium">{totals.totalViews.toLocaleString()}</span>
        </div>
        <div className="bg-white px-3 py-2 rounded border">
          <span className="text-gray-500">Credits/mo:</span>{' '}
          <span className="font-medium">{totals.totalCredits.toFixed(1)}</span>
        </div>
        <div className="bg-white px-3 py-2 rounded border">
          <span className="text-gray-500">Est. Cost/mo:</span>{' '}
          <span className="font-medium">{formatCost(totals.totalCost)}</span>
          <span className="text-xs text-gray-400 ml-1">(@$0.10/credit)</span>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading content...</div>
      ) : filteredAndSortedItems.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No items match the current filters
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <SortHeader label="Name" sortKey="title" />
                  <SortHeader label="Type" sortKey="type" />
                  <SortHeader label="Owner" sortKey="owner" />
                  <SortHeader label="Modified" sortKey="modified" />
                  <SortHeader label="Size" sortKey="size" />
                  <SortHeader label="Views" sortKey="numViews" />
                  <SortHeader label="Credits/mo" sortKey="credits" />
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedItems.map((item) => (
                  <ContentRow
                    key={item.id}
                    item={item}
                    token={token}
                    onServiceStats={handleServiceStats}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-2 text-sm text-gray-500">
        Showing {filteredAndSortedItems.length} of {items?.length || 0} items
      </div>
    </div>
  );
}
