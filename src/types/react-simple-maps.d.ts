declare module 'react-simple-maps' {
  import type { ComponentType, CSSProperties, ReactNode } from 'react'

  interface ProjectionConfig {
    scale?: number
    center?: [number, number]
    rotate?: [number, number, number]
  }

  interface ComposableMapProps {
    projectionConfig?: ProjectionConfig
    projection?: string
    width?: number
    height?: number
    style?: CSSProperties
    children?: ReactNode
  }

  interface GeoItem {
    rsmKey: string
    id: string
    properties: Record<string, unknown>
    geometry: unknown
  }

  interface GeographiesChildProps {
    geographies: GeoItem[]
  }

  interface GeographiesProps {
    geography: string | Record<string, unknown>
    children: (props: GeographiesChildProps) => ReactNode
  }

  interface GeographyStyle {
    default?: CSSProperties
    hover?: CSSProperties
    pressed?: CSSProperties
  }

  interface GeographyProps {
    geography: GeoItem
    key?: string
    fill?: string
    stroke?: string
    strokeWidth?: number
    style?: GeographyStyle
    onMouseEnter?: () => void
    onMouseLeave?: () => void
    onClick?: () => void
  }

  export const ComposableMap: ComponentType<ComposableMapProps>
  export const Geographies: ComponentType<GeographiesProps>
  export const Geography: ComponentType<GeographyProps>
}
