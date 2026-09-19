# 📤 HOW TO PUSH TO GITHUB (from your phone)

## Step 1: Create Access Token (once)
1. Open github.com → tap your profile → **Settings**
2. Scroll down → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
3. **Generate new token (classic)** → name: `aum-push`
4. Check the **`repo`** box (full control of repositories) → **Generate**
5. ⚠️ **COPY THE TOKEN** (starts with `ghp_...`) — ka ajiye shi a safe place (ba za ka iya gani ba kuma)!

## Step 2: Update your local files
1. Sauke `aum-tech-repo.zip` ɗin (updated version ɗin da ke da duka features)
2. A cikin Acode: buɗe folder ɗin repository ɗinka (`AUM-tech-`)
3. **Share/manye gurbinsa dukan files** da wadanda ke cikin zip (replace all)

## Step 3: Push (Acode terminal or Termux)
```bash
# Yi setting na fari (sau ɗaya kawai)
git config --global user.name "abdulrazakumarmuazu0-pixel"
git config --global user.email "YOUR-EMAIL@gmail.com"

# Shiga folder ɗin repo
cd AUM-tech-

# Duba changes
git add .

# Commit
git commit -m "Add: notifications bell, invoices, blog CMS, service worker PWA, inbox, general settings, UI fixes"

# Push (sanya TOKEN ɗinka a matsayin XXXX)
git push https://YOUR-TOKEN@github.com/abdulrazakumarmuazu0-pixel/AUM-tech-.git main
```

**Ko mafi sauƙi (sau ɗaya)** — ka sanya remote ta atomatik:
```bash
git remote set-url origin https://YOUR-TOKEN@github.com/abdulrazakumarmuazu0-pixel/AUM-tech-.git
# Sannan kowane lokacin kawai:
git add . && git commit -m "update" && git push
```

## Step 4: Tabbatar
Buɗe github.com/abdulrazakumarmuazu0-pixel/AUM-tech- a browser — sabbin files za su bayyana.

## ⚠️ Security Note
Token ɗin ya ba ka damar shiga repo ɗinka — **kada ka wallafa shi** a WhatsApp/group.
Idan ka ɓata shi, je github.com → settings → tokens → **Delete** → ƙirƙiri sabo.
