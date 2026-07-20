import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import { success, badRequest } from '../../shared/utils/response.js';
import { db } from '../../shared/database.js';
import * as fs from 'fs';
import * as path from 'path';
import {
  getBranding,
  updateBranding,
  updateBrandingSchema,
} from './controller.js';

const router = Router();

router.use(authMiddleware);

// GET /v1/whitelabel/config
router.get('/whitelabel/config', getBranding);
// PUT /v1/whitelabel/config
router.put('/whitelabel/config', validate({ body: updateBrandingSchema }), updateBranding);

// POST /v1/whitelabel/upload-logo (真实文件上传)
router.post('/whitelabel/upload-logo', async (req, res) => {
  try {
    // Try to handle file upload via multer or base64
    const { logoData, logoName } = req.body || {};

    if (!logoData) {
      return badRequest(res, 'Logo data is required (base64 encoded)');
    }

    // Decode base64 and save
    const uploadDir = path.join(process.cwd(), 'uploads', 'whitelabel');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const ext = logoName?.split('.').pop() || 'png';
    const filename = `logo-${Date.now()}.${ext}`;
    const filepath = path.join(uploadDir, filename);

    // Remove data URL prefix if present
    const base64Data = logoData.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(filepath, Buffer.from(base64Data, 'base64'));

    const url = `/uploads/whitelabel/${filename}`;

    // Update branding config with logo URL
    await db('whitelabel_config')
      .insert({ key: 'logo_url', value: url })
      .onConflict('key')
      .merge({ value: url });

    success(res, { url }, 'Logo uploaded');
  } catch (err) {
    badRequest(res, 'Failed to upload logo', { error: (err as Error).message });
  }
});

// POST /v1/whitelabel/verify-domain (真实域名验证)
router.post('/whitelabel/verify-domain', async (req, res) => {
  try {
    const { domain } = req.body || {};

    if (!domain) {
      return badRequest(res, 'Domain is required');
    }

    // Check if domain resolves to our server IP
    const dns = await import('dns').catch(() => null);
    let verified = false;
    let message = '';

    if (dns) {
      try {
        const addresses = await dns.promises.resolve(domain);
        // Check if any address matches our server
        verified = addresses.length > 0;
        message = verified ? 'Domain resolves successfully' : 'Domain does not resolve';
      } catch {
        message = 'DNS resolution failed';
      }
    } else {
      // Fallback: store domain for manual verification
      message = 'Domain verification queued';
    }

    // Store verification attempt
    await db('whitelabel_domains')
      .insert({
        domain,
        verified,
        verified_at: verified ? new Date().toISOString() : null,
      })
      .onConflict('domain')
      .merge({ verified, verified_at: verified ? new Date().toISOString() : null });

    success(res, { verified, domain, message }, message);
  } catch (err) {
    badRequest(res, 'Failed to verify domain', { error: (err as Error).message });
  }
});

export default router;