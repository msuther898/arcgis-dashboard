import { formatNumber } from '../../utils/formatters';

function StatCard({ label, value, icon }) {
  return (
    <div className="bg-white rounded-lg px-4 py-3 shadow-sm border border-gray-200">
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <div>
          <div className="text-2xl font-semibold text-gray-900">
            {formatNumber(value)}
          </div>
          <div className="text-xs text-gray-500">{label}</div>
        </div>
      </div>
    </div>
  );
}

export function SummaryDashboard({ stats }) {
  const {
    totalFeatures = 0,
    totalServices = 0,
    totalLayers = 0,
    totalClickrays = 0,
    geodatabases = 0,
    sceneLayers = 0,
    imageServices = 0,
  } = stats || {};

  return (
    <div className="bg-gray-100 p-4 border-b border-gray-200">
      <div className="flex flex-wrap gap-4">
        <StatCard label="Features" value={totalFeatures} icon="📍" />
        <StatCard label="Services" value={totalServices} icon="🗺️" />
        <StatCard label="Layers" value={totalLayers} icon="📊" />
        <StatCard label="ClickRays" value={totalClickrays} icon="🔵" />
        <StatCard label="Geodatabases" value={geodatabases} icon="💾" />
        <StatCard label="Scene Layers" value={sceneLayers} icon="🏔️" />
        <StatCard label="Image Services" value={imageServices} icon="🖼️" />
      </div>
    </div>
  );
}
