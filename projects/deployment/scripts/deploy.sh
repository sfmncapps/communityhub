#!/bin/bash
# ==============================================================================
# CommunityHub v1.0 Automated Deployment Script (RFP §8, §10)
# Supports deployment to:
#   - Test Instance: commhub.heconf.net
#   - Production Instance: hapacgh.org
# ==============================================================================

set -e

ENV_TARGET=${1:-"production"}
DEPLOY_ROOT="/var/www/communityhub"

echo "=========================================================="
echo " Starting CommunityHub Deployment [Target: ${ENV_TARGET}]"
echo " Timestamp: $(date -u +"%Y-%m-%d %H:%M:%SZ")"
echo "=========================================================="

cd "${DEPLOY_ROOT}"

# 1. Pull latest code from repository
echo "==> Pulling latest git repository updates..."
git fetch origin
if [ "${ENV_TARGET}" = "test" ]; then
    git checkout staging || git checkout main
else
    git checkout main
fi
git pull

# 2. Install and prepare backend
echo "==> Building Backend..."
cd "${DEPLOY_ROOT}/projects/backend"
npm ci --omit=dev

# 3. Build optimized frontend bundle
echo "==> Building Frontend static assets..."
cd "${DEPLOY_ROOT}/projects/frontend"
npm ci
npm run build

# 4. Reload PM2 cluster gracefully
echo "==> Reloading PM2 backend services..."
cd "${DEPLOY_ROOT}/projects/deployment"
pm2 startOrReload ecosystem.config.cjs --env "${ENV_TARGET}"

# 5. Reload Nginx configuration
echo "==> Testing and reloading Nginx..."
sudo nginx -t
sudo systemctl reload nginx

# 6. Verify health check endpoint
echo "==> Probing API health diagnostics..."
sleep 3
HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5000/api/health)

if [ "${HEALTH_CODE}" -eq 200 ]; then
    echo "✅ Deployment successful! API is healthy (HTTP 200)."
    exit 0
else
    echo "❌ Deployment verification failed! API returned HTTP ${HEALTH_CODE}."
    exit 1
fi
