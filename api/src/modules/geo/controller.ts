import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as geoService from './service.js';
import { success, notFound, badRequest } from '../../shared/utils/response.js';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const localRankingsQuerySchema = z.object({
  keyword: z.string().optional(),
  locationCode: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : undefined)),
  languageCode: z.string().optional().default('en'),
});

export const compareLocationsSchema = z.object({
  location1: z.string().min(1),
  location2: z.string().min(1),
});

export const geoGridQuerySchema = z.object({
  lat: z
    .string()
    .min(1, 'Latitude is required')
    .transform((v) => parseFloat(v)),
  lng: z
    .string()
    .min(1, 'Longitude is required')
    .transform((v) => parseFloat(v)),
  radius: z
    .string()
    .optional()
    .transform((v) => (v ? parseFloat(v) : undefined)),
  gridSize: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : undefined)),
});

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export async function getLocalRankings(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const { keyword, locationCode, languageCode } = req.query as unknown as z.infer<
      typeof localRankingsQuerySchema
    >;

    const rankings = await geoService.getLocalRankings(projectId, {
      keyword,
      locationCode,
      languageCode,
    });

    success(res, rankings);
  } catch (err) {
    badRequest(res, 'Failed to fetch local rankings', { error: (err as Error).message });
  }
}

export async function getGMBProfile(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const profile = await geoService.getGMBProfile(projectId);

    if (!profile) {
      notFound(res, 'GMB profile not found for this project');
      return;
    }

    success(res, profile);
  } catch (err) {
    badRequest(res, 'Failed to fetch GMB profile', { error: (err as Error).message });
  }
}

export async function compareLocations(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const { location1, location2 } = req.body as z.infer<typeof compareLocationsSchema>;

    const result = await geoService.compareLocations(projectId, location1, location2);
    success(res, result, 'Location comparison completed');
  } catch (err) {
    badRequest(res, 'Failed to compare locations', { error: (err as Error).message });
  }
}

export async function getReviews(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const result = await geoService.getReviews(projectId);
    success(res, result);
  } catch (err) {
    badRequest(res, 'Failed to fetch GMB reviews', { error: (err as Error).message });
  }
}

export async function getGeoGrid(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const { lat, lng, radius, gridSize } = req.query as unknown as z.infer<
      typeof geoGridQuerySchema
    >;

    const result = await geoService.getGeoGrid(projectId, lat, lng, radius, gridSize);
    success(res, result);
  } catch (err) {
    badRequest(res, 'Failed to fetch geo grid rankings', { error: (err as Error).message });
  }
}

export async function getCategories(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const result = await geoService.getCategories(projectId);
    success(res, result);
  } catch (err) {
    badRequest(res, 'Failed to fetch competitor categories', { error: (err as Error).message });
  }
}

export default {
  getLocalRankings,
  getGMBProfile,
  compareLocations,
  getReviews,
  getGeoGrid,
  getCategories,
};