# MediMesh — Helm Umbrella Chart Deployment Guide

## Architecture Overview

```
medimesh (parent umbrella chart)
├── frontend      → medimesh-frontend namespace  (Deployment + Gateway + HPA)
├── bff           → medimesh-backend namespace   (Backend-For-Frontend)
├── auth          → medimesh-backend namespace   (Auth microservice)
├── user          → medimesh-backend namespace   (User microservice)
├── doctor        → medimesh-backend namespace   (Doctor microservice)
├── appointment   → medimesh-backend namespace   (Appointment microservice)
├── vitals        → medimesh-backend namespace   (Vitals microservice)
├── pharmacy      → medimesh-backend namespace   (Pharmacy microservice)
├── ambulance     → medimesh-backend namespace   (Ambulance microservice)
├── complaint     → medimesh-backend namespace   (Complaint microservice)
├── forum         → medimesh-backend namespace   (Forum microservice)
├── mongo         → medimesh-db namespace        (MongoDB 3-replica StatefulSet)
└── nfs           → medimesh-db namespace        (NFS dynamic provisioner)
```

### Namespace Isolation

| Namespace            | Components                                        |
|----------------------|---------------------------------------------------|
| `medimesh-frontend`  | Frontend, Gateway, HTTPRoute, HPA                 |
| `medimesh-backend`   | BFF + 9 Microservices, ConfigMap, Secret           |
| `medimesh-db`        | MongoDB StatefulSet, NFS Provisioner, StorageClass |

### Network Policy (Zero Trust)

| Source               | Destination          | Status |
|----------------------|----------------------|--------|
| frontend → bff       | ✅ Allowed           |        |
| bff → backend        | ✅ Allowed           |        |
| backend ↔ backend    | ✅ Allowed           |        |
| backend → database   | ✅ Allowed           |        |
| frontend → database  | ❌ Denied            |        |
| external → database  | ❌ Denied            |        |
| unspecified traffic   | ❌ Denied            |        |

### Cross-Namespace Communication

All services use Kubernetes FQDN format:
```
<service>.<namespace>.svc.cluster.local
```
Example: `medimesh-auth-svc.medimesh-backend.svc.cluster.local:5001`

---

## Prerequisites

- Kubernetes cluster (kubeadm / EKS / etc.)
- Helm 3.x installed
- kubectl configured
- NFS server running at `172.31.64.95`
- Docker images pushed to `bharath44623` registry
- kGateway CRDs installed (if using Gateway API)

---

## Step-by-Step Deployment

### Step 1: Prepare the NFS Server (IP: 172.31.64.95)

```bash
# SSH into your NFS server
ssh ubuntu@172.31.64.95

# Install NFS server
sudo apt update && sudo apt install -y nfs-kernel-server

# Create export directory
sudo mkdir -p /srv/nfs/medimesh
sudo chown nobody:nogroup /srv/nfs/medimesh
sudo chmod 777 /srv/nfs/medimesh

# Configure exports
echo "/srv/nfs/medimesh *(rw,sync,no_subtree_check,no_root_squash)" | sudo tee -a /etc/exports

# Apply and enable
sudo exportfs -rav
sudo systemctl restart nfs-kernel-server
sudo systemctl enable nfs-kernel-server
```

### Step 2: Install NFS Client on ALL Kubernetes Nodes

```bash
# Run on master + all worker nodes
sudo apt update && sudo apt install -y nfs-common

# Quick test (on any node)
sudo mount -t nfs 172.31.64.95:/srv/nfs/medimesh /mnt
ls /mnt
sudo umount /mnt
```

### Step 3: Update values.yaml (if needed)

NFS IP is already set to `172.31.64.95`. Only change if your IP differs:
```yaml
global:
  storage:
    nfs:
      server: "172.31.64.95"    # ← your NFS server private IP
      path: "/srv/nfs/medimesh"
```

### Step 4: Build Helm Dependencies

```bash
cd helm/medimesh
helm dependency build
```

This packages all 13 subcharts into `charts/*.tgz`.

### Step 5: Lint the Chart

```bash
helm lint .
```

Make sure there are no errors.

### Step 6: Dry-Run (Preview What Gets Created)

```bash
helm template medimesh . --debug > /tmp/rendered.yaml

# Verify namespace isolation
grep "namespace: medimesh-frontend" /tmp/rendered.yaml | wc -l
grep "namespace: medimesh-backend" /tmp/rendered.yaml | wc -l
grep "namespace: medimesh-db" /tmp/rendered.yaml | wc -l

# Verify NetworkPolicies
grep "kind: NetworkPolicy" /tmp/rendered.yaml

# Verify all deployments
grep "kind: Deployment" /tmp/rendered.yaml
```

### Step 7: Install the Chart

```bash
helm install medimesh . -n medimesh-system --create-namespace
```

This will:
1. Create 3 namespaces: `medimesh-frontend`, `medimesh-backend`, `medimesh-db`
2. Deploy NFS provisioner + StorageClass
3. Deploy MongoDB StatefulSet (3 replicas)
4. Run MongoDB ReplicaSet init Job
5. Deploy all 9 backend microservices + BFF
6. Deploy frontend with log sidecar
7. Create Gateway + HTTPRoute
8. Apply all NetworkPolicies (deny-all + specific allow rules)

### Step 8: Verify Everything

```bash
# Check namespaces
kubectl get ns | grep medimesh

# Check pods in each namespace
kubectl get pods -n medimesh-frontend
kubectl get pods -n medimesh-backend
kubectl get pods -n medimesh-db

# Check services
kubectl get svc -n medimesh-frontend
kubectl get svc -n medimesh-backend
kubectl get svc -n medimesh-db

# Check StorageClass and PVCs
kubectl get sc | grep nfs
kubectl get pvc -n medimesh-db

# Check NetworkPolicies
kubectl get networkpolicy -n medimesh-frontend
kubectl get networkpolicy -n medimesh-backend
kubectl get networkpolicy -n medimesh-db

# Check MongoDB RS init job
kubectl get jobs -n medimesh-db
kubectl logs -n medimesh-db job/mongodb-rs-init

# Check Gateway
kubectl get gateway -n medimesh-frontend
kubectl get httproute -n medimesh-frontend
```

### Step 9: Get External IP

```bash
# Get Gateway external IP
kubectl get svc -n medimesh-frontend | grep gateway
# OR
kubectl get gateway medimesh-gateway -n medimesh-frontend -o jsonpath='{.status.addresses[0].value}'
```

Access app at: `http://<GATEWAY_EXTERNAL_IP>`

---

## Upgrading

```bash
cd helm/medimesh
# Edit values.yaml as needed
helm dependency build
helm upgrade medimesh . -n medimesh-system
```

## Uninstalling

```bash
helm uninstall medimesh -n medimesh-system

# Clean up namespaces (optional)
kubectl delete ns medimesh-frontend medimesh-backend medimesh-db
```

---

## Troubleshooting

### Pods stuck in Pending (PVC issues)
```bash
kubectl get pvc -n medimesh-db
kubectl logs -n medimesh-db -l app=nfs-client-provisioner
# Test NFS mount from node
sudo mount -t nfs 172.31.64.95:/srv/nfs/medimesh /mnt
```

### Backend pods in CrashLoopBackOff
```bash
kubectl get pods -n medimesh-db                              # Is MongoDB up?
kubectl logs -n medimesh-backend <pod> -c wait-for-mongodb   # Init container logs
kubectl logs -n medimesh-backend <pod>                       # App logs
```

### MongoDB ReplicaSet not initializing
```bash
kubectl describe job mongodb-rs-init -n medimesh-db
kubectl logs -n medimesh-db job/mongodb-rs-init
kubectl exec -it -n medimesh-db medimesh-mongodb-0 -- mongosh --eval "rs.status()"
```

### NetworkPolicy blocking traffic
```bash
kubectl describe networkpolicy -n medimesh-backend
kubectl exec -n medimesh-backend <pod> -- nc -z medimesh-mongodb.medimesh-db.svc.cluster.local 27017
kubectl exec -n medimesh-backend <pod> -- nslookup medimesh-mongodb.medimesh-db.svc.cluster.local
```

---

## Folder Structure

```
helm/medimesh/
├── Chart.yaml                              # Parent umbrella (13 dependencies)
├── values.yaml                             # SINGLE source of truth
│
├── templates/                              # Global cross-cutting resources
│   ├── _helpers.tpl                        # Naming, labels, MongoDB URI helper
│   ├── namespace.yaml                      # 3 namespaces with tier labels
│   ├── configmap.yaml                      # Shared service URLs (FQDN)
│   ├── secret.yaml                         # Shared JWT + MongoDB creds
│   └── network-policies/
│       ├── deny-all.yaml                   # Default deny in all 3 namespaces
│       ├── allow-frontend-to-bff.yaml      # Frontend → BFF
│       ├── allow-bff-to-backend.yaml       # BFF ↔ Backend (inter-service)
│       └── allow-backend-to-db.yaml        # Backend → DB + replication + DNS
│
└── charts/                                 # ALL services (flat subcharts)
    ├── frontend/                           # → medimesh-frontend namespace
    │   ├── Chart.yaml
    │   └── templates/
    │       ├── deployment.yaml
    │       ├── service.yaml
    │       ├── hpa.yaml
    │       └── gateway.yaml                # kGateway + HTTPRoute
    │
    ├── bff/                                # → medimesh-backend namespace
    │   ├── Chart.yaml
    │   └── templates/
    │       ├── deployment.yaml
    │       └── service.yaml
    │
    ├── auth/                               # → medimesh-backend namespace
    │   ├── Chart.yaml
    │   └── templates/
    │       ├── deployment.yaml
    │       └── service.yaml
    ├── user/         (same structure)
    ├── doctor/       (same structure)
    ├── appointment/  (same structure)
    ├── vitals/       (same structure)
    ├── pharmacy/     (same structure)
    ├── ambulance/    (same structure)
    ├── complaint/    (same structure)
    ├── forum/        (same structure)
    │
    ├── mongo/                              # → medimesh-db namespace
    │   ├── Chart.yaml
    │   └── templates/
    │       ├── statefulset.yaml
    │       ├── service.yaml
    │       ├── secret.yaml
    │       └── rs-init-job.yaml
    │
    └── nfs/                                # → medimesh-db namespace
        ├── Chart.yaml
        └── templates/
            ├── deployment.yaml
            ├── rbac.yaml
            └── storageclass.yaml
```
