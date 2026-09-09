# AYUSH-Connect | SIH26044 Portal

**National Portal for Academia–Industry Collaboration for Skill Mapping, Internships and Placement in Indian Ayush & Herbal Bio-Pharma**

> Developed for **Smart India Hackathon (Problem ID: SIH26044)**  
> **Production-Ready Decoupled Architecture**: Separate `client/` (frontend) and `server/` (backend) for easy, independent deployments.

---

## 🌟 Architecture Overview

The repository is organized into distinct, isolated directories for frontend and backend:

```
sih26044-ayush-portal/
├── client/                               # FRONTEND (React 18 + Vite + Tailwind CSS)
│   ├── src/                              # React components, pages, stores, hooks
│   │   ├── components/                   # Reusable UI components & modals
│   │   ├── layouts/                      # DashboardLayout, PublicLayout, ProtectedRoute
│   │   ├── pages/                        # 28 functional screens across 4 user roles
│   │   ├── services/                     # Unified API dispatcher & mock dataset
│   │   ├── store/                        # Zustand stores (auth, notifications, apps)
│   │   └── types/                        # TypeScript interfaces & domain types
│   ├── public/                           # Static assets & Netlify _redirects
│   ├── index.html                        # Application HTML entry
│   ├── package.json                      # Frontend dependencies & scripts
│   ├── vite.config.ts                    # Vite bundler configuration
│   ├── tsconfig.json                     # Frontend TypeScript configuration
│   ├── tailwind.config.js                # Tailwind CSS design system
│   ├── vercel.json                       # Vercel SPA route rewrite rules
│   ├── .env.example                      # Frontend environment variable template
│   └── .gitignore
│
├── server/                               # BACKEND (Node.js + Express + TypeScript + MongoDB)
│   ├── src/
│   │   ├── config/                       # Database, Redis, and Cloudinary config
│   │   ├── controllers/                  # Route business logic handlers
│   │   ├── middleware/                   # Auth (JWT), rate limiting, error handlers
│   │   ├── models/                       # Mongoose schemas (User, Internship, Job, etc.)
│   │   ├── routes/                       # Express REST API route definitions
│   │   ├── services/                     # Socket.IO WebRTC, AI Groq, Email service
│   │   └── server.ts                     # Main Express server entry point
│   ├── package.json                      # Backend dependencies & scripts
│   ├── tsconfig.json                     # Server TypeScript configuration
│   ├── .env.example                      # Backend environment variable template
│   └── .gitignore
│
├── package.json                          # Monorepo root orchestration scripts
├── .gitignore                            # Root gitignore
└── README.md                             # Project & deployment documentation
```

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies
You can install dependencies for both client and server from the root directory:
```bash
npm run install:all
```
*(Or navigate into each directory: `cd client && npm install` and `cd server && npm install`)*

### 2. Configure Environment Variables
- **Frontend (`client/`)**:
  Copy `client/.env.example` to `client/.env`:
  ```bash
  VITE_API_URL=https://sih26044-ayush-portal.onrender.com/api
  VITE_BACKEND_URL=https://sih26044-ayush-portal.onrender.com
  ```
- **Backend (`server/`)**:
  Copy `server/.env.example` to `server/.env`:
  ```bash
  PORT=5000
  NODE_ENV=production
  FRONTEND_URL=https://sih26044-ayush-portal.vercel.app
  CORS_ORIGINS=https://sih26044-ayush-portal.vercel.app,http://localhost:5173,http://localhost:3000
  MONGODB_URI=your_mongodb_connection_string
  JWT_SECRET=your_jwt_secret_key
  ```

### 3. Run Development Servers
From the root directory:
- **Run Frontend Client**:
  ```bash
  npm run dev:client
  ```
  *(Runs on `http://localhost:5173`)*

- **Run Backend Server**:
  ```bash
  npm run dev:server
  ```
  *(Runs on `http://localhost:5000`)*

### 4. Build for Production
To build both client and server from the root:
```bash
npm run build
```
Or build each individually:
- Client: `npm run build:client` (output in `client/dist/`)
- Server: `npm run build:server` (output in `server/dist/`)

---

## 🌐 Deployment Instructions

Because the frontend and backend are decoupled, you can deploy them easily to your choice of modern cloud providers.

### Option 1: Frontend Deployment (Client)

#### Deploying on Vercel
1. Link your GitHub repository in Vercel.
2. Under **Project Settings**:
   - **Root Directory**: `client`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add Environment Variables:
   - `VITE_API_URL`: Your deployed backend API URL (e.g. `https://ayush-api.onrender.com/api`)
   - `VITE_BACKEND_URL`: Your deployed backend root URL (e.g. `https://ayush-api.onrender.com`)
4. The included `client/vercel.json` automatically handles SPA routing.

#### Deploying on Netlify
1. Connect your repository in Netlify.
2. Configure build settings:
   - **Base directory**: `client`
   - **Build command**: `npm run build`
   - **Publish directory**: `client/dist`
3. Add Environment Variables (`VITE_API_URL`, `VITE_BACKEND_URL`).
4. The included `client/public/_redirects` ensures React Router SPA URLs work without 404s.

---

### Option 2: Backend Deployment (Server)

#### Deploying on Render (Web Service)
1. Create a **New Web Service** pointing to your repository.
2. Configure settings:
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
3. Add Environment Variables:
   - `PORT`: `5000` (or leave default, Render supplies `PORT`)
   - `NODE_ENV`: `production`
   - `MONGODB_URI`: `mongodb+srv://...`
   - `JWT_SECRET`: A secure random secret string
   - `FRONTEND_URL`: `https://sih26044-ayush-portal.vercel.app`
   - `CORS_ORIGINS`: `https://sih26044-ayush-portal.vercel.app`

#### Deploying on Railway
1. Create a new service and set **Root Directory** to `/server`.
2. Railway detects Node.js automatically.
3. Set build command `npm run build` and start command `npm start`.
4. Supply your MongoDB and JWT variables in the Railway Variables tab.

---

## 🧭 Preloaded Demo Accounts for Evaluation

| Role | Demo Persona | Affiliation / Organization | Quick Link |
| :--- | :--- | :--- | :--- |
| **Student** | Ananya Sharma | All India Institute of Ayurveda (AIIA), New Delhi | `/student/dashboard` |
| **Industry** | Dr. Vikram Malhotra | Dabur Research & Development Centre (DRDC) | `/industry/dashboard` |
| **Academician** | Prof. Rajeshwar Shastri | National Institute of Ayurveda (NIA), Jaipur | `/academician/dashboard` |
| **Admin** | Dr. Sunita Kulkarni | Ministry of Ayush / Central Accreditation Council | `/admin/dashboard` |

---

## 🏆 Smart India Hackathon Compliance
- Addresses all requirements of **SIH26044**.
- Complete 28 screens mapped and fully interactive.
- All form submissions, filters, search bars, and state updates work seamlessly out of the box.