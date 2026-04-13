# 🏥 MediMesh — Kubernetes Deployment Guide

Production-ready Kubernetes configuration for the MediMesh Hospital Management System microservices architecture, with **kGateway** (Gateway API routing) and **HAProxy** (external load balancer).

---

## 📁 Folder Structure

```
k8s/
├── namespace.yaml                          # Dedicated namespace
├── configmap.yaml                          # Non-sensitive configuration
├── secret.yaml                             # Sensitive credentials (base64)
├── README.md                               # This file
├── mongodb/
│   ├── mongodb-pv-pvc.yaml                 # PersistentVolume + PVC (5Gi)
│   └── mongodb-statefulset.yaml            # StatefulSet + Headless Service
├── frontend/
│   └── frontend-deployment.yaml            # Deployment + ClusterIP Service
├── backend-services/
│   ├── auth-deployment.yaml                # Auth Service (port 5001)
│   ├── user-deployment.yaml                # User Service (port 5002)
│   ├── doctor-deployment.yaml              # Doctor Service (port 5003)
│   ├── appointment-deployment.yaml         # Appointment Service (port 5004)
│   ├── vitals-deployment.yaml              # Vitals Service (port 5005)
│   ├── pharmacy-deployment.yaml            # Pharmacy Service (port 5006)
│   ├── ambulance-deployment.yaml           # Ambulance Service (port 5007)
│   ├── complaint-deployment.yaml           # Complaint Service (port 5008)
│   ├── forum-deployment.yaml               # Forum Service (port 5009)
│   └── bff-deployment.yaml                 # BFF Gateway (port 5010)
├── services/
│   └── cluster-ip-services.yaml            # All 10 ClusterIP services
├── gateway/
│   └── kgateway.yaml                       # Gateway + HTTPRoute (all routes)
├── haproxy/
│   ├── haproxy.cfg                         # HAProxy config (LB instance)
│   └── haproxy-setup.sh                    # Automated HAProxy setup script
└── hpa/
    └── frontend-hpa.yaml                   # HPA for frontend (2→5 pods)
```

---

## 🏗️ Architecture Overview

```
                  Internet (Port 80)
                        │
              ┌─────────▼──────────┐
              │  HAProxy (LB EC2)  │  ← Separate EC2 instance
              │  bind *:80         │     Round-robin to workers
              └─────────┬──────────┘
                        │
              ┌─────────▼──────────────────────┐
              │  kGateway (Envoy Proxy)        │  ← Gateway API routing
              │  HTTPRoute path-based routing  │     NodePort on workers
              └─────────┬──────────────────────┘
                        │
    ┌───────────────────┼───────────────────────────┐
    │ Path-based routes:                            │
    │  /             → medimesh-frontend-svc:80     │
    │  /api          → medimesh-bff-svc:5010        │
    │  /auth         → medimesh-auth-svc:5001       │
    │  /user         → medimesh-user-svc:5002       │
    │  /doctor       → medimesh-doctor-svc:5003     │
    │  /appointment  → medimesh-appointment-svc:5004│
    │  /vitals       → medimesh-vitals-svc:5005     │
    │  /pharmacy     → medimesh-pharmacy-svc:5006   │
    │  /ambulance    → medimesh-ambulance-svc:5007  │
    │  /complaint    → medimesh-complaint-svc:5008  │
    │  /forum        → medimesh-forum-svc:5009      │
    └───────────────────┼───────────────────────────┘
                        │
              ┌─────────▼──────────┐
              │  MongoDB StatefulSet│  ← Persistent (5Gi PV)
              │  ClusterIP :27017  │
              └────────────────────┘
```

---

## 🚀 Step-by-Step Deployment

> **Important:** Apply resources in exactly this order to satisfy dependencies.

### Prerequisites

1. **Kubernetes cluster** with `kubectl` configured
2. **Metrics Server** installed (required for HPA):

```bash
# Install metrics-server
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# For kubeadm clusters, patch metrics-server to allow insecure TLS:
kubectl patch deployment metrics-server -n kube-system \
  --type='json' \
  -p='[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}]'

# Verify metrics-server is running
kubectl get pods -n kube-system | grep metrics-server
```

### Step 1: Create Namespace

```bash
kubectl apply -f k8s/namespace.yaml
```

### Step 2: Apply ConfigMap and Secrets

```bash
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
```

### Step 3: Deploy MongoDB (Database First)

```bash
kubectl apply -f k8s/mongodb/mongodb-pv-pvc.yaml
kubectl apply -f k8s/mongodb/mongodb-statefulset.yaml
```

Wait for MongoDB to be ready:
```bash
kubectl get pods -n medimesh -l app=medimesh-mongodb --watch
# Wait until STATUS = Running and READY = 1/1
```

### Step 4: Deploy Backend Services

```bash
kubectl apply -f k8s/backend-services/
kubectl apply -f k8s/services/cluster-ip-services.yaml
```

Wait for all backend pods:
```bash
kubectl get pods -n medimesh -l tier=backend --watch
# Wait until all show STATUS = Running and READY = 1/1
```

### Step 5: Deploy Frontend

```bash
kubectl apply -f k8s/frontend/frontend-deployment.yaml
```

### Step 6: Apply Horizontal Pod Autoscaler

```bash
kubectl apply -f k8s/hpa/frontend-hpa.yaml
```

### Step 7: Install kGateway & Apply Gateway Routes

```bash
# Install Gateway API CRDs
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.2.1/standard-install.yaml

# Install kGateway controller (requires Helm)
helm install kgateway oci://cr.kgateway.dev/kgateway-helm/kgateway \
  --version v2.0.0-main \
  -n kgateway-system --create-namespace

# Wait for kGateway controller to be ready
kubectl get pods -n kgateway-system --watch

# Apply Gateway + HTTPRoutes
kubectl apply -f k8s/gateway/kgateway.yaml

# Get the kGateway NodePort (note the port number)
kubectl get svc -n medimesh
```

### Step 8: Set Up HAProxy (Separate EC2 Instance)

On your **HAProxy EC2 instance** (separate from the K8s cluster):

```bash
# Copy the setup script to HAProxy instance and run:
chmod +x haproxy-setup.sh
sudo ./haproxy-setup.sh <KGATEWAY_NODEPORT>

# Example (if kGateway NodePort is 31080):
sudo ./haproxy-setup.sh 31080
```

### 🎯 One-Shot Deployment (All at Once)

If you want to deploy everything in a single command:

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/mongodb/
kubectl apply -f k8s/services/
kubectl apply -f k8s/backend-services/
kubectl apply -f k8s/frontend/
kubectl apply -f k8s/hpa/
kubectl apply -f k8s/gateway/kgateway.yaml
```

---

## ✅ Verification Commands

### Check All Pods

```bash
# All pods in medimesh namespace
kubectl get pods -n medimesh -o wide

# By tier
kubectl get pods -n medimesh -l tier=frontend
kubectl get pods -n medimesh -l tier=backend
kubectl get pods -n medimesh -l tier=database
```

**Expected output:** Each backend service has **2 pods** running, frontend has **2+ pods**, MongoDB has **1 pod**.

### Check All Services

```bash
kubectl get svc -n medimesh
```

**Expected output:**

| Service Name               | Type      | Port  |
|----------------------------|-----------|-------|
| medimesh-frontend-svc      | ClusterIP | 80    |
| medimesh-bff-svc           | ClusterIP | 5010  |
| medimesh-auth-svc          | ClusterIP | 5001  |
| medimesh-user-svc          | ClusterIP | 5002  |
| medimesh-doctor-svc        | ClusterIP | 5003  |
| medimesh-appointment-svc   | ClusterIP | 5004  |
| medimesh-vitals-svc        | ClusterIP | 5005  |
| medimesh-pharmacy-svc      | ClusterIP | 5006  |
| medimesh-ambulance-svc     | ClusterIP | 5007  |
| medimesh-complaint-svc     | ClusterIP | 5008  |
| medimesh-forum-svc         | ClusterIP | 5009  |
| medimesh-mongodb           | ClusterIP (None) | 27017 |
| medimesh-gateway           | NodePort  | 80:auto |

### Check HPA

```bash
kubectl get hpa -n medimesh
```

**Expected output:**
```
NAME                    REFERENCE                      TARGETS   MINPODS   MAXPODS   REPLICAS
medimesh-frontend-hpa   Deployment/medimesh-frontend   <cpu>%/60%   2         5         2
```

### Check PV and PVC

```bash
kubectl get pv
kubectl get pvc -n medimesh
```

### Check Deployments

```bash
kubectl get deployments -n medimesh
```

### View Logs

```bash
# View logs for a specific service
kubectl logs -n medimesh -l app=medimesh-auth --tail=50

# Follow logs in real-time
kubectl logs -n medimesh -l app=medimesh-bff -f
```

---

## 🌐 Accessing the Application

### Via HAProxy (Production)

All traffic goes through HAProxy → kGateway → Services:

```
http://<HAPROXY_PUBLIC_IP>
```

### HAProxy Stats Dashboard

```
http://<HAPROXY_PUBLIC_IP>:8404/stats
Username: admin
Password: medimesh2026
```

### Route Map

| URL Path | Routed To |
|----------|----------|
| `/` | Frontend UI |
| `/api/*` | BFF Gateway → Backend Services |
| `/auth/*` | Auth Service (5001) |
| `/user/*` | User Service (5002) |
| `/doctor/*` | Doctor Service (5003) |
| `/appointment/*` | Appointment Service (5004) |
| `/vitals/*` | Vitals Service (5005) |
| `/pharmacy/*` | Pharmacy Service (5006) |
| `/ambulance/*` | Ambulance Service (5007) |
| `/complaint/*` | Complaint Service (5008) |
| `/forum/*` | Forum Service (5009) |

> **AWS Security Group (HAProxy Instance):** Ensure port `80` and `8404` are open for inbound TCP traffic.

---

## 📈 How Scaling Works (HPA)

### What is HPA?

The **Horizontal Pod Autoscaler (HPA)** automatically scales the number of frontend pods based on CPU utilization:

| Metric          | Value  |
|-----------------|--------|
| Min Replicas    | 2      |
| Max Replicas    | 5      |
| Target CPU      | 60%    |

### How It Works

1. **Metrics Server** continuously monitors CPU usage of frontend pods
2. If **average CPU > 60%**, HPA creates additional pods (up to 5)
3. If **average CPU < 60%**, HPA scales down pods (minimum 2)
4. Scaling decisions are made every **15 seconds** (default)

### Testing HPA

Generate load to trigger autoscaling:

```bash
# Run a load test from within the cluster
kubectl run -n medimesh load-test --rm -it --image=busybox -- /bin/sh -c "while true; do wget -q -O- http://medimesh-frontend-svc; done"
```

Monitor scaling:
```bash
# Watch HPA metrics
kubectl get hpa -n medimesh --watch

# Watch pod count increase
kubectl get pods -n medimesh -l app=medimesh-frontend --watch
```

---

## 🔐 Security Configuration

### ConfigMap (Non-Sensitive)

Stores service URLs and environment settings. View with:
```bash
kubectl get configmap medimesh-config -n medimesh -o yaml
```

### Secrets (Sensitive)

Stores JWT secret and MongoDB credentials (base64 encoded). View with:
```bash
kubectl get secret medimesh-secrets -n medimesh -o yaml
```

To update a secret value:
```bash
# Encode new value
echo -n "new-secret-value" | base64

# Edit the secret
kubectl edit secret medimesh-secrets -n medimesh
```

---

## 🔧 Troubleshooting

### Pod Not Starting

```bash
# Check pod status and events
kubectl describe pod <POD_NAME> -n medimesh

# Common issues:
# - ImagePullBackOff → Check Docker Hub image name
# - CrashLoopBackOff → Check logs: kubectl logs <POD_NAME> -n medimesh
# - Pending → Check resources: kubectl describe node
```

### Service Not Accessible

```bash
# Verify service endpoints
kubectl get endpoints -n medimesh

# Test from within the cluster
kubectl run -n medimesh debug --rm -it --image=busybox -- wget -qO- http://medimesh-bff-svc:5010
```

### MongoDB Connection Issues

```bash
# Check MongoDB is running
kubectl get pods -n medimesh -l app=medimesh-mongodb

# Check PVC is bound
kubectl get pvc -n medimesh

# Test MongoDB connection from another pod
kubectl run -n medimesh mongo-test --rm -it --image=mongo:7 -- mongosh mongodb://medimesh-mongodb:27017
```

### HPA Shows "Unknown" Metrics

```bash
# Ensure metrics-server is running
kubectl get pods -n kube-system | grep metrics-server

# Check metrics-server logs
kubectl logs -n kube-system -l k8s-app=metrics-server

# For kubeadm clusters, add --kubelet-insecure-tls flag
kubectl edit deployment metrics-server -n kube-system
# Add under spec.template.spec.containers[0].args:
#   - --kubelet-insecure-tls
```

### Rolling Update Issues

```bash
# Check rollout status
kubectl rollout status deployment/medimesh-auth -n medimesh

# Rollback if needed
kubectl rollout undo deployment/medimesh-auth -n medimesh

# View rollout history
kubectl rollout history deployment/medimesh-auth -n medimesh
```

---

## 🛠️ Fixes Applied — CrashLoopBackOff Resolution

### Problem

After initial deployment, **one replica of each backend service kept crashing** with `CrashLoopBackOff` / `Error` states, while the other replica ran fine. Pods cycled through restarts endlessly.

### Root Causes Identified

#### 1. MongoDB Authentication Mismatch (Primary Cause)

The MongoDB StatefulSet was configured with `MONGO_INITDB_ROOT_USERNAME` and `MONGO_INITDB_ROOT_PASSWORD`, enabling authentication. However, all 9 service deployments connected to MongoDB **without credentials** in their `MONGO_URI`:

```
# ❌ Old (no auth in URI, but MongoDB required auth):
mongodb://medimesh-mongodb:27017/medimesh-ambulance-db
```

This caused `AuthenticationFailed` errors. The services' `server.js` files called `process.exit(1)` on the first connection failure, instantly killing the container.

#### 2. No Startup Ordering (Secondary Cause)

All backend service pods started **simultaneously** with MongoDB. When MongoDB wasn't ready yet, services would fail to connect and immediately exit, causing Kubernetes to restart them repeatedly.

### Changes Made

#### A. MongoDB StatefulSet (`k8s/mongodb/mongodb-statefulset.yaml`)

- **Removed** `MONGO_INITDB_ROOT_USERNAME` and `MONGO_INITDB_ROOT_PASSWORD` environment variables
- MongoDB now runs **without authentication**, matching the credential-less `MONGO_URI` strings in all services
- **Added** TCP readiness and liveness probes on port 27017

#### B. All Backend Deployments (`k8s/backend-services/*.yaml`)

- **Added `initContainers`** with a `busybox` container that uses `nc -z` to poll MongoDB port 27017
  - This ensures the main application container only starts **after** MongoDB is accepting connections
- **Added** HTTP `readinessProbe` and `livenessProbe` on each service's `/health` endpoint
  - Kubernetes now properly tracks pod health and only routes traffic to ready pods

#### C. Service Source Code (`services/medimesh-*/server.js`)

- **Replaced** `process.exit(1)` on first MongoDB connection failure with **retry logic**
- 5 retries with exponential backoff: 3s → 6s → 12s → 24s → 48s
- Only calls `process.exit(1)` after all retries are exhausted
- This makes services resilient to brief MongoDB unavailability during rolling updates

### Re-Deployment Instructions

> **Important:** Because the old MongoDB data was initialized with authentication, you must delete the PVC to clear stale data.

```bash
# 1. Clean up old resources
kubectl delete statefulset medimesh-mongodb -n medimesh
kubectl delete pvc medimesh-mongodb-pvc -n medimesh
kubectl delete deployments --all -n medimesh

# 2. Re-deploy MongoDB (now without auth)
kubectl apply -f k8s/mongodb/mongodb-pv-pvc.yaml
kubectl apply -f k8s/mongodb/mongodb-statefulset.yaml

# 3. Wait for MongoDB to be ready
kubectl wait --for=condition=ready pod/medimesh-mongodb-0 -n medimesh --timeout=120s

# 4. Re-deploy all backend services
kubectl apply -f k8s/backend-services/
kubectl apply -f k8s/services/cluster-ip-services.yaml

# 5. Verify — all pods should reach Running with 0 restarts
kubectl get pods -n medimesh -w
```

**Expected Result:** All 21 pods (1 MongoDB + 20 service replicas) reach `Running 1/1` with **0 restarts**.

---

## 🧹 Cleanup

Remove all MediMesh resources:

```bash
# Delete everything in the namespace
kubectl delete namespace medimesh

# Delete PersistentVolume (namespace-independent)
kubectl delete pv medimesh-mongodb-pv
```

---

## 📊 Key Features Summary

| Feature              | Implementation                          |
|----------------------|-----------------------------------------|
| High Availability    | 2 replicas per service (22 total pods)  |
| Auto-Scaling         | HPA on frontend (2→5 pods, 60% CPU)    |
| Data Persistence     | MongoDB StatefulSet + 5Gi PV/PVC       |
| Rolling Updates      | maxUnavailable: 1, maxSurge: 1         |
| Secure Config        | Secrets (base64) + ConfigMaps           |
| Load Balancer        | HAProxy on separate EC2 (port 80)       |
| API Gateway          | kGateway with HTTPRoute (11 routes)     |
| Internal Networking  | ClusterIP services with DNS discovery   |
| Resource Management  | CPU/Memory requests and limits on all   |
| Startup Ordering     | initContainers wait for MongoDB (busybox nc) |
| Health Probes        | Liveness + readiness probes on all pods |
| Sidecar Containers   | Nginx log aggregator on frontend pods   |
| Retry Logic          | Exponential backoff in all server.js (5 retries) |

---

## 📝 Docker Hub Images

All images are hosted on Docker Hub under `bharath44623`:

| Service      | Image                                         | Port |
|--------------|-----------------------------------------------|------|
| Frontend     | bharath44623/medimesh_medimesh-frontend        | 80   |
| BFF          | bharath44623/medimesh_medimesh-bff             | 5010 |
| Auth         | bharath44623/medimesh_medimesh-auth            | 5001 |
| User         | bharath44623/medimesh_medimesh-user            | 5002 |
| Doctor       | bharath44623/medimesh_medimesh-doctor          | 5003 |
| Appointment  | bharath44623/medimesh_medimesh-appointment     | 5004 |
| Vitals       | bharath44623/medimesh_medimesh-vitals          | 5005 |
| Pharmacy     | bharath44623/medimesh_medimesh-pharmacy        | 5006 |
| Ambulance    | bharath44623/medimesh_medimesh-ambulance       | 5007 |
| Complaint    | bharath44623/medimesh_medimesh-complaint       | 5008 |
| Forum        | bharath44623/medimesh_medimesh-forum           | 5009 |
| MongoDB      | mongo:7 (Official)                            | 27017|
