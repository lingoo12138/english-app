// src/lib/llmFallback.ts - v1.12.0-B
// LLM 失败时友好降级:
// 1) 错误分类 (classifyError) - 把任意错误归为 6 类
// 2) 友好提示 (getFriendlyErrorMessage) - 把分类转中文 UI 文案
// 3) 主备双链路 (withFallback) - primary 失败自动调 fallback, 都失败抛分类错
//
// 设计原则:
// - 不破坏 v1.6 review 规范的 unknown + Error 守卫
// - 兼容 v1.8-B chatCompletionWithTimeout (错信息透传)
// - 错误信息保留原始 message (用于调试), UI 文案由 getFriendlyErrorMessage 包装

export type LLMErrorType =
  | 'network'    // fetch TypeError / 网络断开
  | 'rate_limit' // HTTP 429 / 限流
  | 'auth'       // HTTP 401/403 / API key 失效
  | 'invalid'    // HTTP 400 / 请求格式无效
  | 'timeout'    // 超时
  | 'unknown'    // 默认

/**
 * 分类 LLM 调用错误
 * - 'network': fetch 失败 (TypeError with "fetch" / "network" 关键字)
 * - 'rate_limit': HTTP 429 / "rate limit" / "too many requests"
 * - 'auth': HTTP 401/403 / "unauthorized" / "api key"
 * - 'invalid': HTTP 400 / "invalid request" / "bad request"
 * - 'timeout': "timeout" / "aborted" / "AbortError"
 * - 'unknown': 其他
 */
export function classifyError(e: unknown): LLMErrorType {
  const msg = getErrorMessage(e)
  const lower = msg.toLowerCase()

  // 1) timeout 优先 (因为超时 message 里可能含 "aborted" 也可能含 "fetch failed")
  if (lower.includes('timeout') || lower.includes('aborted') || lower.includes('abort') || msg.includes('超时')) {
    return 'timeout'
  }

  // 2) HTTP 状态码
  if (/\b429\b/.test(msg) || lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'rate_limit'
  }
  if (/\b401\b/.test(msg) || /\b403\b/.test(msg) || lower.includes('unauthorized') || lower.includes('api key') || lower.includes('forbidden')) {
    return 'auth'
  }
  if (/\b400\b/.test(msg) || lower.includes('invalid request') || lower.includes('bad request')) {
    return 'invalid'
  }

  // 3) 网络错误 (fetch TypeError, "Failed to fetch", "NetworkError")
  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('network request failed') || lower.includes('fetch failed')) {
    return 'network'
  }
  if (e instanceof TypeError && (lower.includes('fetch') || lower.includes('network'))) {
    return 'network'
  }

  return 'unknown'
}

/** 提取错误 message (unknown + Error 守卫) */
function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message || ''
  if (typeof e === 'string') return e
  if (e && typeof e === 'object' && 'message' in e) {
    const m = (e as { message: unknown }).message
    if (typeof m === 'string') return m
  }
  return String(e)
}

/**
 * 把分类转中文友好提示
 * @param type 错误类型
 * @param providerName LLM 渠道名 (如 "OpenRouter", "OpenAI")
 * @param message 原始错误 message (用于 invalid/unknown 兜底)
 */
export function getFriendlyErrorMessage(
  type: LLMErrorType,
  providerName: string,
  message: string = '',
): string {
  switch (type) {
    case 'network':
      return '🌐 网络异常, 请检查连接后重试'
    case 'rate_limit':
      return `⏰ ${providerName} 限流, 请稍后重试或换 Mock 渠道`
    case 'auth':
      return `🔑 API key 失效, 请在设置中检查 ${providerName} 配置`
    case 'invalid':
      return `⚠️ 请求格式无效: ${message || '参数有误'}`
    case 'timeout':
      return '⏱️ 请求超时, 请重试'
    case 'unknown':
    default:
      return `❌ 未知错误: ${message || '请稍后重试'}`
  }
}

/** 包装过后的友好错误 (含分类 + 友好 message + 原始 cause) */
export class LLMFallbackError extends Error {
  readonly type: LLMErrorType
  readonly providerName: string
  readonly cause?: unknown

  constructor(type: LLMErrorType, providerName: string, message: string, cause?: unknown) {
    super(message)
    this.name = 'LLMFallbackError'
    this.type = type
    this.providerName = providerName
    this.cause = cause
  }
}

/**
 * 主备双链路包装
 * - primary 成功 → 返结果 (不调 fallback)
 * - primary 失败 → 调 fallback, 成功返结果
 * - 都失败 → 抛 LLMFallbackError (含分类 + 友好 message)
 *
 * 用法:
 *   const data = await withFallback(
 *     () => chatCompletion(opts),
 *     () => chatCompletion({ ...opts, provider: MOCK_PROVIDER, apiKey: '' }),
 *     'OpenRouter',
 *   )
 */
export async function withFallback<T>(
  primaryFn: () => Promise<T>,
  fallbackFn: () => Promise<T>,
  providerName: string,
): Promise<T> {
  try {
    return await primaryFn()
  } catch (primaryErr: unknown) {
    // primary 失败 → 试 fallback
    try {
      return await fallbackFn()
    } catch (fallbackErr: unknown) {
      // 都失败 → 抛分类错 (优先报 primary 错信息, 因为它更可能是根因)
      const primaryMsg = getErrorMessage(primaryErr)
      const primaryType = classifyError(primaryErr)
      // 若 primary 是 timeout/auth/invalid/network 等明确类型, 用 primary 分类
      // 否则看 fallback 是否带更明确的类型 (例如 fallback 报 "API key 失效")
      const finalType = primaryType !== 'unknown' ? primaryType : classifyError(fallbackErr)
      const friendly = getFriendlyErrorMessage(finalType, providerName, primaryMsg)
      throw new LLMFallbackError(finalType, providerName, friendly, primaryErr)
    }
  }
}
