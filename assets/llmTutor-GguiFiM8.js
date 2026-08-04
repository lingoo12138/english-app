import{y as m,x as p}from"./index-CgEUxbm0.js";const u=`你是一位耐心的英语老师。用户给出一个英语错误, 请解释:
1. rule: 为什么错 (语法规则,1-2 句)
2. examples: 2-3 个正确例句 (英文 + 简短中文翻译)
3. mnemonic: 一句话记忆口诀

严格用 JSON 格式输出, 不要 markdown 代码块:
{"rule": "...", "examples": "...", "mnemonic": "..."}

examples 字段可换行分隔多个例句, 总长 ≤ 300 字。`;function h(n,e,a){return`${n}::${e.trim().toLowerCase()}::${a.trim().toLowerCase()}`.slice(0,200)}function g(n){let e=n.trim();e.startsWith("```")&&(e=e.replace(/^```(?:json)?\s*/i,"").replace(/```\s*$/,""));const a=e.indexOf("{"),s=e.lastIndexOf("}");a>=0&&s>a&&(e=e.slice(a,s+1));try{const t=JSON.parse(e);return{rule:String(t.rule||"暂无规则说明"),examples:String(t.examples||"暂无例句"),mnemonic:String(t.mnemonic||"暂无口诀")}}catch{return{rule:e.slice(0,200)||"解析失败",examples:"",mnemonic:""}}}function x(n,e,a){const s={grammar:{rule:"英语语法结构: 主谓宾/时态/语态等需严格匹配",examples:"I go to school. / She went home. / They are playing.",mnemonic:"主谓一致, 时态呼应"},vocab:{rule:"用词不当: 选词需符合语境",examples:"happy (开心) / glad (高兴) / joyful (喜悦)",mnemonic:"语境定词, 不混用"},spelling:{rule:"拼写错误: 注意字母顺序和双写",examples:"receive (收到) / believe (相信) / achieve (实现)",mnemonic:"i before e, except after c"},style:{rule:"表达风格: 书面/口语需分清",examples:"I would like... (正式) / I want... (口语)",mnemonic:"看场合用词"},tense:{rule:"时态错误: 动作发生时间决定时态",examples:"I played (过去) / I play (现在) / I will play (将来)",mnemonic:"看时间选时态"},preposition:{rule:"介词搭配: 固定搭配需记忆",examples:"in the morning / on Monday / at night",mnemonic:"时间介词: in 月季, on 星期, at 时刻"},article:{rule:"冠词: a/an 看音标, the 表特指",examples:"a book (一本书) / an apple (一个苹果) / the book (那本书)",mnemonic:"a/an 元音开头, the 特指用"},other:{rule:"其他错误类型, 请参考上下文",examples:"请结合具体场景理解",mnemonic:"多读多练"}};return{...s[n]||s.other,cached:!0}}async function I(n,e,a,s,t,o){const r=h(s,t,o);if(n.id==="mock"||!e)return x(s);const i=`错误类型: ${s}
原文: ${t}
建议改为: ${o}

请用 JSON 格式解释这个错误。`,c=await m({provider:n,apiKey:e,model:a,messages:[{role:"system",content:u},{role:"user",content:i}],temperature:.3,maxTokens:500}),l=g(c.content);return await p(r,async()=>l).catch(console.error),l}const f=`你是一位耐心的英语老师。用户给出一个英文单词 (及中文释义), 请推荐 3-5 个最常用的短语 (idiom/collocation/固定搭配)。

严格用 JSON 格式输出, 不要 markdown 代码块:
{
  "phrases": [
    {"phrase": "make a decision", "meaning": "做决定", "example": "I need to make a decision."},
    {"phrase": "decision maker", "meaning": "决策者", "example": "She's the decision maker."}
  ],
  "tip": "一句话记住: decision 是名词, 动词 decide"
}

短语 3-5 个, 总长 ≤ 400 字。`;function k(n){let e=n.trim();e.startsWith("```")&&(e=e.replace(/^```(?:json)?\s*/i,"").replace(/```\s*$/,""));const a=e.indexOf("{"),s=e.lastIndexOf("}");a>=0&&s>a&&(e=e.slice(a,s+1));try{const t=JSON.parse(e);return{phrases:Array.isArray(t.phrases)?t.phrases.map(r=>{const i=r&&typeof r=="object"?r:{};return{phrase:String(i.phrase||""),meaning:String(i.meaning||""),example:String(i.example||"")}}).filter(r=>r.phrase):[],tip:String(t.tip||"暂无小贴士")}}catch{return{phrases:[],tip:e.slice(0,200)||"解析失败"}}}function $(n){return{phrases:[{phrase:`make a ${n}`,meaning:"做...",example:`I need to make a ${n} quickly.`},{phrase:`take a ${n}`,meaning:"采取...",example:`Let's take a ${n} on this.`},{phrase:`${n} maker`,meaning:"...者",example:`She's a professional ${n} maker.`},{phrase:`have a ${n}`,meaning:"有...",example:`I have a ${n} tomorrow.`}],tip:`提示: ${n} 是常用词, 注意搭配 make/take/have a ${n} 等`}}async function b(n,e,a,s,t){if(n.id==="mock"||!e)return{...$(s),cached:!0};const o=`单词: ${s}
中文释义: ${t}

请用 JSON 格式推荐 3-5 个常用短语。`,r=await m({provider:n,apiKey:e,model:a,messages:[{role:"system",content:f},{role:"user",content:o}],temperature:.3,maxTokens:600});return k(r.content)}const S=`你是一位耐心的英语老师。用户给出一个英文单词和词性 (POS), 请用中文详细讲解这个单词的语法。

严格用 JSON 格式输出, 不要 markdown 代码块:
{
  "definition": "名词: 表示...的东西",
  "usage": "作主语/宾语使用, 可数/不可数, 后面常接...",
  "examples": [
    {"en": "I need a decision.", "zh": "我需要一个决定。"},
    {"en": "Make a quick decision.", "zh": "快速做出决定。"},
    {"en": "It's your decision.", "zh": "这是你的决定。"}
  ],
  "commonMistakes": [
    {"wrong": "make decision", "right": "make a decision", "why": "decision 是可数名词, 需要冠词 a"},
    {"wrong": "do a decision", "right": "make a decision", "why": "固定搭配 make a decision, 不用 do"}
  ]
}

definition + usage ≤ 200 字。examples 3 个, 每个 en ≤ 20 词。commonMistakes 2-3 个。`;function y(n,e){return`grammar::${n.trim().toLowerCase()}::${e.trim().toLowerCase()}`.slice(0,200)}function d(n){let e=n.trim();e.startsWith("```")&&(e=e.replace(/^```(?:json)?\s*/i,"").replace(/```\s*$/,""));const a=e.indexOf("{"),s=e.lastIndexOf("}");a>=0&&s>a&&(e=e.slice(a,s+1));try{const t=JSON.parse(e),o=Array.isArray(t.examples)?t.examples.map(i=>{const c=i&&typeof i=="object"?i:{};return{en:String(c.en||""),zh:String(c.zh||"")}}).filter(i=>i.en):[],r=Array.isArray(t.commonMistakes)?t.commonMistakes.map(i=>{const c=i&&typeof i=="object"?i:{};return{wrong:String(c.wrong||""),right:String(c.right||""),why:String(c.why||"")}}).filter(i=>i.wrong||i.right):[];return{definition:String(t.definition||"暂无定义"),usage:String(t.usage||"暂无用法说明"),examples:o,commonMistakes:r}}catch{return{definition:"解析失败",usage:e.slice(0,200),examples:[],commonMistakes:[]}}}const M={noun:"名词",verb:"动词",adj:"形容词",adv:"副词",prep:"介词",conj:"连词",article:"冠词",pronoun:"代词"};function O(n,e){const a=M[e.toLowerCase()]||e;return{definition:`${a}: ${n} 是常见英语${a}, 需根据语境理解。`,usage:`在句中作${a}使用, 注意上下文与搭配。`,examples:[{en:`I need ${n}.`,zh:`我需要 ${n}。`},{en:`This ${n} is important.`,zh:`这个 ${n} 很重要。`},{en:`She uses ${n} often.`,zh:`她经常使用 ${n}。`}],commonMistakes:[{wrong:`错用 ${n}`,right:`正确使用 ${n}`,why:`注意 ${a} 常见搭配和语法规则`}],cached:!0}}async function N(n,e,a,s,t,o){if(y(s,t),n.id==="mock"||!e)return O(s,t);const r=`单词: ${s}
词性: ${t}
中文释义: ${o}

请用 JSON 格式讲解这个单词的语法。`,i=await m({provider:n,apiKey:e,model:a,messages:[{role:"system",content:S},{role:"user",content:r}],temperature:.3,maxTokens:800});return d(i.content)}export{N as a,I as b,b as e};
