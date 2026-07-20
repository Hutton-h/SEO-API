import { apiGet } from './api';

export interface GeoGridPoint {
  lat: number;
  lng: number;
  rank: number;
  rankChange?: number;
}

export interface GeoGridResult {
  center: { lat: number; lng: number };
  radius: number;
  gridSize: number;
  gridPoints: GeoGridPoint[];
  averageRank: number;
  bestRank: number;
  worstRank: number;
}

export interface ReviewsResult {
  businessName: string;
  rating: number;
  totalReviews: number;
  reviews: Array<{
    author: string;
    rating: number;
    text: string;
    time: string;
    response?: string;
  }>;
  ratingDistribution: { '5': number; '4': number; '3': number; '2': number; '1': number };
}

export const geoGridAPI = {
  getGeoGrid: (projectId: string, params: { lat: number; lng: number; radius?: number; gridSize?: number }) =>
    apiGet<GeoGridResult>(`/v1/projects/${projectId}/local-seo/geo-grid`, params),

  getReviews: (projectId: string) =>
    apiGet<ReviewsResult>(`/v1/projects/${projectId}/local-seo/reviews`),
};