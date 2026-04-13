#!/bin/bash
# ════════════════════════════════════════════════════════════
# MediMesh — NFS Server Setup Script
# ════════════════════════════════════════════════════════════
# Run this script on the HAProxy / NFS EC2 instance.
# This installs and configures NFS server to provide dynamic
# storage provisioning for the Kubernetes cluster.
#
# Usage:
#   chmod +x nfs-server-setup.sh
#   sudo ./nfs-server-setup.sh <K8S_SUBNET_CIDR>
#
# Example:
#   sudo ./nfs-server-setup.sh 172.31.0.0/16
#
# The subnet CIDR should cover ALL your K8s nodes
# (master + workers). Use the VPC CIDR for simplicity.
# ════════════════════════════════════════════════════════════

set -e

SUBNET=$1

if [ -z "$SUBNET" ]; then
    echo "❌ Error: Please provide the K8s subnet CIDR."
    echo "   Usage: sudo ./nfs-server-setup.sh <K8S_SUBNET_CIDR>"
    echo ""
    echo "   Example: sudo ./nfs-server-setup.sh 172.31.0.0/16"
    echo ""
    echo "   Use your VPC CIDR to cover all K8s nodes."
    echo "   Find it in AWS Console → VPC → Your VPC → IPv4 CIDR"
    exit 1
fi

echo "═══════════════════════════════════════════════════════"
echo "  MediMesh NFS Server Setup"
echo "  Allowed Subnet: $SUBNET"
echo "═══════════════════════════════════════════════════════"

# ─── Step 1: Install NFS Server ───────────────────────────
echo ""
echo "📦 Step 1: Installing NFS server packages..."
apt-get update -y
apt-get install -y nfs-kernel-server

# ─── Step 2: Create NFS Export Directory ──────────────────
echo ""
echo "📁 Step 2: Creating NFS export directory..."
mkdir -p /srv/nfs/medimesh
chown nobody:nogroup /srv/nfs/medimesh
chmod 777 /srv/nfs/medimesh

# ─── Step 3: Configure NFS Exports ───────────────────────
echo ""
echo "⚙️  Step 3: Configuring NFS exports..."

# Remove any existing medimesh entry
sed -i '/medimesh/d' /etc/exports

# Add the export rule
echo "/srv/nfs/medimesh ${SUBNET}(rw,sync,no_subtree_check,no_root_squash)" >> /etc/exports

echo "   Export config:"
cat /etc/exports

# ─── Step 4: Apply NFS Exports ───────────────────────────
echo ""
echo "🔄 Step 4: Applying NFS exports..."
exportfs -rav

# ─── Step 5: Enable and Start NFS Server ─────────────────
echo ""
echo "🚀 Step 5: Starting NFS server..."
systemctl enable nfs-kernel-server
systemctl restart nfs-kernel-server
systemctl status nfs-kernel-server --no-pager

# ─── Step 6: Verify ──────────────────────────────────────
echo ""
echo "🔍 Step 6: Verifying NFS exports..."
showmount -e localhost

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  ✅ NFS Server is running!"
echo ""
echo "  📂 Export Path:  /srv/nfs/medimesh"
echo "  🌐 Allowed:     $SUBNET"
echo "  🔌 NFS Port:    2049"
echo ""
echo "  ⚠️  IMPORTANT: Make sure your AWS Security Group"
echo "     allows inbound TCP/UDP port 2049 from the"
echo "     K8s nodes' subnet ($SUBNET)."
echo ""
echo "  📋 Next Steps:"
echo "     1. Install nfs-common on ALL K8s nodes:"
echo "        sudo apt-get install -y nfs-common"
echo "     2. Test mount from a K8s node:"
echo "        sudo mount -t nfs <THIS_IP>:/srv/nfs/medimesh /mnt"
echo "        sudo umount /mnt"
echo "     3. Deploy the NFS provisioner on K8s"
echo "═══════════════════════════════════════════════════════"
