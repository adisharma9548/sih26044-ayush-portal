import crypto from 'crypto';
import { IUser } from '../models/User';
import { SkillProfile } from '../models/SkillProfile';
import { AssessmentAttempt } from '../models/Assessment';

export interface AcademicContextPayload {
  degree?: string;
  department?: string;
  specialization?: string;
  institution?: string;
  academicField?: string;
  course?: string;
}

/**
 * Computes a deterministic SHA-256 hash representing a student's academic program.
 */
export function computeAcademicContextHash(context: AcademicContextPayload): string {
  const norm = [
    context.degree || '',
    context.department || '',
    context.specialization || '',
    context.institution || '',
    context.academicField || '',
    context.course || '',
  ]
    .map((s) => s.toLowerCase().trim())
    .join('|');

  return crypto.createHash('sha256').update(norm).digest('hex');
}

/**
 * Determines whether any academic identifier has been modified.
 */
export function hasAcademicContextChanged(
  current: Partial<IUser>,
  updates: Record<string, any>
): boolean {
  const academicKeys = ['degree', 'course', 'department', 'specialization', 'institution', 'academicField'];

  for (const key of academicKeys) {
    if (updates[key] !== undefined) {
      const oldVal = ((current as any)[key] || '').toString().toLowerCase().trim();
      const newVal = (updates[key] || '').toString().toLowerCase().trim();
      if (oldVal !== newVal) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Authoritative handler for academic profile updates.
 * When academic context fields change:
 * 1. Computes new hash and increments version
 * 2. Archives previous radar competencies to historicalContexts
 * 3. Atomically sets current radar state to 'not_assessed' with 0 fabricated numbers
 * 4. Marks past assessment attempts as historical (isCurrentContext = false)
 * 5. Clears stale study roadmaps
 */
export async function handleAcademicProfileUpdate(
  user: IUser,
  updates: Record<string, any>
): Promise<{ changed: boolean; previousVersion: number; newVersion: number }> {
  const currentVersion = user.academicContextVersion || 1;

  if (!hasAcademicContextChanged(user, updates)) {
    return { changed: false, previousVersion: currentVersion, newVersion: currentVersion };
  }

  const mergedContext: AcademicContextPayload = {
    degree: updates.degree !== undefined ? updates.degree : user.degree,
    department: updates.department !== undefined ? updates.department : user.department,
    specialization: updates.specialization !== undefined ? updates.specialization : user.specialization,
    institution: updates.institution !== undefined ? updates.institution : user.institution,
    academicField: updates.academicField !== undefined ? updates.academicField : user.academicField,
    course: updates.course !== undefined ? updates.course : (user as any).course,
  };

  const newHash = computeAcademicContextHash(mergedContext);
  const newVersion = currentVersion + 1;

  // Invalidate and archive current SkillProfile
  const profile = await SkillProfile.findOne({ userId: user._id.toString() });
  if (profile) {
    if (!profile.historicalContexts) {
      profile.historicalContexts = [];
    }

    // Archive previous radar state if it had assessed skills
    if (profile.skills && profile.skills.length > 0) {
      profile.historicalContexts.push({
        contextHash: profile.academicContextHash || user.academicContextHash || '',
        version: profile.academicContextVersion || currentVersion,
        degree: user.degree || '',
        department: user.department || '',
        specialization: user.specialization || '',
        institution: user.institution || '',
        archivedAt: new Date(),
        skills: profile.skills,
        overallScore: profile.overallScore || 0,
        gapAnalysis: profile.gapAnalysis || [],
      });
    }

    // Atomically reset active radar to not_assessed state
    profile.skills = [];
    profile.gapAnalysis = [];
    profile.overallScore = 0;
    profile.rankPercentile = 0;
    profile.strengths = [];
    profile.status = 'not_assessed';
    profile.degree = mergedContext.degree || '';
    profile.academicContextHash = newHash;
    profile.academicContextVersion = newVersion;
    profile.academicContext = {
      degree: mergedContext.degree || '',
      department: mergedContext.department || '',
      specialization: mergedContext.specialization || '',
      institution: mergedContext.institution || '',
      academicField: mergedContext.academicField || '',
    };

    await profile.save();
  }

  // Mark previous assessment attempts as non-current context
  await AssessmentAttempt.updateMany(
    { userId: user._id.toString(), isCurrentContext: true },
    { $set: { isCurrentContext: false } }
  );

  // Clear stale study roadmaps on User model
  user.studyRoadmap = undefined;
  user.academicContextHash = newHash;
  user.academicContextVersion = newVersion;

  return { changed: true, previousVersion: currentVersion, newVersion };
}
