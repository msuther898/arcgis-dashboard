export function formatDate(timestamp) {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatNumber(num) {
  if (num === null || num === undefined) return '-';
  return num.toLocaleString();
}

export function formatSharing(access) {
  const labels = {
    public: 'Public',
    org: 'Organization',
    private: 'Private',
    shared: 'Group',
  };
  return labels[access] || access;
}

export function getSharingColor(access) {
  const colors = {
    public: 'bg-green-100 text-green-800',
    org: 'bg-blue-100 text-blue-800',
    private: 'bg-gray-100 text-gray-800',
    shared: 'bg-purple-100 text-purple-800',
  };
  return colors[access] || 'bg-gray-100 text-gray-800';
}

export function getItemTypeIcon(type) {
  const icons = {
    'Feature Service': '🗺️',
    'Map Service': '🗺️',
    'Web Map': '🌐',
    'Web Mapping Application': '📱',
    'Scene Service': '🏔️',
    'Image Service': '🖼️',
    'Vector Tile Service': '📐',
    'File Geodatabase': '💾',
    'Shapefile': '📁',
    'CSV': '📊',
    'GeoJSON': '📄',
  };
  return icons[type] || '📄';
}

export function truncate(str, maxLength = 30) {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

export function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '-';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let size = bytes;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(size < 10 ? 2 : 1)} ${units[unitIndex]}`;
}

// ArcGIS Online credit costs (per month)
// From: https://doc.arcgis.com/en/arcgis-online/administer/credits.htm
// Feature storage: 2.4 credits per 10MB/month
// Tile/Image/File storage: 1.2 credits per 1GB/month
// Credits cost ~$0.10 each (varies by subscription)
const CREDIT_COST_USD = 0.10;

// Item types that use feature storage pricing (2.4 credits per 10MB)
const FEATURE_STORAGE_TYPES = [
  'Feature Service',
  'Feature Layer',
  'Feature Collection',
  'Table',
];

// Item types that use tile/imagery pricing (1.2 credits per 1GB)
const TILE_STORAGE_TYPES = [
  'Vector Tile Service',
  'Scene Service',
  'Image Service',
  'Map Service',
  'Tile Layer',
  'Scene Layer',
];

export function calculateMonthlyCredits(sizeBytes, itemType) {
  if (!sizeBytes || sizeBytes === 0) return 0;

  const sizeMB = sizeBytes / (1024 * 1024);
  const sizeGB = sizeMB / 1024;

  // Feature storage: 2.4 credits per 10MB
  if (FEATURE_STORAGE_TYPES.some(t => itemType?.includes(t))) {
    return (sizeMB / 10) * 2.4;
  }

  // Everything else: 1.2 credits per 1GB
  return sizeGB * 1.2;
}

export function calculateMonthlyCost(sizeBytes, itemType) {
  const credits = calculateMonthlyCredits(sizeBytes, itemType);
  return credits * CREDIT_COST_USD;
}

export function formatCost(costUSD) {
  if (!costUSD || costUSD === 0) return '-';
  if (costUSD < 0.01) return '<$0.01';
  return `$${costUSD.toFixed(2)}`;
}

export function formatCredits(sizeBytes, itemType) {
  const credits = calculateMonthlyCredits(sizeBytes, itemType);
  if (!credits || credits === 0) return '-';
  if (credits < 0.1) return '<0.1';
  if (credits < 1) return credits.toFixed(2);
  return credits.toFixed(1);
}
