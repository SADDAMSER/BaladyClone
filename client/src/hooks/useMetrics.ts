import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/auth/useAuth';
import { apiRequest } from '@/lib/queryClient';

/**
 * Frontend Performance Metrics Collection Hook
 * جمع مؤشرات الأداء من الواجهة الأمامية
 */

export interface MetricData {
  metricName: string;
  metricType: 'counter' | 'gauge' | 'timer' | 'histogram';
  metricCategory: 'performance' | 'user_action' | 'error' | 'business';
  value: string;
  unit: string;
  userId?: string;
  sessionId?: string;
  deviceInfo?: {
    userAgent: string;
    language: string;
    platform: string;
    viewport: { width: number; height: number };
  };
  geographic?: {
    governorateId?: string;
    districtId?: string;
  };
  contextMetadata?: Record<string, any>;
}

export interface PerformanceTiming {
  navigationStart: number;
  domContentLoaded: number;
  loadComplete: number;
  firstPaint?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  firstInputDelay?: number;
  cumulativeLayoutShift?: number;
}

export function useMetrics() {
  const { user } = useAuth();
  const metricsQueue = useRef<MetricData[]>([]);
  const sessionId = useRef<string>(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const isFlushingRef = useRef<boolean>(false);

  // Device and session info collection
  const getDeviceInfo = useCallback(() => ({
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    }
  }), []);

  // Core metric recording function
  const recordMetric = useCallback(async (metricData: Omit<MetricData, 'userId' | 'sessionId' | 'deviceInfo'>) => {
    const enrichedMetric: MetricData = {
      ...metricData,
      userId: user?.id,
      sessionId: sessionId.current,
      deviceInfo: getDeviceInfo()
    };

    // Add to queue for batch processing
    metricsQueue.current.push(enrichedMetric);

    // Auto-flush for critical metrics
    if (metricData.metricCategory === 'error' || metricsQueue.current.length >= 10) {
      await flushMetrics();
    }
  }, [user?.id, getDeviceInfo]);

  // Batch flush metrics to backend
  const flushMetrics = useCallback(async () => {
    if (isFlushingRef.current || metricsQueue.current.length === 0) return;

    isFlushingRef.current = true;
    const metricsToFlush = [...metricsQueue.current];
    metricsQueue.current = [];

    try {
      await apiRequest('/api/monitoring/metrics/batch', 'POST', {
        metrics: metricsToFlush,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.warn('Failed to flush metrics:', error);
      // Re-queue failed metrics (avoid infinite loop)
      if (metricsQueue.current.length < 50) {
        metricsQueue.current.unshift(...metricsToFlush.slice(0, 20));
      }
    } finally {
      isFlushingRef.current = false;
    }
  }, []);

  // Performance timing collection
  const recordPageLoad = useCallback(async (pageName: string) => {
    // Get performance timing data
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');
    
    if (navigation) {
      const timing: PerformanceTiming = {
        navigationStart: navigation.fetchStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
        loadComplete: navigation.loadEventEnd - navigation.fetchStart,
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime
      };

      await recordMetric({
        metricName: 'page_load_time',
        metricType: 'timer',
        metricCategory: 'performance',
        value: timing.loadComplete.toString(),
        unit: 'milliseconds',
        contextMetadata: { pageName, timing }
      });

      await recordMetric({
        metricName: 'dom_content_loaded',
        metricType: 'timer',
        metricCategory: 'performance',
        value: timing.domContentLoaded.toString(),
        unit: 'milliseconds',
        contextMetadata: { pageName }
      });

      if (timing.firstContentfulPaint) {
        await recordMetric({
          metricName: 'first_contentful_paint',
          metricType: 'timer',
          metricCategory: 'performance',
          value: timing.firstContentfulPaint.toString(),
          unit: 'milliseconds',
          contextMetadata: { pageName }
        });
      }
    }
  }, [recordMetric]);

  // API call performance tracking
  const recordApiCall = useCallback(async (endpoint: string, method: string, duration: number, status: number, success: boolean) => {
    await recordMetric({
      metricName: 'api_call_duration',
      metricType: 'timer',
      metricCategory: 'performance',
      value: duration.toString(),
      unit: 'milliseconds',
      contextMetadata: { endpoint, method, status, success }
    });

    await recordMetric({
      metricName: success ? 'api_call_success' : 'api_call_error',
      metricType: 'counter',
      metricCategory: success ? 'performance' : 'error',
      value: '1',
      unit: 'count',
      contextMetadata: { endpoint, method, status }
    });
  }, [recordMetric]);

  // User action tracking
  const recordUserAction = useCallback(async (action: string, component: string, metadata?: Record<string, any>) => {
    await recordMetric({
      metricName: 'user_action',
      metricType: 'counter',
      metricCategory: 'user_action',
      value: '1',
      unit: 'count',
      contextMetadata: { action, component, ...metadata }
    });
  }, [recordMetric]);

  // Error tracking
  const recordError = useCallback(async (errorType: string, errorMessage: string, stack?: string, metadata?: Record<string, any>) => {
    await recordMetric({
      metricName: 'frontend_error',
      metricType: 'counter',
      metricCategory: 'error',
      value: '1',
      unit: 'count',
      contextMetadata: { errorType, errorMessage, stack, ...metadata }
    });
  }, [recordMetric]);

  // Business metrics
  const recordBusinessMetric = useCallback(async (metricName: string, value: string, unit: string, metadata?: Record<string, any>) => {
    await recordMetric({
      metricName,
      metricType: 'gauge',
      metricCategory: 'business',
      value,
      unit,
      contextMetadata: metadata
    });
  }, [recordMetric]);

  // Resource performance tracking
  const recordResourceLoad = useCallback(async () => {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    for (const resource of resources.slice(-10)) { // Last 10 resources
      if (resource.name.includes('static') || resource.name.includes('chunk')) {
        await recordMetric({
          metricName: 'resource_load_time',
          metricType: 'timer',
          metricCategory: 'performance',
          value: resource.duration.toString(),
          unit: 'milliseconds',
          contextMetadata: {
            resourceName: resource.name,
            resourceType: resource.initiatorType,
            transferSize: resource.transferSize
          }
        });
      }
    }
  }, [recordMetric]);

  // Memory usage tracking
  const recordMemoryUsage = useCallback(async () => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      await recordMetric({
        metricName: 'memory_usage',
        metricType: 'gauge',
        metricCategory: 'performance',
        value: memory.usedJSHeapSize.toString(),
        unit: 'bytes',
        contextMetadata: {
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit
        }
      });
    }
  }, [recordMetric]);

  // Setup automatic flushing and cleanup
  useEffect(() => {
    // Flush metrics every 30 seconds
    const flushInterval = setInterval(flushMetrics, 30000);

    // Flush metrics when page unloads
    const handleBeforeUnload = () => {
      navigator.sendBeacon('/api/monitoring/metrics/beacon', JSON.stringify({
        metrics: metricsQueue.current,
        timestamp: new Date().toISOString()
      }));
    };

    // Record memory usage every 5 minutes
    const memoryInterval = setInterval(recordMemoryUsage, 300000);

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(flushInterval);
      clearInterval(memoryInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Final flush
      flushMetrics();
    };
  }, [flushMetrics, recordMemoryUsage]);

  // Global error handler
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      recordError(
        'javascript_error',
        event.message,
        event.error?.stack,
        {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      );
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      recordError(
        'unhandled_promise_rejection',
        event.reason?.message || String(event.reason),
        event.reason?.stack,
        { reason: event.reason }
      );
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [recordError]);

  return {
    recordMetric,
    recordPageLoad,
    recordApiCall,
    recordUserAction,
    recordError,
    recordBusinessMetric,
    recordResourceLoad,
    recordMemoryUsage,
    flushMetrics
  };
}