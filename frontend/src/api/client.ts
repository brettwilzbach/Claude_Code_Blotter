/**
 * API client for hedge analytics backend
 */
import axios from 'axios';
import type {
  AggRow,
  RollupResponse,
  HealthResponse,
  AggTableQueryParams,
} from './types';

// Get API base URL from environment variable
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

/**
 * Fetch aggregate hedge table with optional filters
 */
export async function fetchAggTable(
  params?: AggTableQueryParams
): Promise<AggRow[]> {
  const response = await apiClient.get<AggRow[]>('/api/agg-table', {
    params,
  });
  return response.data;
}

/**
 * Fetch rollup header with totals and grouped metrics
 */
export async function fetchRollup(): Promise<RollupResponse> {
  const response = await apiClient.get<RollupResponse>('/api/rollup');
  return response.data;
}

/**
 * Fetch sample rows for quick preview
 */
export async function fetchSample(limit: number = 20): Promise<AggRow[]> {
  const response = await apiClient.get<AggRow[]>('/api/sample', {
    params: { limit },
  });
  return response.data;
}

/**
 * Health check
 */
export async function fetchHealth(): Promise<HealthResponse> {
  const response = await apiClient.get<HealthResponse>('/api/health');
  return response.data;
}

/**
 * Force refresh data from backend
 */
export async function refreshData(): Promise<void> {
  await apiClient.post('/api/refresh');
}

/**
 * Save manual trade entry
 */
export async function saveTrade(tradeData: any): Promise<void> {
  await apiClient.post('/api/trade', tradeData);
}

export default apiClient;
