# AYUSH-Connect Backend API Specification (SIH26044)

This document provides the complete API contracts, request payloads, and response JSON schemas required to build the backend (Node.js/Express, Python/FastAPI, Java/Spring Boot, etc.) for the **SIH26044 Academia–Industry Portal**.

---

## 🌐 Global Conventions

- **Base URL**: `https://sih26044-ayush-portal-production.up.railway.app/api` (or `http://localhost:5000/api` locally)
- **Content-Type**: `application/json`
- **Authentication**: Bearer Token in HTTP header: `Authorization: Bearer <JWT_TOKEN>`
- **Response Format**: All successful responses wrap the payload in `{ "data": ... }` to match the frontend service architecture.

```json
// Success Standard
{
  "data": { ... }
}

// Error Standard (4xx, 5xx)
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Internship with ID int_01 was not found"
  }
}
```

---

## 1. Authentication & User Management

### 1.1 Login User
- **Route**: `POST /api/auth/login`
- **Access**: Public
- **Request Body**:
```json
{
  "email": "ananya.sharma@aiia.edu.in",
  "password": "Password123@",
  "role": "student" // "student" | "industry" | "academician" | "admin"
}
```
- **Response (200 OK)**:
```json
{
  "data": {
    "user": {
      "id": "usr_student_01",
      "name": "Ananya Sharma",
      "email": "ananya.sharma@aiia.edu.in",
      "role": "student",
      "profilePicture": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
      "institution": "All India Institute of Ayurveda (AIIA), New Delhi",
      "department": "Department of Dravyaguna Vigyana",
      "degree": "Bachelor of Ayurvedic Medicine & Surgery (BAMS)",
      "graduationYear": 2026,
      "location": "New Delhi, India",
      "phone": "+91 98765 43210",
      "bio": "Aspiring Ayurvedic clinical researcher and phytopharmacology enthusiast.",
      "skills": ["Dravyaguna Phytochemistry", "Ayush-GMP Compliance", "Herbarium Taxonomy", "Clinical Rog Nidan"],
      "ayushDomain": "Ayurveda",
      "verified": true
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 1.2 User Registration (Signup)
- **Route**: `POST /api/auth/signup`
- **Access**: Public
- **Request Body (Student Example)**:
```json
{
  "name": "Ananya Sharma",
  "email": "ananya.sharma@aiia.edu.in",
  "password": "SecurePassword123",
  "role": "student",
  "institution": "All India Institute of Ayurveda, New Delhi",
  "degree": "Bachelor of Ayurvedic Medicine & Surgery (BAMS)",
  "department": "Department of Dravyaguna",
  "graduationYear": 2026,
  "ayushDomain": "Ayurveda",
  "skills": ["Ayush Core Competencies", "Classical Nidan", "Ayush-GMP"]
}
```
- **Response (201 Created)**:
```json
{
  "data": {
    "user": {
      "id": "usr_1725368400000",
      "name": "Ananya Sharma",
      "email": "ananya.sharma@aiia.edu.in",
      "role": "student",
      "institution": "All India Institute of Ayurveda, New Delhi",
      "degree": "Bachelor of Ayurvedic Medicine & Surgery (BAMS)",
      "department": "Department of Dravyaguna",
      "graduationYear": 2026,
      "ayushDomain": "Ayurveda",
      "verified": true
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 1.3 Forgot Password / Request OTP
- **Route**: `POST /api/auth/forgot-password`
- **Access**: Public
- **Request Body**:
```json
{
  "email": "ananya.sharma@aiia.edu.in"
}
```
- **Response (200 OK)**:
```json
{
  "data": {
    "success": true,
    "message": "Password reset instructions and verification code sent to ananya.sharma@aiia.edu.in."
  }
}
```

---

### 1.4 Update User Profile
- **Route**: `PUT /api/users/:userId/profile`
- **Access**: Authenticated (`userId` owner or Admin)
- **Request Body**:
```json
{
  "name": "Ananya Sharma",
  "phone": "+91 98765 43210",
  "location": "New Delhi, India",
  "bio": "Updated professional bio for phytochemistry research.",
  "institution": "All India Institute of Ayurveda, New Delhi",
  "department": "Department of Dravyaguna Vigyana"
}
```
- **Response (200 OK)**:
```json
{
  "data": {
    "id": "usr_student_01",
    "name": "Ananya Sharma",
    "email": "ananya.sharma@aiia.edu.in",
    "role": "student",
    "phone": "+91 98765 43210",
    "location": "New Delhi, India",
    "bio": "Updated professional bio for phytochemistry research.",
    "institution": "All India Institute of Ayurveda, New Delhi",
    "department": "Department of Dravyaguna Vigyana",
    "verified": true
  }
}
```

---

## 2. Internships Module

### 2.1 Get All Internships (Filterable)
- **Route**: `GET /api/internships`
- **Access**: Public or Authenticated
- **Query Parameters**:
  - `domain`: e.g. `Ayurveda`, `Unani`, `Siddha`, `Homoeopathy`, `All` (optional)
  - `search`: e.g. `Dabur`, `HPTLC`, `Quality Control` (optional)
- **Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "int_01",
      "title": "Phytochemical Analysis & Quality Control Intern",
      "company": "Dabur Research Foundation",
      "companyLogo": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=80",
      "location": "Ghaziabad, NCR, India",
      "isRemote": false,
      "stipend": "₹22,000 / month",
      "duration": "6 Months",
      "skillsRequired": ["HPTLC Fingerprinting", "Ayush-GMP Compliance", "Phytochemistry", "Pharmacopoeia Standards"],
      "description": "Work alongside senior formulation chemists at Dabur DRDC...",
      "responsibilities": [
        "Extract secondary metabolites using Soxhlet and ultrasonic techniques",
        "Perform HPLC and HPTLC fingerprint quantification on key marker compounds"
      ],
      "requirements": [
        "Final year BAMS, B.Pharm (Ayurveda), or M.Sc Phytochemistry student",
        "Basic familiarity with Ayurvedic Pharmacopoeia monographs"
      ],
      "postedDate": "2026-08-20",
      "deadline": "2026-09-30",
      "status": "active",
      "ayushDomain": "Ayurveda",
      "openings": 5
    }
  ]
}
```

---

### 2.2 Get Internship By ID
- **Route**: `GET /api/internships/:id`
- **Access**: Public / Authenticated
- **Response (200 OK)**:
```json
{
  "data": {
    "id": "int_01",
    "title": "Phytochemical Analysis & Quality Control Intern",
    "company": "Dabur Research Foundation",
    "companyLogo": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=80",
    "location": "Ghaziabad, NCR, India",
    "isRemote": false,
    "stipend": "₹22,000 / month",
    "duration": "6 Months",
    "skillsRequired": ["HPTLC Fingerprinting", "Ayush-GMP Compliance", "Phytochemistry", "Pharmacopoeia Standards"],
    "description": "Work alongside senior formulation chemists at Dabur DRDC...",
    "responsibilities": ["..."],
    "requirements": ["..."],
    "postedDate": "2026-08-20",
    "deadline": "2026-09-30",
    "status": "active",
    "ayushDomain": "Ayurveda",
    "openings": 5
  }
}
```

---

### 2.3 Create New Internship (Industry Only)
- **Route**: `POST /api/internships`
- **Access**: Role `industry` or `admin`
- **Request Body**:
```json
{
  "title": "Clinical Trial Data Coordinator",
  "company": "CCRAS Research Division",
  "location": "New Delhi, India",
  "isRemote": false,
  "stipend": "₹25,000 / month",
  "duration": "6 Months",
  "skillsRequired": ["CCRAS GCP", "Clinical Rog Nidan", "Biostatistics"],
  "description": "Conduct clinical monitoring for multi-centric Ayurveda trials.",
  "responsibilities": ["Audit Case Report Forms", "Coordinate with institutional ethics committee"],
  "requirements": ["BAMS Intern or Graduate"],
  "deadline": "2026-10-15",
  "ayushDomain": "Ayurveda",
  "openings": 4
}
```
- **Response (201 Created)**:
```json
{
  "data": {
    "id": "int_1725369000000",
    "title": "Clinical Trial Data Coordinator",
    "company": "CCRAS Research Division",
    "location": "New Delhi, India",
    "isRemote": false,
    "stipend": "₹25,000 / month",
    "duration": "6 Months",
    "skillsRequired": ["CCRAS GCP", "Clinical Rog Nidan", "Biostatistics"],
    "description": "Conduct clinical monitoring for multi-centric Ayurveda trials.",
    "postedDate": "2026-09-03",
    "deadline": "2026-10-15",
    "status": "active",
    "ayushDomain": "Ayurveda",
    "openings": 4
  }
}
```

---

### 2.4 Apply for Internship
- **Route**: `POST /api/internships/:id/apply`
- **Access**: Role `student`
- **Request Body**:
```json
{
  "userId": "usr_student_01",
  "studentName": "Ananya Sharma",
  "studentEmail": "ananya.sharma@aiia.edu.in",
  "coverNote": "I have hands-on experience in Soxhlet extraction of Withania somnifera and HPLC at AIIA."
}
```
- **Response (201 Created)**:
```json
{
  "data": {
    "id": "app_1725369500000",
    "userId": "usr_student_01",
    "studentName": "Ananya Sharma",
    "studentEmail": "ananya.sharma@aiia.edu.in",
    "studentInstitute": "All India Institute of Ayurveda, New Delhi",
    "opportunityId": "int_01",
    "type": "internship",
    "opportunityTitle": "Phytochemical Analysis & Quality Control Intern",
    "companyName": "Dabur Research Foundation",
    "status": "applied",
    "appliedDate": "2026-09-03",
    "coverNote": "I have hands-on experience in Soxhlet extraction...",
    "skillMatchPercentage": 88
  }
}
```

---

## 3. Placement / Jobs Module

### 3.1 Get All Jobs
- **Route**: `GET /api/jobs`
- **Access**: Public / Authenticated
- **Query Parameters**: `domain`, `search`
- **Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "job_01",
      "title": "Senior Ayush Regulatory Affairs & Dossier Executive",
      "company": "Dabur India Ltd.",
      "companyLogo": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=80",
      "location": "New Delhi / NCR, India",
      "isRemote": false,
      "salary": "₹8.5 - 12.0 LPA",
      "experienceLevel": "Entry to 2 Years",
      "skillsRequired": ["Ayush-GMP Compliance", "DCGI & State Licensing", "Dossier Preparation", "Pharmacovigilance"],
      "description": "Responsible for filing regulatory license applications for classical and proprietary Ayurvedic formulations...",
      "postedDate": "2026-08-18",
      "deadline": "2026-10-15",
      "status": "active",
      "ayushDomain": "Ayurveda",
      "openings": 2
    }
  ]
}
```

---

### 3.2 Create Full-Time Job
- **Route**: `POST /api/jobs`
- **Access**: Role `industry` or `admin`
- **Request Body**:
```json
{
  "title": "Herbal Formulation Chemist",
  "company": "Himalaya Wellness",
  "location": "Bengaluru, India",
  "isRemote": false,
  "salary": "₹7.0 - 9.5 LPA",
  "experienceLevel": "0 - 2 Years",
  "skillsRequired": ["Dravyaguna Phytochemistry", "Tablet Granulation", "GMP Audits"],
  "description": "Formulate solid and liquid dosage forms from standardized herbal extracts.",
  "deadline": "2026-10-30",
  "ayushDomain": "Ayurveda",
  "openings": 3
}
```
- **Response (201 Created)**: Returns the newly created `Job` object.

---

### 3.3 Apply for Full-Time Job
- **Route**: `POST /api/jobs/:id/apply`
- **Access**: Role `student`
- **Request Body**: Same schema as `POST /api/internships/:id/apply`
- **Response (201 Created)**: Returns created `Application` with `"type": "job"`.

---

## 4. Skill Assessment & Radar Mapping Module

### 4.1 Get Student Skill Profile (Radar & Gap Analysis)
- **Route**: `GET /api/skills/profile?userId=usr_student_01`
- **Access**: Authenticated
- **Response (200 OK)**:
```json
{
  "data": {
    "userId": "usr_student_01",
    "overallScore": 84,
    "rankPercentile": 92,
    "lastAssessmentDate": "2026-08-28",
    "skills": [
      {
        "name": "Dravyaguna Phytochemistry",
        "level": 88,
        "industryBenchmark": 75,
        "verified": true,
        "category": "Phytochemistry"
      },
      {
        "name": "Clinical Rog Nidan & Diagnosis",
        "level": 90,
        "industryBenchmark": 80,
        "verified": true,
        "category": "Clinical Practice"
      },
      {
        "name": "Ayush-GMP & Regulatory Compliance",
        "level": 64,
        "industryBenchmark": 85,
        "verified": false,
        "category": "Regulatory & GMP"
      },
      {
        "name": "Herbarium & Botanical Taxonomy",
        "level": 85,
        "industryBenchmark": 70,
        "verified": true,
        "category": "Phytochemistry"
      },
      {
        "name": "Good Clinical Practice (GCP) & Trials",
        "level": 60,
        "industryBenchmark": 82,
        "verified": false,
        "category": "Research Methodology"
      },
      {
        "name": "Pharmacovigilance for Ayush Drugs",
        "level": 72,
        "industryBenchmark": 78,
        "verified": true,
        "category": "Pharmacovigilance"
      }
    ],
    "gapAnalysis": [
      {
        "skill": "Ayush-GMP & Regulatory Compliance",
        "currentLevel": 64,
        "requiredLevel": 85,
        "gapPercentage": 21,
        "priority": "High",
        "recommendedProgramId": "prog_01"
      },
      {
        "skill": "Good Clinical Practice (GCP) & Trials",
        "currentLevel": 60,
        "requiredLevel": 82,
        "gapPercentage": 22,
        "priority": "High",
        "recommendedProgramId": "prog_02"
      }
    ]
  }
}
```

---

### 4.2 Get Skill Assessment Questions
- **Route**: `GET /api/skills/assessment/questions`
- **Access**: Role `student`
- **Response (200 OK)**:
```json
{
  "data": [
    {
      "id": 1,
      "category": "Dravyaguna Phytochemistry",
      "question": "Which spectroscopic technique is officially prescribed in the Ayurvedic Pharmacopoeia of India (API) for marker quantification?",
      "options": [
        "UV-Vis Spectrophotometry only",
        "High-Performance Thin-Layer Chromatography (HPTLC)",
        "Flame Atomic Absorption Spectrophotometry",
        "Differential Scanning Calorimetry"
      ],
      "correctIndex": 1,
      "explanation": "HPTLC is widely mandated by API monographs...",
      "weight": 20
    }
  ]
}
```

---

### 4.3 Submit Skill Assessment Answers
- **Route**: `POST /api/skills/assessment/submit`
- **Access**: Role `student`
- **Request Body**:
```json
{
  "answers": {
    "1": 1,
    "2": 0,
    "3": 1,
    "4": 1,
    "5": 0
  }
}
```
- **Response (200 OK)**:
```json
{
  "data": {
    "score": 88,
    "profile": {
      "userId": "usr_student_01",
      "overallScore": 88,
      "rankPercentile": 96,
      "lastAssessmentDate": "2026-09-03",
      "skills": [ "..." ],
      "gapAnalysis": [ "..." ]
    }
  }
}
```

---

### 4.4 Get Student Digital Portfolio (Certificates & Projects)
- **Route**: `GET /api/skills/portfolio?userId=usr_student_01`
- **Access**: Authenticated
- **Response (200 OK)**:
```json
{
  "data": {
    "certificates": [
      {
        "id": "cert_01",
        "title": "Certified Ayush Pharmacovigilance Associate",
        "issuer": "National Pharmacovigilance Centre, AIIA New Delhi",
        "issueDate": "July 2026",
        "credentialUrl": "https://verify.ayush.gov.in/cert/NPC-2026-8819",
        "verified": true,
        "badgeIcon": "ShieldCheck"
      }
    ],
    "projects": [
      {
        "id": "proj_01",
        "title": "Comparative Phytochemical Fingerprinting of Commercial Ashwagandha",
        "role": "Lead Student Researcher",
        "technologies": ["HPTLC", "Soxhlet Extraction", "Spectrophotometry"],
        "description": "Evaluated total withanolide content against API standards.",
        "link": "https://doi.org/10.1016/j.jaim.2026.04.012",
        "startDate": "Jan 2026",
        "endDate": "May 2026"
      }
    ]
  }
}
```

---

### 4.5 Add Student Research Project
- **Route**: `POST /api/skills/portfolio/projects`
- **Access**: Role `student`
- **Request Body**:
```json
{
  "title": "HPTLC Marker Quantification of Curcuma Longa",
  "role": "Student Co-Investigator",
  "technologies": ["HPTLC", "Curcuminoids", "API Monographs"],
  "description": "Quantified curcumin and demethoxycurcumin in field samples.",
  "link": "https://doi.org/10.1016/curcumin-analysis",
  "startDate": "Jan 2026",
  "endDate": "Apr 2026"
}
```
- **Response (201 Created)**: Returns created `StudentProject` object with `id`.

---

## 5. Learning & Skill Bridge Recommendations

### 5.1 Get Learning Programs
- **Route**: `GET /api/learning/programs`
- **Access**: Public / Authenticated
- **Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "prog_01",
      "title": "Masterclass in Schedule T Ayush-GMP & Regulatory Dossiers",
      "provider": "NIPER & Dabur Research",
      "providerLogo": "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=80",
      "type": "certification",
      "duration": "4 Weeks (Self-paced)",
      "skillsCovered": ["Ayush-GMP Compliance", "Schedule T Auditing", "Clean Room Validation"],
      "description": "Industry-accredited program covering Schedule T compliance...",
      "rating": 4.8,
      "enrolledCount": 1420,
      "level": "Intermediate",
      "cost": "Free (SIH Sponsored)",
      "ayushDomain": "Ayurveda",
      "syllabus": [
        "Overview of Drugs & Cosmetics Act 1940: Chapter IV-A",
        "Schedule T Requirements: Machinery, air handling, water systems"
      ]
    }
  ]
}
```

---

### 5.2 Enroll in Learning Program
- **Route**: `POST /api/learning/programs/:id/enroll`
- **Access**: Role `student`
- **Response (200 OK)**:
```json
{
  "data": {
    "success": true,
    "message": "Enrolled successfully in 'Masterclass in Schedule T Ayush-GMP'! Course materials added to learning dashboard."
  }
}
```

---

### 5.3 Post Learning Program (Industry / Academician)
- **Route**: `POST /api/learning/programs`
- **Access**: Role `industry` or `academician`
- **Request Body**:
```json
{
  "title": "Hands-on Supercritical CO2 Phyto-Extraction",
  "provider": "Dabur R&D Centre",
  "type": "workshop",
  "duration": "2 Weeks",
  "skillsCovered": ["Supercritical Extraction", "Phytochemistry"],
  "description": "Practical solvent-free green extraction protocols.",
  "level": "Intermediate",
  "cost": "Free (Corporate Sponsored)",
  "ayushDomain": "Ayurveda",
  "syllabus": ["Principles of SCF extraction", "Yield calculation"]
}
```
- **Response (201 Created)**: Returns created `LearningProgram`.

---

## 6. Applications Management

### 6.1 Get Student's Own Applications
- **Route**: `GET /api/applications/my?userId=usr_student_01`
- **Access**: Role `student`
- **Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "app_01",
      "userId": "usr_student_01",
      "studentName": "Ananya Sharma",
      "studentEmail": "ananya.sharma@aiia.edu.in",
      "studentInstitute": "All India Institute of Ayurveda, New Delhi",
      "opportunityId": "int_01",
      "type": "internship",
      "opportunityTitle": "Phytochemical Analysis & Quality Control Intern",
      "companyName": "Dabur Research Foundation",
      "status": "shortlisted",
      "appliedDate": "2026-08-22",
      "interviewDate": "2026-09-12 11:30 AM IST",
      "skillMatchPercentage": 88
    }
  ]
}
```

---

### 6.2 Get Company Applicants (Industry Recruiter)
- **Route**: `GET /api/applications/company`
- **Access**: Role `industry` or `admin`
- **Response (200 OK)**: List of `Application` items with student details and compatibility scores.

---

### 6.3 Update Application Status (Industry Recruiter)
- **Route**: `PATCH /api/applications/:id/status`
- **Access**: Role `industry` or `admin`
- **Request Body**:
```json
{
  "status": "interview_scheduled" // "applied" | "in_review" | "shortlisted" | "interview_scheduled" | "offered" | "rejected"
}
```
- **Response (200 OK)**:
```json
{
  "data": {
    "id": "app_01",
    "status": "interview_scheduled",
    "interviewDate": "2026-09-18 10:30 AM IST (Virtual Room 1)",
    "opportunityTitle": "Phytochemical Analysis & Quality Control Intern"
  }
}
```

---

## 7. Notifications Module

### 7.1 Get User Notifications
- **Route**: `GET /api/notifications`
- **Access**: Authenticated
- **Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "notif_01",
      "userId": "usr_student_01",
      "title": "Interview Scheduled - Dabur DRDC",
      "message": "Dabur Research Foundation has shortlisted your application for Phytochemical Analysis & QC Intern.",
      "read": false,
      "timestamp": "2 hours ago",
      "type": "application",
      "link": "/student/applications"
    }
  ]
}
```

---

### 7.2 Mark Notification as Read
- **Route**: `PATCH /api/notifications/:id/read`
- **Access**: Authenticated
- **Response (200 OK)**:
```json
{
  "data": true
}
```

---

### 7.3 Mark All Notifications as Read
- **Route**: `PATCH /api/notifications/read-all`
- **Response (200 OK)**: `{ "data": true }`

---

## 8. Academician & Faculty Module

### 8.1 Get Faculty Opportunities (Immersion & Grants)
- **Route**: `GET /api/academician/opportunities`
- **Access**: Role `academician`
- **Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "fac_01",
      "title": "Industry Sabbatical in Phyto-Bioavailability Enhancement",
      "organization": "Himalaya Wellness Research Labs",
      "type": "Immersion",
      "stipendOrGrant": "₹75,000 / month Fellowship + Boarding",
      "duration": "2 Months",
      "deadline": "2026-10-01",
      "description": "Collaborate with Himalaya formulation scientists on lipid-based nano-emulsions.",
      "requirements": ["Minimum 5 years teaching/research experience"],
      "ayushDomain": "Ayurveda",
      "status": "open"
    }
  ]
}
```

---

### 8.2 Get Hosted Workshops
- **Route**: `GET /api/academician/workshops`
- **Response (200 OK)**: List of `Workshop` items with date, mode, registered count, and capacity.

---

### 8.3 Create New Workshop / Webinar
- **Route**: `POST /api/academician/workshops`
- **Access**: Role `academician`
- **Request Body**:
```json
{
  "title": "Modern HPTLC Identification of Ayurvedic Raw Herbs",
  "organizer": "National Institute of Ayurveda, Jaipur",
  "facultyName": "Prof. Rajeshwar Shastri",
  "date": "2026-10-12",
  "time": "02:00 PM - 05:00 PM IST",
  "mode": "Online",
  "capacity": 150,
  "description": "Demonstrating densitometric scanning of adulterants in commercial churnas.",
  "targetAudience": "BAMS Interns and MD Scholars"
}
```
- **Response (201 Created)**: Returns created `Workshop` object with `id`.

---

### 8.4 Get Mentorship Requests
- **Route**: `GET /api/academician/mentorship/requests`
- **Access**: Role `academician`
- **Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "ment_01",
      "studentId": "usr_student_01",
      "studentName": "Ananya Sharma",
      "studentEmail": "ananya.sharma@aiia.edu.in",
      "topic": "Guidance on HPTLC Marker Selection for Ashwagandha",
      "message": "Respected Sir, seeking 30 minutes guidance on Withaferin-A Rf values.",
      "preferredDate": "2026-09-15 04:00 PM IST",
      "status": "accepted",
      "meetingLink": "https://meet.ayushportal.gov.in/shastri-guidance"
    }
  ]
}
```

---

### 8.5 Update Mentorship Request Status
- **Route**: `PATCH /api/academician/mentorship/requests/:id`
- **Request Body**:
```json
{
  "status": "accepted" // "accepted" | "declined"
}
```
- **Response (200 OK)**: Returns updated `MentorshipRequest` with auto-generated `meetingLink`.

---

## 9. Institution / Admin Module

### 9.1 Get Institutional KPI Stats
- **Route**: `GET /api/admin/stats`
- **Access**: Role `admin`
- **Response (200 OK)**:
```json
{
  "data": {
    "totalStudents": 2840,
    "activePartners": 64,
    "totalInternshipsPosted": 198,
    "internshipsFilled": 164,
    "overallPlacementRate": "91.4%",
    "avgSkillIndex": 78.6,
    "pendingVerifications": 5,
    "mouSignedCount": 38
  }
}
```

---

### 9.2 Get Partner Organizations & MoUs
- **Route**: `GET /api/admin/partners`
- **Access**: Role `admin`
- **Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "part_01",
      "name": "Dabur Research & Development Foundation",
      "category": "Herbal Pharmaceutical",
      "location": "Ghaziabad, UP",
      "mouStatus": "Active MoU",
      "mouValidUntil": "2028-12-31",
      "activeInterns": 14,
      "totalHired": 48,
      "status": "Approved"
    },
    {
      "id": "part_05",
      "name": "AyurVeda LifeSciences Biotech Labs",
      "category": "Startup / Phyto-Extraction",
      "location": "Pune, Maharashtra",
      "mouStatus": "Pending Verification",
      "mouValidUntil": "Under Review",
      "activeInterns": 0,
      "totalHired": 0,
      "status": "Pending"
    }
  ]
}
```

---

### 9.3 Approve Partner Accreditation
- **Route**: `PATCH /api/admin/partners/:id/approve`
- **Access**: Role `admin`
- **Response (200 OK)**: `{ "data": true }`

---

### 9.4 Block Partner Accreditation
- **Route**: `PATCH /api/admin/partners/:id/block`
- **Access**: Role `admin`
- **Response (200 OK)**: `{ "data": true }`

---

### 9.5 Get Departmental Skill Analytics & At-Risk Roster
- **Route**: `GET /api/admin/progress`
- **Access**: Role `admin`
- **Response (200 OK)**:
```json
{
  "data": {
    "departmentAverages": [
      { "department": "Dravyaguna Vigyana", "score": 84, "students": 640 },
      { "department": "Rasashastra & Bhaishajya Kalpana", "score": 79, "students": 580 },
      { "department": "Rog Nidan & Vikriti Vigyana", "score": 82, "students": 710 },
      { "department": "Panchakarma", "score": 86, "students": 510 }
    ],
    "skillTrend": [
      { "month": "Apr", "index": 68 },
      { "month": "May", "index": 71 },
      { "month": "Jun", "index": 74 },
      { "month": "Jul", "index": 79 },
      { "month": "Aug", "index": 82 },
      { "month": "Sep", "index": 85 }
    ],
    "atRiskStudents": [
      {
        "name": "Kavita Joshi",
        "institute": "Govt Ayurved College, Nanded",
        "score": 54,
        "gap": "Ayush-GMP & Regulations",
        "status": "Intervention Required"
      }
    ]
  }
}
```

---

## 10. How to Connect Frontend to Real Backend

When your backend is ready:
1. In `src/services/api.ts`, replace the `delay()` mock dispatchers with real `fetch()` or `axios` calls:
```typescript
const BASE_URL = import.meta.env.VITE_API_URL || 'https://sih26044-ayush-portal-production.up.railway.app/api';

const request = async <T>(url: string, options?: RequestInit): Promise<{ data: T }> => {
  const token = localStorage.getItem('ayush_portal_token');
  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'API request failed');
  }
  return res.json();
};
```
2. Because the types and data structures match 100%, zero component refactoring is needed!
