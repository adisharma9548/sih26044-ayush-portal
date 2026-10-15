import { Request, Response } from 'express';
import { College } from '../models/College';
import {
  searchColleges,
  validateDomain,
  deriveSlugFromDomain,
  getOrDiscoverCollege,
} from '../services/collegeDiscoveryService';
import { recordAuditLog } from '../services/auditService';

/**
 * POST /api/college/search
 * Input: { query, limit }
 * Output: [{ name, domain, location, confidence }]
 */
export const searchCollegeHandler = async (req: Request, res: Response) => {
  try {
    const { query, limit } = req.body;
    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return res.status(400).json({
        error: { code: 'INVALID_QUERY', message: 'A search query of at least 2 characters is required.' },
      });
    }

    const numericLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 25);
    const results = await searchColleges(query.trim(), numericLimit);

    res.json({ data: results });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message || 'College search failed' } });
  }
};

/**
 * POST /api/college/discover
 * Input: { domain }
 * Output: { officialDomain, slug, confidence }
 */
export const discoverCollegeHandler = async (req: Request, res: Response) => {
  try {
    const { domain } = req.body;
    if (!domain || typeof domain !== 'string') {
      return res.status(400).json({
        error: { code: 'DOMAIN_REQUIRED', message: 'Official institution domain is required.' },
      });
    }

    const val = validateDomain(domain);
    if (!val.valid) {
      return res.status(400).json({
        error: { code: 'INVALID_DOMAIN', message: val.reason || 'Invalid institutional domain' },
      });
    }

    const slug = deriveSlugFromDomain(val.domain);

    // Trigger initial discovery/structuring asynchronously or return cached
    const college = await getOrDiscoverCollege(val.domain);

    res.json({
      data: {
        officialDomain: college.officialDomain,
        slug: college.slug,
        confidence: 0.95,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'DISCOVERY_FAILED', message: err.message || 'Discovery failed' } });
  }
};

/**
 * GET /api/college/:slug
 * Output: College document
 */
export const getCollegeBySlugHandler = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({
        error: { code: 'SLUG_REQUIRED', message: 'College slug is required' },
      });
    }

    const cleanSlug = slug.toLowerCase().trim();
    const college = await getOrDiscoverCollege(cleanSlug);

    if (!college) {
      return res.status(404).json({
        error: { code: 'COLLEGE_NOT_FOUND', message: `Institution '${cleanSlug}' could not be discovered or found.` },
      });
    }

    res.json({ data: college });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message || 'Failed to fetch college profile' } });
  }
};

/**
 * POST /api/college/:slug/refresh
 * Forces re-extraction + AI structuring
 */
export const refreshCollegeHandler = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({
        error: { code: 'SLUG_REQUIRED', message: 'College slug is required' },
      });
    }

    const cleanSlug = slug.toLowerCase().trim();
    const refreshed = await getOrDiscoverCollege(cleanSlug, true);

    res.json({
      data: refreshed,
      message: 'Institutional identity successfully refreshed and updated.',
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'REFRESH_FAILED', message: err.message || 'Failed to refresh college profile' } });
  }
};

/**
 * POST /api/college/:slug/claim
 * Input: { verificationMethod }
 * Initiates verification workflow
 */
export const claimCollegeHandler = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { verificationMethod } = req.body;

    const college = await College.findOne({ slug: slug.toLowerCase().trim() });
    if (!college) {
      return res.status(404).json({
        error: { code: 'COLLEGE_NOT_FOUND', message: 'College not found' },
      });
    }

    if (college.verificationStatus === 'VERIFIED') {
      return res.status(400).json({
        error: { code: 'ALREADY_VERIFIED', message: 'This institution has already been verified and claimed.' },
      });
    }

    await recordAuditLog({
      req,
      action: 'INSTITUTION_CLAIM_INITIATED',
      entity: 'College',
      entityId: college._id.toString(),
      status: 'SUCCESS',
      details: { slug: college.slug, verificationMethod: verificationMethod || 'official_email' },
    });

    res.json({
      data: {
        collegeSlug: college.slug,
        verificationMethod: verificationMethod || 'official_email',
        status: 'CLAIM_INITIATED',
        message: 'Verification workflow initiated. Please submit representative details to complete claim onboarding.',
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message || 'Failed to initiate claim' } });
  }
};

/**
 * GET /api/college or GET /api/colleges
 * Lists colleges with optional state, district, type, or search filter
 */
export const listCollegesHandler = async (req: Request, res: Response) => {
  try {
    const { state, district, type, search, limit = '20', page = '1' } = req.query;

    const escapeRegex = (str: string): string => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const filter: any = {};
    if (state && typeof state === 'string') {
      const escapedState = escapeRegex(state.trim());
      filter.$or = [
        { state: { $regex: new RegExp(`^${escapedState}$`, 'i') } },
        { 'location.state': { $regex: new RegExp(`^${escapedState}$`, 'i') } },
      ];
    }
    if (district && typeof district === 'string') {
      filter.district = { $regex: new RegExp(`^${escapeRegex(district.trim())}$`, 'i') };
    }
    if (type && typeof type === 'string') {
      filter.type = { $regex: new RegExp(`^${escapeRegex(type.trim())}$`, 'i') };
    }
    if (search && typeof search === 'string' && search.trim()) {
      const escaped = escapeRegex(search.trim());
      filter.name = { $regex: escaped, $options: 'i' };
    }

    const numericLimit = Math.min(Math.max(parseInt(limit as string, 10) || 20, 1), 100);
    const numericPage = Math.max(parseInt(page as string, 10) || 1, 1);
    const skip = (numericPage - 1) * numericLimit;

    const [colleges, total] = await Promise.all([
      College.find(filter).sort({ name: 1 }).skip(skip).limit(numericLimit).lean(),
      College.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: colleges,
      pagination: {
        page: numericPage,
        limit: numericLimit,
        total,
        totalPages: Math.ceil(total / numericLimit),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

/**
 * POST /api/colleges/request
 * Input: { name, state, district, city, website, contactEmail, type }
 * Allows students and institutions to request onboarding of an unlisted college
 */
export const requestCollegeHandler = async (req: any, res: Response) => {
  try {
    const { name, state, district, city, website, contactEmail, type } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length < 3) {
      return res.status(400).json({
        error: { code: 'INVALID_NAME', message: 'Institution name of at least 3 characters is required.' },
      });
    }

    const cleanName = name.trim();
    let baseSlug = cleanName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);

    if (!baseSlug) baseSlug = 'institution';

    let uniqueSlug = baseSlug;
    let counter = 1;
    while (await College.findOne({ slug: uniqueSlug })) {
      uniqueSlug = `${baseSlug}-${counter++}`;
    }

    const college = new College({
      name: cleanName,
      slug: uniqueSlug,
      type: type || 'General',
      state: state || '',
      district: district || '',
      city: city || '',
      source: 'user_request',
      requestedBy: req.user?.id,
      verificationStatus: 'user_submitted',
      location: {
        state: state || '',
        district: district || '',
        city: city || '',
        country: 'India',
        address: [city, district, state].filter(Boolean).join(', '),
      },
      contact: {
        email: contactEmail || '',
        website: website || '',
      },
      about: `Institution profile requested by user. Verification pending.`,
      sources: [
        {
          field: 'user_request',
          sourceType: 'user_request',
          fetchedAt: new Date(),
        },
      ],
    });

    await college.save();

    await recordAuditLog({
      req,
      action: 'COLLEGE_REQUEST_SUBMITTED',
      entity: 'College',
      entityId: college._id.toString(),
      status: 'SUCCESS',
      details: { name: cleanName, slug: uniqueSlug, requestedBy: req.user?.id },
    }).catch(() => {});

    return res.status(201).json({
      success: true,
      message: 'College request successfully submitted for review.',
      data: college,
    });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

