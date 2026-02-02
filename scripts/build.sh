#!/bin/bash
set -e

# Ensure execution from project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

VERSION=${1:-latest}
DIST_DIR="dist"

echo "========================================"
echo "Build Strategy: Closed Network Deployment"
echo "Target Version: $VERSION"
echo "========================================"

# 1. Prepare Dist Directory
if [ -d "$DIST_DIR" ]; then
    echo "Cleaning existing dist directory..."
    rm -rf "$DIST_DIR"
fi
mkdir -p "$DIST_DIR"

# 2. Build Docker Images
echo "Building Backend Image (cruxsiem/backend:$VERSION)..."
cp scripts/test_db.py backend/
docker build -t cruxsiem/backend:"$VERSION" ./backend
rm backend/test_db.py

echo "Checking frontend dependencies..."
if [ ! -f "./frontend/package-lock.json" ]; then
    echo "Warning: package-lock.json not found in frontend directory."
    echo "Generating package-lock.json..."
    # Use subshell to avoid changing current directory of the script permanently
    (cd frontend && npm install --package-lock-only)
fi

echo "Building Frontend Image (cruxsiem/frontend:$VERSION)..."
docker build -t cruxsiem/frontend:"$VERSION" ./frontend

# 3. Save Images to Tarball
ARCHIVE_NAME="cruxsiem-images-$VERSION.tar.gz"
echo "Saving images to $DIST_DIR/$ARCHIVE_NAME..."
# We save the specific version. 
# Note: If you want 'latest' to also work, you might want to tag it as latest and save that too,
# but strictly versioned is safer for production.
docker save cruxsiem/backend:"$VERSION" cruxsiem/frontend:"$VERSION" | gzip > "$DIST_DIR/$ARCHIVE_NAME"

# 4. Copy Deployment Artifacts
echo "Copying configuration files..."

# Copy docker-compose
cp docker-compose.prod.yml "$DIST_DIR/docker-compose.yml"

# Copy env example and update TAG
cp .env.production.example "$DIST_DIR/.env.production.example"

# On Linux/Mac sed usage is slightly different, trying portable way or assuming GNU sed (Git Bash usually has GNU sed)
# We want to replace TAG=latest with TAG=$VERSION in the example file
if [ "$VERSION" != "latest" ]; then
    sed -i "s/TAG=latest/TAG=$VERSION/" "$DIST_DIR/.env.production.example"
fi

# Copy deploy script
cp scripts/deploy.sh "$DIST_DIR/"
chmod +x "$DIST_DIR/deploy.sh"

# Copy DB test script
cp scripts/test_db.py "$DIST_DIR/"
chmod +x "$DIST_DIR/test_db.py"

echo "========================================"
echo "Build Complete!"
echo "Artifacts located in: $DIST_DIR/"
echo "1. Transfer the contents of '$DIST_DIR/' to the target server."
echo "2. Run './deploy.sh' on the target server."
echo "========================================"
