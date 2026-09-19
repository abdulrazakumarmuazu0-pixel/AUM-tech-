# 🚀 DEPLOYMENT GUIDE — GitHub Pages vs GitHub Actions

## 📊 Bambance-bambancen su (ka zaɓi dangane da buƙatarka)

| | **GitHub Pages** | **GitHub Actions → Firebase** |
|---|---|---|
| Wane app? | **Website kaɗai** (public site) | **Dukkan 3** (website + portal + admin) |
| Sauƙin setup | ⭐ Mafi sauƙi (2 clicks) | Matsala ƙanana (10 mins) |
| URL | `user.github.io/repo-name/` (ba da kyau) | `aum-tech-company.web.app` ko custom domain (kyakkyawa) |
| Auto-deploy a push | ✅ | ✅ |
| Firestore rules deploy | ❌ (ka yi manual) | ✅ (otomatik) |
| Auth works? | ✅ (sai ka ƙara Pages domain a Firebase authorized domains) | ✅ |
| Repo public/private | Public kaɗai | Duk |
| **Shawarata** | **Fara da haka NAN** (quick win) | **Matsayin ƙarshe** (professional) |

---

## 🟢 ZABI A — GitHub Pages (NAN TAKE, 2 minutes)

Repo ɗinka public ne — hakan ya isa!

### Step 1: Enable Pages
1. Buɗe github.com/abdulrazakumarmuazu0-pixel/AUM-tech-
2. **Settings** → **Pages** (a ƙasan left sidebar)
3. **Source**: `Deploy from a branch` → **Branch**: `main` → folder: `/(root)` → **Save**
4. Ka jira ~1 minute — site ɗinka zai zama live a:
   ```
   https://abdulrazakumarmuazu0-pixel.github.io/AUM-tech-/
   ```
   (Root `index.html` ɗinmu yana redirecting zuwa `public-website/` kai tsaye ✨)

### Step 2: Ƙara domain a Firebase (WAJIBI don contact form)
Website yana aika leads zuwa Firestore — sai Firebase ya san domain ɗin:
1. console.firebase.google.com → **Authentication** → **Settings** tab
2. **Authorized domains** → **Add domain**:
   ```
   abdulrazakumarmuazu0-pixel.github.io
   ```

### Step 3: Ƙarshe
Kowane `git push` → website yana updating kansa! 🎉

**⚠️ Yaƙi**: Portal & Admin **ba** za su aiki a Pages subdomain ɗin ba duk da haka (login zai yi redirect loop) — hakan ya normal. Su na buƙatar Zabi B.

---

## 🔵 ZABI B — GitHub Actions → Firebase (FULL PLATFORM)

Kowane push → **dukan 3 apps + Firestore rules** suna deploying otomatik!

### Step 1: Generate Service Account Key
1. console.firebase.google.com → **Project settings** (gear icon) → **Service accounts** tab
2. **Generate new private key** → JSON file ya sauka
3. Buɗe JSON a text editor — **copy dukkan content** (mai ƙasa, yana da `-----BEGIN PRIVATE KEY-----`)

### Step 2: Ɗora shi a GitHub Secrets
1. Repo ɗinka → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret**:
   - Name: `FIREBASE_SERVICE_ACCOUNT`
   - Value: **paste the full JSON** → **Add secret**

### Step 3: Push
```bash
git add .
git commit -m "Add GitHub Actions auto-deploy to Firebase"
git push
```
Actions zai gudana (tab "Actions" a repo) — ~2 mins → **live a:**
```
https://aum-tech-company.web.app
```

### Step 4: (Optional) Custom domain
Firebase Console → **Hosting** → **Add custom domain** (e.g. `aumtech.com`) — SSL free, otomatik.

---

## 🎯 Shawarata (gaskiya mai sauƙi)

| Yanzu | Yi wannan |
|---|---|
| **A yau** | Zabi A (Pages) — ka nuna website ɗinka ga mutane da sauri |
| **Wannan mako** | Zabi B (Actions) — ka haɗa service account key, ka sami full platform |
| **Ƙarshe** | Custom domain + Cloud Functions (functions/ folder) |

⚠️ **Security**: Service account JSON = babban key! Kada ka wallafa shi, kada ka sanya shi a cikin repo files. GitHub Secrets kaɗai.

---
© 2026 AUM Technology
