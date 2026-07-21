// 全局状态管理
// v0.11: 引入多渠道(LLM / TTS / Translate)统一管理
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// === 渠道类型定义(从 providers 导入) ===
import type { LLMProvider } from '../lib/providers/llm'
import type { TranslateProvider } from '../lib/translate'
import type { TTSProvider } from '../lib/tts'

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
  /** 激活的 TTS 渠道 id */
  ttsProviderId: string
  setTtsProviderId: (id: string) => void
  /** TTS 渠道选择缓存 (id -> 选定) */
  ttsProviders: TTSProvider[]
  setTtsProviders: (p: TTSProvider[]) => void
  /** 用户自定义 TTS 渠道(可在 Settings 添加) */
  customTtsProviders: TTSProvider[]
  setCustomTtsProviders: (p: TTSProvider[]) => void
  addCustomTtsProvider: (p: TTSProvider) => void
  removeCustomTtsProvider: (id: string) => void
  /** TTS 渠道 API key(用于 http 类型) */
  ttsApiKeys: Record<string, string>
  setTtsApiKey: (providerId: string, key: string) => void

  // LLM 渠道(图片识别 + AI 对话共用)
  llmProviderId: string
  setLlmProviderId: (id: string) => void
  llmProviders: LLMProvider[]
  setLlmProviders: (p: LLMProvider[]) => void
  llmApiKeys: Record<string, string>  // providerId -> key
  setLlmApiKey: (providerId: string, key: string) => void
  llmModels: Record<string, string>    // providerId -> model
  setLlmModel: (providerId: string, model: string) => void
  /** 用户自定义 LLM 渠道(可在 Settings 添加 OpenAI 兼容端点) */
  customLlmProviders: LLMProvider[]
  setCustomLlmProviders: (p: LLMProvider[]) => void
  addCustomLlmProvider: (p: LLMProvider) => void
  removeCustomLlmProvider: (id: string) => void

  // 翻译渠道
  translateProviderId: string
  setTranslateProviderId: (id: string) => void
  translateProviders: TranslateProvider[]
  setTranslateProviders: (p: TranslateProvider[]) => void
  /** 翻译渠道特殊 key (如百度 appid|key) */
  translateApiKeys: Record<string, string>
  setTranslateApiKey: (providerId: string, key: string) => void

  // AI 对话
  chatScenario: string  // 'cafe' / 'airport' / ...
  setChatScenario: (s: string) => void
  chatLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
  setChatLevel: (l: AppState['chatLevel']) => void

  // 学习设置
  targetLevel: 'primary' | 'junior' | 'senior' | 'gaozhong' | 'cet4' | 'cet6' | 'kaoyan' | 'daily' | 'all'
  setTargetLevel: (level: AppState['targetLevel']) => void
  dailyGoal: number
  setDailyGoal: (n: number) => void
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
      ttsProviderId: 'browser',
      setTtsProviderId: (id) => {
        // 修复 P1-7: 切换时停止当前播放
        try {
          // 动态 import 避免循环依赖
          import('../lib/tts').then(m => m.stopSpeak())
        } catch {}
        set({ ttsProviderId: id })
      },
      ttsProviders: [],
      setTtsProviders: (p) => set({ ttsProviders: p }),
      customTtsProviders: [],
      setCustomTtsProviders: (p) => set({ customTtsProviders: p }),
      addCustomTtsProvider: (p) => set(s => ({ customTtsProviders: [...s.customTtsProviders, p] })),
      removeCustomTtsProvider: (id) => set(s => ({ customTtsProviders: s.customTtsProviders.filter(p => p.id !== id) })),
      ttsApiKeys: {},
      setTtsApiKey: (providerId, key) => set(s => ({ ttsApiKeys: { ...s.ttsApiKeys, [providerId]: key } })),

      llmProviderId: 'mock',
      setLlmProviderId: (id) => set({ llmProviderId: id }),
      llmProviders: [],
      setLlmProviders: (p) => set({ llmProviders: p }),
      llmApiKeys: {},
      setLlmApiKey: (providerId, key) =>
        set((s) => ({ llmApiKeys: { ...s.llmApiKeys, [providerId]: key } })),
      llmModels: {},
      setLlmModel: (providerId, model) =>
        set((s) => ({ llmModels: { ...s.llmModels, [providerId]: model } })),
      customLlmProviders: [],
      setCustomLlmProviders: (p) => set({ customLlmProviders: p }),
      addCustomLlmProvider: (p) => set(s => ({ customLlmProviders: [...s.customLlmProviders, p] })),
      removeCustomLlmProvider: (id) => set(s => ({ customLlmProviders: s.customLlmProviders.filter(p => p.id !== id) })),

      translateProviderId: 'mymemory',
      setTranslateProviderId: (id) => set({ translateProviderId: id }),
      translateProviders: [],
      setTranslateProviders: (p) => set({ translateProviders: p }),
      translateApiKeys: {},
      setTranslateApiKey: (providerId, key) =>
        set((s) => ({ translateApiKeys: { ...s.translateApiKeys, [providerId]: key } })),

      chatScenario: 'cafe',
      setChatScenario: (s) => set({ chatScenario: s }),
      chatLevel: 'B1',
      setChatLevel: (l) => set({ chatLevel: l }),

      targetLevel: 'cet4',
      setTargetLevel: (level) => set({ targetLevel: level }),
      dailyGoal: 10,
      setDailyGoal: (n) => set({ dailyGoal: n }),
    }),
    {
      name: 'english-app-settings-v2',
      // 不持久化大数组(providers 都是 builtin)
      partialize: (state) => ({
        darkMode: state.darkMode,
        themeColor: state.themeColor,
        fontSize: state.fontSize,
        voiceName: state.voiceName,
        rate: state.rate,
        ttsProviderId: state.ttsProviderId,
        ttsApiKeys: state.ttsApiKeys,
        customTtsProviders: state.customTtsProviders,
        llmProviderId: state.llmProviderId,
        customLlmProviders: state.customLlmProviders,
        llmApiKeys: state.llmApiKeys,
        llmModels: state.llmModels,
        translateProviderId: state.translateProviderId,
        translateApiKeys: state.translateApiKeys,
        chatScenario: state.chatScenario,
        chatLevel: state.chatLevel,
        targetLevel: state.targetLevel,
        dailyGoal: state.dailyGoal,
      }),
    }
  )
)

// 学习统计(不变)
interface Stats {
  todayCount: number
  totalLearned: number
  favoriteCount: number
  streak: number
  setStats: (s: Partial<Stats>) => void
}

export const useStats = create<Stats>((set: (partial: Partial<Stats> | ((s: Stats) => Partial<Stats>)) => void) => ({
  todayCount: 0,
  totalLearned: 0,
  favoriteCount: 0,
  streak: 0,
  setStats: (s: Partial<Stats>) => set((prev: Stats) => ({ ...prev, ...s })),
}))
