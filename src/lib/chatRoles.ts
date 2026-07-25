// chatRoles.ts - v1.13.0 B3 多角色对话
// AIChat 加角色选择, 5 角色 + "普通对话"
// 每个角色: emoji + name + scenario + systemPrompt + greetings + fallbackReplies
import type { CEFRLevel } from './aiChat'

/** 角色 id 联合类型 */
export type ChatRoleId =
  | 'interviewer'   // 面试官
  | 'barista'       // 咖啡师
  | 'receptionist'  // 酒店前台
  | 'tour_guide'    // 导游
  | 'waiter'        // 餐厅服务员

/** 角色结构 */
export interface ChatRole {
  id: ChatRoleId | 'none'
  name: string
  emoji: string
  description: string  // 1 句场景
  systemPrompt: string // LLM 系统 prompt
  scenario: string     // UI 展示的场景标签
  greetings: string[]  // 欢迎语 (≥3 条)
  fallbackReplies: string[]  // mock 回复 (≥5 条)
}

/** 普通对话 (无角色) */
export const NONE_ROLE: ChatRole = {
  id: 'none',
  name: '普通对话',
  emoji: '💬',
  description: '自由聊天, AI 陪练按需回应',
  systemPrompt: '',
  scenario: '自由话题',
  greetings: [],
  fallbackReplies: [],
}

/** 5 角色 */
export const CHAT_ROLES: ChatRole[] = [
  {
    id: 'interviewer',
    name: '面试官',
    emoji: '💼',
    description: '英文面试, 从自我介绍到工作经历',
    scenario: '求职面试',
    systemPrompt: `You are a professional interviewer at a tech company. Ask common interview questions one at a time. Be encouraging but professional. Start with introductions. Speak naturally like a real interviewer would, not like a textbook. Keep responses to 1-3 sentences.`,
    greetings: [
      "Hi! I'm Sarah, your interviewer today. Let's start — could you briefly introduce yourself?",
      "Welcome! I'm Mike from the engineering team. Tell me a bit about your background and what brought you here today.",
      "Hello! I'm Alex, the hiring manager. Thanks for coming in. So, can you start by walking me through your resume?",
      "Hi there! I'm Jamie. I'm excited to chat with you. To begin, could you tell me about yourself?",
      "Good morning! I'm David. Before we dive in, please give me a quick overview of who you are.",
    ],
    fallbackReplies: [
      "That's interesting. Can you tell me more about that experience?",
      "Great. And what was your specific role in that project?",
      "Why are you interested in this position?",
      "What do you consider your biggest strength?",
      "Where do you see yourself in five years?",
      "Tell me about a challenge you faced and how you handled it.",
      "Why should we hire you?",
      "What's your expected salary?",
      "Do you have any questions for me?",
      "Thank you for coming in today. We'll be in touch soon.",
    ],
  },
  {
    id: 'barista',
    name: '咖啡师',
    emoji: '☕',
    description: '咖啡店点单, 问 size/温度/口味',
    scenario: '咖啡店',
    systemPrompt: `You are a friendly barista at a busy coffee shop. Help customers order drinks, ask about size, milk preference, and extras. Keep it casual and warm. Speak naturally like a real barista would — quick, friendly, with small talk. Keep responses to 1-2 sentences.`,
    greetings: [
      "Hi! What can I get for you today?",
      "Welcome to Bean & Brew! What'll it be — the usual, or something new?",
      "Hey there! How can I help you?",
      "Good morning! What can I make for you?",
      "Hi! First time here? Let me know what you're in the mood for.",
    ],
    fallbackReplies: [
      "Got it. What size — small, medium, or large?",
      "Any milk preference? We have oat, almond, and whole milk.",
      "Hot or iced?",
      "Would you like that with whipped cream?",
      "Anything to eat with that? We have fresh pastries.",
      "That'll be $5.50. Cash or card?",
      "Anything else for you?",
      "Great choice! One more minute, please.",
      "Sorry, we're out of that. How about something similar?",
      "Here's your drink. Enjoy!",
    ],
  },
  {
    id: 'receptionist',
    name: '酒店前台',
    emoji: '🏨',
    description: 'check in/out, 问 ID/房型/早餐',
    scenario: '酒店入住',
    systemPrompt: `You are a hotel receptionist at a 4-star hotel. Help guests check in and out, ask for ID, room preference, and provide info about hotel amenities (gym, breakfast, pool, Wi-Fi). Be polite and professional. Keep responses to 1-2 sentences.`,
    greetings: [
      "Good evening! Welcome to Grand Hotel. Do you have a reservation?",
      "Hello! Checking in today? May I have your name, please?",
      "Welcome to Grand Hotel! How can I help you?",
      "Hi there! Are you checking in or checking out today?",
      "Good morning! Welcome to the front desk. How may I assist you?",
    ],
    fallbackReplies: [
      "May I see your ID and the credit card on file, please?",
      "Single or double bed preference?",
      "How many nights will you be staying?",
      "Your room is on the 5th floor. Here's your key card.",
      "Breakfast is served from 7 to 10 AM in the lobby restaurant.",
      "Wi-Fi password is on this card. The gym and pool are on the 2nd floor.",
      "Checkout time is 11 AM. Would you like a late checkout?",
      "I'll send someone up with extra towels right away.",
      "Here's your receipt. We hope you enjoyed your stay!",
      "Have a safe trip home. Thank you for staying with us!",
    ],
  },
  {
    id: 'tour_guide',
    name: '导游',
    emoji: '🗺️',
    description: '旅行问询, 推荐景点/美食/文化',
    scenario: '城市旅行',
    systemPrompt: `You are an enthusiastic tour guide in a new city. Recommend places, describe landmarks, give tips on local food and culture. Be vivid and helpful, like a real local guide who loves their city. Keep responses to 1-3 sentences.`,
    greetings: [
      "Welcome to Paris! I'm Lucas, your guide. Where would you like to start — landmarks, food, or hidden gems?",
      "Hi! Ready to explore the city? What's your interest — history, food, or art?",
      "Hello and welcome! I'm Maria, your local guide. What kind of experience are you looking for?",
      "Hey there! Welcome to the city. First time here? Let me know what excites you!",
      "Hi! I'm Tom, your guide today. Anywhere specific you'd like to visit, or want some recommendations?",
    ],
    fallbackReplies: [
      "Oh, you must try the croissants at the corner bakery — they bake them fresh every morning!",
      "The Louvre is amazing but crowded. How about the Musée d'Orsay instead?",
      "For sunset views, the best spot is the hill at Montmartre. Trust me!",
      "Local tip: avoid restaurants near main tourist squares. Walk two blocks away for better food and prices.",
      "The metro is the fastest way around. I can show you how to buy tickets if you'd like.",
      "Most museums are free on the first Sunday of the month!",
      "That area is safe to walk even at night. Very lively with street performers.",
      "If you only have one day, I'd recommend the Old Town + river cruise combo.",
      "The best time to visit that spot is early morning to avoid crowds.",
      "Don't forget to try the local wine! I can recommend a great vineyard tour.",
    ],
  },
  {
    id: 'waiter',
    name: '餐厅服务员',
    emoji: '🍽️',
    description: '餐厅点菜, 问忌口/烹饪方式',
    scenario: '餐厅用餐',
    systemPrompt: `You are a polite waiter at a mid-range restaurant. Greet guests, hand out menus, recommend specials, take orders, and check on food. Be attentive but not pushy. Speak like a real server — friendly, efficient, with a smile. Keep responses to 1-2 sentences.`,
    greetings: [
      "Good evening! Table for how many?",
      "Welcome! Here's the menu. Can I get you something to drink first?",
      "Hi! Just two tonight? Right this way.",
      "Good evening! Would you prefer a table by the window or in the main dining area?",
      "Welcome! My name is Chris, and I'll be your server tonight. Can I start you off with water or something else?",
    ],
    fallbackReplies: [
      "Today's special is grilled salmon with lemon butter sauce.",
      "How would you like your steak — rare, medium, or well-done?",
      "Any allergies I should know about?",
      "Would you like to start with an appetizer?",
      "The soup of the day is tomato basil.",
      "Can I get you another drink while you decide?",
      "How is everything tasting?",
      "Would you like to see the dessert menu?",
      "I'll box that up for you. Just a moment.",
      "Thank you! Have a wonderful evening.",
    ],
  },
]

/** 完整角色表 (含 none) */
export const ALL_ROLES: ChatRole[] = [NONE_ROLE, ...CHAT_ROLES]

/** 按 id 取角色 (默认 NONE_ROLE) */
export function getRoleById(id: string | undefined | null): ChatRole {
  if (!id) return NONE_ROLE
  return ALL_ROLES.find(r => r.id === id) || NONE_ROLE
}

/** 取角色欢迎语 (随机选一条, 角色未设返空) */
export function getGreetingForRole(role: ChatRole): string {
  if (role.id === 'none' || role.greetings.length === 0) return ''
  const idx = Math.floor(Math.random() * role.greetings.length)
  return role.greetings[idx]
}

/** 取角色 mock 回复 (随机选一条) */
export function getFallbackReply(role: ChatRole): string {
  if (role.id === 'none' || role.fallbackReplies.length === 0) return ''
  const idx = Math.floor(Math.random() * role.fallbackReplies.length)
  return role.fallbackReplies[idx]
}

/** 拼装角色系统 prompt (含难度自适应 level) */
export function getRoleSystemPrompt(role: ChatRole, level?: CEFRLevel): string {
  if (role.id === 'none') return ''
  let prompt = role.systemPrompt
  if (level) {
    const levelHints: Record<CEFRLevel, string> = {
      A1: '\n\nAdapt to A1 level: use very simple words and short sentences (≤5 words).',
      A2: '\n\nAdapt to A2 level: use basic everyday words and short sentences.',
      B1: '\n\nAdapt to B1 level: use everyday vocabulary with natural, medium-length sentences.',
      B2: '\n\nAdapt to B2 level: use richer vocabulary and more complex sentences naturally.',
      C1: '\n\nAdapt to C1 level: use advanced vocabulary and nuanced expressions.',
      C2: '\n\nAdapt to C2 level: use native-level vocabulary with idioms and cultural references.',
    }
    prompt += levelHints[level] || ''
  }
  return prompt
}
