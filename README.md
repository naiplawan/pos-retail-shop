# 🏪 POS Retail Shop - ระบบจัดการร้านค้าแบบครบครัน

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://typescriptlang.org/)
[![Electron](https://img.shields.io/badge/Electron-Ready-green)](https://electronjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

ระบบจัดการร้านค้าสมัยใหม่ที่ออกแบบมาเพื่อเจ้าของร้านค้าไทย พร้อมฟีเจอร์ครบครันระดับองค์กร แต่ใช้งานง่ายเหมือนแอพบนมือถือ

## ✨ ฟีเจอร์หลัก

### 🏠 **แดชบอร์ดหลัก**
- **Quick Actions** - ปุ่มลัดสำหรับงานที่ใช้บ่อย (เพิ่มสินค้า, ค้นหา, พิมพ์รายงาน)
- **Real-time Statistics** - สถิติแบบเรียลไทม์พร้อมการ์ดแสดงผลสวยงาม
- **แนวโน้มการขาย** - กราฟแสดงยอดขายแบบ Interactive

### 🔍 **ระบบค้นหาขั้นสูง**
- **Smart Autocomplete** - ค้นหาพร้อมคำแนะนำอัตโนมัติ
- **ประวัติการค้นหา** - เก็บคำค้นหาล่าสุดเพื่อเข้าถึงได้ง่าย
- **กรองข้อมูลหลายเงื่อนไข** - กรองตามหมวดหมู่, ช่วงราคา, วันที่
- **Barcode Scanner** - รองรับการสแกนบาร์โค้ด

### 📊 **การวิเคราะห์ข้อมูลขั้นสูง**
- **กราฟแบบ Interactive** - คลิกดูรายละเอียดได้
- **วิเคราะห์แนวโน้ม** - แสดงการเปลี่ยนแปลงเป็นเปอร์เซ็นต์
- **สินค้าขายดี** - รายการสินค้าที่ขายดีที่สุด
- **คำแนะนำอัตโนมัติ** - ระบบแนะนำจากการวิเคราะห์ข้อมูล

### 🖨️ **ระบบพิมพ์มืออาชีพ**
- **5 รูปแบบรายงาน** - ใบเสร็จ, รายวัน, รายเดือน, สต๊อก, การเงิน
- **Thermal Printer** - รองรับเครื่องพิมพ์ความร้อน 80mm
- **PDF Export** - ส่งออกเป็นไฟล์ PDF
- **Print Preview** - ดูตัวอย่างก่อนพิมพ์

### 📦 **การจัดการคลังสินค้า**
- **Stock Alert** - แจ้งเตือนสินค้าเหลือน้อยแบบเรียลไทม์
- **One-Click Restock** - เติมสต๊อกด่วนแค่คลิกเดียว
- **Inventory Dashboard** - สถิติคลังสินค้าครบครัน 6 ตัวชี้วัด
- **CSV Import/Export** - นำเข้า/ส่งออกข้อมูลเป็น Excel

### 🚀 **ฟีเจอร์ขั้นสูง**
- **Offline Mode** - ใช้งานได้แม้ไม่มีอินเทอร์เน็ต
- **Auto Sync** - ซิงค์ข้อมูลอัตโนมัติเมื่อกลับมาออนไลน์
- **Keyboard Shortcuts** - คีย์ลัดสำหรับผู้ใช้ขั้นสูง
- **Error Recovery** - จัดการข้อผิดพลาดอัตโนมัติ
- **Multi-language** - รองรับภาษาไทยเต็มรูปแบบ

## 🛠️ เทคโนโลยีที่ใช้

### **Frontend Framework**
- **Next.js 15** - App Router + React Server Components
- **React 19** - ใหม่ล่าสุด
- **TypeScript** - Type Safety 100%
- **Tailwind CSS** + **shadcn/ui** - Design System

### **Database & Backend**
- **Supabase** - PostgreSQL + Real-time + Auth
- **Prisma** - Type-safe Database Client
- **Row Level Security** - ความปลอดภัยระดับแถว
- **Next.js API Routes** - Serverless Functions

### **Desktop App**
- **Electron** - Cross-platform Desktop App
- **Better-sqlite3** - Local Database
- **Auto-updater** - อัพเดทอัตโนมัติ

### **Advanced Features**
- **IndexedDB** - Offline Storage
- **Service Workers** - Background Sync
- **Chart.js** - Data Visualization
- **React-PDF** - PDF Generation
- **Framer Motion** - Smooth Animations

## 🚀 เริ่มต้นใช้งาน

### ความต้องการของระบบ

- **Node.js** v18+ 
- **pnpm** (แนะนำ) หรือ npm
- **Git**
- **RAM** ขั้นต่ำ 4GB

### การติดตั้ง

1. **Clone Repository**
   ```bash
   git clone https://github.com/yourusername/pos-retail-shop.git
   cd pos-retail-shop
   ```

2. **ติดตั้ง Dependencies**
   ```bash
   pnpm install
   # หรือ
   npm install
   ```

3. **ตั้งค่า Environment Variables**
   
   สร้างไฟล์ `.env.local`:
   ```env
   # Database (Supabase)
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   
   # App Configuration
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NEXT_PUBLIC_APP_NAME=ร้านค้าของคุณ
   
   # Optional: AI Features
   GOOGLE_CLOUD_API_KEY=your_google_cloud_key
   ```

4. **ตั้งค่าฐานข้อมูล**
   ```bash
   # Run database migrations
   pnpm db:migrate
   
   # Seed initial data (optional)
   pnpm db:seed
   ```

5. **รันแอพพลิเคชัน**
   ```bash
   # Development
   pnpm dev
   
   # Production
   pnpm build
   pnpm start
   ```

6. **เปิดในเบราว์เซอร์**
   
   ไปที่ [http://localhost:3000](http://localhost:3000)

### รัน Desktop App

```bash
# Terminal 1: Start Next.js server
pnpm dev

# Terminal 2: Start Electron
pnpm electron:dev
```

## 📁 โครงสร้างโปรเจค

```
pos-retail-shop/
├── 📁 app/                    # Next.js App Router
│   ├── 📁 api/                # API Routes
│   ├── 📁 checklist/          # Checklist Pages
│   ├── globals.css            # Global Styles
│   ├── layout.tsx             # Root Layout
│   └── page.tsx               # Home Page
├── 📁 components/             # React Components
│   ├── 📁 ui/                 # UI Components (shadcn/ui)
│   ├── advanced-search.tsx    # ระบบค้นหาขั้นสูง
│   ├── dashboard.tsx          # แดชบอร์ดหลัก
│   ├── enhanced-charts.tsx    # กราฟขั้นสูง
│   ├── inventory-manager.tsx  # จัดการคลัง
│   ├── keyboard-shortcuts.tsx # คีย์ลัด
│   ├── notification-system.tsx# ระบบแจ้งเตือน
│   ├── print-system.tsx       # ระบบพิมพ์
│   └── quick-actions.tsx      # Quick Actions
├── 📁 electron/               # Electron Desktop App
│   ├── main.js                # Main Process
│   └── preload.js             # Preload Script
├── 📁 hooks/                  # Custom React Hooks
├── 📁 lib/                    # Utilities
│   ├── database-electron.ts   # Local Database
│   ├── offline-manager.ts     # Offline Support
│   └── utils.ts               # Helper Functions
├── 📁 public/                 # Static Files
├── 📁 types/                  # TypeScript Types
├── 📁 docs/                   # Documentation
├── .env.example               # Environment Template
├── next.config.mjs            # Next.js Config
├── package.json               # Dependencies
├── tailwind.config.js         # Tailwind Config
└── README.md                  # This file
```

## 🎮 การใช้งาน

### Quick Actions (งานด่วน)
- **Ctrl+N** - เพิ่มสินค้าใหม่
- **Ctrl+F** - ค้นหาสินค้า  
- **Ctrl+S** - บันทึกข้อมูล
- **Ctrl+P** - พิมพ์รายงาน
- **?** - แสดงคีย์ลัดทั้งหมด

### การนำทาง
- **Ctrl+H** - หน้าหลัก
- **Ctrl+L** - รายการคำสั่งซื้อ
- **Ctrl+R** - รีเฟรชข้อมูล

### ฟีเจอร์พิเศษ
- **การทำงานแบบออฟไลน์** - แอพยังใช้งานได้แม้ไม่มีอินเทอร์เน็ต
- **ซิงค์อัตโนมัติ** - ข้อมูลจะถูกซิงค์เมื่ออินเทอร์เน็ตกลับมา
- **Print Templates** - รูปแบบการพิมพ์หลากหลายตามการใช้งาน

## 📊 API Documentation

### Price Management
```typescript
GET    /api/prices              # ดึงข้อมูลราคาทั้งหมด
POST   /api/prices              # เพิ่มราคาใหม่
PUT    /api/prices/:id          # แก้ไขราคา
DELETE /api/prices/:id          # ลบราคา
GET    /api/prices?type=daily   # สรุปรายวัน
GET    /api/prices?type=monthly # สรุปรายเดือน
```

### Inventory Management  
```typescript
GET    /api/inventory           # ดึงข้อมูลสต๊อกทั้งหมด
POST   /api/inventory           # เพิ่มสินค้าใหม่
PUT    /api/inventory/:id       # อัพเดทสต๊อก
DELETE /api/inventory/:id       # ลบสินค้า
GET    /api/inventory/alerts    # แจ้งเตือนสต๊อกน้อย
```

### Reports & Analytics
```typescript
GET    /api/summary/all         # สรุปข้อมูลทั้งหมด
GET    /api/reports/daily       # รายงานรายวัน
GET    /api/reports/monthly     # รายงานรายเดือน
GET    /api/analytics/trends    # วิเคราะห์แนวโน้ม
```

## 🚀 การ Deploy

### Vercel (แนะนำ)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Docker
```bash
# Build image
docker build -t pos-retail-shop .

# Run container
docker run -p 3000:3000 pos-retail-shop
```

### Desktop App Build
```bash
# Build for all platforms
pnpm electron:build

# Build for specific platform
pnpm electron:build --win
pnpm electron:build --mac
pnpm electron:build --linux
```

## 🛡️ ความปลอดภัย

- **Row Level Security** - ข้อมูลแยกตามผู้ใช้
- **Input Validation** - ตรวจสอบข้อมูลป้อนเข้า
- **SQL Injection Prevention** - ป้องกัน SQL Injection
- **XSS Protection** - ป้องกัน Cross-site Scripting
- **CSRF Protection** - ป้องกัน Cross-site Request Forgery

## 🧪 การทดสอบ

```bash
# Unit Tests
pnpm test

# Integration Tests  
pnpm test:integration

# E2E Tests
pnpm test:e2e

# Test Coverage
pnpm test:coverage
```

## 📝 การมีส่วนร่วม

1. Fork โปรเจค
2. สร้าง Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit การเปลี่ยนแปลง (`git commit -m 'Add AmazingFeature'`)
4. Push ไปยัง Branch (`git push origin feature/AmazingFeature`)
5. สร้าง Pull Request

## 📞 การสนับสนุน

- 📧 Email: support@yourstore.com
- 💬 Discord: [เข้าร่วม Community](https://discord.gg/yourstore)
- 📝 Issues: [GitHub Issues](https://github.com/yourusername/pos-retail-shop/issues)
- 📖 Wiki: [Documentation](https://github.com/yourusername/pos-retail-shop/wiki)

## 📄 License

โปรเจคนี้อยู่ภายใต้ MIT License - ดู [LICENSE](LICENSE) สำหรับรายละเอียด

## 🙏 Acknowledgments

- [Next.js Team](https://nextjs.org/) - Framework ที่ยอดเยี่ยม
- [Vercel](https://vercel.com/) - Platform สำหรับ Deployment
- [shadcn/ui](https://ui.shadcn.com/) - Component Library สวยงาม
- [Supabase](https://supabase.com/) - Backend-as-a-Service ที่เยี่ยม
- [Tailwind CSS](https://tailwindcss.com/) - CSS Framework ที่ดีที่สุด

---

<div align="center">

**🏪 สร้างด้วยความรักสำหรับเจ้าของร้านค้าไทย**

Made with ❤️ for Thai Shop Owners

[⭐ ถ้าชอบโปรเจคนี้ อย่าลืม Star ให้หน่อยนะ](https://github.com/yourusername/pos-retail-shop)

</div>