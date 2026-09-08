import { Request, Response } from 'express';
import {
  verifyAndSearchInstitutions,
  getInstitutionPrograms,
  getInstitutionHierarchy,
  validateAcademicHierarchy,
} from '../services/aiService';
import { getCache, setCache } from '../config/redis';

/**
 * GET /api/academic/institutions?q=...
 * Searches and verifies recognized Indian higher education institutions against UGC/AICTE data.
 * Zero hardcoded catalogs or static fallbacks.
 */
export const searchInstitutions = async (req: Request, res: Response) => {
  try {
    const q = ((req.query.q as string) || '').trim();
    if (!q || q.length < 2) {
      return res.json({ data: { institutions: [] } });
    }

    const cacheKey = `academic_inst:${q.toLowerCase()}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return res.json({ data: { institutions: parsed } });
      } catch {
        // Fall through on JSON parse error
      }
    }

    const institutions = await verifyAndSearchInstitutions(q);

    // Cache verified results for 24 hours to prevent redundant AI traffic
    if (institutions.length > 0) {
      await setCache(cacheKey, JSON.stringify(institutions), 86400);
    }

    res.json({ data: { institutions } });
  } catch (err: any) {
    console.error('[Academic Controller] searchInstitutions error:', err.message);
    res.status(500).json({
      error: {
        code: 'VERIFICATION_ERROR',
        message: 'Unable to verify institution at this time. Please try again.',
      },
    });
  }
};

/**
 * GET /api/academic/programs?institution=...&affiliatingUniversity=...
 * Retrieves exact programs verified as offered by the selected institution.
 */
export const getPrograms = async (req: Request, res: Response) => {
  try {
    const institution = ((req.query.institution as string) || '').trim();
    const affiliatingUniversity = ((req.query.affiliatingUniversity as string) || '').trim();

    if (!institution) {
      return res.status(400).json({
        error: {
          code: 'INSTITUTION_REQUIRED',
          message: 'Institution name is required to retrieve verified degree programs.',
        },
      });
    }

    const cacheKey = `academic_prog:${institution.toLowerCase()}:${affiliatingUniversity.toLowerCase()}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return res.json({ data: { programs: parsed } });
      } catch {
        // Fall through
      }
    }

    const programs = await getInstitutionPrograms(institution, affiliatingUniversity || undefined);

    if (programs.length > 0) {
      await setCache(cacheKey, JSON.stringify(programs), 86400);
    }

    res.json({ data: { programs } });
  } catch (err: any) {
    console.error('[Academic Controller] getPrograms error:', err.message);
    res.status(500).json({
      error: {
        code: 'PROGRAMS_FETCH_ERROR',
        message: 'Unable to retrieve verified degree programs at this time.',
      },
    });
  }
};

/**
 * GET /api/academic/hierarchy?institution=...&degree=...
 * Resolves academic field and physical departments & specializations for institution + degree.
 */
export const getHierarchy = async (req: Request, res: Response) => {
  try {
    const institution = ((req.query.institution as string) || '').trim();
    const degree = ((req.query.degree as string) || '').trim();

    if (!institution || !degree) {
      return res.status(400).json({
        error: {
          code: 'PARAMS_REQUIRED',
          message: 'Both institution and degree are required to resolve academic hierarchy.',
        },
      });
    }

    const cacheKey = `academic_hier:${institution.toLowerCase()}:${degree.toLowerCase()}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return res.json({ data: parsed });
      } catch {
        // Fall through
      }
    }

    const hierarchy = await getInstitutionHierarchy(institution, degree);

    if (hierarchy && hierarchy.departments.length > 0) {
      await setCache(cacheKey, JSON.stringify(hierarchy), 86400);
      return res.json({ data: hierarchy });
    }

    // Invalid or unverified combination
    return res.status(404).json({
      data: null,
      error: {
        code: 'INVALID_COMBINATION',
        message:
          'This degree could not be verified as being offered by the selected institution. Please select a valid college or degree/program.',
      },
    });
  } catch (err: any) {
    console.error('[Academic Controller] getHierarchy error:', err.message);
    res.status(500).json({
      error: {
        code: 'HIERARCHY_ERROR',
        message: 'Unable to resolve academic hierarchy at this time.',
      },
    });
  }
};

/**
 * POST /api/academic/validate
 * Validates the complete combination (Institution + Degree + Department + Specialization).
 */
export const validateCombination = async (req: Request, res: Response) => {
  try {
    const { institution, degree, department, specialization } = req.body;

    if (!institution || !degree) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Institution and degree are required for validation.',
        },
      });
    }

    const result = await validateAcademicHierarchy(
      institution,
      degree,
      department,
      specialization
    );

    res.json({ data: result });
  } catch (err: any) {
    console.error('[Academic Controller] validateCombination error:', err.message);
    res.status(500).json({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Unable to validate academic combination at this time.',
      },
    });
  }
};
