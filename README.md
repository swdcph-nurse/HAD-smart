# HAD Smart Alert

ระบบนิเทศการบริหารยาความเสี่ยงสูง (High Alert Drug) — หอผู้ป่วยพิเศษปาริฉัตร
Progressive Web App (PWA) + Supabase

## โครงสร้างโปรเจกต์

```
had-smart-alert/
  ROADMAP.md          แผนพัฒนาเป็นเฟส + สถานะปัจจุบัน + วิธี bootstrap แอดมินคนแรก
  supabase/
    migrations/       SQL migration ทั้งหมด (schema, alert engine, RLS, seed data)
  app/                 เว็บแอป React + TypeScript + Tailwind + Vite (PWA)
    README.md          วิธีติดตั้งและรันแอป
```

## เริ่มต้นใช้งาน

1. สร้างโปรเจกต์ Supabase ใหม่ แล้วรัน SQL migration ทั้ง 4 ไฟล์ในโฟลเดอร์ `supabase/migrations` ตามลำดับเลขไฟล์ (ดูรายละเอียดขั้นตอนใน `ROADMAP.md`)
2. เข้าโฟลเดอร์ `app/` แล้วทำตาม `app/README.md` เพื่อติดตั้งและรันเว็บแอป

## สถานะปัจจุบัน

ดูตารางความคืบหน้าแบบละเอียดที่ [`ROADMAP.md`](./ROADMAP.md) — สรุปสั้นๆ:

- ✅ เฟส 1: ฐานข้อมูล Supabase (schema, RLS, alert engine, seed data)
- ✅ เฟส 2: Auth + โครงแอป React PWA
- ✅ เฟส 3: โมดูล QR Checklist + Critical Alert
- 🔜 เฟส 4: Supervision Dashboard
- 🔜 เฟส 5: แบบประเมินพฤติกรรม + Pre/Post-test
- 🔜 เฟส 6: PWA offline sync + Web Push
- 🔜 เฟส 7: ทดสอบและ Go-live

## ความปลอดภัยของข้อมูล

- ไม่มีการเก็บชื่อ-นามสกุลหรือเลขบัตรประชาชนผู้ป่วยในระบบ ใช้รหัสเตียง (bed code) แทน
- สิทธิ์การเข้าถึงข้อมูลบังคับใช้ผ่าน Row Level Security (RLS) ระดับฐานข้อมูล แยกตามบทบาทและหอผู้ป่วย
- ไฟล์ `.env.local` ที่เก็บคีย์เชื่อมต่อ Supabase **ไม่ถูก commit เข้า git** (ดู `.gitignore`) — ต้องตั้งค่าใหม่ทุกครั้งที่ clone โปรเจกต์นี้ไปเครื่องใหม่
