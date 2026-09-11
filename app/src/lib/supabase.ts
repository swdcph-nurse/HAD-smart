import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!supabaseUrl || !supabaseAnonKey) {
  // ช่วยให้เห็น error ชัดเจนตอน dev แทนที่จะเจอ error ทั่วไปจาก supabase-js
  // คัดลอก .env.example เป็น .env.local แล้วใส่ค่าจากโปรเจกต์ Supabase ของคุณ
  throw new Error(
    'ไม่พบ VITE_SUPABASE_URL หรือ VITE_SUPABASE_ANON_KEY — กรุณาตั้งค่าไฟล์ .env.local (ดู .env.example)',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // ใช้ localStorage ปกติของ Supabase (ไม่ใช่ browser storage ของ artifact) — โปรเจกต์นี้ build เป็นไฟล์แยก รันนอก claude.ai
  },
})
