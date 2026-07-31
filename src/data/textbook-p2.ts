// src/data/textbook-p2.ts - v1.87 W81-B 课文扩展 (5 → 10+ 篇)
// 主题: 校园/食物/健康/购物/交通/家庭/节日/运动/音乐/天气
// 跨课复用 8+ 词, 词汇全在 words.json
import type { Lesson } from './textbook'

export const LESSONS_P2: Lesson[] = [
  // === 6. 校园 ===
  {
    id: 'school-day',
    title: '在校园里的一天',
    emoji: '🏫',
    level: 'primary',
    summary: '上课、午餐、放学, 小学生的普通一天。',
    body: `My school is not far from my home. Every morning, I walk to school with my friend. We like to talk about life on the way. The school has a big playground and many trees.

In class, I learn new things. My teacher is very kind. She helps me read a book and write new words. I like my school because I learn and have fun at the same time.

At noon, we eat lunch in the school hall. The food is hot and good. In the afternoon, I play with my friends on the playground. We feel happy every day at school.`,
    vocabulary: ['school', 'friend', 'home', 'learn', 'teacher', 'read', 'book', 'play', 'food', 'happy'],
    estimatedMinutes: 3,
  },

  // === 7. 食物 ===
  {
    id: 'food-dinner',
    title: '今天的晚餐',
    emoji: '🍲',
    level: 'junior',
    summary: '在家做一顿简单的晚餐, 分享快乐。',
    body: `Today, I want to make dinner for my family. I go to the kitchen and look at the food in the fridge. I have some rice, meat, and vegetables. I also find a few eggs and some milk.

First, I wash the vegetables and cut the meat. Then I cook the rice in a big pot. While the rice cooks, I fry the meat with a little oil. The kitchen smells so good!

Finally, I put all the food on the table. My family comes home and we sit down to eat together. The food is simple, but we all feel happy. We love family time at home.`,
    vocabulary: ['food', 'family', 'home', 'cook', 'eat', 'rice', 'meat', 'table', 'time', 'happy'],
    estimatedMinutes: 3,
  },

  // === 8. 健康 ===
  {
    id: 'health-exercise',
    title: '保持健康',
    emoji: '💪',
    level: 'senior',
    summary: '运动、饮食、睡眠, 简单三招保健康。',
    body: `To stay healthy, I do three things every day. First, I exercise in the morning. I run in the park for thirty minutes. The fresh air helps me feel strong and full of energy.

Second, I eat good food. I try to have fruit, vegetables, and water every day. I do not eat too much meat or sugar. A good diet is very important for health.

Third, I sleep early. I go to bed at ten o'clock and get up at six. Sleep helps my body and mind feel new again. With these three habits, I feel good and ready to work each day.`,
    vocabulary: ['healthy', 'food', 'water', 'work', 'sleep', 'feel', 'good', 'day', 'new', 'energy'],
    estimatedMinutes: 3,
  },

  // === 9. 购物 ===
  {
    id: 'shopping-mall',
    title: '周末逛街',
    emoji: '🛍️',
    level: 'junior',
    summary: '逛商场、试衣服、买礼物, 一次开心的购物。',
    body: `Last Saturday, my friend and I went to the mall. The mall is very big, and it has many shops. We walked from one shop to another, looking at shoes, bags, and clothes.

My friend wanted to buy a new dress for her birthday. She tried on three dresses and felt happy with the second one. I bought a small gift for my mother. The price was not too high, so I paid with my card.

After shopping, we drank some tea in a cafe near the mall. We talked about our work and our life. It was a fun day, and we both feel happy.`,
    vocabulary: ['shop', 'friend', 'buy', 'new', 'happy', 'price', 'card', 'work', 'life', 'mall'],
    estimatedMinutes: 3,
  },

  // === 10. 交通 ===
  {
    id: 'transport-bus',
    title: '坐公共汽车',
    emoji: '🚌',
    level: 'primary',
    summary: '等车、坐车、看窗外, 小朋友第一次坐公交。',
    body: `Today, my mother and I took the bus to the park. We waited at the bus stop for a few minutes. The bus came, and we got on. I sat by the window and looked outside. I can see many things on the road.

The bus moved slowly through the city. I saw many shops, some cars, and tall buildings. I also saw people walking on the road. It was a new and fun way to travel for me.

After thirty minutes, we got off the bus. The park was right in front of us. I felt very happy because I had a good time with my mother. I want to take the bus again next week.`,
    vocabulary: ['bus', 'park', 'mother', 'time', 'see', 'shop', 'road', 'new', 'happy', 'week'],
    estimatedMinutes: 3,
  },

  // === 11. 家庭 ===
  {
    id: 'family-weekend',
    title: '和家人在一起',
    emoji: '👨‍👩‍👧',
    level: 'junior',
    summary: '周末陪家人做饭、看电影、散步, 简单又温暖。',
    body: `On the weekend, my whole family stays at home. In the morning, my mother cooks breakfast, and my father reads a book. I help my mother set the table. We eat together and feel happy.

In the afternoon, we watch a film on TV. The film is about a family who travels to a small village. We all laugh at the funny parts. My dog sits with us on the sofa.

In the evening, we go for a walk in the park near our home. The air is cool, and we see many people. We talk about our day and our life. I feel so happy to have such a good family.`,
    vocabulary: ['family', 'home', 'mother', 'father', 'read', 'book', 'happy', 'film', 'walk', 'park', 'life'],
    estimatedMinutes: 3,
  },

  // === 12. 节日 ===
  {
    id: 'holiday-spring',
    title: '春节到了',
    emoji: '🧧',
    level: 'senior',
    summary: '除夕、拜年、团圆饭, 春节的传统与温暖。',
    body: `Spring Festival is the most important holiday in China. On the last day of the year, my whole family comes home. My mother and father cook a lot of good food. My grandparents tell us old stories.

On the first day of the new year, we wake up early and put on new clothes. We say "Happy New Year" to our elders and give them small red bags. Children feel so excited to get the red bag with money inside.

At noon, we sit around a big round table. We eat fish, meat, vegetables, and dumplings. The food is delicious, and we all laugh and talk. We feel happy to be together as a family.`,
    vocabulary: ['family', 'home', 'food', 'new', 'happy', 'year', 'old', 'day', 'table', 'red'],
    estimatedMinutes: 3,
  },
]
