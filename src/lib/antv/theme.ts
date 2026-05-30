import type { Colors, ThemeNameValue } from '@/lib/dna/schema'

const THEME_COLORS: Record<ThemeNameValue, Colors> = {
  'glass-dark': {
    primary: '#11E68F',
    secondary: '#33C4FF',
    background: '#121326',
    text: '#F5F7FB',
    accent: '#6BE4FF',
  },
  'glass-light': {
    primary: '#1B6EF3',
    secondary: '#39B2FF',
    background: '#F6F8FC',
    text: '#172033',
    accent: '#52C8C2',
  },
  'neon-cyberpunk': {
    primary: '#00F7A6',
    secondary: '#FF3FD2',
    background: '#0C0A18',
    text: '#F9FBFF',
    accent: '#00E5FF',
  },
  minimalist: {
    primary: '#101828',
    secondary: '#667085',
    background: '#FFFFFF',
    text: '#101828',
    accent: '#16A34A',
  },
  editorial: {
    primary: '#8B2500',
    secondary: '#C65B2A',
    background: '#F7F1E8',
    text: '#2D1B0E',
    accent: '#D97706',
  },
  'warm-earth': {
    primary: '#B28A3C',
    secondary: '#6B8E23',
    background: '#17120C',
    text: '#E9DEC6',
    accent: '#D8A64B',
  },
  'ocean-depth': {
    primary: '#16C6B6',
    secondary: '#4B8BFF',
    background: '#09162A',
    text: '#E7F3FF',
    accent: '#6FE7FF',
  },
}

export function themeNameToColors(themeName: ThemeNameValue): Colors {
  return THEME_COLORS[themeName] ?? THEME_COLORS['glass-dark']
}
