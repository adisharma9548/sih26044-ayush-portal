import pdfParse from 'pdf-parse';
import { callGroq } from './aiClient';
import { IResumeExtractedData } from '../models/Resume';
import { SkillProfile, ISkillProfileItem } from '../models/SkillProfile';
import { User } from '../models/User';
import { College } from '../models/College';
import { normalizeIndianLocation } from '../config/indiaGeography';
import { normalizeSkillName, getBenchmarkForSkill } from './benchmarkService';

/**
 * Extracts raw machine-readable text from uploaded document buffer
 */
export const extractTextFromBuffer = async (
  buffer: Buffer,
  mimeType: string
): Promise<string> => {
  if (!buffer || buffer.length === 0) {
    throw new Error('Uploaded document buffer is empty.');
  }

  if (mimeType === 'application/pdf') {
    try {
      let text = '';
      const anyPdfParse: any = pdfParse;
      if (anyPdfParse && typeof anyPdfParse.PDFParse === 'function') {
        const parser = new anyPdfParse.PDFParse({ data: buffer });
        const result = await parser.getText();
        if (typeof parser.destroy === 'function') {
          await parser.destroy();
        }
        text = (result && result.text) ? result.text.trim() : '';
      } else {
        const fn: any = typeof anyPdfParse === 'function' ? anyPdfParse : anyPdfParse?.default || anyPdfParse;
        const result = await fn(buffer);
        text = (result && result.text) ? result.text.trim() : '';
      }
      return text;
    } catch (err: any) {
      throw new Error(`Failed to parse PDF document: ${err.message}`);
    }
  }

  // Text / basic document fallback extraction
  const rawString = buffer.toString('utf-8');
  // Strip non-printable control characters
  const clean = rawString.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ').trim();
  return clean;
};

/**
 * Sends parsed resume text to Groq LLM for entity extraction into strict JSON
 */
export const parseResumeWithGroq = async (
  resumeText: string
): Promise<IResumeExtractedData> => {
  if (!resumeText || resumeText.length < 30) {
    throw new Error(
      'Document text extraction yielded insufficient machine-readable text (< 30 characters). ' +
      'This document may be a scanned image or protected PDF. Please verify and confirm details manually.'
    );
  }

  // Truncate to safe context size for Groq
  const truncatedText = resumeText.slice(0, 12000);

  const prompt = `You are a resume parsing and entity extraction assistant for higher education and Ayush university students.
Extract the structured profile information from the following resume text.

Rules:
1. Do not invent or hallucinate information. If a field is not present in the text, leave it empty or null.
2. For skills, estimate an initial competency level (0-100) based strictly on context (e.g. beginner/learning = 40, proficient/hands-on = 70, expert/lead = 90). Default to 60 if unspecified.
3. For location, extract any mentioned city, district, and Indian state.
4. Output MUST be valid JSON adhering exactly to the following schema:

{
  "fullName": "Extracted Full Name or null",
  "email": "Extracted email or null",
  "phone": "Extracted phone or null",
  "location": {
    "city": "City or null",
    "district": "District or null",
    "state": "State or null",
    "country": "India"
  },
  "education": [
    {
      "institution": "Institution Name",
      "degree": "Degree Name",
      "fieldOfStudy": "Major or Specialization",
      "startYear": 2020,
      "endYear": 2024,
      "grade": "GPA/Percentage or null"
    }
  ],
  "skills": [
    {
      "name": "Skill Name",
      "level": 70,
      "category": "Ayush Clinical | Pharmacognosy | Software | Management | Laboratory | Other"
    }
  ],
  "experience": [
    {
      "organization": "Organization Name",
      "role": "Position Title",
      "startDate": "Month Year or Year",
      "endDate": "Month Year or Present",
      "description": "Short summary of responsibilities"
    }
  ],
  "certifications": [
    {
      "title": "Certificate Title",
      "issuer": "Issuing Organization",
      "issueDate": "Date or Year"
    }
  ],
  "projects": [
    {
      "title": "Project Title",
      "description": "Brief description",
      "technologies": ["Skill1", "Skill2"]
    }
  ]
}

Resume Text:
---
${truncatedText}
---`;

  const parsed = await callGroq(
    prompt,
    'You are a professional resume parsing engine. Always respond with strictly valid JSON only. Never include markdown explanation outside the JSON.'
  );

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('AI was unable to parse structured information from the provided resume text.');
  }

  return {
    fullName: parsed.fullName || '',
    email: parsed.email || '',
    phone: parsed.phone || '',
    location: parsed.location || {},
    education: Array.isArray(parsed.education) ? parsed.education : [],
    skills: Array.isArray(parsed.skills) ? parsed.skills : [],
    experience: Array.isArray(parsed.experience) ? parsed.experience : [],
    certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
    projects: Array.isArray(parsed.projects) ? parsed.projects : [],
  };
};

/**
 * Synchronizes confirmed resume data directly into student's SkillProfile and User record
 */
export const syncResumeToSkillProfile = async (
  userId: string,
  confirmedData: IResumeExtractedData
): Promise<{ profile: any; user: any }> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error(`User not found with id: ${userId}`);
  }

  // 1. Sync structured location to user
  if (confirmedData.location) {
    const rawLoc = [confirmedData.location.city, confirmedData.location.district, confirmedData.location.state]
      .filter(Boolean)
      .join(', ');
    const normalized = normalizeIndianLocation(rawLoc);

    user.locationStructured = {
      country: 'India',
      state: confirmedData.location.state || normalized.state || '',
      district: confirmedData.location.district || normalized.district || '',
      city: confirmedData.location.city || normalized.city || '',
      village: '',
      rawInput: rawLoc,
      source: 'ai_suggested_confirmed',
    };
    user.location = rawLoc;
  }

  // 2. Sync education to user institution/college
  if (Array.isArray(confirmedData.education) && confirmedData.education.length > 0) {
    const primaryEdu = confirmedData.education[0];
    if (primaryEdu.institution && !user.institution) {
      user.institution = primaryEdu.institution;
    }
    if (primaryEdu.degree && !user.degree) {
      user.degree = primaryEdu.degree;
    }
    if (primaryEdu.fieldOfStudy && !user.specialization) {
      user.specialization = primaryEdu.fieldOfStudy;
    }

    // Try linking to known College model
    if (primaryEdu.institution && !user.collegeId) {
      const matchedCollege = await College.findOne({
        name: { $regex: new RegExp(`^${primaryEdu.institution.trim()}$`, 'i') },
      });
      if (matchedCollege) {
        user.collegeId = matchedCollege._id as any;
      }
    }
  }

  await user.save();

  // 3. Find or initialize SkillProfile without injecting unverified fake skills
  let profile = await SkillProfile.findOne({ userId });
  if (!profile) {
    profile = new SkillProfile({
      userId,
      degree: user.degree || '',
      overallScore: 0,
      skills: [],
      gapAnalysis: [],
      status: 'not_assessed',
    });
    await profile.save();
  }

  return { profile, user };
};
