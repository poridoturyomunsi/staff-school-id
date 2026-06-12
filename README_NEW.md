# 📇 Staff ID Management System

A modern web application for managing school staff ID cards with integrated Firebase cloud storage.

## ✨ Features

- ✅ Staff registration with photo & signature capture
- ✅ Dynamic ID card design & preview
- ✅ Bulk staff import from Excel
- ✅ QR code generation & verification
- ✅ Cloud storage with Firebase
- ✅ Real-time data sync across devices
- ✅ Offline support with auto-sync
- ✅ Print-ready cards

## 🚀 Getting Started

### Quick Start (5 minutes)

1. **Clone & Install**
   ```bash
   git clone <your-repo>
   cd staff-id-manager
   npm install
   ```

2. **Configure Firebase** (see [SETUP_CHECKLIST.md](./SETUP_CHECKLIST.md))
   - Create `.env.local` with your Firebase credentials
   - See [DEPLOYMENT_ENV_VARIABLES.md](./DEPLOYMENT_ENV_VARIABLES.md) for details

3. **Run Development Server**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173`

4. **Build for Production**
   ```bash
   npm run build
   ```

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [START_HERE.md](./START_HERE.md) | 👈 **Start here** - Quick overview |
| [SETUP_CHECKLIST.md](./SETUP_CHECKLIST.md) | Step-by-step initial setup |
| [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | Deploy to Netlify/Vercel/GitHub Pages |
| [DEPLOYMENT_ENV_VARIABLES.md](./DEPLOYMENT_ENV_VARIABLES.md) | Environment variables for production |
| [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) | Firebase configuration details |
| [FINAL_SUMMARY.md](./FINAL_SUMMARY.md) | Project completion summary |

## 🌐 Accessing on Other Machines

When running `npm run dev`, use this URL on other machines on your LAN:

```
http://192.168.0.113:5173
```

**Start the server with host binding:**
```bash
npm run dev -- --host 0.0.0.0
```

(Replace `192.168.0.113` with your actual machine IP)

## 🌍 Deploy to Production

### Quick Deploy to Netlify

```bash
# Build locally
npm run build

# Deploy with Netlify CLI
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for full Netlify/Vercel/GitHub Pages instructions.

### Important: Environment Variables

Before deploying, add these to your platform:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

See [DEPLOYMENT_ENV_VARIABLES.md](./DEPLOYMENT_ENV_VARIABLES.md) for platform-specific instructions.

## 🛠 Tech Stack

- **Frontend**: React 19 + Vite
- **Database**: Firebase Firestore
- **Storage**: Firebase Cloud Storage
- **Auth**: Firebase Authentication
- **Styling**: Tailwind CSS
- **QR Codes**: qrcode.js
- **Canvas**: html2canvas
- **Spreadsheets**: XLSX

## 📝 Available Scripts

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run preview   # Preview production build
npm run lint      # Run ESLint
```

## 🔐 Security

- Environment variables stored in `.env.local` (not committed)
- Firebase security rules configured for secure access
- Photos & signatures stored in Firebase Storage
- All data encrypted in transit

## ❓ Troubleshooting

**Firebase not configured?**
- Check `.env.local` has all 6 variables
- Verify values match your Firebase project
- Restart dev server after updating `.env.local`

**Can't access from other machines?**
- Use `npm run dev -- --host 0.0.0.0`
- Check firewall allows port 5173
- Replace IP with your machine's actual IP

**Data not saving?**
- Check browser console (F12) for Firebase errors
- Verify Firestore database exists in Firebase Console
- Check security rules allow writes

See [SETUP_CHECKLIST.md](./SETUP_CHECKLIST.md) for more troubleshooting.

## 📞 Support

- 📖 [Firebase Documentation](https://firebase.google.com/docs)
- 🐛 [Report Issues](./ISSUES.md)
- 💬 [Firebase Community](https://discord.gg/firebase)

## 📄 License

This project is proprietary. All rights reserved.
