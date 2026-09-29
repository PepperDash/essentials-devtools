import React from 'react'

interface IconProps {
  size?: number
  className?: string
}

export function RisingEdgeIcon({ size = 18, className }: IconProps) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Rising edge"
    >
      <line x1="96" y1="416" x2="416" y2="416" stroke="currentColor" strokeWidth="6" opacity="0.35"/>
      <polyline
        points="96,352 240,352 240,160 416,160"
        fill="none"
        stroke="var(--green)"
        strokeWidth="28"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  )
}

export function FallingEdgeIcon({ size = 18, className }: IconProps) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Falling edge"
    >
      <line x1="96" y1="416" x2="416" y2="416" stroke="currentColor" strokeWidth="6" opacity="0.35"/>
      <polyline
        points="96,160 240,160 240,352 416,352"
        fill="none"
        stroke="var(--red)"
        strokeWidth="28"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  )
}

export function EyeIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1.8 12S5.4 5.4 12 5.4 22.2 12 22.2 12 18.6 18.6 12 18.6 1.8 12 1.8 12Z" />
      <circle cx="12" cy="12" r="3.1" />
    </svg>
  )
}

export function EyeOffIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9.9 5.7A9.6 9.6 0 0 1 12 5.4c6.6 0 10.2 6.6 10.2 6.6a17.7 17.7 0 0 1-3.1 4.1" />
      <path d="M6.3 7.4A17.4 17.4 0 0 0 1.8 12S5.4 18.6 12 18.6a9.9 9.9 0 0 0 4-.8" />
      <path d="M9.9 9.9a3.1 3.1 0 0 0 4.3 4.3" />
      <line x1="3.4" y1="3.4" x2="20.6" y2="20.6" />
    </svg>
  )
}
