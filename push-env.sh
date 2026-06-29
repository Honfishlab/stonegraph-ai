#!/bin/bash
# Push local env vars to Vercel production
cd /c/Users/wayne/projects/stonegraph-ai

echo "Pulling current Vercel env vars..."
vercel env pull .env.vercel --token=$(vercel whoami --token) 2>/dev/null

echo "Adding environment variables to Vercel..."

# Read each var from .env.local and add to Vercel
while IFS='=' read -r key value; do
  if [[ -n "$key" && ! "$key" =~ ^# ]]; then
    echo "Adding $key..."
    echo "$value" | vercel env add "$key" production
  fi
done < <(grep -E '^[A-Z_]+=.+' .env.local)

echo "Redeploying..."
vercel --prod --yes

echo "Done! Check https://wayne-nu.vercel.app"
