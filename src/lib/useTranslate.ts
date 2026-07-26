// useTranslate.ts - v1.41.0 W41 翻译 hook
import { useState, useEffect, useCallback } from 'react'
import { t as translate, getLocale, setLocale, type Locale } from './i18n'

/** 翻译 hook (监听 locale-change 事件触发 rerender) */
export function useTranslate() {
  const [locale, setLocaleState] = useState<Locale>(getLocale())

  useEffect(() => {
    const handler = (e: Event) => {
      setLocaleState((e as CustomEvent<Locale>).detail)
    }
    window.addEventListener('locale-change', handler)
    return () => window.removeEventListener('locale-change', handler)
  }, [])

  const t = useCallback((key: string) => translate(key, locale), [locale])
  const changeLocale = useCallback((l: Locale) => {
    setLocale(l)
    setLocaleState(l)
  }, [])

  return { t, locale, setLocale: changeLocale }
}
