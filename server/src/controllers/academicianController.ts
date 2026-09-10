import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Workshop, Mentorship } from '../models/Workshop';
import { FacultyOpportunity } from '../models/FacultyOpportunity';
import { Notification } from '../models/Notification';
import { Meeting } from '../models/Meeting';
import { User } from '../models/User';
import { SkillProfile } from '../models/SkillProfile';
import { Portfolio } from '../models/Portfolio';
import { emitToUser } from '../services/socketService';
import { recordAuditLog } from '../services/auditService';
import { AuthRequest } from '../middleware/auth';

export const getFacultyOpportunities = async (_req: Request, res: Response) => {
  try {
    const opps = await FacultyOpportunity.find({ status: 'open' }).sort({ createdAt: -1 });
    res.json({ data: opps });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const createFacultyOpportunity = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    const {
      title,
      organization,
      type,
      stipendOrGrant,
      duration,
      deadline,
      description,
      requirements,
      ayushDomain,
    } = req.body;

    if (!title || !type || !stipendOrGrant || !duration || !deadline || !description) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Title, type, stipend/grant, duration, deadline, and description are required.',
        },
      });
    }

    const opportunity = new FacultyOpportunity({
      title: title.trim(),
      organization: (organization || user.institution || user.name || 'Corporate Partner').trim(),
      type,
      stipendOrGrant: stipendOrGrant.trim(),
      duration: duration.trim(),
      deadline: deadline.trim(),
      description: description.trim(),
      requirements: Array.isArray(requirements)
        ? requirements
        : typeof requirements === 'string'
        ? requirements.split('\n').filter(Boolean)
        : [],
      ayushDomain: ayushDomain || 'Technology & Engineering',
      status: 'open',
      postedBy: user._id,
      applications: [],
    });

    await opportunity.save();

    await recordAuditLog({
      req,
      action: 'CREATE_FACULTY_OPPORTUNITY',
      userId: user._id.toString(),
      userEmail: user.email,
      userRole: user.role,
      entity: 'FacultyOpportunity',
      entityId: opportunity._id.toString(),
      details: { title: opportunity.title, type: opportunity.type, organization: opportunity.organization },
    });

    res.status(201).json({ data: opportunity });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const applyFacultyOpportunity = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    const { id } = req.params;
    const { proposalText, experience, cvLink } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Faculty opportunity not found' } });
    }

    if (!proposalText || proposalText.trim().length < 10) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Please provide a meaningful proposal / abstract (at least 10 characters).' },
      });
    }

    const opp = await FacultyOpportunity.findById(id);
    if (!opp) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Faculty opportunity not found' } });
    }

    // Check if faculty already applied
    const alreadyApplied = opp.applications.some(
      (app: any) =>
        app.facultyId?.toString() === user._id.toString() ||
        app.facultyEmail?.toLowerCase() === user.email.toLowerCase()
    );

    if (alreadyApplied) {
      return res.status(400).json({
        error: { code: 'ALREADY_APPLIED', message: 'You have already submitted a proposal for this opportunity.' },
      });
    }

    const newApp: any = {
      facultyId: user._id,
      facultyName: user.name,
      facultyEmail: user.email,
      institution: user.institution || '',
      department: (user as any).department || '',
      proposalText: proposalText.trim(),
      experience: experience ? experience.trim() : '',
      cvLink: cvLink ? cvLink.trim() : '',
      status: 'pending',
      createdAt: new Date(),
    };

    opp.applications.push(newApp);
    await opp.save();

    // 1. Notify Industry Recruiter / Poster
    if (opp.postedBy) {
      const industryNotif = new Notification({
        userId: opp.postedBy.toString(),
        title: `Faculty Proposal: ${opp.title}`,
        message: `${user.name} (${user.institution || 'Faculty Scholar'}) submitted a proposal for "${opp.title}".`,
        type: 'application',
        link: '/industry/applicants',
      });
      await industryNotif.save();
      emitToUser(opp.postedBy.toString(), 'notification', industryNotif);
    }

    // 2. Notify Academician (Confirmation)
    const facultyNotif = new Notification({
      userId: user._id.toString(),
      title: `Proposal Submitted: ${opp.title}`,
      message: `Your research proposal / expression of interest for "${opp.title}" at ${opp.organization} was successfully dispatched.`,
      type: 'achievement',
      link: '/academician/opportunities',
    });
    await facultyNotif.save();
    emitToUser(user._id.toString(), 'notification', facultyNotif);

    await recordAuditLog({
      req,
      action: 'APPLY_FACULTY_OPPORTUNITY',
      userId: user._id.toString(),
      userEmail: user.email,
      userRole: user.role,
      entity: 'FacultyOpportunity',
      entityId: opp._id.toString(),
      details: { title: opp.title, facultyName: user.name, facultyEmail: user.email },
    });

    res.status(201).json({ data: opp });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const getIndustryFacultyOpportunities = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    const query: any = {
      $or: [
        { postedBy: user._id },
        { organization: new RegExp(user.institution || user.name, 'i') },
      ],
    };

    // If user is admin, return all
    const opps = user.role === 'admin'
      ? await FacultyOpportunity.find({}).sort({ createdAt: -1 })
      : await FacultyOpportunity.find(query).sort({ createdAt: -1 });

    res.json({ data: opps });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const updateFacultyApplicationStatus = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    const { oppId, appId } = req.params;
    const { status } = req.body;

    if (!['pending', 'shortlisted', 'accepted', 'rejected'].includes(status)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid status. Must be pending, shortlisted, accepted, or rejected.' },
      });
    }

    const opp = await FacultyOpportunity.findById(oppId);
    if (!opp) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Opportunity not found' } });
    }

    const application = (opp.applications as any).id?.(appId) || opp.applications.find((a: any) => a._id?.toString() === appId || a.id === appId);
    if (!application) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Application proposal not found' } });
    }

    application.status = status;
    await opp.save();

    // Send notification to the Faculty member
    if (application.facultyId) {
      const notif = new Notification({
        userId: application.facultyId.toString(),
        title: `Proposal Status: ${opp.title}`,
        message: `Your research proposal for "${opp.title}" has been updated to "${status.toUpperCase()}" by ${opp.organization}.`,
        type: status === 'accepted' ? 'achievement' : 'application',
        link: '/academician/opportunities',
      });
      await notif.save();
      emitToUser(application.facultyId.toString(), 'notification', notif);
    }

    res.json({ data: { oppId, appId, status } });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const getWorkshops = async (_req: Request, res: Response) => {
  try {
    const workshops = await Workshop.find({}).sort({ date: 1 }).lean();
    res.json({ data: workshops });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const createWorkshop = async (req: Request, res: Response) => {
  try {
    const workshop = new Workshop(req.body);
    await workshop.save();
    res.status(201).json({ data: workshop });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const getMentorshipRequests = async (_req: Request, res: Response) => {
  try {
    const requests = await Mentorship.find({}).sort({ createdAt: -1 }).lean();
    res.json({ data: requests });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const updateMentorshipStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Mentorship request not found' } });
    }

    const request = await Mentorship.findById(id);
    if (!request) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Mentorship request not found' } });
    }

    request.status = status;
    const roomId = `mentorship-${request._id.toString()}`;

    if (status === 'accepted') {
      request.meetingLink = `/meetings?room=${roomId}`;

      // Create WebRTC native Meeting record
      await Meeting.findOneAndUpdate(
        { roomId },
        {
          title: `Faculty Mentorship: ${request.topic}`,
          type: 'mentorship',
          organizerId: request.facultyId || (req as any).user?._id,
          organizerName: request.facultyName || 'Faculty Mentor',
          organizerRole: 'academician',
          participantId: request.studentId,
          participantEmail: 'mentee@ayushportal.gov.in',
          participantName: request.studentName,
          scheduledAt: new Date(Date.now() + 86400000),
          durationMinutes: 45,
          roomId,
          meetingUrl: `/meetings?room=${roomId}`,
          status: 'scheduled',
          notes: `Live 1-on-1 mentorship session on ${request.topic}.`,
        },
        { upsert: true, new: true }
      );
    }
    await request.save();

    // Create notification for student
    const notif = new Notification({
      userId: request.studentId,
      title: 'Mentorship Guidance Slot Confirmed',
      message: `${request.facultyName} accepted your guidance request on "${request.topic}". Meeting room is now active.`,
      type: 'mentorship',
      link: `/meetings?room=${roomId}&title=${encodeURIComponent('Mentorship: ' + request.topic)}`,
    });
    await notif.save();

    emitToUser(request.studentId, 'notification:new', notif);

    res.json({ data: request });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// ============================================================================
// Institutional (.edu.in) Student Discovery, Profile Inspection & Project Assistance
// ============================================================================

export const extractEmailDomain = (email: string): string => {
  if (!email || !email.includes('@')) return '';
  return email.toLowerCase().split('@')[1].trim();
};

export const isEducationalDomain = (domain: string): boolean => {
  return (
    domain.endsWith('.edu.in') ||
    domain.endsWith('.ac.in') ||
    domain.includes('.edu') ||
    domain.endsWith('.res.in')
  );
};

export const canFacultyAccessStudent = (
  facultyEmail: string,
  studentEmail: string,
  facultyInstitution?: string,
  studentInstitution?: string
): { allowed: boolean; reason?: string; matchedDomain?: string } => {
  const fDomain = extractEmailDomain(facultyEmail);
  const sDomain = extractEmailDomain(studentEmail);

  // Exact domain match (e.g., student@dtu.edu.in and teacher@dtu.edu.in)
  if (fDomain && sDomain && fDomain === sDomain) {
    return { allowed: true, matchedDomain: fDomain };
  }

  // Educational domains (.edu.in, .ac.in, etc.) require STRICT domain match
  if (isEducationalDomain(fDomain) || isEducationalDomain(sDomain)) {
    return {
      allowed: false,
      reason: `Access restricted. Student domain (@${sDomain || 'unknown'}) does not match faculty institutional domain (@${fDomain || 'unknown'}).`,
    };
  }

  // Fallback for general non-educational domains only
  if (
    facultyInstitution &&
    studentInstitution &&
    facultyInstitution.trim().toLowerCase() === studentInstitution.trim().toLowerCase() &&
    facultyInstitution.trim().length > 2
  ) {
    return { allowed: true, matchedDomain: fDomain || sDomain || 'institutional' };
  }

  return {
    allowed: false,
    reason: `Access restricted. Student domain (@${sDomain || 'unknown'}) does not match faculty institutional domain (@${fDomain || 'unknown'}).`,
  };
};

export const getInstitutionalStudents = async (req: Request, res: Response) => {
  try {
    const faculty = (req as any).user;
    if (!faculty) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    const facultyDomain = extractEmailDomain(faculty.email);
    const facultyInstitution = faculty.institution?.trim();
    const isEdu = isEducationalDomain(facultyDomain);

    const queryConditions: any[] = [];
    if (isEdu) {
      // For verified educational faculty (.edu.in, .ac.in), match strictly by email domain
      const escapedDomain = facultyDomain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      queryConditions.push({ email: new RegExp(`@${escapedDomain}$`, 'i') });
    } else {
      if (facultyDomain) {
        const escapedDomain = facultyDomain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        queryConditions.push({ email: new RegExp(`@${escapedDomain}$`, 'i') });
      }
      if (facultyInstitution) {
        queryConditions.push({
          institution: new RegExp(`^${facultyInstitution.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
        });
      }
    }

    if (queryConditions.length === 0) {
      return res.json({
        data: [],
        meta: {
          facultyDomain,
          facultyInstitution,
          message: 'No institutional domain or affiliated university configured for faculty member.',
        },
      });
    }

    const rawStudents = await User.find({
      role: { $in: ['student', 'jobseeker'] },
      $or: queryConditions,
    })
      .select('name email role institution department degree academicField specialization graduationYear skills profilePicture createdAt')
      .lean();

    // If educational domain, ensure strict email domain equality (no foreign demo accounts)
    const students = isEdu
      ? rawStudents.filter((s) => extractEmailDomain(s.email) === facultyDomain)
      : rawStudents;

    const studentIds = students.map((s) => s._id.toString());
    const [profiles, portfolios] = await Promise.all([
      SkillProfile.find({ userId: { $in: studentIds } }).lean(),
      Portfolio.find({ userId: { $in: studentIds } }).lean(),
    ]);

    const profileMap = new Map<string, any>();
    profiles.forEach((p) => profileMap.set(p.userId, p));

    const portfolioMap = new Map<string, any>();
    portfolios.forEach((pf) => portfolioMap.set(pf.userId, pf));

    const enhancedStudents = students.map((s) => {
      const p = profileMap.get(s._id.toString());
      const pf = portfolioMap.get(s._id.toString());
      return {
        ...s,
        id: s._id.toString(),
        skillScore: p?.overallScore ?? 0,
        rankPercentile: p?.rankPercentile ?? 0,
        assessedSkillsCount: p?.skills?.length ?? 0,
        lastAssessmentDate: p?.lastAssessmentDate,
        projectsCount: pf?.projects?.length ?? 0,
        certificatesCount: pf?.certificates?.length ?? 0,
        projects: pf?.projects || [],
      };
    });

    res.json({
      data: enhancedStudents,
      meta: {
        facultyDomain,
        facultyInstitution,
        isEduDomain: isEducationalDomain(facultyDomain),
        totalStudents: enhancedStudents.length,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const getStudentDetailedProfile = async (req: Request, res: Response) => {
  try {
    const faculty = (req as any).user;
    const { studentId } = req.params;

    if (!mongoose.isValidObjectId(studentId)) {
      return res.status(400).json({ error: { code: 'INVALID_ID', message: 'Invalid student ID' } });
    }

    const student = await User.findById(studentId).select('+studyRoadmap').lean();
    if (!student || (student.role !== 'student' && student.role !== 'jobseeker')) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Student scholar not found' } });
    }

    const access = canFacultyAccessStudent(faculty.email, student.email, faculty.institution, student.institution);
    if (!access.allowed && faculty.role !== 'admin') {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: access.reason } });
    }

    const [skillProfile, portfolio, mentorshipHistory] = await Promise.all([
      SkillProfile.findOne({ userId: studentId }).lean(),
      Portfolio.findOne({ userId: studentId }).lean(),
      Mentorship.find({ studentId, facultyId: faculty._id.toString() }).sort({ createdAt: -1 }).lean(),
    ]);

    res.json({
      data: {
        student: {
          id: student._id.toString(),
          name: student.name,
          email: student.email,
          role: student.role,
          institution: student.institution,
          department: student.department,
          degree: student.degree,
          academicField: student.academicField,
          specialization: student.specialization,
          graduationYear: student.graduationYear,
          location: student.location,
          bio: student.bio,
          skills: student.skills || [],
          profilePicture: student.profilePicture,
          studyRoadmap: student.studyRoadmap,
          verified: student.verified,
          createdAt: student.createdAt,
        },
        skillProfile: skillProfile || {
          overallScore: 0,
          rankPercentile: 0,
          skills: [],
          gapAnalysis: [],
          strengths: [],
        },
        portfolio: portfolio || {
          certificates: [],
          projects: [],
        },
        mentorshipHistory: mentorshipHistory || [],
        institutionalDomainMatched: access.matchedDomain,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const assistStudentProject = async (req: Request, res: Response) => {
  try {
    const faculty = (req as any).user;
    const { studentId } = req.params;
    const { projectTitle, assistanceType, notes, scheduleMeeting } = req.body;

    if (!notes || !notes.trim()) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Assistance guidance notes are required' } });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Student scholar not found' } });
    }

    const access = canFacultyAccessStudent(faculty.email, student.email, faculty.institution, student.institution);
    if (!access.allowed && faculty.role !== 'admin') {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: access.reason } });
    }

    let portfolio = await Portfolio.findOne({ userId: studentId });
    if (!portfolio) {
      portfolio = new Portfolio({ userId: studentId, certificates: [], projects: [] });
    }

    let projectIndex = portfolio.projects.findIndex(
      (p) => p.title.toLowerCase().trim() === (projectTitle || '').toLowerCase().trim()
    );

    if (projectIndex === -1 && portfolio.projects.length > 0) {
      projectIndex = 0;
    }

    const targetProjectTitle = projectIndex >= 0 ? portfolio.projects[projectIndex].title : (projectTitle || 'Academic Project');

    let roomId = '';
    if (scheduleMeeting) {
      roomId = `guidance-${faculty._id.toString().slice(-6)}-${studentId.slice(-6)}-${Date.now().toString().slice(-4)}`;

      await Meeting.create({
        title: `Project Guidance: ${targetProjectTitle}`,
        type: 'mentorship',
        organizerId: faculty._id,
        organizerName: faculty.name,
        organizerRole: 'academician',
        participantId: student._id,
        participantEmail: student.email,
        participantName: student.name,
        scheduledAt: new Date(Date.now() + 3600000),
        durationMinutes: 45,
        roomId,
        meetingUrl: `/meetings?room=${roomId}`,
        status: 'scheduled',
        notes: `Academic Project Guidance on "${targetProjectTitle}" with Faculty Guide ${faculty.name}.`,
      });

      await Mentorship.create({
        studentId,
        studentName: student.name,
        studentEmail: student.email,
        facultyId: faculty._id.toString(),
        facultyName: faculty.name,
        topic: `Project Review: ${targetProjectTitle}`,
        message: notes,
        preferredDate: new Date(Date.now() + 3600000).toISOString().split('T')[0],
        status: 'accepted',
        meetingLink: `/meetings?room=${roomId}`,
      });
    }

    const assistanceRecord = {
      facultyId: faculty._id.toString(),
      facultyName: faculty.name,
      facultyEmail: faculty.email,
      facultyDesignation: faculty.designation || 'Faculty Research Guide',
      assistanceType: assistanceType || 'guidance',
      notes: notes.trim(),
      meetingRoomId: roomId || undefined,
      createdAt: new Date(),
    };

    if (projectIndex >= 0 && portfolio.projects[projectIndex]) {
      const project = portfolio.projects[projectIndex];
      if (!project.assistance) {
        project.assistance = [];
      }
      project.assistance.unshift(assistanceRecord as any);
      portfolio.markModified('projects');
      await portfolio.save();
    }

    const notif = new Notification({
      userId: studentId,
      title: `Faculty Guidance: ${targetProjectTitle}`,
      message: `${faculty.name} (${faculty.institution || 'Faculty Mentor'}) provided ${assistanceType || 'guidance'} on "${targetProjectTitle}": "${notes.slice(0, 100)}${notes.length > 100 ? '...' : ''}"`,
      type: 'mentorship',
      link: roomId
        ? `/meetings?room=${roomId}&title=${encodeURIComponent('Project Guidance: ' + targetProjectTitle)}`
        : '/student/portfolio',
    });
    await notif.save();

    emitToUser(studentId, 'notification:new', notif);
    emitToUser(studentId, 'student:project_assisted', {
      projectTitle: targetProjectTitle,
      assistance: assistanceRecord,
    });

    recordAuditLog({
      action: 'FACULTY_ASSISTED_STUDENT_PROJECT',
      entity: 'Portfolio',
      entityId: studentId,
      userId: faculty._id.toString(),
      userRole: 'academician',
      details: { studentId, projectTitle: targetProjectTitle, assistanceType },
    });

    res.status(200).json({
      data: {
        success: true,
        message: `Guidance successfully recorded for "${targetProjectTitle}".`,
        assistance: assistanceRecord,
        meetingRoomId: roomId || null,
        meetingUrl: roomId ? `/meetings?room=${roomId}` : null,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};
