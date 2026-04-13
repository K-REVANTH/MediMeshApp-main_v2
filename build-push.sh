#!/bin/bash
# ════════════════════════════════════════════════════════════
# MediMesh — Build, Tag & Push Docker Images to Docker Hub
# ════════════════════════════════════════════════════════════
# Usage: chmod +x build-push.sh && ./build-push.sh
# Run from the MediMesh project root directory
# ════════════════════════════════════════════════════════════

set -e  # Exit immediately on any error

DOCKER_USER="bharath44623"
TAG="v1.1.0"

# ─── All services to build ────────────────────────────────
# Format: "image_name build_context"
SERVICES=(
  "medimesh_medimesh-auth       ./services/medimesh-auth"
  "medimesh_medimesh-user       ./services/medimesh-user"
  "medimesh_medimesh-doctor     ./services/medimesh-doctor"
  "medimesh_medimesh-appointment ./services/medimesh-appointment"
  "medimesh_medimesh-vitals     ./services/medimesh-vitals"
  "medimesh_medimesh-pharmacy   ./services/medimesh-pharmacy"
  "medimesh_medimesh-ambulance  ./services/medimesh-ambulance"
  "medimesh_medimesh-complaint  ./services/medimesh-complaint"
  "medimesh_medimesh-forum      ./services/medimesh-forum"
  "medimesh_medimesh-bff        ./medimesh-bff"
  "medimesh_medimesh-frontend   ./medimesh-frontend"
)

echo "════════════════════════════════════════════════════════════"
echo "  MediMesh — Docker Build & Push Script"
echo "  Docker Hub: ${DOCKER_USER}"
echo "  Tag: ${TAG}"
echo "════════════════════════════════════════════════════════════"
echo ""

# ─── Step 1: Docker Hub Login ──────────────────────────────
echo "🔐 Step 1: Logging into Docker Hub..."
docker login -u ${DOCKER_USER}
echo ""

# ─── Step 2: Build, Tag & Push each service ────────────────
TOTAL=${#SERVICES[@]}
COUNT=0

for entry in "${SERVICES[@]}"; do
  # Parse image name and build context
  IMAGE_NAME=$(echo $entry | awk '{print $1}')
  BUILD_CONTEXT=$(echo $entry | awk '{print $2}')
  COUNT=$((COUNT + 1))
  FULL_IMAGE="${DOCKER_USER}/${IMAGE_NAME}:${TAG}"

  echo "────────────────────────────────────────────────────────"
  echo "📦 [${COUNT}/${TOTAL}] Building: ${IMAGE_NAME}"
  echo "   Context: ${BUILD_CONTEXT}"
  echo "   Image:   ${FULL_IMAGE}"
  echo "────────────────────────────────────────────────────────"

  # Build
  docker build -t ${FULL_IMAGE} ${BUILD_CONTEXT}

  # Push
  echo "🚀 Pushing ${FULL_IMAGE}..."
  docker push ${FULL_IMAGE}

  echo "✅ ${IMAGE_NAME}:${TAG} pushed successfully!"
  echo ""
done

# ─── Summary ──────────────────────────────────────────────
echo "════════════════════════════════════════════════════════════"
echo "✅ ALL ${TOTAL} IMAGES BUILT AND PUSHED SUCCESSFULLY!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Images pushed:"
for entry in "${SERVICES[@]}"; do
  IMAGE_NAME=$(echo $entry | awk '{print $1}')
  echo "  → ${DOCKER_USER}/${IMAGE_NAME}:${TAG}"
done
echo ""
echo "════════════════════════════════════════════════════════════"
echo "NEXT STEPS:"
echo "  1. Apply updated K8s manifests:"
echo "     kubectl delete statefulset medimesh-mongodb -n medimesh"
echo "     kubectl delete pvc medimesh-mongodb-pvc -n medimesh"
echo "     kubectl delete deployments --all -n medimesh"
echo ""
echo "  2. Re-deploy everything:"
echo "     kubectl apply -f k8s/mongodb/mongodb-pv-pvc.yaml"
echo "     kubectl apply -f k8s/mongodb/mongodb-statefulset.yaml"
echo "     kubectl wait --for=condition=ready pod/medimesh-mongodb-0 -n medimesh --timeout=120s"
echo "     kubectl apply -f k8s/backend-services/"
echo "     kubectl apply -f k8s/services/cluster-ip-services.yaml"
echo "     kubectl apply -f k8s/frontend/frontend-deployment.yaml"
echo "     kubectl apply -f k8s/hpa/frontend-hpa.yaml"
echo ""
echo "  3. Verify:"
echo "     kubectl get pods -n medimesh -w"
echo "════════════════════════════════════════════════════════════"
