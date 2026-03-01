import {
  User,
  DollarSign,
  Car,
  TreePine,
  House,
  Heart,
  Zap,
  Droplets,
  Globe,
  Flame,
  Baby,
  Briefcase,
  GraduationCap,
  Smartphone,
  ShieldCheck,
  Leaf,
  Star,
  CircleDot,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/** Maps icon name strings to Lucide React components (for static rendering) */
const ICON_MAP: Record<string, LucideIcon> = {
  human: User,
  person: User,
  dollar: DollarSign,
  money: DollarSign,
  car: Car,
  tree: TreePine,
  house: House,
  heart: Heart,
  energy: Zap,
  water: Droplets,
  globe: Globe,
  fire: Flame,
  baby: Baby,
  job: Briefcase,
  education: GraduationCap,
  phone: Smartphone,
  shield: ShieldCheck,
  leaf: Leaf,
  star: Star,
  default: CircleDot,
}

/**
 * SVG path data for each icon (for Remotion animated rendering).
 * Remotion renders raw SVG — we can't use Lucide React components.
 * Each entry is a single `d` attribute for a 24x24 viewBox.
 */
const SVG_PATHS: Record<string, string[]> = {
  human: [
    'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2',
    'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  ],
  dollar: [
    'M12 2v20',
    'M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  ],
  car: [
    'M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2',
    'M7 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
    'M17 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  ],
  tree: [
    'M17 14l3-3.3a1 1 0 0 0-.7-1.7H15l2-4.5a1 1 0 0 0-.9-1.5H8a1 1 0 0 0-.9 1.5L9 9H4.7a1 1 0 0 0-.7 1.7L7 14',
    'M12 14v8',
  ],
  house: [
    'M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8',
    'M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  ],
  heart: [
    'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z',
  ],
  energy: [
    'M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z',
  ],
  water: [
    'M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z',
  ],
  globe: [
    'M12 12m-10 0a10 10 0 1 0 20 0 10 10 0 1 0-20 0',
    'M2 12h20',
    'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
  ],
  fire: [
    'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z',
  ],
  baby: [
    'M9 12h.01',
    'M15 12h.01',
    'M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5',
    'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z',
  ],
  job: [
    'M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16',
    'M20 8H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2z',
  ],
  education: [
    'M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z',
    'M22 10v6',
    'M6 12.5V16a6 3 0 0 0 12 0v-3.5',
  ],
  phone: [
    'M12 18h.01',
    'M17 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z',
  ],
  shield: [
    'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z',
    'M9 12l2 2 4-4',
  ],
  leaf: [
    'M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.1 17 3.1s.1 5.5-2.3 10.3',
    'M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12',
  ],
  star: [
    'M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a.53.53 0 0 0 .4.29l5.16.752a.53.53 0 0 1 .294.904l-3.733 3.64a.53.53 0 0 0-.153.468l.882 5.14a.53.53 0 0 1-.771.56l-4.614-2.426a.53.53 0 0 0-.494 0L6.18 18.73a.53.53 0 0 1-.77-.56l.881-5.139a.53.53 0 0 0-.152-.468L2.404 8.92a.53.53 0 0 1 .294-.906l5.16-.751a.53.53 0 0 0 .399-.29z',
  ],
  default: [
    'M12 12m-10 0a10 10 0 1 0 20 0 10 10 0 1 0-20 0',
    'M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0',
  ],
}

export function getIconComponent(iconName: string): LucideIcon {
  return ICON_MAP[iconName.toLowerCase()] ?? ICON_MAP.default
}

export function getIconSVGPaths(iconName: string): string[] {
  return SVG_PATHS[iconName.toLowerCase()] ?? SVG_PATHS.default
}

/** All available icon names (for AI prompt reference) */
export const AVAILABLE_ICONS = Object.keys(ICON_MAP).filter((k) => k !== 'default' && k !== 'person' && k !== 'money')
