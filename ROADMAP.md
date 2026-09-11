# แผนพัฒนาเป็นเฟส — HAD Smart Alert & Supervision Dashboard (PWA + Supabase)

เริ่มจากฐานข้อมูลก่อน เพราะทุกฟีเจอร์ (Checklist, Alert, Dashboard, ประเมินพฤติกรรม) ต้องพึ่งโครงสร้างข้อมูลและ RLS ที่ถูกต้องตั้งแต่ต้น การแก้ schema ทีหลังจะกระทบโค้ด frontend มาก จึงควรให้ schema นิ่งก่อนเขียน UI

| เฟส | เนื้อหา | สถานะ |
| --- | --- | --- |
| **0. วางแผน/ออกแบบ schema** | สรุป entity, ความสัมพันธ์, และ policy สิทธิ์ | ✅ เสร็จแล้ว |
| **1. ฐานข้อมูล Supabase** | สร้างตาราง, index, trigger คำนวณ Alert อัตโนมัติ, RLS policy ครบทุกตาราง, seed ข้อมูลอ้างอิง (ward, รายการยา HAD, 20 ข้อประเมิน) | ✅ เสร็จแล้ว — ทดสอบรันจริงและยืนยัน RLS/Alert engine ทำงานถูกต้อง |
| **2. Auth & โครงแอป (Scaffold)** | ตั้งโปรเจกต์ Vite + React + TS + Tailwind + PWA config, เชื่อม Supabase client, ระบบ login, การจัดการ role/session | ✅ เสร็จแล้ว — build/lint ผ่าน, ดูรายละเอียดที่ `app/README.md` |
| **3. โมดูล QR Checklist + Critical Alert** | หน้าเลือกช่วง (ก่อน/ขณะ/หลังให้ยา), ฟอร์ม checklist แบบ dynamic ดึงจาก Supabase, บันทึกแล้วแสดงผล Alert ทันที, ประวัติการบันทึกล่าสุดของตนเอง | ✅ เสร็จแล้ว — build ผ่าน (ยังไม่มีกล้องสแกน QR จริง ใช้การเลือกช่วงด้วยปุ่มแทนในเวอร์ชันนี้ — ดูหมายเหตุด้านล่าง) |
| **4. Supervision Dashboard** | กราฟแนวโน้มรายวัน, สัดส่วนตามระดับ Alert, Top 5 รายการไม่ปฏิบัติบ่อยสุด, รายการ Alert ค้างพร้อมปิดได้จริง (บันทึกการแก้ไข) | ✅ เสร็จแล้ว — build ผ่าน |
| **5. แบบประเมินพฤติกรรม + Pre/Post-test** | ฟอร์มประเมิน 20 ข้อคำนวณคะแนนอัตโนมัติ, quiz ก่อน-หลัง | 🔜 ถัดไป |
| **6. PWA / Offline** | Service worker, background sync คิวส่งข้อมูลออฟไลน์, Web Push แจ้งเตือน Alert แดง | ถัดไป (โครง service worker ตั้งไว้แล้วในเฟส 2 แต่ยังไม่มี background sync / push) |
| **7. ทดสอบ & Go-live** | ทดสอบด้วยข้อมูลจำลอง, อบรมผู้ใช้, ติดตั้งจริง | ถัดไป |

โครงสร้างไฟล์ทั้งโปรเจกต์ตอนนี้:

```
had-smart-alert/
  ROADMAP.md
  supabase/
    migrations/        เฟส 1 — ฐานข้อมูล (0001–0004)
  app/                  เฟส 2 — เว็บแอป React PWA
    README.md           วิธีติดตั้ง/รันแอป
    src/
```


ไฟล์ในรอบนี้ (เฟส 1) อยู่ใต้ `supabase/migrations/` เรียงลำดับรันตามเลขไฟล์ — ใช้ได้ทั้งกับ Supabase CLI (`supabase db push` / `supabase migration up`) หรือคัดลอกไปรันใน SQL Editor บน Supabase Dashboard ทีละไฟล์ตามลำดับ

## สรุปสิ่งที่อยู่ในเฟส 1 นี้

1. `0001_schema.sql` — ตารางหลักทั้งหมด, ความสัมพันธ์, index, และ trigger `updated_at`
2. `0002_alert_engine.sql` — ฟังก์ชัน + trigger คำนวณ Alert อัตโนมัติเมื่อบันทึก checklist (ตรรกะ แดง/ส้ม/เขียว ตามที่ระบุในแผนโครงการ)
3. `0003_rls_policies.sql` — เปิด RLS ทุกตารางที่มีข้อมูลบุคคล/เหตุการณ์ พร้อม policy แยกตามบทบาท (nurse / supervisor / pharmacist / admin / executive)
4. `0004_seed.sql` — ข้อมูลอ้างอิงเริ่มต้น: ward ตัวอย่าง, 20 ข้อแบบประเมินพฤติกรรมพร้อมระบุรายการวิกฤต, checklist template ก่อน/ขณะ/หลังให้ยา

## วิธีใช้งาน

```bash
# ติดตั้ง Supabase CLI (ถ้ายังไม่มี)
npm install -g supabase

# เข้าสู่ระบบและเชื่อมกับโปรเจกต์ Supabase ที่สร้างไว้
supabase login
supabase link --project-ref <your-project-ref>

# รัน migration ทั้งหมดตามลำดับ
supabase db push
```

หรือคัดลอกเนื้อหาไฟล์ `0001` → `0004` ไปวางรันทีละไฟล์ใน **Supabase Dashboard → SQL Editor** ตามลำดับเลขไฟล์ (SQL Editor รันด้วยสิทธิ์ระดับสูงอยู่แล้ว จึงใช้ bootstrap แอดมินคนแรกในขั้นตอนถัดไปได้เลย)

## ⚠️ ขั้นตอนสำคัญหลังรัน migration: Bootstrap แอดมินคนแรก

ระบบมี trigger ป้องกันไม่ให้ผู้ใช้ทั่วไปเปลี่ยน `role`/`ward_id` ของตัวเอง (กันการยกระดับสิทธิ์) ซึ่งหมายความว่า **ต้องตั้งแอดมินคนแรกด้วยตนเองผ่าน SQL Editor** (รันด้วย service role จึงข้ามการป้องกันนี้ได้โดยอัตโนมัติ):

```sql
-- 1) ให้ผู้ใช้คนแรกสมัครเข้าระบบผ่านหน้า Login ของแอปก่อน (จะมี profile ถูกสร้างอัตโนมัติ role='nurse')
-- 2) จากนั้นรันคำสั่งนี้ใน Supabase SQL Editor เพื่อ promote เป็น admin
update public.profiles
set role = 'admin', display_code = 'ADMIN-01'
where id = '<uuid ของผู้ใช้จาก auth.users>';
```

หลังจากนั้นแอดมินคนนี้จะเข้าหน้าจัดการผู้ใช้ในแอป (เฟส 2) เพื่อ assign role/ward ให้พยาบาลคนอื่น ๆ ต่อไปได้ตามปกติ — ไม่ต้องกลับมาที่ SQL Editor อีก

## การทดสอบที่ทำไปแล้วในรอบนี้

ก่อนส่งมอบ ได้ทดสอบรัน migration ทั้ง 4 ไฟล์จริงบน Postgres (จำลองสภาพแวดล้อม Supabase) และยืนยันว่า:

- ✅ Schema/trigger/function ทุกตัวรันไม่มี syntax error
- ✅ `handle_new_user` สร้าง profile อัตโนมัติเมื่อสมัครสมาชิกใหม่
- ✅ Alert engine คำนวณระดับ red/orange/yellow/green ถูกต้องตามเงื่อนไข และสร้างแถวใน `alerts` เฉพาะกรณีไม่ใช่ green
- ✅ RLS บล็อกไม่ให้พยาบาลเห็น/แทรกข้อมูลข้าม ward ได้จริง (ทดสอบด้วย role ที่ไม่ bypass RLS)
- ✅ พยาบาลทั่วไปปิด Alert เองไม่ได้ ต้องผ่านผู้มีบทบาท supervisor/admin เท่านั้น
- ✅ การปิด Alert บันทึกลง `audit_log` อัตโนมัติ และปรับสถานะ `checklist_responses` กลับเป็น `closed`
- ✅ Guard กัน role/ward escalation ทำงานถูกต้อง พร้อมช่องทาง bootstrap ผ่าน `service_role`

ขั้นถัดไป: แจ้งกลับมาเพื่อเริ่ม **เฟส 5 (แบบประเมินพฤติกรรม + Pre/Post-test)**

## หมายเหตุเฟส 3 — เรื่อง QR Scanning

เวอร์ชันนี้ยังไม่ได้ใส่กล้องสแกน QR จริง (ต้องขอสิทธิ์กล้องและใช้ library เพิ่มเติมเช่น `html5-qrcode`) — ใช้การ**เลือกช่วง (ก่อน/ขณะ/หลังให้ยา) ด้วยการแตะปุ่มแทน** ซึ่งให้ผลลัพธ์เดียวกันทุกประการ (บันทึกลงตารางเดียวกัน, Alert engine ทำงานเหมือนกัน) เพียงแต่ไม่ได้สแกนจาก QR code จริงที่ติดหน้างาน สามารถเพิ่มกล้องสแกนเป็นฟีเจอร์เสริมได้ภายหลังโดยไม่กระทบโครงสร้างข้อมูล — แจ้งได้หากต้องการให้เพิ่มในเฟสถัดไป
