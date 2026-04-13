# 🗄️ MediMesh — MongoDB 3-Node ReplicaSet on Kubernetes

> **High-Availability MongoDB** with automatic data replication across 3 pods, backed by NFS dynamic provisioning for persistent, node-independent storage.

---

## 📐 Architecture

```
                    ┌────────────────────────────────────────┐
                    │     MongoDB ReplicaSet "rs0"           │
                    │                                        │
  ┌─────────────────┼──────────┐                             │
  │ medimesh-mongodb-0         │                             │
  │ Role: PRIMARY (priority 2) │                             │
  │ DNS: medimesh-mongodb-0.   │                             │
  │   medimesh-mongodb.medimesh│                             │
  │   .svc.cluster.local       │                             │
  │ PVC: mongodb-data-....-0   │                             │
  │ NFS: /srv/nfs/medimesh/    │                             │
  │   medimesh-mongodb-data-..0│                             │
  └────────────┬───────────────┘                             │
               │ replication                                 │
  ┌────────────▼───────────────┐  ┌──────────────────────────┤
  │ medimesh-mongodb-1         │  │ medimesh-mongodb-2       │
  │ Role: SECONDARY (priority 1)  │ Role: SECONDARY (pri 1)  │
  │ DNS: medimesh-mongodb-1.   │  │ DNS: medimesh-mongodb-2. │
  │   medimesh-mongodb.medimesh│  │   medimesh-mongodb....   │
  │ PVC: mongodb-data-....-1   │  │ PVC: mongodb-data-...-2  │
  └────────────────────────────┘  └──────────────────────────┘
                    │                          │
                    ▼                          ▼
          ┌──────────────────────────────────────────┐
          │         NFS Server (HAProxy EC2)         │
          │  /srv/nfs/medimesh/                      │
          │    ├── medimesh-mongodb-data-...-0/       │
          │    ├── medimesh-mongodb-data-...-1/       │
          │    └── medimesh-mongodb-data-...-2/       │
          └──────────────────────────────────────────┘
```

---

## 📁 Files in This Directory

| File | Purpose |
|------|---------|
| `mongodb-statefulset.yaml` | Headless Service + 3-replica StatefulSet with `--replSet rs0` |
| `mongodb-rs-init-job.yaml` | Job to run `rs.initiate()` and verify replication |
| `mongodb-pv-pvc.yaml` | Reference file (PVCs auto-created by volumeClaimTemplates) |
| `README.md` | This documentation |

---

## 🚀 Deployment Steps (Complete)

### Prerequisites

Before deploying MongoDB, you MUST have:
1. ✅ Namespace created (`kubectl apply -f k8s/namespace.yaml`)
2. ✅ ConfigMap & Secrets applied
3. ✅ NFS server running on HAProxy EC2 (see `k8s/nfs/README.md`)
4. ✅ NFS client (`nfs-common`) installed on ALL K8s nodes
5. ✅ NFS provisioner deployed (RBAC + StorageClass + Deployment)

### Step 1: Deploy MongoDB StatefulSet

```bash
kubectl apply -f k8s/mongodb/mongodb-statefulset.yaml
```

This creates:
- **Headless Service** `medimesh-mongodb` (ClusterIP: None)
- **StatefulSet** `medimesh-mongodb` with 3 replicas
- **3 PVCs** automatically via `volumeClaimTemplates` (NFS-backed)

### Step 2: Wait for All 3 Pods to be Running

```bash
kubectl get pods -n medimesh -l app=medimesh-mongodb -w
```

Wait until you see:
```
NAME                   READY   STATUS    RESTARTS   AGE
medimesh-mongodb-0     1/1     Running   0          60s
medimesh-mongodb-1     1/1     Running   0          45s
medimesh-mongodb-2     1/1     Running   0          30s
```

> ⚠️ **All 3 pods MUST be Running before proceeding to Step 3.**

### Step 3: Initialize the ReplicaSet

```bash
kubectl apply -f k8s/mongodb/mongodb-rs-init-job.yaml
```

### Step 4: Watch the Init Job Logs

```bash
kubectl logs -n medimesh job/mongodb-rs-init -f
```

Expected output:
```
═══════════════════════════════════════════════════════
  MediMesh — MongoDB ReplicaSet Initialization
═══════════════════════════════════════════════════════

📡 Step 1: Waiting for all MongoDB pods to be reachable...
  Checking medimesh-mongodb-0... ✅ Ready
  Checking medimesh-mongodb-1... ✅ Ready
  Checking medimesh-mongodb-2... ✅ Ready

🔍 Step 2: Checking if ReplicaSet is already initialized...
  ReplicaSet not yet initialized. Proceeding...

🚀 Step 3: Initializing ReplicaSet rs0 with 3 members...
  { ok: 1 }

⏳ Step 4: Waiting for PRIMARY election...
  ✅ PRIMARY elected!

📊 Step 5: Final ReplicaSet Status:
  [0] medimesh-mongodb-0...:27017 → PRIMARY
  [1] medimesh-mongodb-1...:27017 → SECONDARY
  [2] medimesh-mongodb-2...:27017 → SECONDARY

🧪 Step 6: Testing data replication...
  ✅ Test document written to PRIMARY
  ✅ Data replicated to SECONDARY-1 successfully!
  ✅ Data replicated to SECONDARY-2 successfully!
  🧹 Test data cleaned up

═══════════════════════════════════════════════════════
  ✅ MongoDB ReplicaSet initialized successfully!
═══════════════════════════════════════════════════════
```

### Step 5: Verify ReplicaSet Status

```bash
# Quick status check
kubectl exec -n medimesh medimesh-mongodb-0 -- \
  mongosh --quiet --eval "rs.status().members.forEach(m => print(m.name + ' → ' + m.stateStr))"

# Expected output:
# medimesh-mongodb-0...:27017 → PRIMARY
# medimesh-mongodb-1...:27017 → SECONDARY
# medimesh-mongodb-2...:27017 → SECONDARY
```

### Step 6: Verify NFS-backed PVCs

```bash
# Check PVCs are Bound
kubectl get pvc -n medimesh | grep mongodb

# Expected:
# mongodb-data-medimesh-mongodb-0   Bound   pvc-xxx   5Gi   RWO   nfs-dynamic
# mongodb-data-medimesh-mongodb-1   Bound   pvc-xxx   5Gi   RWO   nfs-dynamic
# mongodb-data-medimesh-mongodb-2   Bound   pvc-xxx   5Gi   RWO   nfs-dynamic
```

```bash
# On the NFS server, verify directories were created
ls -la /srv/nfs/medimesh/ | grep mongodb

# Expected:
# drwxrwxrwx  medimesh-mongodb-data-medimesh-mongodb-0
# drwxrwxrwx  medimesh-mongodb-data-medimesh-mongodb-1
# drwxrwxrwx  medimesh-mongodb-data-medimesh-mongodb-2
```

---

## 🔗 Connection String

All backend services use the **ReplicaSet-aware** connection string:

```
mongodb://medimesh-mongodb-0.medimesh-mongodb:27017,medimesh-mongodb-1.medimesh-mongodb:27017,medimesh-mongodb-2.medimesh-mongodb:27017/<DB_NAME>?replicaSet=rs0
```

| Service | Database Name |
|---------|--------------|
| Auth | `medimesh-auth-db` |
| User | `medimesh-user-db` |
| Doctor | `medimesh-doctor-db` |
| Appointment | `medimesh-appointment-db` |
| Vitals | `medimesh-vitals-db` |
| Pharmacy | `medimesh-pharmacy-db` |
| Ambulance | `medimesh-ambulance-db` |
| Complaint | `medimesh-complaint-db` |
| Forum | `medimesh-forum-db` |

> **Why not use the headless service name `medimesh-mongodb:27017`?**
> With a ReplicaSet, the MongoDB driver needs to know ALL member hostnames to handle automatic failover. If the PRIMARY goes down, the driver automatically connects to the new PRIMARY.

---

## 🧪 Testing Data Replication

### Write to PRIMARY, Read from SECONDARY

```bash
# Write a test document on PRIMARY (pod-0)
kubectl exec -n medimesh medimesh-mongodb-0 -- \
  mongosh --quiet --eval '
    db.getSiblingDB("test-replication").items.insertOne({
      message: "Hello from PRIMARY",
      timestamp: new Date()
    });
    print("✅ Written to PRIMARY");
  '

# Read from SECONDARY (pod-1) — wait 2-3 seconds for replication
kubectl exec -n medimesh medimesh-mongodb-1 -- \
  mongosh --quiet --eval '
    db.getMongo().setReadPref("secondary");
    var doc = db.getSiblingDB("test-replication").items.findOne();
    if (doc) { print("✅ Read from SECONDARY: " + doc.message); }
    else { print("⏳ Not yet replicated, try again in a few seconds"); }
  '

# Clean up
kubectl exec -n medimesh medimesh-mongodb-0 -- \
  mongosh --quiet --eval 'db.getSiblingDB("test-replication").dropDatabase()'
```

### Failover Test

```bash
# Delete the PRIMARY pod — K8s will recreate it
kubectl delete pod medimesh-mongodb-0 -n medimesh

# Watch the new PRIMARY election (pod-1 or pod-2 becomes PRIMARY)
kubectl exec -n medimesh medimesh-mongodb-1 -- \
  mongosh --quiet --eval 'rs.status().members.forEach(m => print(m.name + " → " + m.stateStr))'

# pod-0 will rejoin as SECONDARY after restart
kubectl get pods -n medimesh -l app=medimesh-mongodb -w
```

---

## 🔧 Troubleshooting

### Pod stuck in Pending

```bash
kubectl describe pod medimesh-mongodb-0 -n medimesh
```

**Likely cause:** PVC not binding. Check:
```bash
kubectl get pvc -n medimesh | grep mongodb
kubectl get sc nfs-dynamic
kubectl get pods -n medimesh -l app=nfs-client-provisioner
```

### ReplicaSet init fails

```bash
# Check Job logs
kubectl logs -n medimesh job/mongodb-rs-init

# Re-run the Job
kubectl delete job mongodb-rs-init -n medimesh
kubectl apply -f k8s/mongodb/mongodb-rs-init-job.yaml
```

### "not primary" errors in app logs

The ReplicaSet hasn't elected a PRIMARY yet. Check:
```bash
kubectl exec -n medimesh medimesh-mongodb-0 -- mongosh --quiet --eval "rs.status()"
```

If not initialized:
```bash
kubectl apply -f k8s/mongodb/mongodb-rs-init-job.yaml
```

### Member in RECOVERING state

This is normal after a pod restart — MongoDB is syncing data from other members. Wait 1-2 minutes and check again.

---

## 🧠 Concepts Explained

| Concept | Description |
|---------|-------------|
| **ReplicaSet** | Group of MongoDB instances that maintain the same data. Provides redundancy and high availability. |
| **PRIMARY** | The only member that accepts writes. Elected automatically. |
| **SECONDARY** | Read-only copies. Continuously replicate data from PRIMARY via the oplog. |
| **Oplog** | Operations log — a capped collection that records all write operations for replication. |
| **Automatic Failover** | If PRIMARY goes down, remaining members elect a new PRIMARY within 10-12 seconds. |
| **Priority** | Member with highest priority is preferred as PRIMARY. Pod-0 has priority 2 (preferred). |
| **rs.initiate()** | One-time command to initialize the ReplicaSet with its member configuration. |
| **volumeClaimTemplates** | StatefulSet feature that creates a unique PVC for each pod (mongodb-data-...-0, -1, -2). |
| **Headless Service** | `clusterIP: None` — provides stable DNS for each pod but no load-balancing. |
| **Pod Anti-Affinity** | Prefers scheduling pods on different nodes for true HA. |
