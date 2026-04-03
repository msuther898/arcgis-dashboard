import { useQuery } from '@tanstack/react-query';
import { searchContent, getGroupContent } from '../services/arcgis';

export function useContent(token, orgId, options = {}) {
  const { type, groupId } = options;

  return useQuery({
    queryKey: ['content', orgId, type, groupId],
    queryFn: async () => {
      if (groupId) {
        const data = await getGroupContent(token, groupId);
        return data.items || [];
      }

      const data = await searchContent(token, orgId, { type });
      return data.results || [];
    },
    enabled: !!token && !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAllContent(token, orgId) {
  return useQuery({
    queryKey: ['allContent', orgId],
    queryFn: async () => {
      // Fetch all content with pagination
      let allResults = [];
      let start = 1;
      let hasMore = true;

      while (hasMore) {
        const data = await searchContent(token, orgId, { num: 100, start });
        const results = data.results || [];
        allResults = [...allResults, ...results];

        if (results.length < 100 || data.nextStart === -1) {
          hasMore = false;
        } else {
          start = data.nextStart;
        }
      }

      return allResults;
    },
    enabled: !!token && !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}
