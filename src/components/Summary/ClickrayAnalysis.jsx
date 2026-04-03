import { useEffect, useState } from 'react';
import { formatNumber } from '../../utils/formatters';

const STORAGE_KEY = 'clickray_analysis_results';
const COLLAPSED_KEY = 'clickray_analysis_collapsed';

export function ClickrayAnalysis({ analysis, isLoading, isPaused, progress, onPause, onResume, onStop, onRerun }) {
  const [lastSaved, setLastSaved] = useState(null);
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem(COLLAPSED_KEY) === 'true';
  });

  const showProgress = isLoading || (analysis?.isPartial);
  const pct = progress?.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  const toggleCollapsed = () => {
    const newValue = !collapsed;
    setCollapsed(newValue);
    localStorage.setItem(COLLAPSED_KEY, String(newValue));
  };

  // Auto-save when analysis completes (not partial)
  useEffect(() => {
    if (analysis && !analysis.isPartial && !isLoading) {
      const saveData = {
        ...analysis,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
      setLastSaved(saveData.savedAt);
    }
  }, [analysis, isLoading]);

  // Load last saved timestamp on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setLastSaved(data.savedAt);
      } catch {}
    }
  }, []);

  const handleDownloadJSON = () => {
    if (!analysis) return;
    const saveData = {
      ...analysis,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clickray-analysis-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCSV = () => {
    if (!analysis?.clickrayTables?.length) return;
    const headers = ['Table Name', 'Service', 'Records'];
    const rows = analysis.clickrayTables.map(t => [
      t.name,
      t.serviceName,
      t.count,
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clickray-analysis-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatSavedTime = (isoString) => {
    if (!isoString) return null;
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleCollapsed}
            className="w-5 h-5 flex items-center justify-center text-blue-600 hover:text-blue-800"
          >
            {collapsed ? '▶' : '▼'}
          </button>
          <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
          <h3 className="font-semibold text-blue-900">ClickRay Analysis</h3>
          {/* Show compact stats when collapsed */}
          {collapsed && analysis && (
            <span className="text-sm text-blue-700 ml-2">
              {formatNumber(analysis.totalClickrays)} records in {analysis.clickrayTables?.length || 0} tables
            </span>
          )}
          {lastSaved && !isLoading && !collapsed && (
            <span className="text-xs text-gray-500">
              (saved {formatSavedTime(lastSaved)})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {showProgress && (
            <div className="text-sm text-blue-600">
              {isPaused ? 'Paused' : 'Scanning'} {progress?.current || 0} / {progress?.total || 0} services ({pct}%)
            </div>
          )}
          {analysis && (
            <>
              <button
                onClick={handleDownloadJSON}
                className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 text-gray-700"
              >
                Save JSON
              </button>
              <button
                onClick={handleDownloadCSV}
                className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 text-gray-700"
              >
                Save CSV
              </button>
            </>
          )}
          {/* Pause/Resume/Stop buttons while scanning */}
          {isLoading && onPause && onResume && (
            isPaused ? (
              <button
                onClick={onResume}
                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
              >
                Resume
              </button>
            ) : (
              <button
                onClick={onPause}
                className="px-2 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                Pause
              </button>
            )
          )}
          {isLoading && onStop && (
            <button
              onClick={onStop}
              className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
            >
              Stop
            </button>
          )}
          {onRerun && !isLoading && (
            <button
              onClick={onRerun}
              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Re-run
            </button>
          )}
        </div>
      </div>

      {!collapsed && (
        <>
          {showProgress && (
            <div className="mt-3 mb-4">
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${pct}%` }}
                ></div>
              </div>
              {progress?.currentService && (
                <div className="text-xs text-blue-600 mt-1 truncate">
                  Analyzing: {progress.currentService}
                </div>
              )}
            </div>
          )}

          {analysis ? (
            <>
              <div className="grid grid-cols-3 gap-4 mt-3 mb-4">
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatNumber(analysis.totalClickrays)}
                  </div>
                  <div className="text-xs text-gray-500">Total ClickRay Records</div>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="text-2xl font-bold text-blue-600">
                    {analysis.clickrayTables?.length || 0}
                  </div>
                  <div className="text-xs text-gray-500">ClickRay Tables</div>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="text-2xl font-bold text-blue-600">
                    {analysis.servicesWithClickrays} / {analysis.totalServicesAnalyzed}
                  </div>
                  <div className="text-xs text-gray-500">Services with ClickRays</div>
                </div>
              </div>

              {analysis.clickrayTables && analysis.clickrayTables.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left py-2 px-3 font-medium text-gray-600">Table Name</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-600">Service</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-600">Records</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.clickrayTables.map((table, idx) => (
                        <tr key={`${table.serviceId}-${table.id}`} className={idx % 2 ? 'bg-gray-50' : ''}>
                          <td className="py-2 px-3 font-medium text-gray-900">{table.name}</td>
                          <td className="py-2 px-3 text-gray-600">{table.serviceName}</td>
                          <td className="py-2 px-3 text-right font-mono text-blue-600">
                            {formatNumber(table.count)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {(!analysis.clickrayTables || analysis.clickrayTables.length === 0) && !isLoading && (
                <div className="text-sm text-gray-500 italic">
                  No tables containing "_clickrays" found in any Feature Service
                </div>
              )}
            </>
          ) : isLoading ? (
            <div className="text-sm text-blue-600 mt-3">Starting analysis...</div>
          ) : (
            <div className="text-sm text-gray-500 mt-3">No Feature Services to analyze</div>
          )}
        </>
      )}
    </div>
  );
}
