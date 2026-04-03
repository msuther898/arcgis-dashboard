// MinIO Integration Service
// Note: This uses presigned URLs approach for browser compatibility
// For production, you'd want a backend API to handle MinIO operations securely

const MINIO_ENDPOINT = import.meta.env.VITE_MINIO_ENDPOINT || 'http://localhost:9000';
const MINIO_BUCKET = import.meta.env.VITE_MINIO_BUCKET || 'arcgis-archive';
const MINIO_ACCESS_KEY = import.meta.env.VITE_MINIO_ACCESS_KEY || '';
const MINIO_SECRET_KEY = import.meta.env.VITE_MINIO_SECRET_KEY || '';

export function isMinioConfigured() {
  return !!(MINIO_ENDPOINT && MINIO_ACCESS_KEY && MINIO_SECRET_KEY);
}

export function getMinioConfig() {
  return {
    endpoint: MINIO_ENDPOINT,
    bucket: MINIO_BUCKET,
    configured: isMinioConfigured(),
  };
}

// Generate a path for archiving an ArcGIS item
export function generateArchivePath(item) {
  const date = new Date().toISOString().split('T')[0];
  const safeName = item.title.replace(/[^a-zA-Z0-9-_]/g, '_');
  return `archive/${item.owner}/${item.type.replace(/\s+/g, '_')}/${date}_${safeName}_${item.id}`;
}

// Export item data to JSON for archiving metadata
export function createItemManifest(item, additionalData = {}) {
  return {
    arcgisItemId: item.id,
    title: item.title,
    type: item.type,
    owner: item.owner,
    url: item.url,
    size: item.size,
    created: item.created,
    modified: item.modified,
    description: item.description,
    snippet: item.snippet,
    tags: item.tags,
    access: item.access,
    numViews: item.numViews,
    archivedAt: new Date().toISOString(),
    ...additionalData,
  };
}

// Download item data from ArcGIS (for Feature Services, exports as GeoJSON/FGDB)
export async function exportItemData(token, item) {
  if (item.type !== 'Feature Service') {
    // For non-feature services, we just save metadata
    return {
      type: 'metadata-only',
      manifest: createItemManifest(item),
    };
  }

  // For Feature Services, try to export data
  try {
    const exportUrl = `${item.url}/query?where=1=1&outFields=*&f=geojson&token=${token}`;
    const response = await fetch(exportUrl);

    if (!response.ok) {
      throw new Error(`Export failed: ${response.status}`);
    }

    const geojson = await response.json();

    return {
      type: 'geojson',
      data: geojson,
      manifest: createItemManifest(item, { exportFormat: 'geojson' }),
    };
  } catch (error) {
    console.error('Failed to export item data:', error);
    return {
      type: 'metadata-only',
      manifest: createItemManifest(item, { exportError: error.message }),
    };
  }
}

// Upload to MinIO using presigned URL (requires backend or direct MinIO SDK)
// For now, this creates a downloadable archive that can be manually uploaded
export async function createArchiveBundle(token, items, onProgress) {
  const archives = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (onProgress) {
      onProgress({
        current: i + 1,
        total: items.length,
        item: item.title,
        status: 'exporting',
      });
    }

    try {
      const exported = await exportItemData(token, item);
      archives.push({
        item,
        path: generateArchivePath(item),
        ...exported,
      });
    } catch (error) {
      archives.push({
        item,
        path: generateArchivePath(item),
        type: 'error',
        error: error.message,
        manifest: createItemManifest(item, { exportError: error.message }),
      });
    }
  }

  return archives;
}

// Create a downloadable ZIP-like bundle (JSON for now)
export function downloadArchiveBundle(archives) {
  const bundle = {
    exportedAt: new Date().toISOString(),
    itemCount: archives.length,
    items: archives.map(a => ({
      path: a.path,
      manifest: a.manifest,
      hasData: a.type !== 'metadata-only' && a.type !== 'error',
      dataType: a.type,
    })),
    // Include full data for items that have it
    data: archives.reduce((acc, a) => {
      if (a.data) {
        acc[a.path] = a.data;
      }
      return acc;
    }, {}),
  };

  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `arcgis-archive-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);

  return bundle;
}

// For when MinIO is configured, upload directly
export async function uploadToMinio(archives, onProgress) {
  if (!isMinioConfigured()) {
    throw new Error('MinIO is not configured. Set VITE_MINIO_* environment variables.');
  }

  // This would use the MinIO SDK or a backend API
  // For browser-based uploads, you typically need:
  // 1. A backend that generates presigned PUT URLs
  // 2. Or a MinIO policy that allows browser uploads

  // For now, we'll create a manifest that can be used with mc (MinIO Client) CLI
  const manifest = {
    bucket: MINIO_BUCKET,
    endpoint: MINIO_ENDPOINT,
    uploadedAt: new Date().toISOString(),
    items: archives.map(a => ({
      localPath: `${a.path}.json`,
      minioPath: `s3://${MINIO_BUCKET}/${a.path}/manifest.json`,
      dataPath: a.data ? `s3://${MINIO_BUCKET}/${a.path}/data.geojson` : null,
    })),
  };

  return manifest;
}
