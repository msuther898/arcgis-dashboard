import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { analyzeServiceForClickrays } from '../services/arcgis';

export function useClickrayAnalysis(token, featureServices) {
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, currentService: '' });
  const [runKey, setRunKey] = useState(0);
  const abortRef = useRef(false);
  const pausedRef = useRef(false);

  // Create stable dependency key
  const serviceIds = useMemo(() => {
    return featureServices?.map(s => s.id).join(',') || '';
  }, [featureServices]);

  const pause = useCallback(() => {
    pausedRef.current = true;
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    pausedRef.current = false;
    setIsPaused(false);
  }, []);

  const stop = useCallback(() => {
    abortRef.current = true;
    pausedRef.current = false;
    setIsPaused(false);
    setIsLoading(false);
  }, []);

  const rerun = useCallback(() => {
    abortRef.current = true;
    pausedRef.current = false;
    setIsPaused(false);
    setAnalysis(null);
    setRunKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!token || !featureServices || featureServices.length === 0) {
      setAnalysis(null);
      setIsLoading(false);
      return;
    }

    abortRef.current = false;
    pausedRef.current = false;
    setIsLoading(true);
    setIsPaused(false);
    setProgress({ current: 0, total: featureServices.length, currentService: '' });

    const waitWhilePaused = () => {
      return new Promise((resolve) => {
        const check = () => {
          if (abortRef.current) {
            resolve();
          } else if (!pausedRef.current) {
            resolve();
          } else {
            setTimeout(check, 200);
          }
        };
        check();
      });
    };

    const runAnalysis = async () => {
      const results = [];
      const batchSize = 3;

      for (let i = 0; i < featureServices.length; i += batchSize) {
        // Wait if paused
        await waitWhilePaused();
        if (abortRef.current) break;

        const batch = featureServices.slice(i, i + batchSize);

        setProgress({
          current: i,
          total: featureServices.length,
          currentService: batch.map(s => s.title).join(', '),
        });

        const batchResults = await Promise.all(
          batch.map(async (service) => {
            try {
              const result = await analyzeServiceForClickrays(token, service.url);
              return {
                serviceId: service.id,
                serviceName: service.title,
                serviceUrl: service.url,
                ...result,
              };
            } catch (err) {
              console.error('Error analyzing', service.title, err);
              return {
                serviceId: service.id,
                serviceName: service.title,
                hasClickrays: false,
                clickrayTables: [],
                totalClickrays: 0,
              };
            }
          })
        );

        results.push(...batchResults);

        // Update with partial results
        const servicesWithClickrays = results.filter((r) => r.hasClickrays);
        const totalClickrays = results.reduce((sum, r) => sum + (r.totalClickrays || 0), 0);
        const allClickrayTables = [];
        servicesWithClickrays.forEach((service) => {
          service.clickrayTables?.forEach((table) => {
            allClickrayTables.push({
              ...table,
              serviceName: service.serviceName,
              serviceId: service.serviceId,
            });
          });
        });

        setAnalysis({
          totalClickrays,
          servicesWithClickrays: servicesWithClickrays.length,
          totalServicesAnalyzed: results.length,
          clickrayTables: allClickrayTables,
          serviceDetails: servicesWithClickrays,
          isPartial: i + batchSize < featureServices.length,
        });
      }

      if (!abortRef.current) {
        setProgress({ current: featureServices.length, total: featureServices.length, currentService: '' });
      }
      setIsLoading(false);
    };

    runAnalysis();

    return () => {
      abortRef.current = true;
    };
  }, [token, serviceIds, featureServices, runKey]);

  return { data: analysis, isLoading, isPaused, progress, pause, resume, stop, rerun };
}
