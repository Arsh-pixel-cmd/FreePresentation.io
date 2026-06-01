export type SlideLayout =
  | 'title'
  | 'content'
  | 'two-col'
  | 'image-full'
  | 'quote'
  | 'stats'
  | 'image-right'
  | 'image-left'

export type ThemeId =
  | 'obsidian'
  | 'arctic'
  | 'aurora'
  | 'ember'
  | 'sage'
  | 'slate'

export interface SlideTheme {
  id: ThemeId
  name: string
  bg: string
  surface: string
  text: string
  accent: string
  muted: string
  border: string
}

export interface Slide {
  id: string
  layout: SlideLayout
  title: string
  body: string[]
  image?: string
  imageAlt?: string
  imageQuery?: string
  speakerNotes?: string
  stats?: { label: string; value: string }[]
  quote?: string
  quoteAuthor?: string
}

export interface Presentation {
  id: string
  title: string
  topic: string
  slides: Slide[]
  themeId: ThemeId
  createdAt: string
  updatedAt: string
}

export type InputMode = 'prompt' | 'upload' | 'paste'

export interface GenerateRequest {
  mode: InputMode
  prompt?: string
  text?: string
  themeId: ThemeId
  slideCount?: number
}

export interface GenerateResponse {
  presentation: Presentation
  error?: string
}
