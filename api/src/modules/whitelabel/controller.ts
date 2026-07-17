import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as whitelabelService from './service.js';
import {
  success, badRequest,
} from '../../shared/utils/response.js';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const updateBrandingSchema = z.object({
  brand_name: z.string().min(1).max(200).optional(),
  logo_url: z.string().url().optional(),
  primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  secondary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  custom_domain: z.string().optional().nullable(),
  favicon_url: z.string().url().optional().nullable(),
  custom_css: z.string().optional().nullable(),
  custom_js: z.string().optional().nullable(),
  email_template: z.string().optional().nullable(),
});

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export async function getBranding(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;

    const branding = await whitelabelService.getBranding(projectId);
    success(res, branding ?? { brand_name: 'Crane SEO', logo_url: '/logo.png', primary_color: '#2563eb' });
  } catch (err) {
    badRequest(res, 'Failed to get branding', { error: (err as Error).message });
  }
}

export async function updateBranding(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const data = req.body as z.infer<typeof updateBrandingSchema>;

    const branding = await whitelabelService.updateBranding(projectId, data);
    success(res, branding, 'Branding updated successfully');
  } catch (err) {
    badRequest(res, 'Failed to update branding', { error: (err as Error).message });
  }
}

export default {
  getBranding,
  updateBranding,
};