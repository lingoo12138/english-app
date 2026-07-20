// 主题色板 - 用 CSS 变量动态切换
// 6 个主题:绿(默认)/蓝/紫/红/橙/青

export interface Theme {
  id: string
  name: string
  // 6 个色阶:50-900 (Tailwind 标准)
  // 这里用 RGB 三元组,因为 Tailwind 配合 rgb(var(--xxx) / <alpha-value>)
  colors: {
    50: string
    100: string
    200: string
    300: string
    400: string
    500: string
    600: string   // 主色
    700: string
    800: string
    900: string
  }
}

export const THEMES: Theme[] = [
  {
    id: 'green',
    name: '清新绿',
    colors: {
      50: '240 253 244',
      100: '220 252 231',
      200: '187 247 208',
      300: '134 239 172',
      400: '74 222 128',
      500: '34 197 94',
      600: '22 163 74',
      700: '21 128 61',
      800: '22 101 52',
      900: '20 83 29',
    },
  },
  {
    id: 'blue',
    name: '海洋蓝',
    colors: {
      50: '239 246 255',
      100: '219 234 254',
      200: '191 219 254',
      300: '147 197 253',
      400: '96 165 250',
      500: '59 130 246',
      600: '37 99 235',
      700: '29 78 216',
      800: '30 64 175',
      900: '30 58 138',
    },
  },
  {
    id: 'purple',
    name: '神秘紫',
    colors: {
      50: '250 245 255',
      100: '243 232 255',
      200: '233 213 255',
      300: '216 180 254',
      400: '192 132 252',
      500: '168 85 247',
      600: '147 51 234',
      700: '126 34 206',
      800: '107 33 168',
      900: '88 28 135',
    },
  },
  {
    id: 'red',
    name: '热情红',
    colors: {
      50: '254 242 242',
      100: '254 226 226',
      200: '254 202 202',
      300: '252 165 165',
      400: '248 113 113',
      500: '239 68 68',
      600: '220 38 38',
      700: '185 28 28',
      800: '153 27 27',
      900: '127 29 29',
    },
  },
  {
    id: 'orange',
    name: '温暖橙',
    colors: {
      50: '255 247 237',
      100: '255 237 213',
      200: '254 215 170',
      300: '253 186 116',
      400: '251 146 60',
      500: '249 115 22',
      600: '234 88 12',
      700: '194 65 12',
      800: '154 52 18',
      900: '124 45 18',
    },
  },
  {
    id: 'cyan',
    name: '薄荷青',
    colors: {
      50: '236 254 255',
      100: '207 250 254',
      200: '165 243 252',
      300: '103 232 249',
      400: '34 211 238',
      500: '6 182 212',
      600: '8 145 178',
      700: '14 116 144',
      800: '21 94 117',
      900: '22 78 99',
    },
  },
]

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--brand-${key}`, value)
  })
  // 同步 PWA 状态栏颜色
  const meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null
  if (meta && theme.colors['600']) {
    const [r, g, b] = theme.colors['600'].split(' ').map(Number)
    meta.content = `rgb(${r}, ${g}, ${b})`
  }
}

export function getTheme(id: string): Theme {
  return THEMES.find(t => t.id === id) || THEMES[0]
}

// 字号档位
export const FONT_SIZES = [
  { id: 'sm', name: '小', base: '14px' },
  { id: 'md', name: '中', base: '16px' },
  { id: 'lg', name: '大', base: '18px' },
  { id: 'xl', name: '特大', base: '20px' },
] as const

export function applyFontSize(id: string) {
  const fs = FONT_SIZES.find(f => f.id === id)
  if (fs) {
    document.documentElement.style.setProperty('--base-font-size', fs.base)
  }
}
