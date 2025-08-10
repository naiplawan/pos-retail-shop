# 🚀 Deployment Guide - POS Retail Shop

Complete deployment guide for production, staging, and development environments.

---

## 📋 Table of Contents

1. [Quick Deploy (Recommended)](#quick-deploy-recommended)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Platform-Specific Deployment](#platform-specific-deployment)
5. [Desktop App Deployment](#desktop-app-deployment)
6. [Domain & SSL Setup](#domain--ssl-setup)
7. [Performance Optimization](#performance-optimization)
8. [Monitoring & Analytics](#monitoring--analytics)
9. [Backup & Recovery](#backup--recovery)
10. [CI/CD Pipeline](#cicd-pipeline)

---

## 🎯 Quick Deploy (Recommended)

### Option 1: Deploy to Vercel (Fastest)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyourusername%2Fpos-retail-shop)

**Steps:**
1. **Click the deploy button** above
2. **Connect your GitHub** account
3. **Set environment variables** (see below)
4. **Deploy** - takes 2-3 minutes
5. **Your app is live!** 🎉

### Option 2: One-Click Deploy Script

```bash
# Clone and deploy in one command
curl -fsSL https://raw.githubusercontent.com/yourusername/pos-retail-shop/main/scripts/quick-deploy.sh | bash
```

---

## 🔧 Environment Setup

### Required Environment Variables

Create `.env.local` file in your project root:

```env
# === REQUIRED ===
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_APP_NAME=ร้านค้าของคุณ

# === OPTIONAL ===
# Security
NEXTAUTH_SECRET=your-random-secret-key-here-min-32-chars
NEXTAUTH_URL=https://your-domain.com

# AI Features (Optional)
GOOGLE_CLOUD_API_KEY=your-google-cloud-key
OPENAI_API_KEY=sk-your-openai-key

# Analytics (Optional)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
VERCEL_ANALYTICS_ID=your-vercel-analytics-id

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Payment Gateway (Optional)
STRIPE_PUBLIC_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
PROMPTPAY_ID=your-promptpay-id
```

### Environment Variable Sources

#### 🗄️ Getting Supabase Keys
1. Go to [supabase.com](https://supabase.com)
2. Create new project or use existing
3. Go to **Settings** → **API**
4. Copy **Project URL** and **anon public key**
5. Copy **service_role secret key** (keep this secure!)

#### 🔑 Generating Secrets
```bash
# Generate random secret for NEXTAUTH_SECRET
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Environment-Specific Files

#### Development (`.env.local`)
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
NEXT_PUBLIC_SUPABASE_URL=https://your-dev-project.supabase.co
```

#### Staging (`.env.staging`)
```env
NEXT_PUBLIC_APP_URL=https://staging.your-store.com
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=https://your-staging-project.supabase.co
```

#### Production (`.env.production`)
```env
NEXT_PUBLIC_APP_URL=https://your-store.com
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
```

---

## 🗄️ Database Setup

### Option 1: Supabase (Recommended)

#### Create Supabase Project
1. **Sign up** at [supabase.com](https://supabase.com)
2. **Create new project**
   - Name: `pos-retail-shop-prod`
   - Region: Choose closest to your users
   - Password: Generate strong password
3. **Wait for setup** (2-3 minutes)

#### Run Database Migrations
```bash
# Install Supabase CLI
npm install -g @supabase/cli

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push

# Or run SQL manually in Supabase dashboard
```

#### Database Schema SQL
```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create prices table
CREATE TABLE prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL CHECK (price > 0),
    category VARCHAR(100) NOT NULL,
    date TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create inventory table
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(50) UNIQUE NOT NULL,
    category VARCHAR(100) NOT NULL,
    current_stock INTEGER NOT NULL CHECK (current_stock >= 0),
    min_stock INTEGER NOT NULL CHECK (min_stock >= 0),
    max_stock INTEGER NOT NULL CHECK (max_stock > min_stock),
    cost_price DECIMAL(10,2) NOT NULL CHECK (cost_price > 0),
    sell_price DECIMAL(10,2) NOT NULL CHECK (sell_price > 0),
    supplier VARCHAR(255),
    location VARCHAR(100),
    status VARCHAR(20) DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'low_stock', 'out_of_stock', 'discontinued')),
    last_restocked TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create checklist sheets table
CREATE TABLE checklist_sheets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create checklist items table
CREATE TABLE checklist_items (
    id SERIAL PRIMARY KEY,
    sheet_id INTEGER REFERENCES checklist_sheets(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    completed BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_prices_date ON prices(date DESC);
CREATE INDEX idx_prices_category ON prices(category);
CREATE INDEX idx_inventory_sku ON inventory(sku);
CREATE INDEX idx_inventory_status ON inventory(status);
CREATE INDEX idx_inventory_search ON inventory USING gin(to_tsvector('english', name || ' ' || sku));

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables
CREATE TRIGGER update_prices_updated_at BEFORE UPDATE ON prices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_checklist_sheets_updated_at BEFORE UPDATE ON checklist_sheets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_checklist_items_updated_at BEFORE UPDATE ON checklist_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Allow all for authenticated users - customize as needed)
CREATE POLICY "Allow all for authenticated users" ON prices FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON inventory FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON checklist_sheets FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON checklist_items FOR ALL TO authenticated USING (true);
```

#### Seed Data (Optional)
```sql
-- Insert sample data
INSERT INTO inventory (name, sku, category, current_stock, min_stock, max_stock, cost_price, sell_price, supplier, location) VALUES
('โค้ก 325ml', 'COKE325', 'เครื่องดื่ม', 48, 20, 100, 12.00, 15.00, 'บริษัท โค้ก', 'ชั้น A1'),
('มาม่า รสหมูสับ', 'MAMA001', 'อาหารแห้ง', 8, 15, 60, 6.00, 8.00, 'บริษัท มาม่า', 'ชั้น B2'),
('น้ำดื่ม 600ml', 'WATER600', 'เครื่องดื่ม', 0, 12, 80, 3.00, 5.00, 'บริษัท น้ำดื่ม', 'ชั้น A2'),
('ขนมปังโฮลวีต', 'BREAD001', 'ขนม', 25, 10, 40, 18.00, 25.00, 'เบเกอรี่ ABC', 'ชั้น C1'),
('ยาสีฟัน Darlie', 'TOOTH001', 'ของใช้', 15, 5, 30, 28.00, 35.00, 'บริษัท Darlie', 'ชั้น D1');

-- Update inventory status based on stock levels
UPDATE inventory SET status = 
    CASE 
        WHEN current_stock = 0 THEN 'out_of_stock'
        WHEN current_stock <= min_stock THEN 'low_stock'
        ELSE 'in_stock'
    END;

-- Insert sample prices
INSERT INTO prices (product_name, price, category, date) VALUES
('โค้ก 325ml', 15.00, 'เครื่องดื่ม', NOW() - INTERVAL '1 day'),
('มาม่า รสหมูสับ', 8.00, 'อาหารแห้ง', NOW() - INTERVAL '1 day'),
('น้ำดื่ม 600ml', 5.00, 'เครื่องดื่ม', NOW() - INTERVAL '2 days'),
('ขนมปังโฮลวีต', 25.00, 'ขนม', NOW()),
('ยาสีฟัน Darlie', 35.00, 'ของใช้', NOW());
```

### Option 2: Self-Hosted PostgreSQL

#### Docker Compose Setup
```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: pos_retail_shop
      POSTGRES_USER: pos_user
      POSTGRES_PASSWORD: your_secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped

volumes:
  postgres_data:
```

```bash
# Start database
docker-compose up -d

# Connection string
DATABASE_URL=postgresql://pos_user:your_secure_password@localhost:5432/pos_retail_shop
```

---

## 🌐 Platform-Specific Deployment

### Vercel (Recommended)

#### Method 1: GitHub Integration
1. **Push code to GitHub**
2. **Go to vercel.com**
3. **Import project from GitHub**
4. **Configure environment variables**
5. **Deploy**

#### Method 2: Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Deploy to production
vercel --prod
```

#### Method 3: Auto-Deploy Script
```bash
#!/bin/bash
# scripts/deploy-vercel.sh

echo "🚀 Deploying to Vercel..."

# Build the project
npm run build

# Deploy with Vercel CLI
vercel --prod --confirm

echo "✅ Deployment complete!"
echo "🌍 Your app is live at: https://your-app.vercel.app"
```

#### Vercel Configuration
```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/api/:path*"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

### Netlify

```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
```

### Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add environment variables
railway variables set NEXT_PUBLIC_SUPABASE_URL=your-url

# Deploy
railway up
```

### Docker Deployment

#### Dockerfile
```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the app
RUN npm install -g pnpm
RUN pnpm build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

#### Docker Compose for Production
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl/certs
    depends_on:
      - app
    restart: unless-stopped
```

#### Build and Deploy
```bash
# Build Docker image
docker build -t pos-retail-shop .

# Run container
docker run -p 3000:3000 --env-file .env.production pos-retail-shop

# Or use docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

### VPS/Server Deployment

#### Prerequisites
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx -y

# Install SSL certificate tool
sudo apt install certbot python3-certbot-nginx -y
```

#### Deploy Script
```bash
#!/bin/bash
# scripts/deploy-server.sh

echo "🚀 Deploying to server..."

# Variables
APP_DIR="/var/www/pos-retail-shop"
DOMAIN="your-store.com"

# Create app directory
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

# Clone or update code
if [ -d "$APP_DIR/.git" ]; then
    cd $APP_DIR
    git pull origin main
else
    git clone https://github.com/yourusername/pos-retail-shop.git $APP_DIR
    cd $APP_DIR
fi

# Install dependencies
npm install --production

# Build application
npm run build

# Copy environment file
cp .env.production .env.local

# Start with PM2
pm2 delete pos-retail-shop || true
pm2 start ecosystem.config.js
pm2 save

# Configure Nginx
sudo cp nginx.conf /etc/nginx/sites-available/$DOMAIN
sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

echo "✅ Deployment complete!"
echo "🌍 Your app is live at: https://$DOMAIN"
```

#### PM2 Configuration
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'pos-retail-shop',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/pos-retail-shop',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    watch: false,
    max_restarts: 3,
    min_uptime: '10s'
  }]
};
```

#### Nginx Configuration
```nginx
# nginx.conf
server {
    listen 80;
    server_name your-store.com www.your-store.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-store.com www.your-store.com;

    ssl_certificate /etc/letsencrypt/live/your-store.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-store.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;

    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files caching
    location /_next/static {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

---

## 💻 Desktop App Deployment

### Building Desktop App

```bash
# Install Electron Builder
npm install --save-dev electron-builder

# Build for all platforms
npm run electron:build

# Build for specific platform
npm run electron:build -- --win
npm run electron:build -- --mac
npm run electron:build -- --linux
```

### Electron Builder Configuration
```json
// package.json
{
  "build": {
    "appId": "com.yourstore.pos-retail-shop",
    "productName": "POS Retail Shop",
    "directories": {
      "output": "dist-electron"
    },
    "files": [
      "electron/**/*",
      ".next/**/*",
      "public/**/*",
      "package.json"
    ],
    "mac": {
      "icon": "public/icon.icns",
      "category": "public.app-category.business"
    },
    "win": {
      "icon": "public/icon.ico",
      "target": [
        {
          "target": "nsis",
          "arch": ["x64", "ia32"]
        }
      ]
    },
    "linux": {
      "icon": "public/icon.png",
      "target": [
        {
          "target": "AppImage",
          "arch": ["x64"]
        }
      ]
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    },
    "publish": {
      "provider": "github",
      "repo": "pos-retail-shop",
      "owner": "yourusername"
    }
  }
}
```

### Auto-Update Configuration
```javascript
// electron/updater.js
const { autoUpdater } = require('electron-updater');
const { dialog } = require('electron');

class AppUpdater {
  constructor() {
    autoUpdater.checkForUpdatesAndNotify();
    
    autoUpdater.on('update-available', () => {
      dialog.showMessageBox({
        type: 'info',
        title: 'Update available',
        message: 'A new version is available. It will be downloaded in the background.',
        buttons: ['OK']
      });
    });

    autoUpdater.on('update-downloaded', () => {
      dialog.showMessageBox({
        type: 'info',
        title: 'Update ready',
        message: 'Update downloaded. Application will restart to apply the update.',
        buttons: ['Restart', 'Later']
      }).then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
    });
  }
}

module.exports = AppUpdater;
```

### Distribution

#### Windows (NSIS Installer)
```bash
# Build Windows installer
npm run electron:build -- --win

# Output: dist-electron/POS-Retail-Shop-Setup-1.0.0.exe
```

#### macOS (DMG)
```bash
# Build macOS app
npm run electron:build -- --mac

# Output: dist-electron/POS-Retail-Shop-1.0.0.dmg
```

#### Linux (AppImage)
```bash
# Build Linux app
npm run electron:build -- --linux

# Output: dist-electron/POS-Retail-Shop-1.0.0.AppImage
```

### Code Signing

#### Windows Code Signing
```json
// package.json build config
{
  "win": {
    "certificateFile": "certificates/windows.p12",
    "certificatePassword": "your-certificate-password",
    "signingHashAlgorithms": ["sha256"]
  }
}
```

#### macOS Code Signing
```json
{
  "mac": {
    "identity": "Developer ID Application: Your Name (XXXXXXXXXX)",
    "entitlements": "build/entitlements.mac.plist",
    "gatekeeperAssess": false,
    "hardenedRuntime": true
  }
}
```

---

## 🌍 Domain & SSL Setup

### Domain Configuration

#### DNS Records
```
Type    Name    Value                   TTL
A       @       your-server-ip          300
A       www     your-server-ip          300
CNAME   api     your-app.vercel.app     300
TXT     @       "v=spf1 include:_spf.google.com ~all"  300
```

### SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-store.com -d www.your-store.com

# Test automatic renewal
sudo certbot renew --dry-run

# Set up auto-renewal cron job
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Cloudflare Setup (Optional)

1. **Add domain to Cloudflare**
2. **Update nameservers**
3. **Configure DNS records**
4. **Enable SSL/TLS** (Full Strict)
5. **Set up Page Rules**:
   - `www.your-store.com/*` → `https://your-store.com/$1` (301 Redirect)
   - `your-store.com/*` → Cache Level: Standard

---

## ⚡ Performance Optimization

### Next.js Optimizations

```javascript
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features
  experimental: {
    turbopack: true, // For faster builds
    serverComponentsExternalPackages: ['@prisma/client']
  },

  // Optimize images
  images: {
    domains: ['your-store.com'],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000
  },

  // Compress responses
  compress: true,

  // Bundle analyzer (development only)
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    if (!dev && !isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@sentry/node': false,
        '@sentry/profiling-node': false
      };
    }
    return config;
  },

  // Headers for caching
  async headers() {
    return [
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      }
    ];
  }
};

export default nextConfig;
```

### Database Optimization

```sql
-- Add database indexes for performance
CREATE INDEX CONCURRENTLY idx_prices_product_date ON prices(product_name, date DESC);
CREATE INDEX CONCURRENTLY idx_inventory_category_status ON inventory(category, status);
CREATE INDEX CONCURRENTLY idx_checklist_items_sheet_completed ON checklist_items(sheet_id, completed);

-- Analyze query performance
ANALYZE;

-- Update table statistics
VACUUM ANALYZE prices;
VACUUM ANALYZE inventory;
```

### Caching Strategy

```javascript
// lib/cache.ts
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

export async function getCachedData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = 3600
): Promise<T> {
  try {
    const cached = await redis.get(key);
    if (cached) {
      return cached as T;
    }
  } catch (error) {
    console.warn('Cache get failed:', error);
  }

  const data = await fetchFn();
  
  try {
    await redis.setex(key, ttl, data);
  } catch (error) {
    console.warn('Cache set failed:', error);
  }

  return data;
}
```

---

## 📊 Monitoring & Analytics

### Uptime Monitoring

#### UptimeRobot Setup
1. Sign up at [uptimerobot.com](https://uptimerobot.com)
2. Add HTTP(s) monitor for your domain
3. Set up alerts via email/SMS/Slack
4. Monitor key endpoints:
   - `https://your-store.com/` (Main page)
   - `https://your-store.com/api/health` (API health)

#### Custom Health Check
```javascript
// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    // Check database connectivity
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from('prices')
      .select('id')
      .limit(1);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      uptime: process.uptime()
    });

  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    }, { status: 503 });
  }
}
```

### Error Tracking (Sentry)

```bash
# Install Sentry
npm install @sentry/nextjs
```

```javascript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  debug: false,
  environment: process.env.NODE_ENV
});
```

### Analytics

#### Vercel Analytics
```bash
npm install @vercel/analytics
```

```javascript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

#### Google Analytics
```javascript
// lib/gtag.ts
export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID;

export const pageview = (url: string) => {
  window.gtag('config', GA_TRACKING_ID, {
    page_path: url,
  });
};

export const event = ({ action, category, label, value }) => {
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });
};
```

---

## 💾 Backup & Recovery

### Database Backup Script
```bash
#!/bin/bash
# scripts/backup-database.sh

# Variables
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/pos-retail-shop"
DB_NAME="pos_retail_shop"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
pg_dump $DATABASE_URL > $BACKUP_DIR/backup_$TIMESTAMP.sql

# Compress backup
gzip $BACKUP_DIR/backup_$TIMESTAMP.sql

# Upload to S3 (optional)
aws s3 cp $BACKUP_DIR/backup_$TIMESTAMP.sql.gz s3://your-backup-bucket/database/

# Keep only last 30 days of backups
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

echo "✅ Database backup completed: backup_$TIMESTAMP.sql.gz"
```

### Automated Backup with Cron
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /home/ubuntu/scripts/backup-database.sh

# Add weekly full backup on Sunday at 3 AM
0 3 * * 0 /home/ubuntu/scripts/full-backup.sh
```

### Disaster Recovery Plan

#### 1. Database Recovery
```bash
# Restore from backup
gunzip backup_20240115_020000.sql.gz
psql $DATABASE_URL < backup_20240115_020000.sql
```

#### 2. Application Recovery
```bash
# Quick restore from Git
git clone https://github.com/yourusername/pos-retail-shop.git
cd pos-retail-shop
cp .env.backup .env.local
npm install
npm run build
pm2 start ecosystem.config.js
```

#### 3. Full System Recovery
```bash
#!/bin/bash
# scripts/disaster-recovery.sh

echo "🚨 Starting disaster recovery..."

# Restore database
echo "📊 Restoring database..."
gunzip -c $1 | psql $DATABASE_URL

# Deploy application
echo "🚀 Deploying application..."
git clone https://github.com/yourusername/pos-retail-shop.git /tmp/pos-recovery
cd /tmp/pos-recovery
cp /var/backups/pos-retail-shop/.env.backup .env.local
npm install --production
npm run build
pm2 stop all
pm2 start ecosystem.config.js
pm2 save

# Verify health
echo "🔍 Verifying system health..."
curl -f http://localhost:3000/api/health

echo "✅ Disaster recovery completed!"
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '18'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Run build
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

### Pre-deployment Checks
```yaml
# .github/workflows/pre-deploy-checks.yml
name: Pre-deployment Checks

on:
  pull_request:
    branches: [main]

jobs:
  quality-checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Lint code
        run: npm run lint
      
      - name: Type check
        run: npm run type-check
      
      - name: Security audit
        run: npm audit --audit-level high
      
      - name: Bundle analysis
        run: npm run analyze
      
      - name: Lighthouse CI
        run: npm run lighthouse:ci
```

### Deployment Checklist

#### Pre-deployment
- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] Backup completed
- [ ] Rollback plan prepared

#### Deployment
- [ ] Deploy to staging first
- [ ] Smoke tests pass
- [ ] Performance tests pass
- [ ] Security scan completed
- [ ] Deploy to production
- [ ] Health checks pass

#### Post-deployment
- [ ] Monitor application logs
- [ ] Check error rates
- [ ] Verify key functionality
- [ ] Update documentation
- [ ] Notify stakeholders

---

## 🚨 Rollback Strategy

### Quick Rollback (Vercel)
```bash
# List recent deployments
vercel ls

# Rollback to previous deployment
vercel rollback [deployment-url]
```

### Database Rollback
```bash
#!/bin/bash
# scripts/rollback.sh

ROLLBACK_TIMESTAMP=$1

if [ -z "$ROLLBACK_TIMESTAMP" ]; then
    echo "Usage: ./rollback.sh YYYYMMDD_HHMMSS"
    exit 1
fi

# Stop application
pm2 stop all

# Restore database
gunzip -c /var/backups/pos-retail-shop/backup_$ROLLBACK_TIMESTAMP.sql.gz | psql $DATABASE_URL

# Rollback application code
git reset --hard HEAD~1
npm run build

# Restart application
pm2 start all

echo "✅ Rollback completed to $ROLLBACK_TIMESTAMP"
```

---

## 📞 Support & Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

#### Database Connection Issues
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1;"

# Check Supabase status
curl -I https://your-project.supabase.co/rest/v1/
```

#### Performance Issues
```bash
# Monitor server resources
htop
df -h
free -m

# Check application logs
pm2 logs
tail -f /var/log/nginx/error.log
```

### Emergency Contacts

- **Technical Issues**: tech@your-store.com
- **Emergency Hotline**: +66-xxx-xxx-xxxx
- **Slack Channel**: #pos-retail-shop-alerts
- **Status Page**: https://status.your-store.com

---

<div align="center">

## 🎉 Deployment Complete!

Your POS Retail Shop is now live and ready to serve customers.

[📊 Monitor Status](https://status.your-store.com) | [📝 View Logs](https://vercel.com/dashboard) | [🔧 Admin Panel](https://your-store.com/admin)

**Need help?** Contact our deployment team: deploy@your-store.com

</div>