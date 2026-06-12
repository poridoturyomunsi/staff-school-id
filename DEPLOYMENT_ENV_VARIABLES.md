# Environment Variables for Deployment

Before deploying to Netlify, Vercel, or any hosting platform, you **must** add the following Firebase environment variables.

## Required Variables

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## Where to Find These Values

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Click ⚙️ **Settings** → **Project Settings**
4. Scroll to **Your apps** section
5. Under **Firebase SDK snippet**, select **Config**
6. Copy the `firebaseConfig` object values

## How to Add Variables

### Netlify

1. Go to your Netlify site dashboard
2. Click **Site Settings** → **Build & Deploy** → **Environment**
3. Click **Add Environment Variables**
4. Add each variable:
   - **Key**: `VITE_FIREBASE_API_KEY`
   - **Value**: `your_actual_api_key`
5. Repeat for all 6 variables
6. **Redeploy** your site for changes to take effect

### Vercel

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Add each variable:
   - **Name**: `VITE_FIREBASE_API_KEY`
   - **Value**: `your_actual_api_key`
   - **Environments**: Select `Production`, `Preview`, `Development`
4. Repeat for all 6 variables
5. **Redeploy** your site

### GitHub Pages + Actions

If deploying via GitHub Actions:

1. Go to your GitHub repo
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each variable as a secret (same names as above)
5. In your `.github/workflows/deploy.yml`, reference them:
   ```yaml
   - name: Build
     env:
       VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
       VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
       VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
       VITE_FIREBASE_STORAGE_BUCKET: ${{ secrets.VITE_FIREBASE_STORAGE_BUCKET }}
       VITE_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}
       VITE_FIREBASE_APP_ID: ${{ secrets.VITE_FIREBASE_APP_ID }}
     run: npm run build
   ```

## Security Notes

⚠️ **IMPORTANT:**
- ❌ **Never commit** `.env.local` to version control
- ❌ **Never** commit `.env` files with real credentials
- ✅ **Always** use platform secrets/environment variables on hosting
- ✅ Your `.gitignore` already excludes `.env` files
- ✅ `VITE_FIREBASE_API_KEY` is public-safe (Firebase handles auth separately)

## Verification

After adding variables to your platform:

1. **Redeploy** your site
2. Check browser console (F12) - no "Firebase not configured" warnings
3. Test staff registration (should save to Firebase)
4. Check [Firebase Console](https://console.firebase.google.com) → Firestore to see if data appears

## Troubleshooting

### "Firebase not configured" Error
- Check all 6 variables are added to your platform
- Verify spelling matches exactly (case-sensitive)
- Redeploy after adding variables
- Wait 1-2 minutes for deployment to complete

### Data Not Saving
- Check Firebase Console for permission errors
- Verify Firestore security rules allow writes
- Check `browser console (F12)` for Firebase errors

### Build Fails
- Ensure all 6 variables are set
- Check for typos in variable names
- Verify values don't have extra spaces

## Reference

- [Firebase Console](https://console.firebase.google.com)
- [Netlify Environment Variables](https://docs.netlify.com/configure-builds/environment-variables/)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions)
