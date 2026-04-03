const ORG_URL = import.meta.env.VITE_ARCGIS_ORG_URL || 'https://geocam.maps.arcgis.com';

export function getOrgUrl() {
  return ORG_URL;
}

export function getItemUrl(itemId) {
  return `${ORG_URL}/home/item.html?id=${itemId}`;
}

// Token storage
let cachedToken = null;
let tokenExpiry = null;

export async function generateToken(username, password) {
  const response = await fetch(`${ORG_URL}/sharing/rest/generateToken`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      username,
      password,
      referer: window.location.origin,
      expiration: 20160, // 2 weeks in minutes
      f: 'json',
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || 'Failed to generate token');
  }

  cachedToken = data.token;
  tokenExpiry = data.expires;

  return data;
}

export function getToken() {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }
  return null;
}

export function setToken(token, expires) {
  cachedToken = token;
  tokenExpiry = expires;
}

export function clearToken() {
  cachedToken = null;
  tokenExpiry = null;
}

export async function getSelf(token) {
  const response = await fetch(
    `${ORG_URL}/sharing/rest/community/self?f=json&token=${token}`
  );
  return response.json();
}

export async function getOrganization(token) {
  const response = await fetch(
    `${ORG_URL}/sharing/rest/portals/self?f=json&token=${token}`
  );
  return response.json();
}

export async function getGroups(token, orgId) {
  const response = await fetch(
    `${ORG_URL}/sharing/rest/community/groups?q=orgid:${orgId}&num=100&f=json&token=${token}`
  );
  return response.json();
}

export async function getGroupMembers(token, groupId) {
  const response = await fetch(
    `${ORG_URL}/sharing/rest/community/groups/${groupId}/users?f=json&token=${token}`
  );
  return response.json();
}

export async function searchContent(token, orgId, options = {}) {
  const { type, num = 100, start = 1, q = '' } = options;

  let query = `orgid:${orgId}`;
  if (type) {
    query += ` type:"${type}"`;
  }
  if (q) {
    query += ` ${q}`;
  }

  const params = new URLSearchParams({
    q: query,
    num: num.toString(),
    start: start.toString(),
    sortField: 'modified',
    sortOrder: 'desc',
    f: 'json',
    token,
  });

  const response = await fetch(
    `${ORG_URL}/sharing/rest/search?${params}`
  );
  return response.json();
}

export async function getGroupContent(token, groupId, options = {}) {
  const { num = 100, start = 1 } = options;

  const params = new URLSearchParams({
    num: num.toString(),
    start: start.toString(),
    sortField: 'modified',
    sortOrder: 'desc',
    f: 'json',
    token,
  });

  const response = await fetch(
    `${ORG_URL}/sharing/rest/content/groups/${groupId}?${params}`
  );
  return response.json();
}

export async function getFeatureServiceDetails(token, serviceUrl) {
  const separator = serviceUrl.includes('?') ? '&' : '?';
  const response = await fetch(
    `${serviceUrl}${separator}f=json&token=${token}`
  );
  return response.json();
}

export async function getLayerCount(token, serviceUrl, layerId) {
  const response = await fetch(
    `${serviceUrl}/${layerId}/query?where=1=1&returnCountOnly=true&f=json&token=${token}`
  );
  return response.json();
}

export async function getAllLayerCounts(token, serviceUrl, layers) {
  const counts = await Promise.all(
    layers.map(async (layer) => {
      try {
        const result = await getLayerCount(token, serviceUrl, layer.id);
        return {
          ...layer,
          count: result.count || 0,
        };
      } catch {
        return {
          ...layer,
          count: 0,
        };
      }
    })
  );
  return counts;
}

export function isClickRayTable(name) {
  return name.toLowerCase().includes('_clickrays');
}

// Analyze a single feature service for clickray tables
export async function analyzeServiceForClickrays(token, serviceUrl) {
  try {
    const details = await getFeatureServiceDetails(token, serviceUrl);
    const tables = details.tables || [];
    const layers = details.layers || [];

    const clickrayTables = tables.filter((t) => isClickRayTable(t.name));

    if (clickrayTables.length === 0) {
      return { hasClickrays: false, clickrayTables: [], totalClickrays: 0 };
    }

    // Get counts for clickray tables only
    const tablesWithCounts = await getAllLayerCounts(token, serviceUrl, clickrayTables);
    const totalClickrays = tablesWithCounts.reduce((sum, t) => sum + t.count, 0);

    return {
      hasClickrays: true,
      clickrayTables: tablesWithCounts,
      totalClickrays,
      layerCount: layers.length,
      tableCount: tables.length,
    };
  } catch (err) {
    console.error('Error analyzing service:', serviceUrl, err);
    return { hasClickrays: false, clickrayTables: [], totalClickrays: 0 };
  }
}

// Get item usage statistics
export async function getItemUsage(token, itemId) {
  try {
    const response = await fetch(
      `${ORG_URL}/sharing/rest/content/items/${itemId}/usage?f=json&token=${token}`
    );
    return response.json();
  } catch {
    return { usage: [] };
  }
}

// Get all org members
export async function getOrgMembers(token, orgId) {
  const response = await fetch(
    `${ORG_URL}/sharing/rest/portals/${orgId}/users?f=json&num=100&token=${token}`
  );
  return response.json();
}

export { ORG_URL };
