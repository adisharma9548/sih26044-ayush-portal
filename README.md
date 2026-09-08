# AYUSH-Connect | SIH26044 Portal

**National Portal for Academia–Industry Collaboration for Skill Mapping, Internships and Placement in Indian Ayush & Herbal Bio-Pharma**

> Developed for **Smart India Hackathon (Problem ID: SIH26044)**  
> **"Backend-Ready but No Backend" Architecture** with full TypeScript typed mock service layer.

---

## 🌟 Key Features & Ecosystem Highlights

1. **4 Role Ecosystem (28 Functional Screens)**:
   - **Student (10 screens)**: Skill Assessment Quiz, SVG Competency Radar & Gap Analysis, AI-Recommended Courses, Searchable Internships Directory with Stipends, Full-Time Graduate Jobs, My Applications Lifecycle Tracker, and Verified Digital Portfolio with badges.
   - **Industry (5 screens)**: Recruiter Overview, Post New Internship / Job Form, Sponsor Learning Module Form, Manage & Review Candidate Applications (with resume modal), and Talent Scout Candidate Search.
   - **Academician (3 screens)**: Guided Faculty Dashboard, Industry Immersion Programs & Joint Grants, Student 1-on-1 Mentorship Request Manager & Workshop Creator.
   - **Institution Admin (4 screens)**: Macro Institutional KPIs, Student & Faculty Progress Metrics, Regulatory Analytics with simulated PDF / CSV Export, and Partner Organization Accreditation Governance.
   - **Common / Authentication (6 screens)**: Impactful Landing Page, 1-Click Instant Demo Login, Contextual Signup, Forgot/Reset Password OTP flow, Notification Feed, Profile & Settings.

2. **Hackathon Judge 1-Click Role Switcher**:
   - A sticky, prominent bar at the very top of the app allowing evaluators and presentation judges to instantly switch between **Student**, **Industry**, **Academician**, and **Institution Admin** with zero typing!

3. **Domain-Specific Ayush Realism**:
   - Tailored specifically to Indian Ayush entities: **Dabur Research Foundation**, **Himalaya Wellness**, **CCRAS (Central Council for Research in Ayurvedic Sciences)**, **All India Institute of Ayurveda (AIIA)**, **Patanjali Bio-Research**, **Kottakkal Arya Vaidya Sala**, and **Charak Pharma**.
   - Technical competencies mapped against **Schedule T GMP**, **Ayurvedic Pharmacopoeia (API)**, **HPTLC Fingerprinting**, **Clinical Rog Nidan**, and **GCP Protocols**.

4. **"Backend-Ready" Architecture**:
   - Every API call lives in `src/services/api.ts` returning `Promise<{ data: T }>` with synthetic network latency.
   - Swapping to a production Express/FastAPI/NestJS backend only requires changing the base URL and fetch dispatchers in `api.ts`.

---

## 🛠️ Technology Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS 3.4
- **Icons**: Lucide React
- **State Management**: Zustand
- **Routing**: React Router DOM v6 with role-based route guards
- **Data Visualizations**: Custom SVG Radar Chart & Circular Progress Gauges

---

## 🚀 Quick Start Guide

### 1. Installation
Navigate to the project directory and install dependencies:

```bash
cd C:\Users\adish\.gemini\antigravity\scratch\sih26044-ayush-portal
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
Open your browser and navigate to:
```
http://localhost:5173
```

### 3. Build for Production
```bash
npm run build
```

---

## 🧭 Preloaded Demo Accounts for Evaluation

| Role | Demo Persona | Affiliation / Organization | Quick Link |
| :--- | :--- | :--- | :--- |
| **Student** | Ananya Sharma | All India Institute of Ayurveda (AIIA), New Delhi | `/student/dashboard` |
| **Industry** | Dr. Vikram Malhotra | Dabur Research & Development Centre (DRDC) | `/industry/dashboard` |
| **Academician** | Prof. Rajeshwar Shastri | National Institute of Ayurveda (NIA), Jaipur | `/academician/dashboard` |
| **Admin** | Dr. Sunita Kulkarni | Ministry of Ayush / Central Accreditation Council | `/admin/dashboard` |

---

## 📂 Project Structure

```
sih26044-ayush-portal/
├── src/
│   ├── types/               # Core domain interfaces (User, Internship, Job, SkillProfile, etc.)
│   ├── services/            # API dispatcher & mock Ayush dataset
│   │   ├── api.ts           # Unified API layer returning Promise<{ data: T }>
│   │   └── mockData.ts      # Seed database for Ayush entities
│   ├── store/               # Zustand state stores
│   │   ├── useAuthStore.ts
│   │   ├── useNotificationStore.ts
│   │   └── useApplicationStore.ts
│   ├── hooks/               # useAuth, useDebounce
│   ├── utils/               # formatters, helpers
│   ├── components/
│   │   ├── common/          # Navbar, Sidebar, Footer, DemoRoleSwitcher, Modal, Badge, RadarChart, GaugeScore
│   ├── layouts/             # PublicLayout, DashboardLayout, ProtectedRoute
│   ├── pages/
│   │   ├── common/          # Landing, Login, Signup, ForgotPassword, Notifications, Profile
│   │   ├── student/         # Dashboard, Assessment, Skills Radar, Learning, Internships, Jobs, Applications, Portfolio
│   │   ├── industry/        # Dashboard, Post, PostProgram, Applicants, CandidateSearch
│   │   ├── academician/     # Dashboard, Opportunities, Mentorship
│   │   └── admin/           # Dashboard, Progress, AnalyticsReports, ManageUsers
│   ├── App.tsx              # React Router setup
│   ├── main.tsx             # DOM entry point
│   └── index.css            # Tailwind directives
```

---

## 🏆 Smart India Hackathon Compliance
- Addresses all requirements of **SIH26044**.
- Complete 28 screens mapped and fully interactive.
- All form submissions, filters, search bars, and state updates work seamlessly out of the box.
