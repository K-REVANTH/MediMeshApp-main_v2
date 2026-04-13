# 🏥 MediMesh – Hospital Management Microservices

> **Smart Hospital Management System** — A MERN-stack microservices platform designed for hands-on Kubernetes learning using kubeadm on AWS EC2, featuring **kGateway** (Gateway API routing) and **HAProxy** (external load balancing).

---

## 📐 Architecture Diagram

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
      ┌───────────────────────┼───────────────────────────┐
      │ Path-based routes:                                │
      │  /             → medimesh-frontend-svc:80         │
      │  /api          → medimesh-bff-svc:5010            │
      │  /auth         → medimesh-auth-svc:5001           │
      │  /user         → medimesh-user-svc:5002           │
      │  /doctor       → medimesh-doctor-svc:5003         │
      │  /appointment  → medimesh-appointment-svc:5004    │
      │  /vitals       → medimesh-vitals-svc:5005         │
      │  /pharmacy     → medimesh-pharmacy-svc:5006       │
      │  /ambulance    → medimesh-ambulance-svc:5007      │
      │  /complaint    → medimesh-complaint-svc:5008      │
      │  /forum        → medimesh-forum-svc:5009          │
      └───────────────────────┼───────────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │  MongoDB StatefulSet│  ← Persistent (5Gi NFS PVC)
                    │  ClusterIP :27017  │
                    └─────────┬──────────┘
                              │ NFS mount
                    ┌─────────▼──────────┐
                    │  NFS Server (on    │  ← HAProxy/NFS EC2 instance
                    │  HAProxy EC2)      │     /srv/nfs/medimesh
                    │  Port 2049         │     Dynamic provisioning
                    └────────────────────┘
```

---

## 📁 Folder Structure

```
MediMesh/
├── services/
│   ├── medimesh-auth/           # JWT auth, roles, seed admin+doctors
│   ├── medimesh-user/           # Patient dashboard proxy
│   ├── medimesh-doctor/         # Doctor profiles + availability
│   ├── medimesh-appointment/    # Booking flow (CRUD)
│   ├── medimesh-vitals/         # BP, heart rate tracking
│   ├── medimesh-pharmacy/       # Medicine inventory (admin-only)
│   ├── medimesh-ambulance/      # Fleet availability tracking
│   ├── medimesh-complaint/      # User complaints (admin-only mgmt)
│   └── medimesh-forum/          # Community posts + discussions
├── medimesh-bff/                # Backend-for-Frontend aggregator
├── medimesh-frontend/           # React SPA (CRA + Nginx)
├── k8s/                         # Kubernetes manifests
│   ├── namespace.yaml           # Dedicated namespace
│   ├── configmap.yaml           # Non-sensitive configuration
│   ├── secret.yaml              # Sensitive credentials (base64)
│   ├── nfs/                     # ★ NFS Dynamic Provisioning
│   │   ├── nfs-server-setup.sh  # NFS server install script (HAProxy EC2)
│   │   ├── nfs-client-setup.sh  # NFS client install (all K8s nodes)
│   │   ├── rbac.yaml            # ServiceAccount + RBAC for provisioner
│   │   ├── storageclass.yaml    # nfs-dynamic StorageClass
│   │   ├── nfs-provisioner-deployment.yaml  # NFS provisioner pod
│   │   └── README.md            # NFS setup documentation
│   ├── mongodb/
│   │   ├── mongodb-statefulset.yaml  # 3-replica StatefulSet + Headless Service
│   │   ├── mongodb-rs-init-job.yaml  # ★ Job to init ReplicaSet (rs.initiate)
│   │   ├── mongodb-pv-pvc.yaml       # Reference (PVCs auto-created)
│   │   └── README.md                 # MongoDB ReplicaSet documentation
│   ├── backend-services/        # 10 Deployment manifests (9 services + BFF)
│   ├── services/
│   │   └── cluster-ip-services.yaml  # All 10 ClusterIP services
│   ├── frontend/
│   │   └── frontend-deployment.yaml  # Deployment + ClusterIP Service
│   ├── gateway/
│   │   ├── kgateway.yaml        # Gateway + HTTPRoute (all routes)
│   │   └── README.md            # kGateway documentation
│   ├── haproxy/
│   │   ├── haproxy.cfg          # HAProxy config template
│   │   ├── haproxy-setup.sh     # Automated HAProxy setup script
│   │   └── README.md            # HAProxy documentation
│   ├── hpa/
│   │   └── frontend-hpa.yaml   # HPA for frontend (2→5 pods)
│   └── README.md               # Full K8s deployment guide
├── .gitignore
├── docker-compose.yml
├── build-push.sh
└── README.md                   # This file
```

---

## 🧩 Services Overview

| # | Service | Port | Database | Description |
|---|---------|------|----------|-------------|
| 1 | medimesh-auth | 5001 | medimesh-auth-db | JWT login/register, roles (admin/doctor/patient) |
| 2 | medimesh-user | 5002 | medimesh-user-db | Patient profiles, proxy to doctor/pharmacy/ambulance |
| 3 | medimesh-doctor | 5003 | medimesh-doctor-db | Doctor profiles, 5 seeded defaults, availability |
| 4 | medimesh-appointment | 5004 | medimesh-appointment-db | Book (patient) / Approve-Reject (doctor) |
| 5 | medimesh-vitals | 5005 | medimesh-vitals-db | BP, heart rate — doctors write, patients read |
| 6 | medimesh-pharmacy | 5006 | medimesh-pharmacy-db | Medicine inventory — **admin-only** writes |
| 7 | medimesh-ambulance | 5007 | medimesh-ambulance-db | Fleet — available/busy status |
| 8 | medimesh-complaint | 5008 | medimesh-complaint-db | Raise (users) / Manage (**admin-only**) |
| 9 | medimesh-forum | 5009 | medimesh-forum-db | Community posts, likes, discussions |
| 10 | medimesh-bff | 5010 | — | Aggregator for all services |
| 11 | medimesh-frontend | 80 | — | React SPA with Nginx |

---

## 🔐 Default Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `123456` |
| Doctor | `doctor1` through `doctor5` | `pass123` |

> ⚠️ Admin registration is **blocked** at API level. Only the seeded admin exists.

---

## 🎨 UI Theme

- **Primary Blue:** `#2563EB`
- **Dark Blue:** `#1E40AF`
- **Light Background:** `#EFF6FF`
- **Status Colors:** Approved=Green, Pending=Orange, Rejected=Red

---

## 🐳 Docker Quick Start

### Prerequisites
- Docker & Docker Compose installed

### Run

```bash
# Clone and navigate
cd MediMesh

# Build and start all services
docker-compose up --build

# Access
# Frontend:  http://localhost:3000
# BFF API:   http://localhost:5010
```

### Stop

```bash
docker-compose down
# To also remove volumes:
docker-compose down -v
```

---

## ☸️ Kubernetes Deployment Guide

### Prerequisites
- kubeadm cluster (1 master + 2 workers on AWS EC2)
- Docker installed on all nodes
- kubectl configured
- Helm 3 installed (for kGateway)
- Separate EC2 instance for HAProxy (same VPC)

### Step 1: Create Namespace

```bash
kubectl apply -f k8s/namespace.yaml
```

### Step 2: Apply ConfigMap & Secrets

```bash
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
```

### Step 3: Set Up NFS Dynamic Provisioning

> See [k8s/nfs/README.md](k8s/nfs/README.md) for detailed NFS documentation.

**3a. Set up NFS server on HAProxy EC2 instance:**
```bash
# On the HAProxy/NFS EC2 instance
scp -i <your-key.pem> k8s/nfs/nfs-server-setup.sh ubuntu@<HAPROXY_IP>:~/
ssh -i <your-key.pem> ubuntu@<HAPROXY_IP>
chmod +x nfs-server-setup.sh
sudo ./nfs-server-setup.sh 172.31.0.0/16    # Use your VPC CIDR
```

**3b. Install NFS client on ALL K8s nodes (master + workers):**
```bash
# On EACH K8s node
sudo apt-get install -y nfs-common
```

**3c. Deploy NFS provisioner on K8s (from master):**
```bash
# ⚠️  First edit nfs-provisioner-deployment.yaml:
#    Replace <NFS_SERVER_PRIVATE_IP> with HAProxy/NFS private IP
kubectl apply -f k8s/nfs/rbac.yaml
kubectl apply -f k8s/nfs/storageclass.yaml
kubectl apply -f k8s/nfs/nfs-provisioner-deployment.yaml

# Verify provisioner is running
kubectl get pods -n medimesh -l app=nfs-client-provisioner
```

### Step 4: Deploy MongoDB ReplicaSet

> See [k8s/mongodb/README.md](k8s/mongodb/README.md) for detailed MongoDB ReplicaSet documentation.

**4a. Deploy the StatefulSet (creates 3 pods + 3 NFS PVCs):**
```bash
kubectl apply -f k8s/mongodb/mongodb-statefulset.yaml
```

**4b. Wait for ALL 3 MongoDB pods to be Running:**
```bash
kubectl get pods -n medimesh -l app=medimesh-mongodb -w
# Wait until all 3 show Running 1/1, then Ctrl+C
```

**4c. Initialize the ReplicaSet (run rs.initiate):**
```bash
kubectl apply -f k8s/mongodb/mongodb-rs-init-job.yaml
```

**4d. Verify ReplicaSet initialization:**
```bash
# Watch the init Job logs
kubectl logs -n medimesh job/mongodb-rs-init -f

# Verify: should show 1 PRIMARY + 2 SECONDARY
kubectl exec -n medimesh medimesh-mongodb-0 -- \
  mongosh --quiet --eval "rs.status().members.forEach(m => print(m.name + ' → ' + m.stateStr))"
```

### Step 5: Deploy Backend Services

```bash
kubectl apply -f k8s/backend-services/
kubectl apply -f k8s/services/cluster-ip-services.yaml
```

Wait for all pods:
```bash
kubectl get pods -n medimesh -l tier=backend --watch
# Wait until all show Running 1/1, then Ctrl+C
```

### Step 6: Deploy Frontend

```bash
kubectl apply -f k8s/frontend/frontend-deployment.yaml
```

### Step 7: Apply HPA (Optional — requires metrics-server)

```bash
kubectl apply -f k8s/hpa/frontend-hpa.yaml
```

---

### 🌐 Step 8: Install kGateway (Gateway API)

> kGateway is a Kubernetes-native API Gateway based on Envoy Proxy. It replaces the older Ingress approach with the modern **Gateway API** standard.

**7a. Install Gateway API CRDs (cluster-wide):**

```bash
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.2.1/standard-install.yaml
```

**7b. Install kGateway controller via Helm:**

```bash
helm install kgateway oci://cr.kgateway.dev/kgateway-helm/kgateway \
  --version v2.0.0-main \
  -n kgateway-system --create-namespace
```

**7c. Wait for the kGateway controller pod to be ready:**

```bash
kubectl get pods -n kgateway-system --watch
```

Expected output:
```
NAME                        READY   STATUS    RESTARTS   AGE
kgateway-xxxxxxxxx-xxxxx    1/1     Running   0          1m
```

**7d. Apply the Gateway + HTTPRoute manifest:**

```bash
kubectl apply -f k8s/gateway/kgateway.yaml
```

**7e. Verify the Gateway is programmed:**

```bash
kubectl get gateway -n medimesh
```

Expected output:
```
NAME               CLASS      ADDRESS   PROGRAMMED   AGE
medimesh-gateway   kgateway   <IP>      True         1m
```

**7f. Verify the HTTPRoute is accepted:**

```bash
kubectl get httproute -n medimesh
```

Expected output:
```
NAME              HOSTNAMES   AGE
medimesh-routes               1m
```

**7g. Get the kGateway NodePort (save this for HAProxy):**

```bash
kubectl get svc -n medimesh | grep gateway
```

Expected output:
```
medimesh-gateway   NodePort   10.96.x.x   <none>   80:31080/TCP   2m
                                                        ^^^^^
                                                  NOTE THIS PORT
```

> 📝 Save the NodePort number (e.g., `31080`) — you need it in the next step.

---

### 🔀 Step 9: Set Up HAProxy (Separate EC2 Instance)

> HAProxy runs on a **separate EC2 instance** (not on the K8s cluster). It accepts public traffic on port 80 and load-balances to the kGateway NodePort on both worker nodes.

**8a. Launch a new EC2 instance for HAProxy:**

| Setting | Value |
|---------|-------|
| OS | Ubuntu 22.04+ |
| Instance Type | `t2.micro` or `t3.micro` |
| VPC | Same VPC as K8s workers |
| Security Group — Inbound | Port `80` + `8404` from `0.0.0.0/0`, Port `22` from your IP |

**8b. Copy the setup script to the HAProxy instance:**

```bash
scp -i <your-key.pem> k8s/haproxy/haproxy-setup.sh ubuntu@<HAPROXY_PUBLIC_IP>:~/
```

**8c. SSH into the HAProxy instance:**

```bash
ssh -i <your-key.pem> ubuntu@<HAPROXY_PUBLIC_IP>
```

**8d. Run the setup script with the NodePort from step 7g:**

```bash
chmod +x haproxy-setup.sh
sudo ./haproxy-setup.sh <KGATEWAY_NODEPORT>
```

Example (if NodePort is 31080):
```bash
sudo ./haproxy-setup.sh 31080
```

**8e. Verify HAProxy is running:**

```bash
sudo systemctl status haproxy
```

Expected output:
```
● haproxy.service - HAProxy Load Balancer
     Active: active (running)
```

**8f. Test access from browser:**

```
http://<HAPROXY_PUBLIC_IP>          → Should show MediMesh frontend
http://<HAPROXY_PUBLIC_IP>:8404/stats → HAProxy dashboard (admin / medimesh2026)
```

---

### ✅ Final Verification

```bash
# All pods running (24 total: 3 MongoDB + 20 service replicas + 1 Envoy proxy)
kubectl get pods -n medimesh -o wide

# All services (11 ClusterIP + 1 NodePort gateway)
kubectl get svc -n medimesh

# Gateway programmed
kubectl get gateway -n medimesh

# Routes accepted
kubectl get httproute -n medimesh

# HPA active
kubectl get hpa -n medimesh

# Test from browser
curl http://<HAPROXY_PUBLIC_IP>/
curl http://<HAPROXY_PUBLIC_IP>/api
```

---

## 🌐 Accessing the Application

### Via HAProxy (Production)

All traffic flows through HAProxy → kGateway → Services:

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

---

## 📡 Service Interaction Flow

```
Patient Register → medimesh-auth (POST /api/auth/register)
Patient Login    → medimesh-auth (POST /api/auth/login) → JWT Token
Book Appointment → medimesh-bff → medimesh-appointment (POST)
Doctor Approves  → medimesh-bff → medimesh-appointment (PATCH status)
Record Vitals    → medimesh-bff → medimesh-vitals (POST) [doctor-only]
View Pharmacy    → medimesh-bff → medimesh-pharmacy (GET) [all roles]
Add Medicine     → medimesh-bff → medimesh-pharmacy (POST) [admin-only]
File Complaint   → medimesh-bff → medimesh-complaint (POST) [any user]
Resolve Complaint→ medimesh-bff → medimesh-complaint (PATCH) [admin-only]
Forum Post       → medimesh-bff → medimesh-forum (POST) [any user]
Dashboard        → medimesh-bff → aggregates multiple services
```

---

## 🧠 Kubernetes Concepts Practiced

| Concept | Where Used |
|---------|-----------|
| **Namespace** | `medimesh` namespace isolates all resources |
| **Deployments** | All 10 app services + frontend (2 replicas each) |
| **StatefulSet** | MongoDB 3-replica ReplicaSet with stable pod identities |
| **MongoDB ReplicaSet** | 3-node rs0: auto-failover, data replication via oplog |
| **ReplicaSet Init Job** | Kubernetes Job runs rs.initiate() to form the ReplicaSet |
| **ConfigMap** | Service URLs, MongoDB host config |
| **Secret** | JWT secret, admin credentials (base64) |
| **NFS Server** | External NFS on HAProxy EC2 instance |
| **NFS Provisioner** | nfs-subdir-external-provisioner for dynamic PVs |
| **StorageClass** | `nfs-dynamic` — auto-provisions NFS-backed PVs |
| **PersistentVolumeClaim** | Dynamic PVC bound via NFS StorageClass |
| **RBAC** | ServiceAccount + ClusterRole for NFS provisioner |
| **ClusterIP Service** | Internal communication between all 11 services |
| **Gateway API (Gateway)** | kGateway creates Envoy proxy, listens on port 80 |
| **Gateway API (HTTPRoute)** | 11 path-based routing rules to microservices |
| **NodePort Service** | Auto-created by kGateway for external access |
| **HPA** | Frontend auto-scales 2→5 pods at 60% CPU |
| **Resource Requests/Limits** | CPU/Memory on every container |
| **InitContainers** | Wait for MongoDB before starting services |
| **Health Probes** | Liveness + readiness probes on all pods |
| **Sidecar Containers** | Nginx log aggregator on frontend pods |
| **Rolling Updates** | maxUnavailable: 1, maxSurge: 1 |
| **Retry Logic** | Exponential backoff in all server.js (5 retries) |

---

## 🐳 Docker Hub Images

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

---

## 📊 Key Features Summary

| Feature              | Implementation                          |
|----------------------|-----------------------------------------|
| High Availability    | 2 replicas per service + 3 MongoDB (24 total pods) |
| MongoDB ReplicaSet   | 3-node rs0 with auto-failover and data replication |
| Auto-Scaling         | HPA on frontend (2→5 pods, 60% CPU)    |
| Data Persistence     | MongoDB StatefulSet + NFS dynamic PVC  |
| Rolling Updates      | maxUnavailable: 1, maxSurge: 1         |
| Secure Config        | Secrets (base64) + ConfigMaps           |
| External Load Balancer | HAProxy on separate EC2 (port 80)     |
| API Gateway          | kGateway with HTTPRoute (11 routes)     |
| Internal Networking  | ClusterIP services with DNS discovery   |
| Resource Management  | CPU/Memory requests and limits on all   |
| Startup Ordering     | initContainers wait for MongoDB         |
| Health Probes        | Liveness + readiness probes on all pods |
| Retry Logic          | Exponential backoff (5 retries)         |

---

## 📝 License

This project is for **educational/learning purposes only**. Not intended for production use.
