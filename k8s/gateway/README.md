# 🌐 MediMesh — kGateway (Gateway API Routing)

> **Kubernetes-native API Gateway** using the Gateway API standard with kGateway controller (Envoy-based), providing path-based routing to all 11 MediMesh microservices inside the cluster.

---

## 📐 Architecture: Where kGateway Fits

```
       HAProxy (External LB — port 80)
                    │
                    │ Forwards to worker NodePort
                    │
     ┌──────────────▼──────────────┐
     │    kGateway (Envoy Proxy)   │  ← THIS COMPONENT
     │    Gateway API Controller   │     You are here
     │    NodePort Service         │
     └──────────────┬──────────────┘
                    │
    Path-based routing (HTTPRoute rules)
                    │
    ┌───────────────┼────────────────────────────┐
    │               │                            │
    │  /            │  /api         /auth         │
    │  ▼            │  ▼            ▼             │
    │  Frontend     │  BFF ──→ 9 Backend Services │
    │  (port 80)    │  (5010)                     │
    └───────────────┴────────────────────────────┘
```

### What is kGateway?

**kGateway** is a Kubernetes Gateway API implementation built on top of **Envoy Proxy**. It replaces the older Nginx Ingress Controller with the modern, standardized **Gateway API** approach.

| Feature | kGateway (Gateway API) | Nginx Ingress Controller |
|---------|----------------------|--------------------------|
| **API Standard** | `gateway.networking.k8s.io/v1` (official K8s) | Custom annotations |
| **Proxy Engine** | Envoy | Nginx |
| **Configuration** | Gateway + HTTPRoute CRDs | Ingress + annotations |
| **Multi-tenancy** | Built-in (Gateway per namespace) | Limited |
| **Status** | Kubernetes standard (GA since v1.1) | Legacy, still widely used |

### Why kGateway Instead of Nginx Ingress?

1. **Gateway API is the Kubernetes standard** — official successor to Ingress
2. **Separation of concerns** — Infra team manages `Gateway`, dev team manages `HTTPRoute`
3. **Envoy-based** — high-performance, used by Istio, AWS App Mesh, etc.
4. **Path-based routing** without custom annotations
5. **Learning value** — demonstrates modern K8s networking patterns

---

## 📁 Files in This Directory

```
gateway/
├── README.md       # This documentation
└── kgateway.yaml   # Gateway + HTTPRoute manifest (all routes)
```

---

## 🧩 Manifest Breakdown: `kgateway.yaml`

The file contains **two** Kubernetes resources:

### Resource 1: Gateway

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: medimesh-gateway
  namespace: medimesh
spec:
  gatewayClassName: kgateway          # ← Uses the kGateway controller
  listeners:
  - name: http
    protocol: HTTP
    port: 80                          # ← Gateway listens on port 80
    allowedRoutes:
      namespaces:
        from: Same                    # ← Only routes from "medimesh" namespace
```

**What this does:**
- Creates an Envoy proxy instance inside the `medimesh` namespace
- Listens on **port 80** for HTTP traffic
- The kGateway controller automatically creates a **NodePort Service** for this Gateway
- Only accepts HTTPRoute resources from the **same namespace** (security boundary)

### Resource 2: HTTPRoute

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: medimesh-routes
  namespace: medimesh
spec:
  parentRefs:
  - name: medimesh-gateway            # ← Attaches to the Gateway above

  rules:
  # 11 path-based routing rules (order matters!)
  - matches:
    - path:
        type: PathPrefix
        value: /api
    backendRefs:
    - name: medimesh-bff-svc
      port: 5010

  # ... (8 more service routes) ...

  # LAST — catch-all for frontend
  - matches:
    - path:
        type: PathPrefix
        value: /
    backendRefs:
    - name: medimesh-frontend-svc
      port: 80
```

**What this does:**
- Defines **path-based routing rules** that the Gateway's Envoy proxy enforces
- Routes are matched **top-down** — more specific paths (`/api`, `/auth`) are checked first
- The catch-all `/` route is **last** so it doesn't steal traffic from specific paths

---

## 🗺️ Complete Route Table

| # | Path Prefix | Target Service | Port | Description |
|---|-------------|---------------|------|-------------|
| 1 | `/api` | `medimesh-bff-svc` | 5010 | BFF aggregator — main API gateway for frontend |
| 2 | `/auth` | `medimesh-auth-svc` | 5001 | JWT authentication — login, register, roles |
| 3 | `/user` | `medimesh-user-svc` | 5002 | Patient profiles and dashboard |
| 4 | `/doctor` | `medimesh-doctor-svc` | 5003 | Doctor profiles and availability |
| 5 | `/appointment` | `medimesh-appointment-svc` | 5004 | Appointment booking and management |
| 6 | `/vitals` | `medimesh-vitals-svc` | 5005 | Patient vitals (BP, heart rate) |
| 7 | `/pharmacy` | `medimesh-pharmacy-svc` | 5006 | Medicine inventory |
| 8 | `/ambulance` | `medimesh-ambulance-svc` | 5007 | Ambulance fleet tracking |
| 9 | `/complaint` | `medimesh-complaint-svc` | 5008 | User complaints |
| 10 | `/forum` | `medimesh-forum-svc` | 5009 | Community forum posts |
| 11 | `/` *(catch-all)* | `medimesh-frontend-svc` | 80 | React SPA frontend |

> ⚠️ **Order matters!** The `/` catch-all MUST be the last rule. If it were first, it would match every request and no other route would ever trigger.

---

## 🏗️ Prerequisites

### 1. Gateway API CRDs

The Gateway API custom resource definitions must be installed cluster-wide:

```bash
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.2.1/standard-install.yaml
```

This installs:
- `GatewayClass` CRD
- `Gateway` CRD
- `HTTPRoute` CRD
- `ReferenceGrant` CRD

### 2. kGateway Controller

The kGateway controller watches for Gateway/HTTPRoute resources and creates Envoy proxy pods:

```bash
# Requires Helm 3
helm install kgateway oci://cr.kgateway.dev/kgateway-helm/kgateway \
  --version v2.0.0-main \
  -n kgateway-system --create-namespace
```

Verify the controller is running:
```bash
kubectl get pods -n kgateway-system
# Expected:
# NAME                        READY   STATUS    RESTARTS   AGE
# kgateway-xxxxxxxxx-xxxxx    1/1     Running   0          2m
```

### 3. All Backend ClusterIP Services Exist

The HTTPRoute references backend services by name. These must exist before applying:

```bash
# Verify all services exist
kubectl get svc -n medimesh

# You should see all 11 services:
# medimesh-frontend-svc, medimesh-bff-svc, medimesh-auth-svc, etc.
```

---

## 🚀 Deployment

### Apply the Gateway + HTTPRoute

```bash
kubectl apply -f k8s/gateway/kgateway.yaml
```

### What Happens After Apply

1. kGateway controller detects the new `Gateway` resource
2. It creates an **Envoy proxy Deployment** in the `medimesh` namespace
3. It creates a **NodePort Service** called `medimesh-gateway` to expose the Envoy proxy
4. The HTTPRoute rules are loaded into the Envoy configuration
5. Traffic hitting the NodePort is routed based on URL path

### Get the NodePort

```bash
kubectl get svc -n medimesh | grep gateway

# Example output:
# medimesh-gateway   NodePort   10.96.45.123   <none>   80:31080/TCP   5m
#                                                           ^^^^^
#                                                     This is your NodePort
```

> 📝 **Save this NodePort number** — you'll need it for the HAProxy setup.

---

## ✅ Verification

### 1. Check Gateway Status

```bash
kubectl get gateway -n medimesh

# Expected:
# NAME               CLASS      ADDRESS   PROGRAMMED   AGE
# medimesh-gateway   kgateway   <IP>      True         5m
```

The `PROGRAMMED: True` status means kGateway has successfully configured the Envoy proxy.

### 2. Check HTTPRoute Status

```bash
kubectl get httproute -n medimesh

# Expected:
# NAME              HOSTNAMES   AGE
# medimesh-routes               5m
```

### 3. Check the Envoy Proxy Pod

```bash
kubectl get pods -n medimesh | grep gateway

# Expected: An Envoy proxy pod running
# gw-medimesh-gateway-xxxxxxxxx-xxxxx   1/1   Running   0   5m
```

### 4. Test Routes from Inside the Cluster

```bash
# Get the Gateway ClusterIP
GATEWAY_IP=$(kubectl get svc medimesh-gateway -n medimesh -o jsonpath='{.spec.clusterIP}')

# Test frontend (catch-all /)
kubectl run -n medimesh route-test --rm -it --image=busybox -- \
  wget -qO- http://$GATEWAY_IP/

# Test BFF (/api)
kubectl run -n medimesh route-test --rm -it --image=busybox -- \
  wget -qO- http://$GATEWAY_IP/api

# Test Auth (/auth)
kubectl run -n medimesh route-test --rm -it --image=busybox -- \
  wget -qO- http://$GATEWAY_IP/auth/api/auth/login
```

### 5. Test via NodePort (from Worker Node or HAProxy)

```bash
# Replace <WORKER_IP> and <NODEPORT> with actual values
curl http://<WORKER_IP>:<NODEPORT>/
curl http://<WORKER_IP>:<NODEPORT>/api
```

---

## 🔧 Troubleshooting

### Gateway Shows `PROGRAMMED: False`

```bash
# Check kGateway controller logs
kubectl logs -n kgateway-system -l app.kubernetes.io/name=kgateway

# Common causes:
# - GatewayClass "kgateway" not found → kGateway controller not installed
# - Missing RBAC permissions → check controller service account
```

### HTTPRoute Not Routing Correctly

```bash
# Describe the HTTPRoute for status conditions
kubectl describe httproute medimesh-routes -n medimesh

# Check if backend services exist and have endpoints
kubectl get endpoints -n medimesh

# If a service has 0 endpoints, its pods aren't running or labels don't match
```

### "No matching backend" or 404 Errors

```bash
# 1. Verify the service names match exactly
kubectl get svc -n medimesh

# 2. Verify pods are healthy and ready
kubectl get pods -n medimesh -o wide

# 3. Check if the Envoy proxy pod has the routes loaded
kubectl exec -n medimesh $(kubectl get pods -n medimesh | grep gw-medimesh | awk '{print $1}') \
  -- curl -s localhost:19000/config_dump | grep route
```

### NodePort Not Accessible

```bash
# 1. Verify the service exists and has a NodePort assigned
kubectl get svc medimesh-gateway -n medimesh -o yaml

# 2. Check K8s worker security groups allow the NodePort
# The NodePort must be open for inbound TCP from the HAProxy instance

# 3. Test locally on the worker node
ssh <worker-node>
curl http://localhost:<NODEPORT>/
```

---

## 📊 How the Traffic Flows (End-to-End)

```
Step 1: User visits → http://<HAPROXY_PUBLIC_IP>/appointment

Step 2: HAProxy receives on port 80
        → Round-robin selects Worker-1
        → Forwards to Worker-1:<NodePort>

Step 3: Worker-1's kube-proxy receives on NodePort
        → Routes to the Envoy proxy pod (kGateway)

Step 4: Envoy evaluates HTTPRoute rules:
        Path "/appointment" matches rule #5 (PathPrefix: /appointment)
        → Routes to medimesh-appointment-svc:5004

Step 5: ClusterIP service → one of the appointment pod replicas

Step 6: Appointment service processes request
        → Connects to MongoDB via medimesh-mongodb:27017
        → Returns response back through the chain

Step 7: Response flows back: Pod → ClusterIP → Envoy → NodePort → HAProxy → User
```

---

## 🔑 Key Concepts Demonstrated

| Concept | How It's Used |
|---------|---------------|
| **Gateway API** | Official Kubernetes standard for traffic routing (replaces Ingress) |
| **GatewayClass** | `kgateway` — identifies which controller manages the Gateway |
| **Gateway** | Creates the Envoy proxy that accepts traffic on port 80 |
| **HTTPRoute** | Defines 11 path-based routing rules to backend services |
| **PathPrefix Matching** | Routes like `/api` match `/api`, `/api/auth`, `/api/users`, etc. |
| **BackendRef** | Points to a ClusterIP Service by name and port |
| **Route Ordering** | More specific routes first, catch-all `/` last |
| **Namespace Isolation** | `allowedRoutes.namespaces.from: Same` restricts to medimesh namespace |

---

## 🔄 Modifying Routes

### Add a New Service Route

To add a new microservice (e.g., `medimesh-billing` on port 5011):

```yaml
# Add this ABOVE the catch-all "/" rule in kgateway.yaml:

  # ─── Billing Service (/billing) ──────────────────────────
  - matches:
    - path:
        type: PathPrefix
        value: /billing
    backendRefs:
    - name: medimesh-billing-svc
      port: 5011
```

Then apply:
```bash
kubectl apply -f k8s/gateway/kgateway.yaml
```

### Remove a Route

Delete the corresponding `matches` + `backendRefs` block and re-apply.

### Change a Route Path

Update the `value` field under the `path` section and re-apply. Changes take effect within seconds — Envoy hot-reloads its configuration.

---

## 📝 Notes

- **kGateway uses Envoy Proxy** under the hood — same proxy used by Istio, AWS App Mesh, and many production systems
- **Gateway API is the Kubernetes standard** — it's the official successor to the Ingress API
- The Gateway creates a **NodePort Service automatically** — you don't create the Service manually
- **HTTPRoute changes are hot-reloaded** — no need to restart any pods after modifying routes
- The frontend service was changed from **NodePort to ClusterIP** because all external traffic now flows through kGateway → HAProxy, not directly via NodePort
- **No host-based routing** is configured — all routing is purely path-based (suitable for single-domain deployments)
