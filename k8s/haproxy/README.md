# 🔀 MediMesh — HAProxy External Load Balancer

> **Production-grade HTTP load balancer** running on a dedicated EC2 instance, distributing external traffic to the kGateway NodePort on Kubernetes worker nodes.

---

## 📐 Architecture: Where HAProxy Fits

```
                    Internet Users
                         │
                         │ HTTP :80
                ┌────────▼─────────┐
                │   HAProxy EC2    │  ← THIS COMPONENT
                │   (Separate VM)  │     You are here
                │   bind *:80      │
                │   bind *:8404    │  ← Stats dashboard
                └───┬──────────┬───┘
                    │          │
            ┌───────▼──┐  ┌───▼───────┐
            │ Worker-1  │  │ Worker-2  │   K8s worker nodes
            │ :NodePort │  │ :NodePort │   (round-robin)
            └───────┬──┘  └───┬───────┘
                    │          │
               ┌────▼──────────▼────┐
               │   kGateway (Envoy) │   Gateway API routing
               │   HTTPRoute rules  │   inside the cluster
               └────────┬──────────┘
                        │
          ┌─────────────┼──────────────────┐
          │  /         → Frontend (port 80) │
          │  /api      → BFF (port 5010)    │
          │  /auth     → Auth (port 5001)   │
          │  /doctor   → Doctor (port 5003) │
          │  ...       → (9 more routes)    │
          └────────────────────────────────┘
```

### Why HAProxy + kGateway (Two-Tier)?

| Layer | Component | Role |
|-------|-----------|------|
| **External LB** | HAProxy (separate EC2) | Accepts public internet traffic on port 80, load-balances across K8s worker nodes |
| **Internal Router** | kGateway (inside K8s) | Gateway API-based path routing — sends `/api` to BFF, `/auth` to Auth, `/` to Frontend, etc. |

**Why not just use NodePort directly?**
- NodePort exposes a random high port (30000–32767) — not professional for users
- No load balancing across worker nodes
- No health checks — if one worker dies, users get errors
- HAProxy gives you **port 80**, **health checks**, **stats dashboard**, and **round-robin LB**

---

## 📁 Files in This Directory

```
haproxy/
├── README.md          # This documentation
├── haproxy.cfg        # HAProxy configuration template (manual reference)
└── haproxy-setup.sh   # Automated setup script (recommended)
```

| File | Purpose |
|------|---------|
| `haproxy.cfg` | Reference config — shows the full HAProxy config with `<KGATEWAY_NODEPORT>` placeholder. Use for manual setup or review. |
| `haproxy-setup.sh` | Automated script — installs HAProxy, writes config with the actual NodePort, and starts the service. **Recommended approach.** |

---

## 🏗️ Prerequisites

### 1. Separate EC2 Instance for HAProxy

> ⚠️ **HAProxy runs OUTSIDE the Kubernetes cluster** on its own EC2 instance.

| Requirement | Value |
|-------------|-------|
| **OS** | Ubuntu 22.04+ (or any Debian-based) |
| **Instance Type** | `t2.micro` or `t3.micro` (sufficient for LB) |
| **Network** | Same VPC as the K8s worker nodes |
| **Security Group — Inbound** | Port `80` (HTTP) + Port `8404` (Stats) open to `0.0.0.0/0` |

### 2. K8s Cluster with kGateway Deployed

Before setting up HAProxy, you must have:
- ✅ kGateway controller installed on the K8s cluster
- ✅ `k8s/gateway/kgateway.yaml` applied (Gateway + HTTPRoute)
- ✅ The kGateway service assigned a **NodePort**

Find the NodePort:
```bash
# Run this on the K8s master node
kubectl get svc -n medimesh | grep gateway

# Example output:
# medimesh-gateway   NodePort   10.96.x.x   <none>   80:31080/TCP   5m
#                                                         ^^^^^
#                                               This is the NODEPORT (31080)
```

### 3. Worker Node Private IPs

The HAProxy config needs the **private IPs** of your K8s worker nodes:

```bash
# Run on master node
kubectl get nodes -o wide

# Note the INTERNAL-IP column for worker nodes
# Current values in the config:
#   Worker 1: 172.31.94.132
#   Worker 2: 172.31.87.146
```

> ⚠️ **If your worker IPs are different**, you must edit either `haproxy-setup.sh` or `haproxy.cfg` to match.

---

## 🚀 Installation — Automated (Recommended)

### Step 1: Copy the Setup Script to HAProxy EC2

```bash
# From your local machine (where the repo is cloned)
scp -i <your-key.pem> k8s/haproxy/haproxy-setup.sh ubuntu@<HAPROXY_PUBLIC_IP>:~/
```

### Step 2: SSH into HAProxy EC2 and Run

```bash
ssh -i <your-key.pem> ubuntu@<HAPROXY_PUBLIC_IP>

# Make executable and run with the kGateway NodePort
chmod +x haproxy-setup.sh
sudo ./haproxy-setup.sh <KGATEWAY_NODEPORT>

# Example:
sudo ./haproxy-setup.sh 31080
```

### What the Script Does

1. **Installs HAProxy** via `apt-get`
2. **Backs up** the original `/etc/haproxy/haproxy.cfg`
3. **Writes** a new config with:
   - Frontend listener on port **80**
   - Backend pointing to both worker nodes on the given NodePort
   - Stats dashboard on port **8404**
   - Round-robin load balancing with health checks
4. **Enables and starts** the HAProxy systemd service

---

## 🔧 Installation — Manual

If you prefer to configure manually:

### Step 1: Install HAProxy

```bash
sudo apt-get update -y
sudo apt-get install -y haproxy
```

### Step 2: Edit the Config

```bash
sudo nano /etc/haproxy/haproxy.cfg
```

Copy the contents of `haproxy.cfg` from this directory, replacing:
- `<KGATEWAY_NODEPORT>` → your actual NodePort (e.g., `31080`)
- Worker IPs → your actual worker node private IPs

### Step 3: Start HAProxy

```bash
sudo systemctl enable haproxy
sudo systemctl restart haproxy
sudo systemctl status haproxy
```

---

## 📋 Configuration Explained

### `haproxy.cfg` Breakdown

```
global                          # Process-level settings
    log /dev/log local0         # Syslog logging
    chroot /var/lib/haproxy     # Security — chroot jail
    daemon                      # Run as background daemon

defaults                        # Default settings for all frontends/backends
    mode http                   # Layer 7 (HTTP) mode
    option forwardfor           # Adds X-Forwarded-For header
    option http-server-close    # Close server connections quickly
    timeout connect 5000ms      # Max time to establish connection
    timeout client  50000ms     # Max client inactivity time
    timeout server  50000ms     # Max server response time

listen stats                    # Stats dashboard configuration
    bind *:8404                 # Listen on port 8404
    stats enable                # Enable the dashboard
    stats uri /stats            # Dashboard URL path
    stats auth admin:medimesh2026  # Credentials

frontend http_front             # Entry point for traffic
    bind *:80                   # Listen on port 80
    default_backend kgateway_backend  # Route ALL traffic to backend

backend kgateway_backend        # Where traffic goes
    balance roundrobin          # Distribute evenly across servers
    option httpchk GET /        # Health check — HTTP GET to /
    http-check expect status 200  # Expect 200 OK

    server worker1 172.31.94.132:<PORT> check inter 5s fall 3 rise 2
    server worker2 172.31.87.146:<PORT> check inter 5s fall 3 rise 2
    #        │          │          │      │       │     │      │
    #    server     private IP   NodePort health  every  fail  recover
    #    name       of worker           check    5sec  after3  after2
```

### Health Check Parameters

| Parameter | Value | Meaning |
|-----------|-------|---------|
| `check` | — | Enable health checking |
| `inter 5s` | 5 seconds | Check interval |
| `fall 3` | 3 failures | Mark as DOWN after 3 consecutive failures |
| `rise 2` | 2 successes | Mark as UP after 2 consecutive successes |

---

## ✅ Verification

### 1. Check HAProxy Service Status

```bash
sudo systemctl status haproxy
# Should show: active (running)
```

### 2. Test HTTP Access

```bash
# From any machine with internet access:
curl http://<HAPROXY_PUBLIC_IP>

# Should return the MediMesh frontend HTML
```

### 3. Access Stats Dashboard

Open in browser:
```
http://<HAPROXY_PUBLIC_IP>:8404/stats
Username: admin
Password: medimesh2026
```

The dashboard shows:
- **Frontend** (`http_front`) — total connections and request rate
- **Backend** (`kgateway_backend`) — each worker node's status (UP/DOWN)
- **Session counts**, **bytes in/out**, **response times**

### 4. Verify Load Balancing

```bash
# Run multiple requests and check which worker handles them
for i in $(seq 1 10); do
  curl -s -o /dev/null -w "%{http_code}\n" http://<HAPROXY_PUBLIC_IP>
done
# All should return 200

# Watch the stats dashboard — both workers should show increasing session counts
```

---

## 🔧 Troubleshooting

### HAProxy Won't Start

```bash
# Check config syntax
sudo haproxy -c -f /etc/haproxy/haproxy.cfg

# Common error: "cannot bind socket [0.0.0.0:80]"
# → Another service (like Apache/Nginx) is using port 80
sudo lsof -i :80
sudo systemctl stop apache2  # or nginx
```

### Backend Servers Show DOWN in Stats

```bash
# 1. Verify worker nodes are reachable from HAProxy instance
ping 172.31.94.132
ping 172.31.87.146

# 2. Verify the NodePort is correct and open
curl http://172.31.94.132:<NODEPORT>
curl http://172.31.87.146:<NODEPORT>

# 3. Check K8s worker security group — ensure the NodePort is open
#    for inbound TCP from the HAProxy instance's security group or private IP
```

### 502 Bad Gateway

```bash
# HAProxy can reach workers but kGateway/pods aren't responding

# On K8s master, check kGateway pod is running:
kubectl get pods -n kgateway-system
kubectl get pods -n medimesh

# Check kGateway service:
kubectl get svc -n medimesh | grep gateway
```

### Changing Worker Node IPs

If your worker nodes change (e.g., EC2 instance replacement):

```bash
# Edit the config
sudo nano /etc/haproxy/haproxy.cfg

# Update the server lines with new IPs:
#   server worker1 <NEW_IP>:<NODEPORT> check inter 5s fall 3 rise 2
#   server worker2 <NEW_IP>:<NODEPORT> check inter 5s fall 3 rise 2

# Reload without downtime
sudo systemctl reload haproxy
```

---

## 🔒 AWS Security Group Rules

### HAProxy EC2 — Inbound Rules

| Type | Port | Source | Purpose |
|------|------|--------|---------|
| HTTP | 80 | `0.0.0.0/0` | Public web traffic |
| Custom TCP | 8404 | Your IP / `0.0.0.0/0` | Stats dashboard |
| SSH | 22 | Your IP | Management |

### K8s Worker Nodes — Inbound Rules

| Type | Port | Source | Purpose |
|------|------|--------|---------|
| Custom TCP | `<NodePort>` (e.g., 31080) | HAProxy SG / HAProxy private IP | Allow HAProxy to reach kGateway |

---

## 📝 Notes

- HAProxy operates at **Layer 7 (HTTP)** — it can inspect HTTP headers, paths, and methods
- The `X-Forwarded-For` header is added automatically (`option forwardfor`) so backend services know the real client IP
- The stats dashboard refreshes every **10 seconds** automatically
- HAProxy config changes require a `sudo systemctl reload haproxy` (graceful) or `restart` (drops connections)
- For **HTTPS/SSL termination**, you would add a TLS certificate to the frontend section — this is the next logical upgrade step
