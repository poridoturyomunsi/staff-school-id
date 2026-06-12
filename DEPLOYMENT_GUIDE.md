# 🚀 Deployment Guide

Complete instructions for deploying your Staff ID Management System to production.

## Quick Start (Choose Your Platform)

- [🔵 Netlify](#netlify-deployment) - Easiest, free tier available
- [⚫ Vercel](#vercel-deployment) - Optimized for React, free tier available
- [🟣 GitHub Pages](#github-pages-deployment) - Free with GitHub account

---

## Prerequisites

Before deploying anywhere, ensure you have:

1. ✅ **Local `.env.local`** configured with Firebase credentials
   - See [DEPLOYMENT_ENV_VARIABLES.md](./DEPLOYMENT_ENV_VARIABLES.md) for details
2. ✅ **Firebase project created** at [firebase.google.com](https://firebase.google.com)
3. ✅ **Firestore database initialized** in Firebase
4. ✅ **Firebase Storage enabled** for photos/signatures
5. ✅ **Security rules configured** (see [FIREBASE_SETUP.md](./FIREBASE_SETUP.md))

---

## Netlify Deployment

### Step 1: Build Your App Locally

```bash
npm run build
```

You should see:
```
✓ 1234 modules transformed
✓ built in 4.23s
```

### Step 2: Connect to Git

1. Push your code to GitHub/GitLab/Bitbucket
2. Go to [netlify.com](https://netlify.com)
3. Click **Add new site** → **Import an existing project**
4. Connect your Git provider and select your repo

### Step 3: Configure Build Settings

Netlify should auto-detect:
- **Build command**: `npm run build`
- **Publish directory**: `dist`

Click **Deploy site** (we'll add env vars next)

### Step 4: Add Environment Variables

1. After initial deploy, go to **Site Settings** → **Build & Deploy** → **Environment**
2. Click **Add environment variables**
3. Add all 6 Firebase variables (see [DEPLOYMENT_ENV_VARIABLES.md](./DEPLOYMENT_ENV_VARIABLES.md))
4. Click **Trigger new deploy** to redeploy with variables

### Step 5: Configure Redirects

Your `netlify.toml` already handles this, but verify:
- Go to **Site Settings** → **Build & Deploy** → **Deploy contexts**
- Ensure SPA redirects are configured

### Your Live URL

After deployment, Netlify gives you:
```
https://your-site-name.netlify.app
```

---

## Vercel Deployment

### Step 1: Build Your App Locally

```bash
npm run build
```

### Step 2: Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Or connect via dashboard:
1. Go to [vercel.com](https://vercel.com)
2. Click **Add New** → **Project**
3. Select your repository

### Step 3: Add Environment Variables

**Before deploying:**
1. Go to your project **Settings** → **Environment Variables**
2. Add all 6 Firebase variables (see [DEPLOYMENT_ENV_VARIABLES.md](./DEPLOYMENT_ENV_VARIABLES.md))
3. Select **Production**, **Preview**, **Development** for each

### Step 4: Redeploy

```bash
vercel --prod
```

Or click **Redeploy** in the Vercel dashboard.

### Your Live URL

```
https://your-project-name.vercel.app
```

---

## GitHub Pages Deployment

### Step 1: Update `vite.config.js`

Add base path (if deploying to `username.github.io/staff-id-manager`):

```javascript
export default defineConfig({
  base: '/staff-id-manager/', // or '/' if deploying to username.github.io
  plugins: [react()],
  server: {
    allowedHosts: true
  }
})
```

### Step 2: Create GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
          VITE_FIREBASE_STORAGE_BUCKET: ${{ secrets.VITE_FIREBASE_STORAGE_BUCKET }}
          VITE_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}
          VITE_FIREBASE_APP_ID: ${{ secrets.VITE_FIREBASE_APP_ID }}
        run: npm run build
      
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

### Step 3: Add Environment Secrets

1. Go to your repo **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add all 6 Firebase variables (see [DEPLOYMENT_ENV_VARIABLES.md](./DEPLOYMENT_ENV_VARIABLES.md))

### Step 4: Enable Pages

1. Go to **Settings** → **Pages**
2. Set **Source** to **Deploy from a branch**
3. Set **Branch** to `gh-pages`

### Step 5: Deploy

Push to main branch:
```bash
git add .
git commit -m "Configure deployment"
git push origin main
```

### Your Live URL

```
https://username.github.io
# or
https://username.github.io/staff-id-manager (if using subdirectory)
```

---

## Deployment Checklist

Before deploying, verify:

- [ ] All 6 Firebase env variables are correct
- [ ] `.env.local` is in `.gitignore` (won't be committed)
- [ ] `npm run build` succeeds locally
- [ ] No console errors in dev mode
- [ ] Firestore database is created in Firebase
- [ ] Storage bucket is created in Firebase
- [ ] Security rules are configured (see [FIREBASE_SETUP.md](./FIREBASE_SETUP.md))

After deploying, verify:

- [ ] Site loads without errors
- [ ] No "Firebase not configured" warnings
- [ ] Can add a staff member
- [ ] Staff data appears in Firebase Console
- [ ] Photos upload to Storage bucket
- [ ] QR code generation works

---

## Post-Deployment

### Monitor Your Site

1. Set up error monitoring (optional):
   - [Sentry](https://sentry.io) - Error tracking
   - [LogRocket](https://logrocket.com) - Session replay

2. Check Firebase usage:
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Monitor **Firestore**, **Storage**, **Bandwidth**

3. Set up backups:
   - Enable [Firebase Automated Backups](https://firebase.google.com/docs/firestore/manage-data/export-import)
   - Schedule monthly exports

### Custom Domain (Optional)

**Netlify:**
1. Go to **Site Settings** → **Domain**
2. Add custom domain

**Vercel:**
1. Go to **Settings** → **Domains**
2. Add custom domain

**GitHub Pages:**
1. Go to **Settings** → **Pages**
2. Add custom domain

---

## Troubleshooting

### Build Fails
```bash
# Clear cache and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Firebase Not Configured
- Check all 6 env vars are set on platform
- Verify exact spelling (case-sensitive)
- Redeploy after adding variables
- Wait 2-3 minutes for deployment

### Photos/Signatures Not Uploading
- Check Firebase Storage rules allow writes
- Verify Storage bucket exists
- Check browser console for errors

### CORS Errors
- Firebase handles CORS automatically
- If issues persist, check Cloud Storage CORS configuration

---

## Environment Variables Reference

See [DEPLOYMENT_ENV_VARIABLES.md](./DEPLOYMENT_ENV_VARIABLES.md) for:
- ✅ Where to find each value
- ✅ How to set them on each platform
- ✅ Troubleshooting tips

---

## Need Help?

- 📖 [Firebase Setup Guide](./FIREBASE_SETUP.md)
- 📋 [Setup Checklist](./SETUP_CHECKLIST.md)
- 🔐 [Environment Variables](./DEPLOYMENT_ENV_VARIABLES.md)
- 💬 [Firebase Discord Community](https://discord.gg/firebase)

