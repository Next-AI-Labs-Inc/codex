#!/usr/bin/env bash
set -euo pipefail

IMAGE_NAME=${1:-swarm-memory-ui}

AGENT_PATH=${AGENT_SWARM_PATH:-}
if [ -z "$AGENT_PATH" ]; then
  echo "[docker-refresh] AGENT_SWARM_PATH not set; defaulting to repo root."
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  AGENT_PATH="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
fi

echo "[docker-refresh] Building image '${IMAGE_NAME}' (AGENT_SWARM_PATH=${AGENT_PATH})..."
docker build -t "${IMAGE_NAME}" .

cat <<EOF

✅ Docker image '${IMAGE_NAME}' built.

Run the UI container with:
  docker rm -f ${IMAGE_NAME} 2>/dev/null || true
  docker run -d \\
    --name ${IMAGE_NAME} \\
    -p 8832:8832 \\
    -v "${AGENT_PATH}:/data/agent-swarm" \\
    -e AGENT_SWARM_PATH=/data/agent-swarm \\
    ${IMAGE_NAME}

The UI will be available at http://localhost:8832 once the container is running.
EOF
