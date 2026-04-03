import { useQuery } from '@tanstack/react-query';
import { getFeatureServiceDetails, getAllLayerCounts, isClickRayTable } from '../services/arcgis';

export function useFeatureService(token, serviceUrl, enabled = true) {
  return useQuery({
    queryKey: ['featureService', serviceUrl],
    queryFn: async () => {
      const details = await getFeatureServiceDetails(token, serviceUrl);

      const layers = details.layers || [];
      const tables = details.tables || [];

      // Get counts for all layers and tables
      const [layersWithCounts, tablesWithCounts] = await Promise.all([
        getAllLayerCounts(token, serviceUrl, layers),
        getAllLayerCounts(token, serviceUrl, tables),
      ]);

      // Identify clickray tables
      const clickrayTables = tablesWithCounts.filter((t) =>
        isClickRayTable(t.name)
      );

      const totalFeatures = layersWithCounts.reduce((sum, l) => sum + l.count, 0);
      const totalClickrays = clickrayTables.reduce((sum, t) => sum + t.count, 0);

      return {
        ...details,
        layers: layersWithCounts,
        tables: tablesWithCounts,
        clickrayTables,
        totalFeatures,
        totalClickrays,
        hasClickrays: clickrayTables.length > 0,
      };
    },
    enabled: !!token && !!serviceUrl && enabled,
    staleTime: 5 * 60 * 1000,
  });
}
