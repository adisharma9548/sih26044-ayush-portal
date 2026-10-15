import { Request, Response } from 'express';
import { CareerRole } from '../models/CareerRole';
import { Opportunity } from '../models/Opportunity';
import { SkillProfile } from '../models/SkillProfile';
import { Resume } from '../models/Resume';
import { User } from '../models/User';
import { analyzeSkillGaps } from '../services/skillGapService';
import { AuthRequest } from '../middleware/auth';

/**
 * Retrieves dynamic target career roles: aggregates real employer postings (Opportunity)
 * and genuine national benchmark roles (CareerRole), dynamically scored & recommended
 * for ANY applicant's authentic degree, field of study, and resume skills.
 */
export const getCareerRoles = async (req: AuthRequest, res: Response) => {
  try {
    const { category, search } = req.query;

    // 1. Fetch benchmark career roles from DB
    const benchmarkRoles = await CareerRole.find({ isArchived: { $ne: true } }).lean();

    // 2. Fetch active employer opportunities from DB
    const activeOpps = await Opportunity.find({ status: 'active' }).sort({ createdAt: -1 }).lean();

    // Map active opportunities into target role format
    const oppRoles = activeOpps.map((opp: any) => ({
      _id: opp._id,
      id: opp._id.toString(),
      name: opp.title,
      slug: `opp-${opp._id}`,
      category: opp.ayushDomain || (opp.type === 'internship' ? 'Industry Internships' : 'Industry Placements'),
      description: `${opp.company} • ${opp.type === 'internship' ? 'Internship' : 'Job'} (${opp.location}${opp.isRemote ? ', Remote' : ''}). ${opp.description?.slice(0, 180)}...`,
      source: 'industry_standard',
      company: opp.company,
      location: opp.location,
      type: opp.type,
      stipend: opp.stipend,
      salary: opp.salary,
      isOpportunity: true,
      opportunityId: opp._id.toString(),
      requiredSkills: (opp.skillRequirements && opp.skillRequirements.length > 0)
        ? opp.skillRequirements
        : (opp.skillsRequired || []).map((s: string) => ({
            name: s,
            requiredLevel: 70,
            importance: 'high',
            weight: 1.2,
          })),
      preferredSkills: [],
    }));

    // Combine opportunities and benchmark framework roles
    let allRoles: any[] = [...oppRoles, ...benchmarkRoles.map((r: any) => ({
      ...r,
      id: r._id.toString(),
      isOpportunity: false,
    }))];

    // 3. Dynamic Applicant Context Personalization
    let candidateKeywords: string[] = [];
    const candidateSkillSet = new Set<string>();

    if (req.user) {
      const u = req.user;
      if (u.degree) candidateKeywords.push(u.degree.toLowerCase());
      if (u.department) candidateKeywords.push(u.department.toLowerCase());
      if (u.specialization) candidateKeywords.push(u.specialization.toLowerCase());
      if (Array.isArray(u.skills)) {
        u.skills.forEach((s: string) => candidateSkillSet.add(s.toLowerCase().trim()));
      }

      // Check user's resume
      const userResume = await Resume.findOne({ userId: u._id }).sort({ createdAt: -1 }).lean();
      if (userResume) {
        const confirmedData = userResume.confirmedData || userResume.extractedData;
        if (confirmedData) {
          if (Array.isArray(confirmedData.education)) {
            confirmedData.education.forEach((e: any) => {
              if (e.fieldOfStudy) candidateKeywords.push(e.fieldOfStudy.toLowerCase());
              if (e.degree) candidateKeywords.push(e.degree.toLowerCase());
            });
          }
          if (Array.isArray(confirmedData.skills)) {
            confirmedData.skills.forEach((s: any) => {
              if (s.name) candidateSkillSet.add(s.name.toLowerCase().trim());
            });
          }
        }
      }
    }

    // Score relevance for each role dynamically
    allRoles = allRoles.map((role) => {
      let score = 0;
      const roleText = `${role.name} ${role.category} ${role.description}`.toLowerCase();

      // Check academic / domain keyword overlap
      for (const kw of candidateKeywords) {
        const tokens = kw.split(/[\s,–/()]+/).filter((t) => t.length > 2);
        for (const token of tokens) {
          if (roleText.includes(token)) score += 2;
        }
      }

      // Check skills overlap
      const roleSkills = Array.isArray(role.requiredSkills) ? role.requiredSkills : [];
      let matchedSkillsCount = 0;
      for (const rs of roleSkills) {
        const rsName = (rs.name || rs).toLowerCase().trim();
        if (candidateSkillSet.has(rsName)) {
          score += 3;
          matchedSkillsCount++;
        }
      }

      const isRecommended = score >= 2 || matchedSkillsCount > 0;

      return {
        ...role,
        relevanceScore: score,
        recommended: isRecommended,
        matchedSkillsCount,
      };
    });

    // Sort: Recommended roles first, then by relevance score desc
    allRoles.sort((a, b) => {
      if (a.recommended && !b.recommended) return -1;
      if (!a.recommended && b.recommended) return 1;
      return (b.relevanceScore || 0) - (a.relevanceScore || 0);
    });

    // Filter by Category
    if (category && typeof category === 'string' && category !== 'All') {
      if (category === 'Recommended') {
        allRoles = allRoles.filter((r) => r.recommended);
      } else {
        allRoles = allRoles.filter((r) => r.category === category);
      }
    }

    // Filter by Search Query
    if (search && typeof search === 'string') {
      const q = search.trim().toLowerCase();
      allRoles = allRoles.filter(
        (r) =>
          r.name?.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q) ||
          r.company?.toLowerCase().includes(q) ||
          r.category?.toLowerCase().includes(q)
      );
    }

    return res.json({
      success: true,
      data: allRoles,
      userContext: req.user
        ? {
            name: req.user.name,
            degree: req.user.degree || null,
            department: req.user.department || null,
            specialization: req.user.specialization || null,
            skillsCount: candidateSkillSet.size,
          }
        : null,
    });
  } catch (error: any) {
    return res.status(500).json({ error: { message: error.message } });
  }
};

export const getCareerRoleById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if Opportunity
    if (id.startsWith('opp-')) {
      const oppId = id.replace('opp-', '');
      const opp = await Opportunity.findById(oppId).lean();
      if (!opp) return res.status(404).json({ error: { message: 'Opportunity not found' } });
      return res.json({
        success: true,
        data: {
          id: opp._id.toString(),
          _id: opp._id,
          name: opp.title,
          slug: `opp-${opp._id}`,
          category: opp.ayushDomain || 'Technology & Engineering',
          description: opp.description,
          source: 'industry_standard',
          company: opp.company,
          location: opp.location,
          type: opp.type,
          stipend: opp.stipend,
          salary: opp.salary,
          isOpportunity: true,
          opportunityId: opp._id.toString(),
          requiredSkills: (opp.skillRequirements && opp.skillRequirements.length > 0)
            ? opp.skillRequirements
            : (opp.skillsRequired || []).map((s: string) => ({
                name: s,
                requiredLevel: 70,
                importance: 'high',
                weight: 1.2,
              })),
          preferredSkills: [],
        },
      });
    }

    const role = await CareerRole.findById(id).lean();
    if (role) {
      return res.json({ success: true, data: { ...role, id: role._id.toString() } });
    }

    // Try finding opportunity directly by ObjectId
    const opp = await Opportunity.findById(id).lean();
    if (opp) {
      return res.json({
        success: true,
        data: {
          id: opp._id.toString(),
          _id: opp._id,
          name: opp.title,
          slug: `opp-${opp._id}`,
          category: opp.ayushDomain || 'Technology & Engineering',
          description: opp.description,
          source: 'industry_standard',
          company: opp.company,
          location: opp.location,
          type: opp.type,
          stipend: opp.stipend,
          salary: opp.salary,
          isOpportunity: true,
          opportunityId: opp._id.toString(),
          requiredSkills: (opp.skillRequirements && opp.skillRequirements.length > 0)
            ? opp.skillRequirements
            : (opp.skillsRequired || []).map((s: string) => ({
                name: s,
                requiredLevel: 70,
                importance: 'high',
                weight: 1.2,
              })),
          preferredSkills: [],
        },
      });
    }

    return res.status(404).json({ error: { message: 'Career target role not found' } });
  } catch (error: any) {
    return res.status(500).json({ error: { message: error.message } });
  }
};

/**
 * Performs target career role skill gap analysis for the authenticated student.
 * Compares student's actual assessed and confirmed skills against the role's required skills.
 */
export const analyzeTargetRoleGap = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: { message: 'Authentication required' } });
    }

    const { roleId, roleSlug, opportunityId } = req.body;
    if (!roleId && !roleSlug && !opportunityId) {
      return res.status(400).json({ error: { message: 'roleId, roleSlug, or opportunityId is required' } });
    }

    let targetRole: any = null;

    // 1. Resolve Opportunity if target is an employer posting
    const targetOppId = opportunityId || (roleId && roleId.toString().startsWith('opp-') ? roleId.replace('opp-', '') : null);
    if (targetOppId) {
      const opp = await Opportunity.findById(targetOppId).lean();
      if (opp) {
        targetRole = {
          id: opp._id.toString(),
          _id: opp._id,
          name: opp.title,
          category: opp.ayushDomain || (opp.type === 'internship' ? 'Industry Internships' : 'Industry Placements'),
          description: `${opp.company} • ${opp.type === 'internship' ? 'Internship' : 'Job'} in ${opp.location}. ${opp.description}`,
          source: 'industry_standard',
          company: opp.company,
          location: opp.location,
          type: opp.type,
          stipend: opp.stipend,
          salary: opp.salary,
          isOpportunity: true,
          opportunityId: opp._id.toString(),
          requiredSkills: (opp.skillRequirements && opp.skillRequirements.length > 0)
            ? opp.skillRequirements
            : (opp.skillsRequired || []).map((s: string) => ({
                name: s,
                requiredLevel: 70,
                importance: 'high',
                weight: 1.2,
              })),
          preferredSkills: [],
        };
      }
    }

    // 2. Resolve CareerRole if not an opportunity
    if (!targetRole) {
      const role = roleId
        ? await CareerRole.findById(roleId).lean()
        : await CareerRole.findOne({ slug: roleSlug }).lean();

      if (role) {
        targetRole = {
          ...role,
          id: role._id.toString(),
          isOpportunity: false,
        };
      } else {
        // Fallback: try checking Opportunity by ID directly
        const opp = await Opportunity.findById(roleId).lean();
        if (opp) {
          targetRole = {
            id: opp._id.toString(),
            _id: opp._id,
            name: opp.title,
            category: opp.ayushDomain || 'Technology & Engineering',
            description: `${opp.company} • ${opp.type === 'internship' ? 'Internship' : 'Job'} in ${opp.location}. ${opp.description}`,
            source: 'industry_standard',
            company: opp.company,
            location: opp.location,
            type: opp.type,
            stipend: opp.stipend,
            salary: opp.salary,
            isOpportunity: true,
            opportunityId: opp._id.toString(),
            requiredSkills: (opp.skillRequirements && opp.skillRequirements.length > 0)
              ? opp.skillRequirements
              : (opp.skillsRequired || []).map((s: string) => ({
                  name: s,
                  requiredLevel: 70,
                  importance: 'high',
                  weight: 1.2,
                })),
            preferredSkills: [],
          };
        }
      }
    }

    if (!targetRole) {
      return res.status(404).json({ error: { message: 'Specified career role or opportunity does not exist' } });
    }

    // 3. Retrieve student's authentic skills:
    // A) Diagnostic Assessment skills from SkillProfile
    const profile = await SkillProfile.findOne({ userId });
    const profileSkills = profile ? [...profile.skills] : [];

    // B) Genuine confirmed skills extracted from authenticated uploaded resume
    const resume = await Resume.findOne({ userId }).sort({ createdAt: -1 });
    const resumeSkills = (resume?.confirmedData?.skills || resume?.extractedData?.skills || []).map((s: any) => ({
      name: s.name,
      level: typeof s.level === 'number' ? s.level : 70,
      category: s.category || 'Software',
      verified: false,
      verificationStatus: 'unverified',
      source: 'resume',
    }));

    // Combine skills, prioritizing assessed proctored skill ratings
    const combinedSkillMap = new Map<string, any>();
    for (const rs of resumeSkills) {
      combinedSkillMap.set(rs.name.toLowerCase().trim(), rs);
    }
    for (const ps of profileSkills) {
      combinedSkillMap.set(ps.name.toLowerCase().trim(), ps);
    }
    const studentSkills = Array.from(combinedSkillMap.values());

    // 4. Run data-driven gap analysis against role requirements
    const analysisResult = await analyzeSkillGaps(studentSkills, targetRole.requiredSkills);

    // Also compute preferred skills compatibility if available
    let preferredAnalysis: any = null;
    if (targetRole.preferredSkills && targetRole.preferredSkills.length > 0) {
      preferredAnalysis = await analyzeSkillGaps(studentSkills, targetRole.preferredSkills);
    }

    return res.json({
      success: true,
      data: {
        role: targetRole,
        analysis: analysisResult,
        preferredAnalysis,
        resumeMetadata: {
          hasResume: !!resume,
          filename: resume?.originalFilename || null,
          uploadedAt: resume?.uploadedAt || null,
          skillsCount: resumeSkills.length,
          fieldOfStudy: resume?.confirmedData?.education?.[0]?.fieldOfStudy || resume?.extractedData?.education?.[0]?.fieldOfStudy || null,
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: { message: error.message } });
  }
};
