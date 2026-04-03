import { useState, useCallback } from 'react';
import { formatDate, formatBytes, formatCost, formatCredits, calculateMonthlyCost, getItemTypeIcon } from '../../utils/formatters';
import { isArchiveCandidate, isItemArchived, getArchivedItemInfo } from '../../utils/archiveUtils';
import { ServiceDetails } from '../FeatureService/ServiceDetails';

export function ContentRow({ item, token, onServiceStats, selected, onSelect, showSelection }) {
  const [expanded, setExpanded] = useState(false);
  const [serviceStats, setServiceStats] = useState(null);

  const isFeatureService = item.type === 'Feature Service';
  const isCandidate = isArchiveCandidate(item);
  const isArchived = isItemArchived(item.id);
  const archivedInfo = isArchived ? getArchivedItemInfo(item.id) : null;

  const handleStatsLoaded = useCallback(
    (stats) => {
      setServiceStats(stats);
      if (onServiceStats) {
        onServiceStats(item.id, stats);
      }
    },
    [item.id, onServiceStats]
  );

  const monthlyCost = calculateMonthlyCost(item.size, item.type);

  return (
    <>
      <tr
        className={`border-b border-gray-100 hover:bg-gray-50 ${
          expanded ? 'bg-gray-50' : ''
        } ${isArchived ? 'bg-purple-50' : isCandidate ? 'bg-amber-50' : ''}`}
      >
        {showSelection && (
          <td className="py-3 px-2 w-10">
            <input
              type="checkbox"
              checked={selected || false}
              onChange={(e) => onSelect?.(item.id, e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </td>
        )}
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            {isFeatureService ? (
              <button
                onClick={() => setExpanded(!expanded)}
                className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600"
              >
                {expanded ? '▼' : '▶'}
              </button>
            ) : (
              <span className="w-5" />
            )}
            <span className="text-lg">{getItemTypeIcon(item.type)}</span>
            <div className="flex items-center gap-2">
              <div className="font-medium text-gray-900 max-w-xs truncate" title={item.title}>
                {item.title}
              </div>
              {isArchived && (
                <span
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800"
                  title={`Archived to MinIO: ${archivedInfo?.minioPath}`}
                >
                  📦 MinIO
                </span>
              )}
              {!isArchived && isCandidate && (
                <span
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800"
                  title="Large item with low recent activity - consider archiving"
                >
                  💾 Archive?
                </span>
              )}
            </div>
          </div>
        </td>
        <td className="py-3 px-4 text-sm text-gray-600">
          <span className="max-w-[120px] truncate block" title={item.type}>
            {item.type}
          </span>
        </td>
        <td className="py-3 px-4 text-sm text-gray-600">{item.owner}</td>
        <td className="py-3 px-4 text-sm text-gray-600">
          {formatDate(item.modified)}
        </td>
        <td className="py-3 px-4 text-sm text-gray-600 font-mono">
          {formatBytes(item.size)}
        </td>
        <td className="py-3 px-4 text-sm text-gray-600 font-mono">
          {item.numViews?.toLocaleString() || '-'}
        </td>
        <td className="py-3 px-4 text-sm text-gray-600 font-mono">
          <div>{formatCredits(item.size, item.type)}</div>
          <div className="text-xs text-gray-400">{formatCost(monthlyCost)}</div>
        </td>
      </tr>
      {isFeatureService && (
        <tr className={expanded ? '' : 'hidden'}>
          <td colSpan={showSelection ? 8 : 7} className="p-0">
            <ServiceDetails
              token={token}
              serviceUrl={item.url}
              expanded={expanded}
              onStatsLoaded={handleStatsLoaded}
            />
          </td>
        </tr>
      )}
    </>
  );
}
