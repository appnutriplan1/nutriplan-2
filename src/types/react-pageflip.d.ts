// react-pageflip no incluye tipos propios. Declaración mínima para usarlo con TS.
declare module 'react-pageflip' {
  import type { ForwardRefExoticComponent, RefAttributes, ReactNode, CSSProperties } from 'react'

  export interface PageFlipApi {
    flipNext(): void
    flipPrev(): void
    flip(page: number): void
    getPageCount(): number
    getCurrentPageIndex(): number
  }

  export interface HTMLFlipBookRef {
    pageFlip: () => PageFlipApi
  }

  export interface HTMLFlipBookProps {
    width: number
    height: number
    size?: 'fixed' | 'stretch'
    minWidth?: number
    maxWidth?: number
    minHeight?: number
    maxHeight?: number
    drawShadow?: boolean
    flippingTime?: number
    usePortrait?: boolean
    startPage?: number
    showCover?: boolean
    mobileScrollSupport?: boolean
    clickEventForward?: boolean
    useMouseEvents?: boolean
    swipeDistance?: number
    showPageCorners?: boolean
    disableFlipByClick?: boolean
    maxShadowOpacity?: number
    className?: string
    style?: CSSProperties
    onFlip?: (e: { data: number }) => void
    children?: ReactNode
  }

  const HTMLFlipBook: ForwardRefExoticComponent<HTMLFlipBookProps & RefAttributes<HTMLFlipBookRef>>
  export default HTMLFlipBook
}
