#!/bin/bash
# ════════════════════════════════════════════════════════════
# MediMesh — NFS Client Setup Script
# ════════════════════════════════════════════════════════════
# Run this script on ALL Kubernetes nodes (master + workers).
# Installs nfs-common so pods can mount NFS volumes.
#
# Usage:
#   chmod +x nfs-client-setup.sh
#   sudo ./nfs-client-setup.sh <NFS_SERVER_IP>
#
# Example:
#   sudo ./nfs-client-setup.sh 172.31.90.50
# ════════════════════════════════════════════════════════════

set -e

NFS_SERVER=$1

if [ -z "$NFS_SERVER" ]; then
    echo "❌ Error: Please provide the NFS server private IP."
    echo "   Usage: sudo ./nfs-client-setup.sh <NFS_SERVER_IP>"
    echo ""
    echo "   This should be the PRIVATE IP of your HAProxy/NFS instance."
    exit 1
fi

echo "═══════════════════════════════════════════════════════"
echo "  MediMesh NFS Client Setup"
echo "  NFS Server: $NFS_SERVER"
echo "═══════════════════════════════════════════════════════"

# ─── Step 1: Install NFS Client ──────────────────────────
echo ""
echo "📦 Step 1: Installing nfs-common..."
apt-get update -y
apt-get install -y nfs-common

# ─── Step 2: Test NFS Mount ──────────────────────────────
echo ""
echo "🔍 Step 2: Testing NFS connectivity..."
showmount -e $NFS_SERVER

echo ""
echo "📁 Step 3: Testing mount/unmount..."
mkdir -p /tmp/nfs-test
mount -t nfs $NFS_SERVER:/srv/nfs/medimesh /tmp/nfs-test
echo "medimesh-test-$(hostname)-$(date +%s)" > /tmp/nfs-test/test-$(hostname).txt
ls -la /tmp/nfs-test/
umount /tmp/nfs-test
rmdir /tmp/nfs-test

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  ✅ NFS Client is configured on $(hostname)!"
echo ""
echo "  NFS mount from $NFS_SERVER tested successfully."
echo "  This node can now use NFS-backed PersistentVolumes."
echo "═══════════════════════════════════════════════════════"
