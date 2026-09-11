# HAD Smart Alert — Web App (PWA)

ระบบนิเทศการบริหารยาความเสี่ยงสูง (High Alert Drug) — ส่วน frontend
สร้างด้วย Vite + React + TypeScript + Tailwind CSS v4 + Supabase
รองรับติดตั้งเป็น Progressive Web App (PWA) บนมือถือ/แท็บเล็ต

ดูภาพรวมทั้งโครงการและแผนพัฒนาเป็นเฟสได้ที่ [`../ROADMAP.md`](../ROADMAP.md)

## สถานะปัจจุบัน (เฟส 2 — เสร็จแล้ว)

- ✅ โครงแอป Vite/React/TS/Tailwind v4 + PWA config (manifest, service worker)
- ✅ เชื่อมต่อ Supabase Auth พร้อมโหลด profile/role อัตโนมัติ
- ✅ ระบบ login/logout, ป้องกันเส้นทางตาม session (`ProtectedRoute`) และตามบทบาท (`RoleGate`)
- ✅ Layout หลัก (top bar + bottom nav ที่ปรับเมนูตามบทบาท) และหน้า Home/Profile/404
- ⏳ โมดูล QR Checklist, Critical Alert, Dashboard ฯลฯ — พัฒนาต่อในเฟส 3 เป็นต้นไป

## เริ่มต้นใช้งาน (Development)

### 1. ติดตั้ง dependencies

```bash
npm install
```

### 2. ตั้งค่าการเชื่อมต่อ Supabase

คัดลอกไฟล์ตัวอย่างแล้วใส่ค่าจากโปรเจกต์ Supabase ของคุณ (Project Settings → API):

```bash
cp .env.example .env.local
```

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

> ต้องรัน migration ในโฟลเดอร์ `../supabase/migrations` บนโปรเจกต์ Supabase ก่อน (ดูขั้นตอนใน ROADMAP.md รวมถึงการ bootstrap แอดมินคนแรก)

### 3. รันเซิร์ฟเวอร์พัฒนา

```bash
npm run dev
```

เปิด `http://localhost:5173`

### 4. สร้างบัญชีทดสอบ

- สมัครผ่านหน้า Login ของแอป (ใช้ Supabase Auth) หรือสร้างผู้ใช้ผ่าน Supabase Dashboard → Authentication
- ผู้ใช้ใหม่จะได้ profile อัตโนมัติ role `nurse` แบบยังไม่มี ward — ต้อง promote เป็น admin คนแรกผ่าน SQL Editor ตามขั้นตอนใน ROADMAP.md แล้วจึงเข้าไปกำหนด role/ward ให้ผู้ใช้คนอื่นต่อ (หน้าจัดการผู้ใช้จะสร้างในเฟสถัดไป — ระหว่างนี้ทำผ่าน SQL Editor หรือ Table editor ได้โดยตรง)

## คำสั่งที่ใช้บ่อย

| คำสั่ง | ทำอะไร |
| --- | --- |
| `npm run dev` | รันเซิร์ฟเวอร์พัฒนา พร้อม hot reload |
| `npm run build` | ตรวจชนิดข้อมูล (`tsc -b`) แล้ว build production ไปที่ `dist/` |
| `npm run preview` | รันดูผลลัพธ์ของ production build |
| `npm run lint` | ตรวจสอบคุณภาพโค้ดด้วย oxlint |

## โครงสร้างโฟลเดอร์หลัก

```
src/
  lib/
    supabase.ts     Supabase client (อ่านค่าจาก .env.local)
    types.ts        Type ที่สะท้อนตารางใน Supabase
  context/
    AuthContext.tsx  session + profile + role, สมัคร/ออกจากระบบ
  components/
    layout/          AppShell, BottomNav, ProtectedRoute, RoleGate
    ui/              ส่วนประกอบ UI ที่ใช้ซ้ำ
  pages/             หน้าจอต่างๆ (Login, Home, Profile, 404)
  App.tsx            ตั้งค่า routing
  main.tsx           entry point
```

## Deploy เป็น PWA จริง

Build แล้วนำโฟลเดอร์ `dist/` ไป deploy บน static host ที่รองรับ HTTPS (Vercel / Netlify / Cloudflare Pages ฯลฯ) — HTTPS จำเป็นสำหรับ Service Worker และ Add to Home Screen บนมือถือ

```bash
npm run build
# นำ dist/ ไป deploy
```

หลัง deploy แล้ว เปิดลิงก์บนมือถือ → เมนูเบราว์เซอร์ → "เพิ่มไปยังหน้าจอโฮม" (Add to Home Screen) เพื่อใช้งานเหมือนแอปจริง
