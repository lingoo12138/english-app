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

// 修复: 加 fetch timeout 防止无限挂起
function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 8000): Promise<Response> {
  return Promise.race([
    fetch(url, options),
    new Promise<Response>((_, reject) =>
      setTimeout(() => reject(new Error('请求超时')), timeoutMs)
    ),
  ])
}

export async function translate(
  text: string,
  from: 'auto' | 'en' | 'zh' = 'auto',
  to: 'en' | 'zh' = 'zh'
): Promise<TranslateResult> {
  // 修复: 限制文本长度,防止滥用 API + 大文本超时
  if (text.length > 1000) {
    throw new Error('文本超过 1000 字符,请分段翻译')
  }

  // 尝试 LibreTranslate
  for (const endpoint of LIBRE_ENDPOINTS) {
    try {
      const res = await fetchWithTimeout(endpoint, {
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
      // 继续尝试下一个 endpoint
      continue
    }
  }

  // 降级到 MyMemory
  try {
    const langPair = `${from === 'auto' ? 'en' : from}|${to}`
    const res = await fetchWithTimeout(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`,
      {}
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
