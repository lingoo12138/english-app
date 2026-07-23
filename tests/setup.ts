// vitest setup
import 'fake-indexeddb/auto'

// Mock fetch for words.json (test 环境无 dev server)
const SAMPLE_WORDS = [
  { id: 'w-1', word: 'hello', translations: ['你好'], examples: [], tags: ['CET4'], level: 'cet4', difficulty: 1, frequency: 5, pos: ['n'] },
  { id: 'w-2', word: 'world', translations: ['世界'], examples: [], tags: ['CET4'], level: 'cet4', difficulty: 1, frequency: 5, pos: ['n'] },
  { id: 'w-3', word: 'test', translations: ['测试'], examples: [], tags: ['CET4'], level: 'cet4', difficulty: 1, frequency: 5, pos: ['n'] },
  { id: 'w-4', word: 'apple', translations: ['苹果'], examples: [], tags: ['CET4'], level: 'cet4', difficulty: 1, frequency: 5, pos: ['n'] },
  { id: 'w-5', word: 'book', translations: ['书'], examples: [], tags: ['CET4'], level: 'cet4', difficulty: 1, frequency: 5, pos: ['n'] },
  { id: 'w-6', word: 'cat', translations: ['猫'], examples: [], tags: ['CET4'], level: 'cet4', difficulty: 1, frequency: 5, pos: ['n'] },
  { id: 'w-7', word: 'dog', translations: ['狗'], examples: [], tags: ['CET4'], level: 'cet4', difficulty: 1, frequency: 5, pos: ['n'] },
  { id: 'w-8', word: 'elephant', translations: ['大象'], examples: [], tags: ['CET4'], level: 'cet4', difficulty: 1, frequency: 5, pos: ['n'] },
  { id: 'w-9', word: 'fish', translations: ['鱼'], examples: [], tags: ['CET4'], level: 'cet4', difficulty: 1, frequency: 5, pos: ['n'] },
  { id: 'w-10', word: 'garden', translations: ['花园'], examples: [], tags: ['CET4'], level: 'cet4', difficulty: 1, frequency: 5, pos: ['n'] },
]

global.fetch = ((url: string) => {
  if (url.includes('words.json') || url.includes('/data/words.json')) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(SAMPLE_WORDS),
    } as Response)
  }
  return Promise.reject(new Error('Not mocked: ' + url))
}) as typeof fetch
