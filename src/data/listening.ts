// W4-A: 听力模式 - 5 篇精选短文
// 5 个真实场景 + 80-120 词 + 难度渐进
// 适合 A2-B1 学习者
export interface ListeningLesson {
  id: string
  title: string
  scene: 'cafe' | 'airport' | 'hotel' | 'shopping' | 'work'
  level: 'A2' | 'B1' | 'B2'
  text: string  // 整篇 (80-120 词)
  blanks: Array<{
    index: number  // 第几个空 (从 1 开始)
    answer: string  // 正确单词
    hint?: string  // 提示 (首字母 + 长度)
  }>
  vocabulary: Array<{
    word: string
    meaning: string
  }>
  questions: Array<{
    q: string
    options: string[]
    answer: number  // 0-3
  }>
}

export const LISTENING_LESSONS: ListeningLesson[] = [
  {
    id: 'cafe-order-001',
    title: '咖啡店点单',
    scene: 'cafe',
    level: 'A2',
    text: `Good morning! I'd like a cappuccino, please. Make it large with oat milk. Could I also have a chocolate croissant? Do you have any gluten-free options? Yes, we have a banana bread today. I'll take that too. How much is the total? That will be twelve dollars. Would you like to pay by card or cash? Card, please. Thank you, and here's your receipt. Have a great day!`,
    blanks: [
      { index: 1, answer: 'cappuccino', hint: 'c________ (8)' },
      { index: 2, answer: 'oat', hint: 'o__ (3)' },
      { index: 3, answer: 'chocolate', hint: 'c________ (9)' },
      { index: 4, answer: 'gluten-free', hint: 'g_____-f___ (10)' },
      { index: 5, answer: 'twelve', hint: 't_____ (6)' },
    ],
    vocabulary: [
      { word: 'cappuccino', meaning: '卡布奇诺' },
      { word: 'oat milk', meaning: '燕麦奶' },
      { word: 'gluten-free', meaning: '无麸质的' },
      { word: 'receipt', meaning: '小票' },
    ],
    questions: [
      { q: 'What size does the customer want?', options: ['Small', 'Medium', 'Large', 'Extra large'], answer: 2 },
      { q: 'How much is the total?', options: ['$10', '$11', '$12', '$15'], answer: 2 },
    ],
  },
  {
    id: 'airport-checkin-002',
    title: '机场值机',
    scene: 'airport',
    level: 'B1',
    text: `Hello, I'd like to check in for flight BA289 to London. May I see your passport and booking confirmation, please? Here you are. Thank you. You have one checked bag and one carry-on. Please place your bag on the scale. It's twenty-three kilograms, within the limit. Would you prefer a window or aisle seat? Window seat, please. Here's your boarding pass. Your gate is B12 and boarding starts at 10:30. Have a pleasant flight!`,
    blanks: [
      { index: 1, answer: 'passport', hint: 'p_______ (8)' },
      { index: 2, answer: 'confirmation', hint: 'c____________ (12)' },
      { index: 3, answer: 'scale', hint: 's____ (5)' },
      { index: 4, answer: 'twenty-three', hint: 't_____-t_____ (12)' },
      { index: 5, answer: 'window', hint: 'w____ (6)' },
      { index: 6, answer: 'boarding', hint: 'b_______ (8)' },
    ],
    vocabulary: [
      { word: 'check in', meaning: '值机' },
      { word: 'carry-on', meaning: '随身行李' },
      { word: 'boarding pass', meaning: '登机牌' },
      { word: 'aisle', meaning: '过道' },
    ],
    questions: [
      { q: 'What is the flight number?', options: ['BA128', 'BA289', 'BA298', 'BA928'], answer: 1 },
      { q: 'What is the gate number?', options: ['B10', 'B11', 'B12', 'B13'], answer: 2 },
    ],
  },
  {
    id: 'hotel-checkin-003',
    title: '酒店入住',
    scene: 'hotel',
    level: 'B1',
    text: `Welcome to the Grand Hotel. Do you have a reservation? Yes, under the name Smith. I booked a double room for three nights. Let me check... Yes, we have your reservation. May I see your ID and a credit card for incidentals? Here you are. Your room is 502 on the fifth floor. The elevator is just down the hall. Breakfast is included from 7 to 10 AM in the restaurant. Here's your key card. Enjoy your stay!`,
    blanks: [
      { index: 1, answer: 'reservation', hint: 'r___________ (11)' },
      { index: 2, answer: 'double', hint: 'd_____ (6)' },
      { index: 3, answer: 'credit', hint: 'c____ (6)' },
      { index: 4, answer: 'elevator', hint: 'e_______ (8)' },
      { index: 5, answer: 'restaurant', hint: 'r________ (10)' },
    ],
    vocabulary: [
      { word: 'reservation', meaning: '预订' },
      { word: 'double room', meaning: '双人间' },
      { word: 'incidentals', meaning: '杂费' },
      { word: 'key card', meaning: '房卡' },
    ],
    questions: [
      { q: 'What type of room did the guest book?', options: ['Single', 'Double', 'Suite', 'Twin'], answer: 1 },
      { q: 'What floor is the room on?', options: ['3rd', '4th', '5th', '6th'], answer: 2 },
    ],
  },
  {
    id: 'shopping-return-004',
    title: '商店退换货',
    scene: 'shopping',
    level: 'B1',
    text: `Excuse me, I'd like to return this jacket. I bought it last week, but it's too small. Do you have the receipt? Yes, here it is. The tags are still on, so that's fine. Would you like a refund or an exchange? I'd like to exchange it for a larger size. No problem. Let me check if we have it in medium. Yes, we do. Would you like to try it on? The fitting rooms are over there. Take your time.`,
    blanks: [
      { index: 1, answer: 'return', hint: 'r_____ (6)' },
      { index: 2, answer: 'jacket', hint: 'j____ (6)' },
      { index: 3, answer: 'receipt', hint: 'r_____ (7)' },
      { index: 4, answer: 'refund', hint: 'r_____ (6)' },
      { index: 5, answer: 'larger', hint: 'l____ (6)' },
      { index: 6, answer: 'medium', hint: 'm_____ (6)' },
    ],
    vocabulary: [
      { word: 'return', meaning: '退货' },
      { word: 'exchange', meaning: '换货' },
      { word: 'refund', meaning: '退款' },
      { word: 'fitting room', meaning: '试衣间' },
    ],
    questions: [
      { q: 'Why does the customer want to return the jacket?', options: ['Wrong color', 'Too small', 'Too expensive', 'Defective'], answer: 1 },
      { q: 'What does the customer want instead?', options: ['Money back', 'Larger size', 'Different color', 'Store credit'], answer: 1 },
    ],
  },
  {
    id: 'work-meeting-005',
    title: '工作会议',
    scene: 'work',
    level: 'B2',
    text: `Good morning, everyone. Let's start with the quarterly report. The revenue increased by fifteen percent compared to last quarter. Our main growth came from the Asian market. However, operating costs also rose significantly. We need to focus on improving operational efficiency. Sarah, could you share the marketing update? Sure. We launched a new campaign last month, and the response has been very positive. We're planning to expand to two more countries next quarter. That's great news. Let's discuss the budget for the next phase.`,
    blanks: [
      { index: 1, answer: 'quarterly', hint: 'q_______ (9)' },
      { index: 2, answer: 'revenue', hint: 'r_____ (7)' },
      { index: 3, answer: 'fifteen', hint: 'f_____ (7)' },
      { index: 4, answer: 'operational', hint: 'o__________ (12)' },
      { index: 5, answer: 'campaign', hint: 'c_______ (8)' },
      { index: 6, answer: 'budget', hint: 'b____ (6)' },
    ],
    vocabulary: [
      { word: 'quarterly', meaning: '季度的' },
      { word: 'revenue', meaning: '收入' },
      { word: 'operational', meaning: '运营的' },
      { word: 'campaign', meaning: '活动' },
    ],
    questions: [
      { q: 'How much did revenue increase?', options: ['10%', '12%', '15%', '20%'], answer: 2 },
      { q: 'Where did the main growth come from?', options: ['Europe', 'America', 'Asia', 'Africa'], answer: 2 },
    ],
  },
]
