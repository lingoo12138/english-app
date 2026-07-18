// 翻译: 优先用 LibreTranslate 公共 API,失败时降级到 MyMemory
// 全部免费、无需 API key

interface TranslateResult {
  translatedText: string
  source: string
  detectedLang?: string
}

const LIBRE_ENDPOINTS = [
  'https://translate.terraprint.co/translate',
  'https://libretranslate.de/translate',
  'https://lt.vern.cc/translate',
]

export async function translate(
  text: string,
  from: 'auto' | 'en' | 'zh' = 'auto',
  to: 'en' | 'zh' = 'zh'
): Promise<TranslateResult> {
  // 尝试 LibreTranslate
  for (const endpoint of LIBRE_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          source: from,
          target: to,
          format: 'text',
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.translatedText) {
          return {
            translatedText: data.translatedText,
            source: 'libre',
            detectedLang: data.detectedLanguage?.language,
          }
        }
      }
    } catch (e) {
      // 继续尝试下一个
      continue
    }
  }

  // 降级到 MyMemory
  try {
    const langPair = `${from === 'auto' ? 'en' : from}|${to}`
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`
    )
    if (res.ok) {
      const data = await res.json()
      if (data.responseStatus === 200 && data.responseData?.translatedText) {
        return {
          translatedText: data.responseData.translatedText,
          source: 'mymemory',
        }
      }
    }
  } catch (e) {
    // 继续
  }

  throw new Error('所有翻译源都失败了,请检查网络')
}
