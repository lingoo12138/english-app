// src/data/textbook-p3.ts - v1.88 W82-A 课文扩展 P3 (12 → 20+ 篇)
// 主题: 季节/天气/旅行详情/文化/职业/爱好/历史/自然
// 跨课复用目标 25+ 词, 词汇命中 100%
import type { Lesson } from './textbook'

export const LESSONS_P3: Lesson[] = [
  // === 13. 季节 ===
  {
    id: 'season-spring',
    title: '四季之美',
    emoji: '🌸',
    level: 'primary',
    summary: '春夏秋冬, 每个季节的独特与美。',
    body: `There are four seasons in a year. Spring is warm and full of flowers. I like to see the new green leaves on the trees. I often go for a walk in the park with my family.

Summer is hot and sunny. We go to the beach and swim in the cool water. I love to eat ice cream and play with my friend. The days are long, and we feel so happy.

Autumn is cool, and the leaves turn red and gold. My mother and I like to pick apples in the garden. Winter is cold, but the snow is white and beautiful. Every season is good in its own way.`,
    vocabulary: ['season', 'spring', 'summer', 'autumn', 'winter', 'warm', 'hot', 'cold', 'cool', 'happy', 'family', 'friend'],
    estimatedMinutes: 3,
  },

  // === 14. 天气 ===
  {
    id: 'weather-daily',
    title: '今天的天气',
    emoji: '⛅',
    level: 'primary',
    summary: '晴天、雨天、风雪, 小朋友学天气。',
    body: `Today is a nice day. The sun is bright, and the sky is blue. I can see white clouds high in the sky. My mother says it is good weather for a walk.

Yesterday was different. It was rainy and a little cold. I stayed home and read a good book. I drank hot tea and felt warm inside.

Tomorrow, the weather may change. It might be cloudy or windy. I will check the news and wear the right clothes. Weather changes every day, but every day is a new day.`,
    vocabulary: ['weather', 'sun', 'rain', 'cloud', 'wind', 'warm', 'cold', 'hot', 'day', 'new'],
    estimatedMinutes: 3,
  },

  // === 15. 旅行详情 ===
  {
    id: 'travel-mountain',
    title: '登山之旅',
    emoji: '⛰️',
    level: 'senior',
    summary: '登山、看日出、住小旅馆, 一家人的山间旅行。',
    body: `Last summer, my family and I went on a travel to the mountains. We left home very early and drove for three hours. The road was long, but the view was beautiful. We saw green trees, blue rivers, and tall mountains.

When we got to the small town, we found a small hotel. The room was clean, and the food was good. The next morning, we started to climb the mountain. It was hard work, but we helped each other.

After three hours, we reached the top. The sun was rising, and the sky was red and gold. I felt so happy to be with my family. We took many photos and will always remember this trip.`,
    vocabulary: ['travel', 'family', 'road', 'mountain', 'hotel', 'food', 'sun', 'happy', 'work', 'trip', 'help'],
    estimatedMinutes: 3,
  },

  // === 16. 文化 ===
  {
    id: 'culture-tea',
    title: '茶的文化',
    emoji: '🍵',
    level: 'cet4',
    summary: '茶的起源、种类、与朋友的茶叙。',
    body: `Tea is an important part of Chinese culture. People have been drinking tea for thousands of years. There are many kinds of tea: green tea, black tea, and flower tea. Each kind has its own taste and smell. My family loves tea.

My grandparents love tea. Every afternoon, they sit together and drink a cup of hot tea. They talk about the old days and the life they had. I like to sit with them and listen to their stories.

Sometimes, friends come to visit. My mother makes tea for them, and we sit around the table. We talk, laugh, and feel happy. For us, tea is not just a drink. It is a way to share love and time.`,
    vocabulary: ['culture', 'tea', 'green', 'black', 'old', 'life', 'time', 'friend', 'mother', 'family', 'happy'],
    estimatedMinutes: 3,
  },

  // === 17. 职业 ===
  {
    id: 'job-doctor',
    title: '我敬佩的人',
    emoji: '👩‍⚕️',
    level: 'junior',
    summary: '医生、教师、消防员, 介绍一种职业。',
    body: `There are many jobs in the world. My uncle is a doctor. He works at a big hospital and helps sick people every day. He is very kind and very busy. He often works late, but he likes his work.

My aunt is a teacher. She teaches young children to read and write. She is patient and makes learning fun. My friend wants to be a fire fighter when he grows up. He wants to help people in trouble.

Every job is important. Doctors help us stay healthy. Teachers help us learn. I think we should work hard at our job and help others. That is what makes life good.`,
    vocabulary: ['job', 'work', 'hospital', 'help', 'kind', 'teach', 'read', 'learn', 'friend', 'life', 'good'],
    estimatedMinutes: 3,
  },

  // === 18. 爱好 ===
  {
    id: 'hobby-music',
    title: '我的爱好',
    emoji: '🎸',
    level: 'junior',
    summary: '音乐、阅读、运动, 介绍自己的爱好。',
    body: `I have many hobbies. My favorite hobby is music. I learn to play the piano every day. I sit at the piano for one hour after school. I love to play happy songs and feel the music in my heart.

My second hobby is reading. I read a new book every week. I like to read about faraway places and interesting people. Books help me learn new things and think about life.

My friend likes to play sport. He plays football with his team every weekend. I sometimes watch him play. Each of us has our own hobby, and our hobbies make us happy.`,
    vocabulary: ['hobby', 'music', 'play', 'piano', 'school', 'happy', 'read', 'book', 'new', 'learn', 'life', 'friend', 'team', 'sport'],
    estimatedMinutes: 3,
  },

  // === 19. 历史 ===
  {
    id: 'history-great',
    title: '一位伟人',
    emoji: '🏛️',
    level: 'senior',
    summary: '讲一位历史人物的故事, 简单介绍生平。',
    body: `There was a great man in Chinese history. His name was Zhuge Liang. He lived a long time ago, but his story is still told today. He was very smart and worked very hard for his country.

As a young man, he read many books and learned about life. He did not want to be famous, but people came from far away to ask for his help. When the time was right, he went to work for a good leader.

He used his mind to help win wars and make life better for the people. He showed that hard work and good thinking can change the world. Even today, we still learn new things from his life and his work.`,
    vocabulary: ['history', 'old', 'story', 'smart', 'work', 'life', 'read', 'book', 'learn', 'people', 'good', 'help', 'new', 'time'],
    estimatedMinutes: 3,
  },

  // === 20. 自然 ===
  {
    id: 'nature-park',
    title: '自然之美',
    emoji: '🌲',
    level: 'junior',
    summary: '森林、河流、动物, 介绍自然风光的美丽。',
    body: `Nature is full of beautiful things. In the forest, I see tall trees, green leaves, and colorful flowers. I can hear birds singing in the morning. The air is fresh and clean.

By the river, the water moves slowly. Small fish swim in the cool water. Sometimes, I see a family of ducks swim together. They look so happy.

In the sky, white clouds move from west to east. The sun gives us warm light, and the moon comes out at night. Nature is all around us, and it makes our life rich and good. We should take care of it.`,
    vocabulary: ['nature', 'tree', 'green', 'water', 'fish', 'family', 'happy', 'sun', 'warm', 'life', 'good', 'care'],
    estimatedMinutes: 3,
  },
]
