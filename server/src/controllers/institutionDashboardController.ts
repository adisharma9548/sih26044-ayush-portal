import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import { User, REAL_USER_FILTER } from '../models/User';
import { College } from '../models/College';
import { SkillProfile } from '../models/SkillProfile';
import { AssessmentAttempt } from '../models/Assessment';

/**
 * Resolves the College entity associated with the authenticated institution or admin user
 */
async function resolveUserCollege(user: any): Promise<any> {
  if (user.collegeId) {
    const col = await College.findById(user.collegeId);
    if (col) return col;
  }

  if (user.institution) {
    const col = await College.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${user.institution.trim()}$`, 'i') } },
        { slug: user.institution.toLowerCase().replace(/[^a-z0-9]/g, '-') },
      ],
    });
    if (col) return col;
  }

  return null;
}

/**
 * GET /api/institution/dashboard/analytics
 * Returns genuine, scoped institutional analytics excluding all demo accounts
 */
export const getInstitutionAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const authUser = req.user;
    if (!authUser) {
      return res.status(401).json({ error: { message: 'Authentication required.' } });
    }

    const isAllowed = ['institution', 'admin', 'academician'].includes(authUser.role);
    if (!isAllowed) {
      return res.status(403).json({ error: { message: 'Only institutions and authorized faculty can access institutional analytics.' } });
    }

    const college = await resolveUserCollege(authUser);
    if (!college) {
      return res.status(404).json({
        error: {
          code: 'INSTITUTION_NOT_LINKED',
          message: 'Your account is not yet linked to a recognized Institution profile. Please claim or select your institution.',
        },
      });
    }

    // Identify all real students affiliated with this institution
    const studentMatch: any = {
      role: { $in: ['student', 'jobseeker'] },
      ...REAL_USER_FILTER,
      $or: [
        { collegeId: college._id },
        { institution: { $regex: new RegExp(`^${college.name.trim()}$`, 'i') } },
      ],
    };

    const affiliatedStudents = await User.find(studentMatch).select('_id name email department degree graduationYear location locationStructured').lean();
    const studentIds = affiliatedStudents.map((s) => s._id.toString());

    const totalStudents = affiliatedStudents.length;

    // Retrieve skill profiles for these students
    const skillProfiles = await SkillProfile.find({
      userId: { $in: studentIds },
    }).lean();

    const assessedProfiles = skillProfiles.filter((p) => p.status !== 'not_assessed' && (p.overallScore || 0) > 0);
    const assessedStudents = assessedProfiles.length;

    // Compute average skill score
    const avgScore = assessedProfiles.length > 0
      ? Math.round((assessedProfiles.reduce((acc, p) => acc + (p.overallScore || 0), 0) / assessedProfiles.length) * 10) / 10
      : 0;

    // Placement readiness: % students scoring >= 70%
    const placementReadyCount = assessedProfiles.filter((p) => (p.overallScore || 0) >= 70).length;
    const placementReadinessRate = assessedStudents > 0
      ? Math.round((placementReadyCount / assessedStudents) * 100)
      : 0;

    // Department Breakdown
    const deptMap = new Map<string, { count: number; totalScore: number; assessedCount: number }>();
    affiliatedStudents.forEach((st) => {
      const dept = (st.department || st.degree || 'General').trim();
      const existing = deptMap.get(dept) || { count: 0, totalScore: 0, assessedCount: 0 };
      existing.count += 1;

      const prof = skillProfiles.find((p) => p.userId === st._id.toString());
      if (prof && prof.overallScore) {
        existing.totalScore += prof.overallScore;
        existing.assessedCount += 1;
      }
      deptMap.set(dept, existing);
    });

    const departmentBreakdown = Array.from(deptMap.entries()).map(([department, data]) => ({
      department,
      studentCount: data.count,
      assessedCount: data.assessedCount,
      averageScore: data.assessedCount > 0 ? Math.round(data.totalScore / data.assessedCount) : 0,
    })).sort((a, b) => b.studentCount - a.studentCount);

    // Skill aggregations: top competencies vs lagging skill gaps
    const skillProficiencyMap = new Map<string, { count: number; totalLevel: number; category: string }>();
    const skillGapsMap = new Map<string, { count: number; totalGap: number }>();

    skillProfiles.forEach((p) => {
      (p.skills || []).forEach((s) => {
        if (!s || !s.name) return;
        const sName = s.name.trim();
        const current = skillProficiencyMap.get(sName) || { count: 0, totalLevel: 0, category: s.category || 'General' };
        current.count += 1;
        current.totalLevel += s.level || 0;
        skillProficiencyMap.set(sName, current);
      });

      (p.gapAnalysis || []).forEach((g) => {
        if (!g || !g.skill || g.status === 'MATCHED') return;
        const gName = g.skill.trim();
        const existing = skillGapsMap.get(gName) || { count: 0, totalGap: 0 };
        existing.count += 1;
        existing.totalGap += g.gapPercentage || 25;
        skillGapsMap.set(gName, existing);
      });
    });

    const topSkills = Array.from(skillProficiencyMap.entries())
      .map(([name, data]) => ({
        name,
        category: data.category,
        studentCount: data.count,
        averageProficiency: Math.round(data.totalLevel / data.count),
      }))
      .sort((a, b) => b.studentCount - a.studentCount)
      .slice(0, 8);

    const laggingSkills = Array.from(skillGapsMap.entries())
      .map(([name, data]) => ({
        name,
        studentsAffected: data.count,
        averageGapPercentage: Math.round(data.totalGap / data.count),
      }))
      .sort((a, b) => b.studentsAffected - a.studentsAffected)
      .slice(0, 8);

    // Recent assessments from students in this institution
    const recentAttempts = await AssessmentAttempt.find({
      userId: { $in: studentIds },
    })
      .sort({ evaluatedAt: -1 })
      .limit(6)
      .lean();

    const formattedRecentAttempts = recentAttempts.map((att) => {
      const student = affiliatedStudents.find((s) => s._id.toString() === att.userId);
      return {
        id: att._id,
        studentName: student ? student.name : 'Enrolled Student',
        studentEmail: student ? student.email : '',
        score: att.score,
        evaluatedAt: att.evaluatedAt,
        department: att.academicContext?.department || student?.department || '',
      };
    });

    return res.json({
      success: true,
      data: {
        college: {
          id: college._id,
          name: college.name,
          slug: college.slug,
          type: college.type,
          state: college.state,
          district: college.district,
          city: college.city,
          verificationStatus: college.verificationStatus,
          about: college.about,
          contact: college.contact,
          departments: college.departments,
        },
        metrics: {
          totalStudents,
          assessedStudents,
          assessmentParticipationRate: totalStudents > 0 ? Math.round((assessedStudents / totalStudents) * 100) : 0,
          averageSkillScore: avgScore,
          placementReadyCount,
          placementReadinessRate,
        },
        departmentBreakdown,
        topSkills,
        laggingSkills,
        recentAssessments: formattedRecentAttempts,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: { message: error.message } });
  }
};

/**
 * GET /api/institution/dashboard/students
 * Returns paginated affiliated students list with skill status
 */
export const getInstitutionStudents = async (req: AuthRequest, res: Response) => {
  try {
    const authUser = req.user;
    if (!authUser) {
      return res.status(401).json({ error: { message: 'Authentication required.' } });
    }

    const isAllowed = ['institution', 'admin', 'academician'].includes(authUser.role);
    if (!isAllowed) {
      return res.status(403).json({ error: { message: 'Only institutions and authorized faculty can access institutional student rosters.' } });
    }

    const college = await resolveUserCollege(authUser);
    if (!college) {
      return res.status(404).json({ error: { message: 'Institution profile not linked.' } });
    }

    const { department, search, page = '1', limit = '20' } = req.query;

    const query: any = {
      role: { $in: ['student', 'jobseeker'] },
      ...REAL_USER_FILTER,
      $or: [
        { collegeId: college._id },
        { institution: { $regex: new RegExp(`^${college.name.trim()}$`, 'i') } },
      ],
    };

    if (department && typeof department === 'string') {
      query.department = department;
    }

    if (search && typeof search === 'string') {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$and = [
        {
          $or: [
            { name: { $regex: escaped, $options: 'i' } },
            { email: { $regex: escaped, $options: 'i' } },
          ],
        },
      ];
    }

    const numericLimit = Math.min(Math.max(parseInt(limit as string, 10) || 20, 1), 100);
    const numericPage = Math.max(parseInt(page as string, 10) || 1, 1);
    const skip = (numericPage - 1) * numericLimit;

    const [students, total] = await Promise.all([
      User.find(query)
        .select('name email department degree graduationYear location locationStructured resumeId createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(numericLimit)
        .lean(),
      User.countDocuments(query),
    ]);

    const studentIds = students.map((s) => s._id.toString());
    const profiles = await SkillProfile.find({ userId: { $in: studentIds } }).lean();

    const populated = students.map((s) => {
      const prof = profiles.find((p) => p.userId === s._id.toString());
      return {
        ...s,
        overallScore: prof ? prof.overallScore : null,
        skillCount: prof ? (prof.skills || []).length : 0,
        assessmentStatus: prof ? prof.status : 'not_assessed',
      };
    });

    return res.json({
      success: true,
      data: populated,
      pagination: {
        page: numericPage,
        limit: numericLimit,
        total,
        totalPages: Math.ceil(total / numericLimit),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: { message: error.message } });
  }
};

/**
 * PATCH /api/institution/profile
 * Allows representative to update institutional metadata
 */
export const updateInstitutionProfile = async (req: AuthRequest, res: Response) => {
  try {
    const authUser = req.user;
    if (!authUser) {
      return res.status(401).json({ error: { message: 'Authentication required.' } });
    }

    const isAllowed = ['institution', 'admin'].includes(authUser.role);
    if (!isAllowed) {
      return res.status(403).json({ error: { message: 'Only institution administrators can update institutional metadata.' } });
    }

    const college = await resolveUserCollege(authUser);
    if (!college) {
      return res.status(404).json({ error: { message: 'Institution profile not linked.' } });
    }

    const { about, contact, departments, facilities, type } = req.body;

    if (about !== undefined) college.about = about;
    if (type !== undefined) college.type = type;
    if (contact !== undefined) college.contact = { ...college.contact, ...contact };
    if (departments !== undefined && Array.isArray(departments)) college.departments = departments;
    if (facilities !== undefined && Array.isArray(facilities)) college.facilities = facilities;

    await college.save();

    return res.json({
      success: true,
      message: 'Institution profile updated successfully.',
      data: college,
    });
  } catch (error: any) {
    return res.status(500).json({ error: { message: error.message } });
  }
};
