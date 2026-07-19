// 全局状态管理
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppState {
  // 主题
  darkMode: boolean
  toggleDark: () => void
  themeColor: string
  setThemeColor: (id: string) => void
  fontSize: string
  setFontSize: (id: string) => void

  // TTS 设置
  voiceName: string
  setVoiceName: (name: string) => void
  rate: number
  setRate: (rate: number) => void

  // 学习设置
  targetLevel: 'primary' | 'junior' | 'senior' | 'gaozhong' | 'cet4' | 'cet6' | 'kaoyan' | 'daily' | 'all'
  setTargetLevel: (level: AppState['targetLevel']) => void
  dailyGoal: number
  setDailyGoal: (n: number) => void

  // 翻译 API
  translateProvider: 'auto' | 'libre' | 'mymemory'
  setTranslateProvider: (p: AppState['translateProvider']) => void
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      darkMode: false,
      toggleDark: () => set((s) => ({ darkMode: !s.darkMode })),
      themeColor: 'green',
      setThemeColor: (id) => set({ themeColor: id }),
      fontSize: 'md',
      setFontSize: (id) => set({ fontSize: id }),

      voiceName: '',
      setVoiceName: (name) => set({ voiceName: name }),
      rate: 1,
      setRate: (rate) => set({ rate }),

      targetLevel: 'cet4',
      setTargetLevel: (level) => set({ targetLevel: level }),
      dailyGoal: 10,
      setDailyGoal: (n) => set({ dailyGoal: n }),

      translateProvider: 'auto',
      setTranslateProvider: (p) => set({ translateProvider: p }),
    }),
    { name: 'english-app-settings' }
  )
)

// 学习统计
interface Stats {
  todayCount: number
  totalLearned: number
  favoriteCount: number
  streak: number
  setStats: (s: Partial<Stats>) => void
}

export const useStats = create<Stats>((set) => ({
  todayCount: 0,
  totalLearned: 0,
  favoriteCount: 0,
  streak: 0,
  setStats: (s) => set((prev) => ({ ...prev, ...s })),
}))
