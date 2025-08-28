#!/bin/bash

# Free4 App Google Cloud Deployment Script
# Run this in Google Cloud Shell

set -e

echo "🚀 Free4 App Deployment Script"
echo "==============================="

# Set project ID
gcloud config set project free4-469712
echo "📦 Using project: free4-469712"

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable cloudbuild.googleapis.com run.googleapis.com containerregistry.googleapis.com

# Build and deploy
echo "🏗️  Building and deploying to Cloud Run..."
echo "   - Building Docker image"
echo "   - Pushing to Container Registry"  
echo "   - Deploying to Cloud Run with production environment"
echo "   - Setting up Supabase connection"
echo "   - Configuring MapBox integration"

gcloud builds submit --config cloudbuild.yaml

echo ""
echo "✅ Deployment completed!"

# Get the Cloud Run service URL
SERVICE_URL=$(gcloud run services describe free4-app --platform managed --region europe-west1 --format 'value(status.url)')
echo "🔗 Cloud Run service URL: $SERVICE_URL"

echo ""
echo "🌐 Setting up custom domain mapping for free4.app..."

# Create domain mapping
gcloud run domain-mappings create \
  --service=free4-app \
  --domain=free4.app \
  --region=europe-west1 \
  --platform=managed

echo ""
echo "📋 DNS Configuration Required:"
echo "   Add these DNS records to your free4.app domain:"
echo ""
gcloud run domain-mappings describe free4.app \
  --region=europe-west1 \
  --platform=managed \
  --format="table(spec.routePolicy.type:label=TYPE,status.resourceRecords[].name:label=NAME,status.resourceRecords[].rrdata:label=DATA)"

echo ""
echo "✅ Domain mapping created!"
echo "🌐 Your Free4 app will be available at: https://free4.app"
echo "   (after DNS records are configured)"

echo ""
echo "📱 Features deployed:"
echo "   ✅ Event creation and management"
echo "   ✅ Friends system with matching"
echo "   ✅ Location search (MapBox + OSM fallback)"
echo "   ✅ Real-time match detection"
echo "   ✅ PWA with app icons"
echo "   ✅ Responsive mobile design"
echo ""
echo "🎉 Free4 is ready at https://free4.app!"