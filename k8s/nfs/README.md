# 📦 MediMesh — NFS Dynamic Storage Provisioning

> Replaces static `hostPath` PersistentVolumes with **dynamic NFS-backed provisioning** using `nfs-subdir-external-provisioner`.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    AWS VPC (same subnet)                │
│                                                         │
│  ┌──────────────────┐     ┌──────────────────────────┐  │
│  │  HAProxy + NFS   │     │   Kubernetes Cluster     │  │
│  │  EC2 Instance    │     │                          │  │
│  │                  │     │  ┌─────────────────────┐ │  │
│  │  HAProxy :80     │     │  │  NFS Provisioner    │ │  │
│  │  NFS Server :2049│◄────┤  │  (auto-creates PVs) │ │  │
│  │                  │     │  └─────────────────────┘ │  │
│  │  /srv/nfs/       │     │           │              │  │
│  │   medimesh/      │     │  ┌────────▼────────────┐ │  │
│  │    ├── mongo-pvc/│     │  │  MongoDB StatefulSet │ │  │
│  │    └── ...       │     │  │  (mounts NFS PVC)   │ │  │
│  │                  │     │  └─────────────────────┘ │  │
│  └──────────────────┘     └──────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 Files in this Directory

| File | Purpose |
|------|---------|
| `nfs-server-setup.sh` | Installs & configures NFS server on HAProxy EC2 |
| `nfs-client-setup.sh` | Installs NFS client on all K8s nodes |
| `rbac.yaml` | ServiceAccount, ClusterRole, RoleBindings |
| `storageclass.yaml` | `nfs-dynamic` StorageClass (set as default) |
| `nfs-provisioner-deployment.yaml` | NFS subdir external provisioner Deployment |

---

## 🔄 What Changed (Static → Dynamic)

### Before (Static Provisioning)
```yaml
# Had to manually create PV with hostPath
apiVersion: v1
kind: PersistentVolume
metadata:
  name: medimesh-mongodb-pv
spec:
  storageClassName: manual
  hostPath:
    path: /mnt/data/medimesh-mongodb
---
# PVC bound to specific PV
apiVersion: v1
kind: PersistentVolumeClaim
spec:
  storageClassName: manual
```

### After (Dynamic NFS Provisioning)
```yaml
# No PV needed! Just create a PVC:
apiVersion: v1
kind: PersistentVolumeClaim
spec:
  storageClassName: nfs-dynamic
  # PV is auto-created by the provisioner!
```

### Key Benefits
- ✅ **No manual PV creation** — provisioner handles it
- ✅ **Data survives node failures** — stored on separate NFS server
- ✅ **Scalable** — just create more PVCs, no manual work
- ✅ **Centralized storage** — all data on NFS server
- ✅ **Pod rescheduling** — MongoDB can restart on any node

---

## ⚙️ Configuration

### NFS Server IP
The provisioner deployment requires the NFS server's **private IP**. Update it in:
- `nfs-provisioner-deployment.yaml` → Two places marked with `<NFS_SERVER_PRIVATE_IP>`

### Security Group Rules
Add inbound rule on HAProxy/NFS instance:

| Type | Protocol | Port | Source |
|------|----------|------|--------|
| NFS | TCP | 2049 | K8s VPC CIDR (e.g., 172.31.0.0/16) |
| NFS | UDP | 2049 | K8s VPC CIDR (e.g., 172.31.0.0/16) |

---

## 🧪 Troubleshooting

```bash
# Check provisioner pod
kubectl get pods -n medimesh -l app=nfs-client-provisioner

# Check provisioner logs
kubectl logs -n medimesh -l app=nfs-client-provisioner

# Check StorageClass
kubectl get sc

# Check PVC status (should be Bound)
kubectl get pvc -n medimesh

# Check PV (auto-created)
kubectl get pv

# Test NFS from a K8s node
showmount -e <NFS_SERVER_IP>

# Check NFS exports on the server
exportfs -v

# Check NFS server status
systemctl status nfs-kernel-server
```
