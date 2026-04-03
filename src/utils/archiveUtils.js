// Archive candidate detection and tracking

const ARCHIVE_STORAGE_KEY = 'arcgis_archived_items';
const ARCHIVE_SETTINGS_KEY = 'arcgis_archive_settings';

// Default thresholds for archive candidates
const DEFAULT_SETTINGS = {
  minSizeMB: 10,           // Items larger than this are candidates
  maxDaysSinceView: 90,    // Items not viewed in this many days
  maxDaysSinceModified: 180, // Items not modified in this many days
};

export function getArchiveSettings() {
  const saved = localStorage.getItem(ARCHIVE_SETTINGS_KEY);
  if (saved) {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {}
  }
  return DEFAULT_SETTINGS;
}

export function saveArchiveSettings(settings) {
  localStorage.setItem(ARCHIVE_SETTINGS_KEY, JSON.stringify(settings));
}

export function isArchiveCandidate(item, settings = null) {
  const { minSizeMB, maxDaysSinceView, maxDaysSinceModified } = settings || getArchiveSettings();

  const sizeMB = (item.size || 0) / (1024 * 1024);
  const now = Date.now();
  const daysSinceModified = item.modified ? (now - item.modified) / (1000 * 60 * 60 * 24) : 999;

  // Consider it a candidate if:
  // 1. Size is above threshold AND
  // 2. Either hasn't been modified recently OR has very low views
  const isLarge = sizeMB >= minSizeMB;
  const isStale = daysSinceModified >= maxDaysSinceModified;
  const lowViews = (item.numViews || 0) < 10;

  return isLarge && (isStale || lowViews);
}

export function getArchiveScore(item) {
  // Higher score = better archive candidate
  const sizeMB = (item.size || 0) / (1024 * 1024);
  const now = Date.now();
  const daysSinceModified = item.modified ? (now - item.modified) / (1000 * 60 * 60 * 24) : 365;
  const views = item.numViews || 0;

  // Score based on size (bigger = higher score)
  const sizeScore = Math.min(sizeMB / 100, 10); // Max 10 points for 1GB+

  // Score based on staleness (older = higher score)
  const staleScore = Math.min(daysSinceModified / 30, 10); // Max 10 points for 300+ days

  // Score based on low usage (fewer views = higher score)
  const usageScore = Math.max(0, 5 - Math.log10(views + 1)); // 5 points for 0 views, decreases with views

  return sizeScore + staleScore + usageScore;
}

// Archived items tracking
export function getArchivedItems() {
  const saved = localStorage.getItem(ARCHIVE_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {}
  }
  return [];
}

export function saveArchivedItems(items) {
  localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(items));
}

export function addArchivedItem(item, minioPath) {
  const archived = getArchivedItems();
  const archivedItem = {
    id: item.id,
    title: item.title,
    type: item.type,
    owner: item.owner,
    size: item.size,
    originalUrl: item.url,
    minioPath,
    archivedAt: new Date().toISOString(),
    metadata: {
      description: item.description,
      tags: item.tags,
      snippet: item.snippet,
    },
  };

  // Update if exists, otherwise add
  const existingIndex = archived.findIndex(a => a.id === item.id);
  if (existingIndex >= 0) {
    archived[existingIndex] = archivedItem;
  } else {
    archived.push(archivedItem);
  }

  saveArchivedItems(archived);
  return archivedItem;
}

export function removeArchivedItem(itemId) {
  const archived = getArchivedItems();
  const filtered = archived.filter(a => a.id !== itemId);
  saveArchivedItems(filtered);
}

export function isItemArchived(itemId) {
  const archived = getArchivedItems();
  return archived.some(a => a.id === itemId);
}

export function getArchivedItemInfo(itemId) {
  const archived = getArchivedItems();
  return archived.find(a => a.id === itemId);
}
