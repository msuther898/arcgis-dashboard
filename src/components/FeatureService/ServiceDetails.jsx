import { useFeatureService } from '../../hooks/useFeatureService';
import { formatNumber } from '../../utils/formatters';
import { isClickRayTable } from '../../services/arcgis';

function LayerRow({ layer, isClickray }) {
  return (
    <div
      className={`flex items-center gap-2 py-1 px-3 text-sm ${
        isClickray ? 'bg-blue-50' : ''
      }`}
    >
      <span className="text-gray-400">└</span>
      <span className={isClickray ? 'text-blue-700 font-medium' : 'text-gray-600'}>
        {layer.name}
      </span>
      <span className="text-gray-400">({formatNumber(layer.count)})</span>
      {isClickray && (
        <span className="w-2 h-2 bg-blue-500 rounded-full ml-1"></span>
      )}
    </div>
  );
}

export function ServiceDetails({ token, serviceUrl, expanded, onStatsLoaded }) {
  const { data, isLoading, error } = useFeatureService(token, serviceUrl, expanded);

  // Report stats up when loaded
  if (data && onStatsLoaded) {
    onStatsLoaded({
      totalFeatures: data.totalFeatures,
      totalClickrays: data.totalClickrays,
      layerCount: data.layers?.length || 0,
      tableCount: data.tables?.length || 0,
      hasClickrays: data.hasClickrays,
    });
  }

  if (!expanded) return null;

  if (isLoading) {
    return (
      <div className="py-2 px-6 text-sm text-gray-500">Loading layers...</div>
    );
  }

  if (error) {
    return (
      <div className="py-2 px-6 text-sm text-red-500">
        Error loading service details
      </div>
    );
  }

  if (!data) return null;

  const allItems = [
    ...(data.layers || []).map((l) => ({ ...l, isLayer: true })),
    ...(data.tables || []).map((t) => ({ ...t, isTable: true })),
  ];

  return (
    <div className="bg-gray-50 border-t border-gray-100">
      {allItems.length === 0 ? (
        <div className="py-2 px-6 text-sm text-gray-500">No layers or tables</div>
      ) : (
        allItems.map((item) => (
          <LayerRow
            key={`${item.isLayer ? 'layer' : 'table'}-${item.id}`}
            layer={item}
            isClickray={isClickRayTable(item.name)}
          />
        ))
      )}
    </div>
  );
}
