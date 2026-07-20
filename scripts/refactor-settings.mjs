// 脚本: refactor Settings.tsx 加自定义 LLM/TTS 渠道
import { readFileSync, writeFileSync } from 'fs'

const file = 'src/pages/Settings.tsx'
let c = readFileSync(file, 'utf-8')

// 1. import
c = c.replace(
  "import { BUILTIN_LLM_PROVIDERS } from './lib/providers/llm'",
  "import { BUILTIN_LLM_PROVIDERS, createCustomLLMProvider } from './lib/providers/llm'\nimport { createCustomTTSProvider } from './lib/tts'"
)

// 2. state
c = c.replace(
  "const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])",
  "const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])\n  const [showAddLlm, setShowAddLlm] = useState(false)\n  const [showAddTts, setShowAddTts] = useState(false)"
)

// 3. customLlm hooks
c = c.replace(
  "  const llmModels = useStore(s => s.llmModels)\n  const setLlmModel = useStore(s => s.setLlmModel)",
  "  const llmModels = useStore(s => s.llmModels)\n  const setLlmModel = useStore(s => s.setLlmModel)\n  const customLlmProviders = useStore(s => s.customLlmProviders)\n  const addCustomLlmProvider = useStore(s => s.addCustomLlmProvider)\n  const removeCustomLlmProvider = useStore(s => s.removeCustomLlmProvider)"
)

// 4. customTts hooks
c = c.replace(
  "  const ttsProviders = useStore(s => s.ttsProviders)",
  "  const ttsProviders = useStore(s => s.ttsProviders)\n  const customTtsProviders = useStore(s => s.customTtsProviders)\n  const addCustomTtsProvider = useStore(s => s.addCustomTtsProvider)\n  const removeCustomTtsProvider = useStore(s => s.removeCustomTtsProvider)\n  const ttsApiKeys = useStore(s => s.ttsApiKeys)\n  const setTtsApiKey = useStore(s => s.setTtsApiKey)"
)

// 5. allLlmProviders 合并
c = c.replace(
  "  const currentLlm = llmProviders.find(p => p.id === llmProviderId)",
  "  const allLlmProviders = [...llmProviders, ...customLlmProviders]\n  const allTtsProviders = [...ttsProviders, ...customTtsProviders]\n  const currentLlm = allLlmProviders.find(p => p.id === llmProviderId)"
)

// 6. TTS select 改 allTtsProviders
c = c.replace(
  "            {ttsProviders.map(p => (\n              <option key={p.id} value={p.id}>{p.name}</option>\n            ))}",
  "            {allTtsProviders.map(p => (\n              <option key={p.id} value={p.id}>{p.name}</option>\n            ))}"
)

// 7. LLM select 改 allLlmProviders
c = c.replace(
  "            {llmProviders.map(p => (\n              <option key={p.id} value={p.id}>\n                {p.name}{p.supportsVision ? ' 👁' : ''}{p.free ? ' ✓免费' : ''}\n              </option>\n            ))}",
  "            {allLlmProviders.map(p => (\n              <option key={p.id} value={p.id}>\n                {p.name}{p.supportsVision ? ' 👁' : ''}{p.free ? ' ✓免费' : ''}{!p.builtin ? ' 🛠' : ''}\n              </option>\n            ))}"
)

writeFileSync(file, c)
console.log('OK')
