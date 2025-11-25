# ---------- 1) Base image (Debian, not Alpine) ----------
FROM node:20-bookworm-slim AS base
WORKDIR /app

# Optional: speed up / avoid some npm noise
# ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# ---------- 2) Dependencies ----------
FROM base AS deps
WORKDIR /app
# If you need build tools for native modules, uncomment:
# RUN apt-get update && apt-get install -y --no-install-recommends \
#   python3 make g++ \
#   && rm -rf /var/lib/apt/lists/*

# Copy only package files first for better caching
# COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./

# # Install deps (choose based on which lock file exists)
# RUN \
#     if [ -f package-lock.json ]; then npm ci; \
#     elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
#     elif [ -f pnpm-lock.yaml ]; then npm install -g pnpm && pnpm install --frozen-lockfile; \
#     else npm install; \
#     fi


COPY package.json package-lock.json* ./

# IMPORTANT:
# - Drop package-lock.json (created on Windows)
# - Use `npm install` (NOT `npm ci`) so optional deps work
# - Install platform-specific native bindings for Linux x64
RUN rm -f package-lock.json \
  && npm install --include=optional \
  && npm install --no-save \
  lightningcss-linux-x64-gnu \
  @tailwindcss/oxide-linux-x64-gnu

# ---------- 3) Build ----------
FROM base AS builder
WORKDIR /app
# Build-time env (non-secret) can go here if needed, e.g.:
# ENV NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Make sure package.json has: "build": "next build"
RUN npm run build

# ---------- 4) Runtime ----------
# FROM base AS runner

FROM node:20-bookworm-slim AS runner
WORKDIR /app

# WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1


ENV HS_ENV=sandbox 
ENV NHS_API_KEY=0fdae6eec4de4bdaaa62bfa375fb0cde 

ENV NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000 
ENV NEXT_PUBLIC_BASE_URL=https://backend.pharma-health.co.uk/api
ENV NEXT_PUBLIC_API_BASE_URL=https://backend.pharma-health.co.uk/api 
ENV NEXT_PUBLIC_API_BASE instead 
# Next.js local 

# (Optional) remove or ignore BACKEND_API_URL if you’re not using 8001 
# Backend API should match NEXT_PUBLIC_API_BASE_URL during local dev 
ENV BACKEND_API_URL=https://backend.pharma-health.co.uk/api 
ENV NEXT_PUBLIC_API_BASE=https://backend.pharma-health.co.uk 

ENV NEXT_PUBLIC_PAGES_BASE=http://localhost:8001 
ENV NEXT_PUBLIC_MEDIA_ORIGIN=http://localhost:8001 

ENV RYFT_SECRET_KEY=sk_sandbox_9p4L0d03vTuNrSquDGoATyUe+3mpWyfExbk1hRztA4zo8gafu8tan6Zyklyl+WIz 
ENV NEXT_PUBLIC_RYFT_PUBLIC_KEY=pk_sandbox_8haINr3ryWKnSmva4d2ah87O5JPKRXmjmOa3ueyrNCSybiD3KEZf7/YVy5oROmHS 
# ENV NEXT_PUBLIC_MERCHANT_NAME=Safescript Pharmacy 
ENV NEXT_PUBLIC_MERCHANT_COUNTRY=GB 
ENV NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID=merchant_safescript 
ENV NEXT_PUBLIC_RETURN_URL_HTTPS=https://a492e914b3a2.ngrok-free.app 
ENV NEXT_PUBLIC_DEFAULT_FORM_ID=4 
ENV NEXT_PUBLIC_WEIGHT_RAF_FORM_ID=4 
ENV NEXT_PUBLIC_DEV_FAKE_SESSION_ID=9999 
ENV NEXT_PUBLIC_DEV_FAKE_FORM_ID=4 

ENV POSTCODE_PROVIDER=getaddress 
ENV POSTCODE_BASE_URL=https://api.getaddress.io 
ENV GETADDRESS_API_KEY=E1baDPsuFE-m5o3ooVBbiw47706 




ENV NODE_ENV=development 


ENV IRON_SESSION_PASSWORD="c2f3b0d9e5a1478bb9c2d4f1a6e3c8b7d0f1a2b3c4d5e6f7890abcde12345678" 

# Create non-root user
RUN groupadd -g 1001 nodejs \
  && useradd -u 1001 -g nodejs nextjs

USER nextjs

# Copy required files from builder
# copy both .js / .mjs configs if present
# COPY --from=builder /app/next.config.* ./ 2>/dev/null || true
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=deps    /app/node_modules ./node_modules

EXPOSE 8002

# We'll inject your env vars at runtime, not baked into the image
CMD ["npm", "run", "start"]



# docker build  --no-cache -t 192.168.13.72:5000/userukproject_24_nov_2025_latest .      
# docker run -d --name userukproject_24_nov_2025_latest -p 80:80 userukproject_24_nov_2025_latest_image

# docker tag userukproject_24_nov_2025_latest_image 192.168.13.72:5000/userukproject_24_nov_2025_latest
# docker push 192.168.13.72:5000/userukproject_24_nov_2025_latest
# docker pull 192.168.13.72:5000/userukproject_24_nov_2025_latest
# docker run -d --name userukproject_24_nov_2025_latest -p 8002:8002 192.168.13.72:5000/userukproject_24_nov_2025_latest