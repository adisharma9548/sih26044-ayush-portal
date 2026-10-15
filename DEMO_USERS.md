# NodalConnector — Demo Access & Evaluation Guide

This document describes the **secure demo evaluation architecture** for the **NodalConnector** platform across all supported user roles: **Student**, **Industry**, **Academia**, and **Institution**.

> [!SECURITY NOTE]
> In accordance with strict production security standards, all plaintext credentials have been completely purged from this repository. Demo accounts are dynamically provisioned through the real registration engine, isolated with `isDemo: true`, and strictly protected via server-side access control.

---

## 🔒 Secure Demo Access Architecture

Demo accounts are isolated from production search, candidate listings, and public analytics via the global `REAL_USER_FILTER`:
- `accountType: 'demo'`
- `isDemo: true`

### 1. Environment Configuration
To enable demo account evaluation on your local or staging environment, configure the following variables in `server/.env`:

```env
# Secret password used when provisioning demo evaluation accounts
DEMO_ACCOUNT_PASSWORD=your_secure_random_demo_password

# Server-side access code required to authenticate into any demo account
DEMO_ACCESS_CODE=your_secret_demo_access_code
```

### 2. Automated Demo Provisioning
Administrators or platform owners can provision standard evaluation accounts using the secure script:

```bash
cd server
npm run seed:demo
# Or via protected Admin API:
# POST /api/admin/demo-accounts/provision (Admin JWT required)
```

The provisioning script registers demo accounts across all platform stakeholder archetypes:
* **Student Demo**: `student.demo@nodalconnector.in` (Profile preloaded with skill diagnostic attempts, verified resume, and roadmap)
* **Industry Demo**: `industry.demo@nodalconnector.in` (Preloaded with active internships and applicant listings)
* **Academia Demo**: `academia.demo@nodalconnector.in` (Preloaded with faculty programs and student mentorship requests)
* **Institution Admin Demo**: `institution.demo@nodalconnector.in` (Scoped to institutional cohort analytics and placement metrics)

### 3. Authenticating into Demo Accounts
When logging into any account with `isDemo: true`:
1. Submit the login request to `POST /api/auth/login`.
2. Provide the `x-demo-access-code` header (matching `DEMO_ACCESS_CODE` in `.env`).
3. If the header is missing or does not match, the server rejects the login attempt with `403 FORBIDDEN` to prevent unauthorized public access.

---

## 🛡️ Live Environment Audit Findings

During security verification, previous commits containing plaintext credentials were identified:
* All credentials in this file have been purged.
* Personal accounts previously listed in documentation must have their passwords rotated immediately if reused on external services.
* Repository owners should perform a git history rewrite (via `git-filter-repo` or BFG) to permanently purge legacy commit history.
