import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/types'

interface AuthContextValue {
  session: Session | null
  profile: Profile | null
  /** true ระหว่างตรวจสอบ session/profile ครั้งแรก (ใช้กัน flash ของหน้า login) */
  loading: boolean
  /** true เฉพาะตอนที่มี session แล้วแต่ยังโหลด profile ไม่เสร็จ */
  profileLoading: boolean
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)

  async function loadProfile(userId: string) {
    setProfileLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('โหลด profile ไม่สำเร็จ:', error.message)
      setProfile(null)
    } else {
      setProfile(data as Profile)
    }
    setProfileLoading(false)
  }

  useEffect(() => {
    let isMounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return
      setSession(data.session)
      if (data.session) {
        loadProfile(data.session.user.id).finally(() => isMounted && setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession) {
        loadProfile(newSession.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => {
      isMounted = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      // แปล error ที่พบบ่อยเป็นข้อความไทยที่เข้าใจง่าย
      if (error.message.includes('Invalid login credentials')) {
        return { error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }
      }
      return { error: error.message }
    }
    return { error: null }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const refreshProfile = useCallback(async () => {
    if (session) {
      await loadProfile(session.user.id)
    }
  }, [session])

  const value = useMemo(
    () => ({ session, profile, loading, profileLoading, signInWithPassword, signOut, refreshProfile }),
    [session, profile, loading, profileLoading, signInWithPassword, signOut, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth ต้องใช้ภายใน <AuthProvider>')
  return ctx
}
