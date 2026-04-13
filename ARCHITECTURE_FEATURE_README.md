# 🏗️ MediMesh — Architecture Diagrams Feature (v2.1.0)

> This document contains **every step** to deploy the architecture diagrams feature,
> manage the Git branch, and roll back if needed.

---

## 📋 What This Feature Adds

- **"📐 View Architecture"** button on the Landing Page
- A scrollable modal showing **3 architecture diagrams** in order:
  1. **Application Architecture** — Appdiagram.jpg
  2. **Database Architecture** — dbdiagram.jpg
  3. **Main Architecture** — mainarch.jpg
- **Click-to-zoom** — click any diagram to view it fullscreen
- **"📊 Project PPT"** button — links to [https://github.com/Bharath-1602/PPT](https://github.com/Bharath-1602/PPT)
- Smooth animations, fully responsive, does **not** disturb any existing functionality

### Files Changed

| File | What Changed |
|------|-------------|
| `medimesh-frontend/public/images/Appdiagram.jpg` | **[NEW]** Application architecture image |
| `medimesh-frontend/public/images/dbdiagram.jpg` | **[NEW]** Database architecture image |
| `medimesh-frontend/public/images/mainarch.jpg` | **[NEW]** Main architecture image |
| `medimesh-frontend/src/pages/LandingPage.js` | Added architecture button, modal, lightbox |
| `medimesh-frontend/src/index.css` | Added modal/lightbox/glass-button styles (~235 lines) |
| `helm/medimesh/values.yaml` | **Only** frontend image tag → `v2.1.0` |
| `helm/medimesh/Chart.yaml` | Chart version → `1.1.0` |

> **Note:** Only the frontend image tag is changed to `v2.1.0`.
> All backend services (auth, user, doctor, appointment, vitals, pharmacy, ambulance, complaint, forum) and BFF remain at `v1.1.0`.

---

## 🔀 STEP 1: Create & Push Feature Branch

All changes are on a **separate branch** called `feature/architecture-diagrams` so your `main` branch stays safe.

### 1.1 — Verify you're on the feature branch

```bash
cd C:\Users\Admin\MediMesh
git branch
```

Expected output:
```
* feature/architecture-diagrams
  main
```

If you're NOT on the feature branch:
```bash
git checkout feature/architecture-diagrams
```

### 1.2 — Stage all changes

```bash
git add .
```

### 1.3 — Commit

```bash
git commit -m "feat: add architecture diagrams modal and PPT link on landing page (frontend v2.1.0)"
```

### 1.4 — Push the feature branch to GitHub

```bash
git push -u origin feature/architecture-diagrams
```

This creates a new branch on GitHub at:
`https://github.com/Bharath-1602/MediMesh/tree/feature/architecture-diagrams`

> ✅ Your `main` branch is completely untouched at this point.

---

## 🐳 STEP 2: Build & Push Docker Image (Frontend Only)

Since only the frontend changed, we build **only** the frontend image with the new `v2.1.0` tag.

### 2.1 — Build the frontend Docker image

```bash
cd C:\Users\Admin\MediMesh
docker build -t bharath44623/medimesh_medimesh-frontend:v2.1.0 ./medimesh-frontend
```

### 2.2 — Login to Docker Hub

```bash
docker login -u bharath44623
```

Enter your Docker Hub password when prompted.

### 2.3 — Push the image

```bash
docker push bharath44623/medimesh_medimesh-frontend:v2.1.0
```

### 2.4 — Verify the image on Docker Hub

```bash
docker images | findstr "medimesh-frontend"
```

Expected:
```
bharath44623/medimesh_medimesh-frontend   v2.1.0   <image-id>   <size>
bharath44623/medimesh_medimesh-frontend   v1.1.0   <image-id>   <size>
```

---

## 🚀 STEP 3: Deploy with Helm

### 3.1 — Copy updated Helm chart to your master node

If your Helm chart is on your local machine, copy it to your Kubernetes master node:

```bash
scp -r -i <your-key.pem> ./helm/medimesh ubuntu@<MASTER_NODE_IP>:~/MediMesh/helm/medimesh
```

Or if you're running from the master node directly, just `git pull` the feature branch:

```bash
cd ~/MediMesh
git fetch origin
git checkout feature/architecture-diagrams
git pull origin feature/architecture-diagrams
```

### 3.2 — Run Helm Upgrade

```bash
helm upgrade medimesh ./helm/medimesh -n medimesh-helm
```

Expected output:
```
Release "medimesh" has been upgraded. Happy Helming!
```

### 3.3 — Verify pods are running

```bash
kubectl get pods -n medimesh-helm -w
```

Wait until the frontend pods show `Running` and `READY 2/2`.

### 3.4 — Verify the frontend image tag

```bash
kubectl describe deployment medimesh-frontend -n medimesh-helm | grep Image
```

Expected:
```
Image: bharath44623/medimesh_medimesh-frontend:v2.1.0
```

### 3.5 — Check the rollout status

```bash
kubectl rollout status deployment/medimesh-frontend -n medimesh-helm
```

### 3.6 — Test the application

```bash
# Port forward to test locally
kubectl port-forward svc/medimesh-frontend-svc 8080:80 -n medimesh-helm

# Open in browser
# http://localhost:8080
```

On the landing page, you should see:
- ✅ "📐 View Architecture" button
- ✅ "📊 Project PPT" button
- ✅ Clicking "View Architecture" opens a modal with 3 diagrams
- ✅ Clicking any diagram opens it fullscreen
- ✅ All other functionality (Login, Register, Dashboard) works as before

---

## ✅ STEP 4: Merge to Main (When Happy)

Once you've verified everything works:

### 4.1 — Switch to main branch

```bash
cd C:\Users\Admin\MediMesh
git checkout main
```

### 4.2 — Merge the feature branch

```bash
git merge feature/architecture-diagrams
```

### 4.3 — Push updated main

```bash
git push origin main
```

### 4.4 — (Optional) Delete the feature branch locally

```bash
git branch -d feature/architecture-diagrams
```

### 4.5 — (Optional) Delete the feature branch on GitHub

```bash
git push origin --delete feature/architecture-diagrams
```

---

## ⏪ STEP 5: Undo / Rollback (If Needed)

### Option A: Undo the Git merge (if you already merged to main)

```bash
# Find the merge commit
git log --oneline -5

# Revert the merge commit (replace <merge-commit-hash> with actual hash)
git revert -m 1 <merge-commit-hash>
git push origin main
```

### Option B: Just delete the branch (if you haven't merged yet)

```bash
# Switch to main
git checkout main

# Delete local feature branch
git branch -D feature/architecture-diagrams

# Delete remote feature branch
git push origin --delete feature/architecture-diagrams
```

### Option C: Rollback the Helm deployment

```bash
# See release history
helm history medimesh -n medimesh-helm

# Roll back to previous version (revision 1 = before this update)
helm rollback medimesh <PREVIOUS_REVISION_NUMBER> -n medimesh-helm

# Verify
kubectl get pods -n medimesh-helm -w
```

### Option D: Manually revert just the frontend image tag

```bash
# Quick rollback without Helm — just set the image back
kubectl set image deployment/medimesh-frontend \
  medimesh-frontend=bharath44623/medimesh_medimesh-frontend:v1.1.0 \
  -n medimesh-helm

# Verify
kubectl rollout status deployment/medimesh-frontend -n medimesh-helm
```

---

## 📊 Quick Reference — All Commands

```bash
# ═══════════════════════════════════════════════
# GIT — Commit & Push Feature Branch
# ═══════════════════════════════════════════════
cd C:\Users\Admin\MediMesh
git add .
git commit -m "feat: add architecture diagrams modal and PPT link (frontend v2.1.0)"
git push -u origin feature/architecture-diagrams

# ═══════════════════════════════════════════════
# DOCKER — Build & Push Frontend Only
# ═══════════════════════════════════════════════
docker build -t bharath44623/medimesh_medimesh-frontend:v2.1.0 ./medimesh-frontend
docker login -u bharath44623
docker push bharath44623/medimesh_medimesh-frontend:v2.1.0

# ═══════════════════════════════════════════════
# HELM — Deploy
# ═══════════════════════════════════════════════
helm upgrade medimesh ./helm/medimesh -n medimesh-helm
kubectl get pods -n medimesh-helm -w
kubectl rollout status deployment/medimesh-frontend -n medimesh-helm

# ═══════════════════════════════════════════════
# GIT — Merge to Main (when ready)
# ═══════════════════════════════════════════════
git checkout main
git merge feature/architecture-diagrams
git push origin main
git branch -d feature/architecture-diagrams

# ═══════════════════════════════════════════════
# ROLLBACK — If needed
# ═══════════════════════════════════════════════
helm rollback medimesh <REVISION> -n medimesh-helm
# OR
git checkout main
git branch -D feature/architecture-diagrams
git push origin --delete feature/architecture-diagrams
```

---

## 🏷️ Image Tags Summary

| Service | Image Tag | Changed? |
|---------|-----------|----------|
| **medimesh-frontend** | **v2.1.0** | ✅ Yes |
| medimesh-bff | v1.1.0 | ❌ No |
| medimesh-auth | v1.1.0 | ❌ No |
| medimesh-user | v1.1.0 | ❌ No |
| medimesh-doctor | v1.1.0 | ❌ No |
| medimesh-appointment | v1.1.0 | ❌ No |
| medimesh-vitals | v1.1.0 | ❌ No |
| medimesh-pharmacy | v1.1.0 | ❌ No |
| medimesh-ambulance | v1.1.0 | ❌ No |
| medimesh-complaint | v1.1.0 | ❌ No |
| medimesh-forum | v1.1.0 | ❌ No |
