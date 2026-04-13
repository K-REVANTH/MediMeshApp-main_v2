#!/bin/bash
# ════════════════════════════════════════════════════════════
# MediMesh — HAProxy Setup Script
# ════════════════════════════════════════════════════════════
# Run this script on the SEPARATE HAProxy EC2 instance.
#
# Usage:
#   chmod +x haproxy-setup.sh
#   sudo ./haproxy-setup.sh <KGATEWAY_NODEPORT>
#
# Example:
#   sudo ./haproxy-setup.sh 31080
# ════════════════════════════════════════════════════════════

set -e

NODEPORT=$1

if [ -z "$NODEPORT" ]; then
    echo "❌ Error: Please provide the kGateway NodePort."
    echo "   Usage: sudo ./haproxy-setup.sh <KGATEWAY_NODEPORT>"
    echo ""
    echo "   Find the NodePort on your master node with:"
    echo "     kubectl get svc -n medimesh | grep gateway"
    exit 1
fi

echo "═══════════════════════════════════════════════════════"
echo "  MediMesh HAProxy Setup"
echo "  kGateway NodePort: $NODEPORT"
echo "═══════════════════════════════════════════════════════"

# ─── Step 1: Install HAProxy ──────────────────────────────
echo ""
echo "📦 Step 1: Installing HAProxy..."
apt-get update -y
apt-get install -y haproxy

# ─── Step 2: Backup original config ───────────────────────
echo ""
echo "📋 Step 2: Backing up original config..."
cp /etc/haproxy/haproxy.cfg /etc/haproxy/haproxy.cfg.bak

# ─── Step 3: Write HAProxy config ─────────────────────────
echo ""
echo "⚙️  Step 3: Writing HAProxy config..."
cat > /etc/haproxy/haproxy.cfg <<EOF
global
    log /dev/log    local0
    log /dev/log    local1 notice
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin
    stats timeout 30s
    user haproxy
    group haproxy
    daemon

    ca-base /etc/ssl/certs
    crt-base /etc/ssl/private

defaults
    log     global
    mode    http
    option  httplog
    option  dontlognull
    option  forwardfor
    option  http-server-close
    timeout connect 5000ms
    timeout client  50000ms
    timeout server  50000ms
    errorfile 400 /etc/haproxy/errors/400.http
    errorfile 403 /etc/haproxy/errors/403.http
    errorfile 408 /etc/haproxy/errors/408.http
    errorfile 500 /etc/haproxy/errors/500.http
    errorfile 502 /etc/haproxy/errors/502.http
    errorfile 503 /etc/haproxy/errors/503.http
    errorfile 504 /etc/haproxy/errors/504.http

# ─── Stats Dashboard (port 8404) ──────────────────────────
listen stats
    bind *:8404
    stats enable
    stats uri /stats
    stats realm HAProxy\ Statistics
    stats auth admin:medimesh2026
    stats refresh 10s

# ─── HTTP Frontend (port 80) ──────────────────────────────
frontend http_front
    bind *:80
    default_backend kgateway_backend

# ─── kGateway Backend ─────────────────────────────────────
backend kgateway_backend
    balance roundrobin
    option httpchk
    http-check send meth GET uri / ver HTTP/1.1 hdr Host localhost
    http-check expect status 200

    server worker1 172.31.94.132:${NODEPORT} check inter 5s fall 3 rise 2
    server worker2 172.31.87.146:${NODEPORT} check inter 5s fall 3 rise 2
EOF

# ─── Step 4: Enable and start HAProxy ─────────────────────
echo ""
echo "🚀 Step 4: Starting HAProxy..."
systemctl enable haproxy
systemctl restart haproxy
systemctl status haproxy --no-pager

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  ✅ HAProxy is running!"
echo ""
echo "  🌐 Frontend:  http://<THIS_SERVER_PUBLIC_IP>"
echo "  📊 Stats:     http://<THIS_SERVER_PUBLIC_IP>:8404/stats"
echo "     Username:  admin"
echo "     Password:  medimesh2026"
echo "═══════════════════════════════════════════════════════"
