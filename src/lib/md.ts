// src/lib/md.ts - 极简 markdown 渲染 (零依赖, 100 行)
// 支持: 标题 / 粗体 / 斜体 / 行内 code / 链接 / 列表 / 代码块 / 表格 / 引用

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function inlineMd(s: string): string {
  // 先提取代码块保护
  const codes: string[] = []
  s = s.replace(/`([^`]+)`/g, (_, c) => {
    codes.push(c)
    return `\x00CODE${codes.length - 1}\x00`
  })
  // 转义
  s = escapeHtml(s)
  // 粗体
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  // 斜体
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  // 链接 [text](url)
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-brand-600 hover:underline">$1</a>')
  // 还原 code
  s = s.replace(/\x00CODE(\d+)\x00/g, (_, i) => `<code class="px-1 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-sm">${codes[+i]}</code>`)
  return s
}

export function renderMd(md: string): string {
  const lines = md.split('\n')
  const out: string[] = []
  let inCode = false
  let codeLang = ''
  let codeBuf: string[] = []
  let inList: 'ul' | 'ol' | null = null
  let inTable = false
  let tableBuf: string[] = []

  const closeList = () => {
    if (inList) {
      out.push(`</${inList}>`)
      inList = null
    }
  }
  const closeTable = () => {
    if (inTable) {
      out.push('</tbody></table>')
      inTable = false
      tableBuf = []
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // 代码块
    if (line.startsWith('```')) {
      if (inCode) {
        out.push(`<pre class="bg-stone-900 text-stone-100 p-4 rounded-lg overflow-x-auto my-3 text-sm"><code>${escapeHtml(codeBuf.join('\n'))}</code></pre>`)
        inCode = false
        codeBuf = []
      } else {
        closeList()
        closeTable()
        inCode = true
        codeLang = line.slice(3).trim()
      }
      continue
    }
    if (inCode) {
      codeBuf.push(line)
      continue
    }

    // 标题
    const h = line.match(/^(#{1,6})\s+(.+)$/)
    if (h) {
      closeList()
      closeTable()
      const level = h[1].length
      const cls = ['text-3xl font-bold mt-6 mb-3', 'text-2xl font-bold mt-5 mb-2', 'text-xl font-bold mt-4 mb-2', 'text-lg font-semibold mt-3 mb-2', 'text-base font-semibold mt-3 mb-1', 'text-sm font-semibold mt-2 mb-1']
      out.push(`<h${level} class="${cls[level - 1]}">${inlineMd(h[2])}</h${level}>`)
      continue
    }

    // 表格 (| col1 | col2 |)
    if (line.startsWith('|') && line.endsWith('|')) {
      if (!inTable) {
        closeList()
        inTable = true
        const cells = line.slice(1, -1).split('|').map(c => c.trim())
        out.push('<table class="w-full text-sm my-3 border-collapse"><thead><tr>')
        for (const c of cells) out.push(`<th class="border border-stone-300 dark:border-stone-700 px-2 py-1 text-left">${inlineMd(c)}</th>`)
        out.push('</tr></thead><tbody>')
        // 跳过分隔行
        if (i + 1 < lines.length && lines[i + 1].match(/^\|[\s\-:|]+\|$/)) i++
      } else {
        const cells = line.slice(1, -1).split('|').map(c => c.trim())
        out.push('<tr>')
        for (const c of cells) out.push(`<td class="border border-stone-300 dark:border-stone-700 px-2 py-1">${inlineMd(c)}</td>`)
        out.push('</tr>')
      }
      continue
    } else {
      closeTable()
    }

    // 列表
    const ul = line.match(/^[\s]*[-*]\s+(.+)$/)
    const ol = line.match(/^[\s]*\d+\.\s+(.+)$/)
    if (ul) {
      if (inList !== 'ul') { closeList(); out.push('<ul class="list-disc pl-6 my-2 space-y-1">'); inList = 'ul' }
      out.push(`<li>${inlineMd(ul[1])}</li>`)
      continue
    }
    if (ol) {
      if (inList !== 'ol') { closeList(); out.push('<ol class="list-decimal pl-6 my-2 space-y-1">'); inList = 'ol' }
      out.push(`<li>${inlineMd(ol[1])}</li>`)
      continue
    }

    // 空行
    if (line.trim() === '') {
      closeList()
      continue
    }

    // 引用
    if (line.startsWith('> ')) {
      closeList()
      out.push(`<blockquote class="border-l-4 border-stone-300 dark:border-stone-700 pl-3 my-2 text-stone-600 dark:text-stone-400">${inlineMd(line.slice(2))}</blockquote>`)
      continue
    }

    // 普通段落
    closeList()
    out.push(`<p class="my-2 leading-relaxed">${inlineMd(line)}</p>`)
  }
  closeList()
  closeTable()
  if (inCode) {
    out.push(`<pre class="bg-stone-900 text-stone-100 p-4 rounded-lg overflow-x-auto my-3 text-sm"><code>${escapeHtml(codeBuf.join('\n'))}</code></pre>`)
  }
  return out.join('\n')
}
