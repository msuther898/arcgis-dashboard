import { useState, useMemo } from 'react';
import { getArchivedItems, removeArchivedItem, getArchiveSettings, saveArchiveSettings } from '../../utils/archiveUtils';
import { formatBytes, formatDate, calculateMonthlyCredits, formatCost } from '../../utils/formatters';

export function ArchiveManager({ onClose }) {
  const [archivedItems, setArchivedItems] = useState(() => getArchivedItems());
  const [settings, setSettings] = useState(() => getArchiveSettings());
  const [activeTab, setActiveTab] = useState('items'); // 'items' or 'settings'

  const totals = useMemo(() => {
    const totalSize = archivedItems.reduce((sum, i) => sum + (i.size || 0), 0);
    const totalCredits = archivedItems.reduce(
      (sum, i) => sum + calculateMonthlyCredits(i.size, i.type),
      0
    );
    return { totalSize, totalCredits };
  }, [archivedItems]);

  const handleRemove = (itemId) => {
    removeArchivedItem(itemId);
    setArchivedItems(getArchivedItems());
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all archive records? This does not delete the files from MinIO.')) {
      localStorage.removeItem('arcgis_archived_items');
      setArchivedItems([]);
    }
  };

  const handleSettingsChange = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    saveArchiveSettings(newSettings);
  };

  const handleExportManifest = () => {
    const manifest = {
      exportedAt: new Date().toISOString(),
      totalItems: archivedItems.length,
      totalSize: totals.totalSize,
      monthlyCreditsSaved: totals.totalCredits,
      items: archivedItems,
    };

    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arcgis-archive-manifest-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            📦 Archive Manager
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 border-b border-gray-200">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('items')}
              className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'items'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Archived Items ({archivedItems.length})
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'settings'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Archive Settings
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 flex-1 overflow-auto">
          {activeTab === 'items' && (
            <>
              {archivedItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No items have been archived yet.
                </div>
              ) : (
                <>
                  {/* Summary */}
                  <div className="bg-purple-50 rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-purple-900">{archivedItems.length}</div>
                        <div className="text-sm text-purple-600">Items Archived</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-purple-900">{formatBytes(totals.totalSize)}</div>
                        <div className="text-sm text-purple-600">Total Size</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">{totals.totalCredits.toFixed(1)}</div>
                        <div className="text-sm text-green-600">Credits/mo Saved</div>
                      </div>
                    </div>
                  </div>

                  {/* Items list */}
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left py-2 px-3 font-medium text-gray-500">Item</th>
                          <th className="text-left py-2 px-3 font-medium text-gray-500">Type</th>
                          <th className="text-left py-2 px-3 font-medium text-gray-500">Size</th>
                          <th className="text-left py-2 px-3 font-medium text-gray-500">Archived</th>
                          <th className="py-2 px-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {archivedItems.map((item) => (
                          <tr key={item.id} className="border-b last:border-b-0 hover:bg-gray-50">
                            <td className="py-2 px-3">
                              <div className="font-medium text-gray-900 truncate max-w-[200px]" title={item.title}>
                                {item.title}
                              </div>
                              <div className="text-xs text-gray-500 truncate max-w-[200px]" title={item.minioPath}>
                                {item.minioPath}
                              </div>
                            </td>
                            <td className="py-2 px-3 text-gray-600">{item.type}</td>
                            <td className="py-2 px-3 text-gray-600 font-mono">{formatBytes(item.size)}</td>
                            <td className="py-2 px-3 text-gray-600">{formatDate(new Date(item.archivedAt).getTime())}</td>
                            <td className="py-2 px-3">
                              <button
                                onClick={() => handleRemove(item.id)}
                                className="text-red-500 hover:text-red-700"
                                title="Remove from archive list"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Archive Candidate Thresholds</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Items matching these criteria will be flagged as archive candidates.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Minimum size (MB)
                    </label>
                    <input
                      type="number"
                      value={settings.minSizeMB}
                      onChange={(e) => handleSettingsChange('minSizeMB', parseInt(e.target.value) || 0)}
                      className="w-32 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Items smaller than this won't be flagged</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Days since last modified
                    </label>
                    <input
                      type="number"
                      value={settings.maxDaysSinceModified}
                      onChange={(e) => handleSettingsChange('maxDaysSinceModified', parseInt(e.target.value) || 0)}
                      className="w-32 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Items modified more recently won't be flagged</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Days since last viewed
                    </label>
                    <input
                      type="number"
                      value={settings.maxDaysSinceView}
                      onChange={(e) => handleSettingsChange('maxDaysSinceView', parseInt(e.target.value) || 0)}
                      className="w-32 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Items viewed more recently won't be flagged</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h3 className="font-medium text-gray-900 mb-2">Archive Criteria Logic</h3>
                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 font-mono">
                  <p>An item is an archive candidate if:</p>
                  <p className="mt-2 ml-4">size &gt;= {settings.minSizeMB}MB</p>
                  <p className="ml-4">AND (</p>
                  <p className="ml-8">days_since_modified &gt;= {settings.maxDaysSinceModified}</p>
                  <p className="ml-8">OR views &lt; 10</p>
                  <p className="ml-4">)</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
          <div className="flex gap-2">
            {activeTab === 'items' && archivedItems.length > 0 && (
              <>
                <button
                  onClick={handleExportManifest}
                  className="px-4 py-2 text-purple-700 border border-purple-300 rounded hover:bg-purple-50"
                >
                  Export Manifest
                </button>
                <button
                  onClick={handleClearAll}
                  className="px-4 py-2 text-red-700 border border-red-300 rounded hover:bg-red-50"
                >
                  Clear All
                </button>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
