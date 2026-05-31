# Susu-BG Deployment Guide

## Architecture

```
Frontend (Vercel)           Backend (Vercel)            Database (Supabase)
susu-bg.vercel.app   ──►   susu-bg-api.vercel.app  ──►  srlneqekqvnzpckhksdn.supabase.co
```

- **Frontend**: Next.js (auto-detected by Vercel)
- **Backend**: Express.js via `@vercel/node` serverless function
- **Database**: Supabase PostgreSQL

## Prerequisites

- [Vercel](https://vercel.com) account (Hobby plan — free)
- [Supabase](https://supabase.com) project already set up
- GitHub repo pushed with all changes

## Step 1: Create Vercel Project — Backend

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repo (`grehub24-dot/susu-bg`)
3. Configure:
   - **Root Directory**: `backend`
   - **Framework**: Other
   - **Build Command**: `npm install`
   - **Output Directory**: (leave empty)
4. Add **Environment Variables**:

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | `https://srlneqekqvnzpckhksdn.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | (your service_role key) |
| `AUTH_JWT_SECRET` | (your JWT secret) |
| `ADMIN_API_KEY` | `admin-secret-key-123` (change in production) |
| `ALLOWED_ORIGINS` | `https://susu-bg.vercel.app,https://susu-bg-yourname.vercel.app` |
| `FRONTEND_URL` | `https://susu-bg.vercel.app` |
| `BODY_LIMIT` | `4mb` (Vercel Hobby limit) |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | (your email) |
| `SMTP_PASS` | (app password) |
| `NODE_ENV` | `production` |

5. Click **Deploy**

> After deployment, note your backend URL: `https://susu-bg-api.vercel.app`

## Step 2: Create Vercel Project — Frontend

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the same GitHub repo
3. Configure:
   - **Root Directory**: `frontend`
   - **Framework**: Next.js (auto-detected)
   - **Build Command**: `npm run build`
4. Add **Environment Variables**:

| Variable | Value |
|----------|-------|
| `BACKEND_URL` | `https://susu-bg-api.vercel.app` |
| `NEXT_PUBLIC_BACKEND_URL` | `https://susu-bg-api.vercel.app` |
| `NEXT_PUBLIC_ADMIN_API_KEY` | `admin-secret-key-123` |

5. Click **Deploy**

## Step 3: Apply Supabase Schema

Run the schema against your Supabase project:

```bash
# Option A: Use Supabase CLI
supabase link --project-ref srlneqekqvnzpckhksdn
supabase db push

# Option B: Run manually in Supabase SQL Editor
# Open https://supabase.com/dashboard/project/srlneqekqvnzpckhksdn/sql
# Paste and run supabase/schema.sql
```

## Step 4: Verify Deployment

- Frontend: `https://susu-bg.vercel.app`
- Backend health: `https://susu-bg-api.vercel.app/health`
- API docs: `https://susu-bg-api.vercel.app/api-docs`

## Env Vars Summary

### Backend (`susu-bg-api.vercel.app`)

| Variable | Required | Notes |
|----------|----------|-------|
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Secret key — do not expose |
| `AUTH_JWT_SECRET` | ✅ | Generate with `openssl rand -hex 64` |
| `ADMIN_API_KEY` | ✅ | Shared secret for admin auth |
| `ALLOWED_ORIGINS` | ✅ | Comma-separated frontend URLs |
| `FRONTEND_URL` | ✅ | Frontend URL for redirects |
| `BODY_LIMIT` | ❌ | Default: `50mb`, set `4mb` on Vercel Hobby |
| `SMTP_*` | ❌ | Email notifications |
| `WIGAL_*` | ❌ | SMS/OTP service |
| `NODE_ENV` | ❌ | Default: `production` on Vercel |

### Frontend (`susu-bg.vercel.app`)

| Variable | Required | Notes |
|----------|----------|-------|
| `BACKEND_URL` | ✅ | Backend Vercel URL (server-side) |
| `NEXT_PUBLIC_BACKEND_URL` | ✅ | Same as BACKEND_URL (client-side) |
| `NEXT_PUBLIC_ADMIN_API_KEY` | ✅ | Must match backend's `ADMIN_API_KEY` |
