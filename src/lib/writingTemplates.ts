// writingTemplates.ts - v1.30.0 W30 写作模板
// 4 模板: 邮件 / 自我介绍 / 道歉 / 感谢
// 每个模板: 字段 + 拼装 prompt

export interface WritingTemplate {
  id: string
  name: string
  emoji: string
  description: string
  fields: Array<{
    key: string
    label: string
    placeholder: string
    required: boolean
  }>
  /** 拼装 prompt (用户填字段后, 此函数拼成完整 prompt 喂给 LLM) */
  buildPrompt: (values: Record<string, string>) => string
}

export const WRITING_TEMPLATES: WritingTemplate[] = [
  {
    id: 'email',
    name: '英文邮件',
    emoji: '📧',
    description: '求职/商务/朋友邮件',
    fields: [
      { key: 'to', label: '收件人', placeholder: 'e.g. John (HR Manager)', required: true },
      { key: 'subject', label: '主题', placeholder: 'e.g. Application for Software Engineer Position', required: true },
      { key: 'context', label: '邮件目的', placeholder: 'e.g. 求职, 申请, 询问, 感谢', required: true },
      { key: 'details', label: '关键信息', placeholder: 'e.g. 我有 3 年 React 经验, 想面试贵公司', required: false },
    ],
    buildPrompt: (v) =>
      `请帮我写一封专业的英文邮件.\n收件人: ${v.to}\n主题: ${v.subject}\n目的: ${v.context}\n${v.details ? `关键信息: ${v.details}\n` : ''}\n请写一封正式、简洁的英文邮件.`,
  },
  {
    id: 'self_intro',
    name: '自我介绍',
    emoji: '👋',
    description: '面试/社交自我介绍',
    fields: [
      { key: 'name', label: '姓名', placeholder: 'e.g. 张伟', required: true },
      { key: 'role', label: '身份/职业', placeholder: 'e.g. 软件工程师', required: true },
      { key: 'experience', label: '经验/亮点', placeholder: 'e.g. 5 年 React 经验, 喜欢开源贡献', required: false },
      { key: 'occasion', label: '场合', placeholder: 'e.g. 工作面试, 社交聚会, 留学申请', required: true },
    ],
    buildPrompt: (v) =>
      `请帮我写一段 30-60 秒的英文自我介绍.\n姓名: ${v.name}\n身份: ${v.role}\n${v.experience ? `亮点: ${v.experience}\n` : ''}场合: ${v.occasion}\n要求: 自然流畅, 适合口头表达, 不超过 150 词.`,
  },
  {
    id: 'apology',
    name: '道歉',
    emoji: '🙏',
    description: '正式/非正式道歉',
    fields: [
      { key: 'to', label: '道歉对象', placeholder: 'e.g. 同事 Tom', required: true },
      { key: 'reason', label: '原因', placeholder: 'e.g. 错过了会议, 拖延了报告', required: true },
      { key: 'fix', label: '补救方案', placeholder: 'e.g. 我会今天完成, 并提前通知下次', required: false },
    ],
    buildPrompt: (v) =>
      `请帮我写一段真诚的英文道歉.\n对象: ${v.to}\n原因: ${v.reason}\n${v.fix ? `补救: ${v.fix}\n` : ''}要求: 真诚、不找借口、有承担.`,
  },
  {
    id: 'thanks',
    name: '感谢',
    emoji: '💐',
    description: '感谢信/感谢卡',
    fields: [
      { key: 'to', label: '感谢对象', placeholder: 'e.g. 导师王教授', required: true },
      { key: 'reason', label: '感谢原因', placeholder: 'e.g. 指导论文, 帮我内推', required: true },
      { key: 'detail', label: '具体细节', placeholder: 'e.g. 您的反馈让我的研究有了方向', required: false },
    ],
    buildPrompt: (v) =>
      `请帮我写一段真诚的英文感谢.\n对象: ${v.to}\n原因: ${v.reason}\n${v.detail ? `细节: ${v.detail}\n` : ''}要求: 温暖具体, 表达真实感激.`,
  },
]

/** 拼装 prompt (外部用) */
export function buildTemplatePrompt(templateId: string, values: Record<string, string>): string {
  const t = WRITING_TEMPLATES.find(t => t.id === templateId)
  if (!t) return ''
  // 校验必填字段
  for (const f of t.fields) {
    if (f.required && !values[f.key]?.trim()) {
      throw new Error(`请填写: ${f.label}`)
    }
  }
  return t.buildPrompt(values)
}
