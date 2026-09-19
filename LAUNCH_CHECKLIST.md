# 🚀 AUM TECHNOLOGY — LAUNCH CHECKLIST (Phase 6)

## 1. Firebase Setup (15 mins)
- [ ] Create project at console.firebase.google.com
- [ ] Add **Web App** → copy config → paste into `public-website/firebase/config.js`
- [ ] Enable **Email/Password** auth (Authentication → Sign-in method)
- [ ] Create **Firestore Database** (production mode)

## 2. Security (CRITICAL — do this before launch!)
- [ ] Replace `firestore.rules` with our production rules (already in project root)
- [ ] Deploy: `firebase deploy --only firestore:rules`
- [ ] Deploy indexes: `firebase deploy --only firestore:indexes` (or add manually in Console → Indexes)
- [ ] Optional: enable **App Check** (protects `leads` from spam)

## 3. Deploy Everything
```bash
npm install -g firebase-tools
firebase login
firebase init hosting          # public dir = public-website
firebase deploy                # hosting + rules + indexes
```

## 4. Staff Accounts
- [ ] Sign in to `admin/login.html` with your account → **you become superadmin automatically**
- [ ] Create staff accounts: Super Admin → Users tab
- [ ] Assign roles (staff/admin)

## 5. Payments
- [ ] Get Paystack keys: dashboard.paystack.com
- [ ] Replace `pk_test_YOUR_KEY` in `client-portal/js/portal.js`
- [ ] Test with ₦50 transaction

## 6. Optional: Cloud Functions
```bash
cd functions && npm install
firebase deploy --only functions
```
Gives you: staff notifications on new leads, welcome messages, auto uptime checks every 5 min.

## 7. Pre-Launch Tests
- [ ] Website: submit contact form → check `leads` collection + admin CRM Kanban
- [ ] Register a test client → login → request project → see it in admin Projects
- [ ] Change project status in admin → confirm client portal updates live
- [ ] Create invoice (Firestore) → client sees it → test Paystack pay
- [ ] Mobile: test all 3 apps on your phone

## 7.5 Speed & Offline (automatic ✅)
- Service Worker ya installed a kowane app (website/portal/admin)
- `sw.js`, `manifest.json`, `icon.svg` suna a cikin kowane folder
- ⚠️ Idan ka updated files kuma ba sa showing: buɗe `sw.js` a kowane folder, canza `aum-cache-v1` → `v2`, save, refresh twice
- Ba ya aiki a `file://` — sai a localhost/hosting (Acode Preview OK)

## 8. Go Live 🎉
- [ ] Connect custom domain (Firebase Hosting → Add custom domain)
- [ ] Update `sitemap.xml` + `robots.txt` with your real domain
- [ ] Submit sitemap to Google Search Console
- [ ] Add Firebase config to a **2nd web app** for staging (optional)

## Support
Something broken? Check browser console (F12) + Firebase Console → Firestore → Rules.
