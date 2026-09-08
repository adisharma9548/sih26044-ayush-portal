import { Request, Response } from 'express';
import { searchUGCDegrees } from '../services/aiService';
import { getCache, setCache } from '../config/redis';

export const getUGCDegrees = async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || '';
    const type = ((req.query.type as string) || 'degree') as 'degree' | 'field';

    const cacheKey = `ugc_search:${type}:${q.toLowerCase().trim()}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return res.json({ data: { suggestions: parsed } });
      } catch {
        // Continue to fresh search if parse fails
      }
    }

    const suggestions = await searchUGCDegrees(q, type);

    // Cache for 24 hours to eliminate redundant load
    await setCache(cacheKey, JSON.stringify(suggestions), 86400);

    res.json({
      data: {
        suggestions,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};
