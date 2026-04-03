import { useState, useMemo, useCallback } from 'react';
import { ContentFilters } from './ContentFilters';
import { ContentRow } from './ContentRow';
import { formatBytes, formatCost, calculateMonthlyCost, calculateMonthlyCredits } from '../../utils/formatters';
import { isArchiveCandidate, isItemArchived } from '../../utils/archiveUtils';
import { getItemUrl } from '../../services/arcgis';

export function ContentTable({ items, token, isLoading, onStatsUpdate, onArchiveSelected, onRefresh }) {
  const [filters, setFilters] = useState({
    hasClickrays: false,
    type: null,
    sharing: null,
    owner: null,
    search: '',
    archiveCandidates: false,
    showArchived: false,
  });

  const [sortConfig, setSortConfig] = useState({ key: 'modified', direction: 'desc' });
  const [serviceStatsMap, setServiceStatsMap] = useState({});
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

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
      if (filters.archiveCandidates && !isArchiveCandidate(item)) {
        return false;
      }
      if (filters.showArchived && !isItemArchived(item.id)) {
        return false;
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
    const archiveCandidateCount = filteredAndSortedItems.filter(i => isArchiveCandidate(i)).length;
    const archivedCount = filteredAndSortedItems.filter(i => isItemArchived(i.id)).length;
    const archivedSize = filteredAndSortedItems
      .filter(i => isItemArchived(i.id))
      .reduce((sum, i) => sum + (i.size || 0), 0);
    const archivedCredits = filteredAndSortedItems
      .filter(i => isItemArchived(i.id))
      .reduce((sum, i) => sum + calculateMonthlyCredits(i.size, i.type), 0);
    return { totalSize, totalViews, totalCredits, totalCost, archiveCandidateCount, archivedCount, archivedSize, archivedCredits };
  }, [filteredAndSortedItems]);

  // Selection stats
  const selectionStats = useMemo(() => {
    const selectedItems = filteredAndSortedItems.filter(i => selectedIds.has(i.id));
    const selectedSize = selectedItems.reduce((sum, i) => sum + (i.size || 0), 0);
    const selectedCredits = selectedItems.reduce(
      (sum, i) => sum + calculateMonthlyCredits(i.size, i.type),
      0
    );
    return { count: selectedIds.size, size: selectedSize, credits: selectedCredits };
  }, [filteredAndSortedItems, selectedIds]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const handleSelect = useCallback((itemId, checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(itemId);
      } else {
        next.delete(itemId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredAndSortedItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSortedItems.map(i => i.id)));
    }
  }, [filteredAndSortedItems, selectedIds]);

  const handleSelectArchiveCandidates = useCallback(() => {
    const candidates = filteredAndSortedItems.filter(i => isArchiveCandidate(i));
    setSelectedIds(new Set(candidates.map(i => i.id)));
  }, [filteredAndSortedItems]);

  const handleArchiveSelected = useCallback(() => {
    const selectedItems = items.filter(i => selectedIds.has(i.id));
    if (onArchiveSelected) {
      onArchiveSelected(selectedItems);
    }
  }, [items, selectedIds, onArchiveSelected]);

  const handleExportCSV = useCallback(() => {
    const headers = ['Title', 'Type', 'Owner', 'Modified', 'Size (bytes)', 'Size', 'Views', 'Credits/mo', 'Cost/mo', 'ID', 'URL'];
    const rows = filteredAndSortedItems.map(item => [
      item.title,
      item.type,
      item.owner,
      new Date(item.modified).toISOString(),
      item.size || 0,
      formatBytes(item.size),
      item.numViews || 0,
      calculateMonthlyCredits(item.size, item.type).toFixed(2),
      calculateMonthlyCost(item.size, item.type).toFixed(2),
      item.id,
      getItemUrl(item.id)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arcgis-content-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredAndSortedItems]);

  const handleExportJSON = useCallback(() => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      totalItems: filteredAndSortedItems.length,
      totalSize: totals.totalSize,
      totalCredits: totals.totalCredits,
      totalCost: totals.totalCost,
      items: filteredAndSortedItems.map(item => ({
        id: item.id,
        title: item.title,
        type: item.type,
        owner: item.owner,
        modified: item.modified,
        size: item.size,
        numViews: item.numViews,
        access: item.access,
        monthlyCredits: calculateMonthlyCredits(item.size, item.type),
        monthlyCost: calculateMonthlyCost(item.size, item.type),
        url: getItemUrl(item.id),
        isArchived: isItemArchived(item.id),
        isArchiveCandidate: isArchiveCandidate(item),
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arcgis-content-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredAndSortedItems, totals]);

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
      <div className="flex items-center justify-between mb-2">
        <ContentFilters
          filters={filters}
          onFilterChange={setFilters}
          owners={owners}
          types={types}
        />
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            Export CSV
          </button>
          <button
            onClick={handleExportJSON}
            className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            Export JSON
          </button>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1"
            >
              {isLoading ? (
                <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></span>
              ) : (
                '↻'
              )}
              Refresh
            </button>
          )}
        </div>
      </div>

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
        {totals.archiveCandidateCount > 0 && (
          <div className="bg-amber-50 px-3 py-2 rounded border border-amber-200">
            <span className="text-amber-700">💾 Archive Candidates:</span>{' '}
            <span className="font-medium text-amber-800">{totals.archiveCandidateCount}</span>
          </div>
        )}
        {totals.archivedCount > 0 && (
          <div className="bg-purple-50 px-3 py-2 rounded border border-purple-200">
            <span className="text-purple-700">📦 In MinIO:</span>{' '}
            <span className="font-medium text-purple-800">{totals.archivedCount}</span>
            <span className="text-purple-600 text-xs ml-2">
              ({formatBytes(totals.archivedSize)}, {totals.archivedCredits.toFixed(1)} credits/mo saved)
            </span>
          </div>
        )}
      </div>

      {/* Selection toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setSelectionMode(!selectionMode)}
          className={`px-3 py-1.5 text-sm rounded border ${
            selectionMode
              ? 'bg-blue-50 border-blue-300 text-blue-700'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          {selectionMode ? '✓ Selection Mode' : 'Select Items'}
        </button>

        {selectionMode && (
          <>
            <button
              onClick={handleSelectAll}
              className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 text-gray-700"
            >
              {selectedIds.size === filteredAndSortedItems.length ? 'Deselect All' : 'Select All'}
            </button>
            <button
              onClick={handleSelectArchiveCandidates}
              className="px-3 py-1.5 text-sm bg-amber-50 border border-amber-300 rounded hover:bg-amber-100 text-amber-700"
            >
              Select Archive Candidates
            </button>
            {selectedIds.size > 0 && (
              <>
                <span className="text-sm text-gray-500">
                  {selectionStats.count} selected ({formatBytes(selectionStats.size)}, {selectionStats.credits.toFixed(1)} credits/mo)
                </span>
                <button
                  onClick={handleArchiveSelected}
                  className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                  📦 Archive to MinIO
                </button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              </>
            )}
          </>
        )}
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
                  {selectionMode && (
                    <th className="py-3 px-2 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === filteredAndSortedItems.length && filteredAndSortedItems.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                  )}
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
                    selected={selectedIds.has(item.id)}
                    onSelect={handleSelect}
                    showSelection={selectionMode}
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
