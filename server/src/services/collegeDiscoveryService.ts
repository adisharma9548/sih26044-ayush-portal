import { College, ICollege } from '../models/College';
import { callGroq } from './aiClient';

export interface CollegeSearchResult {
  name: string;
  domain: string;
  location: string;
  confidence: number;
}

/**
 * Derives a clean, consistent URL slug from an educational domain.
 * Examples:
 *   rkgit.edu.in -> rkgit
 *   iitb.ac.in -> iitb
 *   mit.edu -> mit
 *   subdomain.du.ac.in -> du
 */
export const deriveSlugFromDomain = (rawDomain: string): string => {
  let domain = rawDomain.toLowerCase().trim();
  // Strip protocol and path if present
  domain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
  
  const parts = domain.split('.').filter(Boolean);
  if (parts.length === 0) return 'college';

  // Suffixes commonly used by institutions
  const commonSuffixes = new Set([
    'edu.in', 'ac.in', 'res.in', 'gov.in', 'org.in', 'ernet.in',
    'edu', 'ac', 'org', 'in', 'com', 'net', 'co.in'
  ]);

  // Try matching 2-part TLD (e.g. edu.in)
  if (parts.length >= 3) {
    const twoPart = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
    if (commonSuffixes.has(twoPart)) {
      return parts[parts.length - 3].toLowerCase().replace(/[^a-z0-9-]/g, '');
    }
  }

  // Single-part TLD (e.g. .edu, .in)
  if (parts.length >= 2) {
    const singlePart = parts[parts.length - 1];
    if (commonSuffixes.has(singlePart)) {
      return parts[parts.length - 2].toLowerCase().replace(/[^a-z0-9-]/g, '');
    }
  }

  return parts[0].toLowerCase().replace(/[^a-z0-9-]/g, '');
};

export const deriveCollegeSlug = deriveSlugFromDomain;

/**
 * Checks if a hostname resolves to a private, loopback, or cloud-metadata address (OWASP SSRF defense).
 */
export const isPrivateOrRestrictedHost = (hostname: string): boolean => {
  const lower = (hostname || '').toLowerCase().trim();
  if (
    !lower ||
    lower === 'localhost' ||
    lower.endsWith('.localhost') ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal') ||
    lower.endsWith('.arpa') ||
    lower === '127.0.0.1' ||
    lower === '0.0.0.0' ||
    lower === '::1' ||
    lower === '169.254.169.254' ||
    lower.startsWith('127.') ||
    lower.startsWith('10.') ||
    lower.startsWith('192.168.') ||
    lower.startsWith('169.254.')
  ) {
    return true;
  }
  const m = lower.match(/^172\.(\d{1,3})\./);
  if (m) {
    const octet = parseInt(m[1], 10);
    if (octet >= 16 && octet <= 31) return true;
  }
  return false;
};

/**
 * Normalizes and validates whether an input string is a valid educational or institutional domain.
 */
export const validateDomain = (input: string): { valid: boolean; domain: string; reason?: string } => {
  if (!input || typeof input !== 'string') {
    return { valid: false, domain: '', reason: 'Domain is required' };
  }

  let clean = input.toLowerCase().trim();
  clean = clean.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
  clean = clean.replace(/:\d+$/, ''); // strip port

  if (isPrivateOrRestrictedHost(clean)) {
    return { valid: false, domain: clean, reason: 'Restricted or internal network address' };
  }

  // Basic FQDN regex
  const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;
  if (!domainRegex.test(clean)) {
    return { valid: false, domain: clean, reason: 'Invalid domain format' };
  }

  // Institutional or college domain patterns
  const eduSuffixes = ['.edu.in', '.ac.in', '.edu', '.res.in', '.ernet.in', '.gov.in', '.org.in', '.org', '.in'];
  const hasEduSuffix = eduSuffixes.some((s) => clean.endsWith(s));

  if (!hasEduSuffix) {
    return {
      valid: false,
      domain: clean,
      reason: 'Domain must belong to an educational or recognized institutional provider (.edu.in, .ac.in, .edu, etc.)',
    };
  }

  return { valid: true, domain: clean };
};

/**
 * Safely fetches text content from the college's official website.
 * Follows redirects, respects a 10s timeout, and extracts clean text without scripts or styles.
 */
export const fetchCollegeWebsiteText = async (domain: string): Promise<{ title: string; text: string; url: string }> => {
  const check = validateDomain(domain);
  if (!check.valid) {
    return {
      title: domain,
      text: `Educational institution domain: ${domain}.`,
      url: `https://${domain}`,
    };
  }

  const targetUrl = `https://${check.domain}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(targetUrl, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 NodalConnectorBot/1.0',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    clearTimeout(timeoutId);

    // SSRF Check after redirect: verify the final destination host is not private/restricted
    if (res.url) {
      try {
        const finalHost = new URL(res.url).hostname;
        if (isPrivateOrRestrictedHost(finalHost)) {
          throw new Error(`Redirect to restricted internal host: ${finalHost}`);
        }
      } catch (uErr: any) {
        throw new Error(`Invalid destination URL after redirect: ${uErr.message}`);
      }
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from ${targetUrl}`);
    }

    const html = await res.text();

    // Extract title tag
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const rawTitle = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : domain;

    // Strip scripts, styles, SVG, noscript
    let clean = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<svg[\s\S]*?<\/svg>/gi, '')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\s+/g, ' ')
      .trim();

    // Truncate to first 6,000 characters to keep LLM context clean and focused
    clean = clean.slice(0, 6000);

    return {
      title: rawTitle,
      text: clean,
      url: targetUrl,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.warn(`[College Discovery] Could not fetch ${targetUrl} directly:`, err.message);
    return {
      title: domain,
      text: `Official website: ${targetUrl}. Educational Institution registered under domain ${domain}.`,
      url: targetUrl,
    };
  }
};

/**
 * Uses the server-side AI model to structure college website data into the College schema.
 * Enforces:
 *   - No invented courses, companies, stats, or accreditations
 *   - Unknown fields set to null, [] or 'Not available'
 *   - Sources array populated
 */
export const structureCollegeDataWithAI = async (
  domain: string,
  websiteText: string,
  pageTitle: string
): Promise<Partial<ICollege>> => {
  const prompt = `
Analyze the official institutional website content below for the domain "${domain}" (Page title: "${pageTitle}").
Extract real verified institutional information into structured JSON.

CRITICAL INTEGRITY INSTRUCTIONS:
- Do NOT invent or hallucinate any courses, companies, statistics, accreditations, or placement records.
- If any section or field is unknown or not explicitly documented in the content, return null, an empty array [], or "Not available".
- Ensure the institutional name is clean and complete (e.g. "Raj Kumar Goel Institute of Technology" or "Indian Institute of Technology Bombay").

Return strictly valid JSON with these keys:
{
  "name": "Full College Name",
  "about": "Brief 2-3 paragraph summary of the institution or 'Not available'",
  "departments": [
    { "name": "Department Name", "code": "DEPT" }
  ],
  "programs": [
    { "name": "Program Name (e.g. B.Tech Computer Science)", "level": "Undergraduate/Postgraduate", "duration": "4 Years" }
  ],
  "skills": ["Skill 1", "Skill 2"],
  "opportunities": [
    { "title": "Opportunity Name", "type": "Research/Internship/Grant", "description": "Brief info" }
  ],
  "collaborations": [
    { "partner": "Organization Name", "type": "MoU/Academic/Industry" }
  ],
  "placements": [
    { "company": "Recruiter Name", "year": "2024" }
  ],
  "location": {
    "address": "Full street address or city",
    "city": "City name",
    "state": "State name",
    "country": "India"
  },
  "contact": {
    "email": "Official contact email",
    "phone": "Official telephone",
    "website": "https://${domain}"
  }
}

Website Content:
"""
${websiteText}
"""
`;

  try {
    const structured = await callGroq(
      prompt,
      'You are a strict institutional data extractor for university accredited bodies. Only extract factual data present in the text. Return valid JSON only.'
    );

    return {
      name: structured.name || pageTitle || domain,
      about: structured.about || '',
      departments: Array.isArray(structured.departments) ? structured.departments : [],
      programs: Array.isArray(structured.programs) ? structured.programs : [],
      skills: Array.isArray(structured.skills) ? structured.skills : [],
      opportunities: Array.isArray(structured.opportunities) ? structured.opportunities : [],
      collaborations: Array.isArray(structured.collaborations) ? structured.collaborations : [],
      placements: Array.isArray(structured.placements) ? structured.placements : [],
      location: structured.location || {},
      contact: structured.contact || { website: `https://${domain}` },
    };
  } catch (err: any) {
    console.warn('[College Discovery AI Notice]: AI structured extraction fallback:', err.message);

    // Deterministic fallback if AI is unavailable or fails
    const cleanName = pageTitle && pageTitle.length > 3 && !pageTitle.includes('403') && !pageTitle.includes('404')
      ? pageTitle.split(/[-–|]/)[0].trim()
      : domain.split('.')[0].toUpperCase();

    return {
      name: cleanName,
      about: `Accredited Higher Education Institution operating under domain ${domain}.`,
      departments: [],
      programs: [],
      skills: [],
      opportunities: [],
      collaborations: [],
      placements: [],
      location: { country: 'India' },
      contact: { website: `https://${domain}` },
    };
  }
};

/**
 * Searches existing colleges in MongoDB and generates prospective candidate institutions if not found.
 */
export const searchColleges = async (
  query: string,
  limit: number = 10
): Promise<CollegeSearchResult[]> => {
  const cleanQ = (query || '').trim();
  if (!cleanQ || cleanQ.length < 2) return [];

  const escapedQ = cleanQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const results: CollegeSearchResult[] = [];

  // 1. Search existing MongoDB College records
  const existingDocs = await College.find({
    $or: [
      { name: { $regex: escapedQ, $options: 'i' } },
      { slug: { $regex: escapedQ, $options: 'i' } },
      { officialDomain: { $regex: escapedQ, $options: 'i' } },
    ],
  })
    .limit(limit)
    .lean();

  for (const doc of existingDocs) {
    const loc = doc.location?.city ? `${doc.location.city}, ${doc.location.state || 'India'}` : 'India';
    results.push({
      name: doc.name,
      domain: doc.officialDomain || '',
      location: loc,
      confidence: 1.0,
    });
  }

  // 2. If results are fewer than requested limit, generate AI candidates
  if (results.length < limit) {
    try {
      const aiPrompt = `
Generate up to ${limit - results.length} recognized Indian higher education institutions matching the query "${cleanQ}".
For each institution, provide:
- "name": Official full institution name
- "domain": Official educational web domain (e.g. rkgit.edu.in, iitb.ac.in, du.ac.in)
- "location": City and State
- "confidence": Float between 0.70 and 0.99

Do not repeat any of these already matched domains: ${JSON.stringify(results.map((r) => r.domain))}

Return strictly a JSON array of objects:
[
  { "name": "...", "domain": "...", "location": "...", "confidence": 0.95 }
]
`;
      const aiCandidates = await callGroq(
        aiPrompt,
        'You are a national university directory registry. Return valid JSON array only.'
      );

      if (Array.isArray(aiCandidates)) {
        for (const cand of aiCandidates) {
          if (cand && cand.name && cand.domain) {
            const val = validateDomain(cand.domain);
            if (val.valid && !results.some((r) => r.domain === val.domain)) {
              results.push({
                name: cand.name.trim(),
                domain: val.domain,
                location: cand.location || 'India',
                confidence: typeof cand.confidence === 'number' ? cand.confidence : 0.85,
              });
            }
          }
        }
      }
    } catch (err: any) {
      console.warn('[College Search AI Notice]: Could not fetch dynamic candidates:', err.message);
    }
  }

  return results.slice(0, limit);
};

/**
 * Retrieves a college profile by slug or domain.
 * If not cached or older than 24h, triggers dynamic discovery and saves to MongoDB.
 */
export const getOrDiscoverCollege = async (
  slugOrDomain: string,
  forceRefresh: boolean = false
): Promise<ICollege> => {
  const cleanInput = slugOrDomain.toLowerCase().trim();
  const slug = cleanInput.includes('.') ? deriveSlugFromDomain(cleanInput) : cleanInput;

  // 1. Check existing MongoDB document
  const existing = await College.findOne({
    $or: [{ slug }, { officialDomain: cleanInput }],
  });

  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  if (existing && !forceRefresh) {
    const isFresh = existing.lastUpdated && now - new Date(existing.lastUpdated).getTime() < ONE_DAY_MS;
    if (isFresh) {
      return existing;
    }
  }

  // 2. Discover official domain
  let domain: string = (existing && existing.officialDomain) ? existing.officialDomain : cleanInput;
  if (!domain.includes('.')) {
    // If input is just a slug like "rkgit", search for candidate or default to .edu.in
    const candidates = await searchColleges(slug, 3);
    if (candidates.length > 0) {
      domain = candidates[0].domain;
    } else {
      domain = `${slug}.edu.in`;
    }
  }

  const domainVal = validateDomain(domain);
  const officialDomain = domainVal.valid ? domainVal.domain : domain;
  const officialSlug = deriveSlugFromDomain(officialDomain);

  // 3. Fetch college website
  const { title, text, url } = await fetchCollegeWebsiteText(officialDomain);

  // 4. Structure with AI
  const structured = await structureCollegeDataWithAI(officialDomain, text, title);

  const sources = [
    { field: 'officialDomain', sourceUrl: url, sourceType: 'official_website' },
    { field: 'name', sourceUrl: url, sourceType: 'official_website' },
    { field: 'programs', sourceUrl: url, sourceType: 'institutional_catalog' },
    { field: 'departments', sourceUrl: url, sourceType: 'institutional_catalog' },
  ];

  // 5. Upsert into MongoDB
  const collegeDoc = await College.findOneAndUpdate(
    { $or: [{ slug: officialSlug }, { officialDomain }] },
    {
      officialDomain,
      slug: officialSlug,
      name: structured.name || title || officialSlug.toUpperCase(),
      about: structured.about || '',
      departments: structured.departments || [],
      programs: structured.programs || [],
      skills: structured.skills || [],
      opportunities: structured.opportunities || [],
      collaborations: structured.collaborations || [],
      placements: structured.placements || [],
      location: structured.location || {},
      contact: structured.contact || { website: url },
      sources,
      lastUpdated: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return collegeDoc;
};
