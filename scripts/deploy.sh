#!/bin/bash
set -e

echo "Starting CruxSIEM deployment..."

# 1. Load images
# Find the image tarball (assuming only one exists or taking the latest)
IMAGE_FILE=$(ls cruxsiem-images-*.tar.gz | head -n 1)

if [ -z "$IMAGE_FILE" ]; then
    echo "Error: No cruxsiem-images-*.tar.gz file found."
    exit 1
fi

echo "Loading images from $IMAGE_FILE..."
docker load < "$IMAGE_FILE"

# 2. Check configuration
if [ ! -f .env.production ]; then
    if [ -f .env.production.example ]; then
        echo "Creating .env.production from example..."
        cp .env.production.example .env.production
        echo "IMPORTANT: Please edit .env.production with your specific configuration (OpenSearch credentials, etc.)"
        echo "Then run this script again."
        exit 0
    else
        echo "Error: .env.production.example not found."
        exit 1
    fi
fi

# 3. Start services
echo "Starting services with Docker Compose..."
docker compose down 2>/dev/null || true
docker compose up -d

echo "----------------------------------------"
echo "Deployment completed successfully."
echo "Frontend: http://localhost"
echo "Backend:  http://localhost:8000/docs"
echo "----------------------------------------"
