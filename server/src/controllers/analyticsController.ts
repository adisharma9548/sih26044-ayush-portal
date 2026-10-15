import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { User } from '../models/User';
import { Application } from '../models/Application';
import { Opportunity } from '../models/Opportunity';
import { College } from '../models/College';
import { AuditLog } from '../models/AuditLog';
import { SkillProfile } from '../models/SkillProfile';

/**
 * GET /api/analytics/student
 * Real calculated metrics for student dashboard.
 */
export const getStudentAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    const userId = user._id.toString();

    // 1. Calculate profile completion percentage (0-100)
    const profileFields = [
      user.name,
      user.email,
      user.institution,
      user.degree,
      user.department,
      user.specialization,
      user.graduationYear,
      user.location,
      user.phone,
      user.bio,
      user.skills && user.skills.length > 0 ? user.skills : null,
      user.profilePicture,
    ];
    const filledCount = profileFields.filter((f) => f !== null && f !== undefined && f !== '').length;
    const profileCompletion = Math.round((filledCount / profileFields.length) * 100);

    // 2. Applications sent and viewed
    const applications = await Application.find({ userId }).lean();
    const applicationsSent = applications.length;
    const applicationsViewed = applications.filter((a) =>
      ['in_review', 'shortlisted', 'interview_scheduled', 'interview_completed', 'offered', 'rejected'].includes(a.status)
    ).length;

    // 3. Interview success rate (if >= 2 interviews)
    const interviews = applications.filter((a) =>
      ['interview_scheduled', 'interview_completed', 'offered'].includes(a.status)
    );
    let interviewSuccessRate: number | null = null;
    if (interviews.length >= 2) {
      const successful = applications.filter((a) => a.status === 'offered').length;
      interviewSuccessRate = Math.round((successful / interviews.length) * 100) / 100;
    }

    // 4. Average skill match from applications
    let averageSkillMatch = 0;
    if (applications.length > 0) {
      const matchScores = applications.map((a) => a.skillMatchPercentage || 0);
      const sum = matchScores.reduce((acc, s) => acc + s, 0);
      averageSkillMatch = Math.round((sum / matchScores.length) * 10) / 10;
    }

    // 5. Top matching active jobs based on student's skills
    const userSkills = user.skills || [];
    let topMatchingJobs: any[] = [];
    if (userSkills.length > 0) {
      const activeJobs = await Opportunity.find({ status: 'active' }).limit(10).lean();
      topMatchingJobs = activeJobs.map((job: any) => {
        const required = job.skillsRequired || [];
        const matched = required.filter((s: string) =>
          userSkills.some((us) => us.toLowerCase() === s.toLowerCase())
        );
        const matchScore = required.length > 0 ? Math.round((matched.length / required.length) * 100) : 50;
        return {
          jobId: job._id.toString(),
          title: job.title,
          company: job.company,
          type: job.type,
          matchScore,
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5);
    }

    res.json({
      data: {
        profileCompletion,
        applicationsSent,
        applicationsViewed,
        interviewSuccessRate,
        averageSkillMatch,
        topMatchingJobs,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

/**
 * GET /api/analytics/company
 * Real calculated metrics for employer/company dashboard.
 */
export const getCompanyAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    const companyName = user.institution || user.name;
    const userId = user._id.toString();

    // 1. Total Job Postings
    const jobQuery = user.role === 'admin'
      ? {}
      : { $or: [{ postedBy: user._id }, { company: companyName }] };

    const opportunities = await Opportunity.find(jobQuery).lean();
    const totalJobPostings = opportunities.length;

    // 2. Applications for these postings
    const oppIds = opportunities.map((o: any) => o._id.toString());
    const appQuery = user.role === 'admin'
      ? {}
      : {
          $or: [
            { opportunityId: { $in: oppIds } },
            { employerId: userId },
            { companyName: companyName },
          ],
        };

    const applications = await Application.find(appQuery).lean();
    const totalApplications = applications.length;

    // 3. Applications by status
    const applicationsByStatus = {
      APPLIED: applications.filter((a) => a.status === 'applied').length,
      REVIEWED: applications.filter((a) => a.status === 'in_review').length,
      SHORTLISTED: applications.filter((a) => ['shortlisted', 'interview_scheduled'].includes(a.status)).length,
      REJECTED: applications.filter((a) => a.status === 'rejected').length,
    };

    // 4. Average time to hire in days (from application creation to 'offered' date)
    const hiredApps = applications.filter((a) => a.status === 'offered');
    let averageTimeToHire = 0;
    if (hiredApps.length > 0) {
      const totalDays = hiredApps.reduce((sum, a: any) => {
        const created = new Date(a.createdAt || a.appliedDate).getTime();
        const updated = new Date(a.updatedAt || Date.now()).getTime();
        const days = Math.max(1, Math.round((updated - created) / (1000 * 60 * 60 * 24)));
        return sum + days;
      }, 0);
      averageTimeToHire = Math.round(totalDays / hiredApps.length);
    }

    // 5. Top in-demand skills from active opportunities
    const skillCounts: Record<string, number> = {};
    for (const opp of opportunities) {
      for (const s of opp.skillsRequired || []) {
        const cleanS = s.trim();
        skillCounts[cleanS] = (skillCounts[cleanS] || 0) + 1;
      }
    }
    const topInDemandSkills = Object.entries(skillCounts)
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 6. Applicants by education
    const educationCounts: Record<string, number> = {};
    for (const app of applications) {
      const edu = app.studentInstitute || 'Higher Education';
      educationCounts[edu] = (educationCounts[edu] || 0) + 1;
    }

    res.json({
      data: {
        totalJobPostings,
        totalApplications,
        applicationsByStatus,
        averageTimeToHire,
        topInDemandSkills,
        applicantsByEducation: educationCounts,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

/**
 * GET /api/analytics/admin
 * Real calculated metrics for platform administrators.
 */
export const getAdminAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    // 1. User counts
    const [students, companies, academicians, admins, collegesCount, verifiedCollegesCount] = await Promise.all([
      User.countDocuments({ role: { $in: ['student', 'jobseeker'] } }),
      User.countDocuments({ role: 'industry' }),
      User.countDocuments({ role: 'academician' }),
      User.countDocuments({ role: 'admin' }),
      College.countDocuments({}),
      College.countDocuments({ verificationStatus: 'VERIFIED' }),
    ]);

    // 2. User growth by month from real User.createdAt
    const rawGrowth = await User.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 },
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const userGrowth = rawGrowth.map((g) => ({
      month: `${monthNames[(g._id.month || 1) - 1]} ${g._id.year}`,
      count: g.count,
    }));

    // 3. Job Activity stats
    const [posted, applied, hired] = await Promise.all([
      Opportunity.countDocuments({}),
      Application.countDocuments({}),
      Application.countDocuments({ status: 'offered' }),
    ]);

    // 4. Placement rate
    const placementRate = applied > 0 ? Math.round((hired / applied) * 100) / 100 : 0;

    // 5. Top search queries from AuditLog
    const searchLogs = await AuditLog.aggregate([
      { $match: { action: { $in: ['COLLEGE_SEARCH', 'USER_SEARCH', 'OPPORTUNITY_SEARCH'] } } },
      { $group: { _id: '$details.query', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);
    const topSearchQueries = searchLogs
      .filter((s) => s._id && typeof s._id === 'string')
      .map((s) => ({ query: s._id, count: s.count }));

    // 6. Institution discovery stats
    const searchedClaims = await AuditLog.countDocuments({ action: 'INSTITUTION_CLAIM_INITIATED' });
    const institutionDiscoveryStats = {
      searched: searchedClaims || collegesCount,
      discovered: collegesCount,
      verified: verifiedCollegesCount,
    };

    res.json({
      data: {
        userCounts: {
          students,
          companies,
          colleges: collegesCount,
          admins,
        },
        userGrowth,
        jobActivityStats: {
          posted,
          applied,
          hired,
        },
        placementRate,
        topSearchQueries,
        institutionDiscoveryStats,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};
