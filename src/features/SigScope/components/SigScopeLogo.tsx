
export default function SigScopeLogo({ className }: { className?: string }) {
  // Use VS Code theme variable so the logo adapts to light/dark automatically
  const wordmarkColor = 'var(--text)'

  return (
    <svg
      width="680"
      height="380"
      viewBox="0 0 680 380"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="SigScope"
    >
      <defs>
        <clipPath id="screenClip">
          <rect x="180" y="50" width="320" height="200" rx="8" />
        </clipPath>
      </defs>

      {/* Scope bezel / outer body */}
      <rect x="160" y="30" width="360" height="240" rx="18" fill="#1a1f2e" stroke="#0d1117" strokeWidth="2" />
      <rect x="170" y="40" width="340" height="220" rx="12" fill="#0d1117" />
      <rect x="180" y="50" width="320" height="200" rx="8" fill="#0a1a0a" />

      {/* Graticule grid */}
      <g clipPath="url(#screenClip)" stroke="#1f4a2a" strokeWidth="0.5" fill="none">
        <line x1="220" y1="50" x2="220" y2="250" />
        <line x1="260" y1="50" x2="260" y2="250" />
        <line x1="300" y1="50" x2="300" y2="250" />
        <line x1="340" y1="50" x2="340" y2="250" />
        <line x1="380" y1="50" x2="380" y2="250" />
        <line x1="420" y1="50" x2="420" y2="250" />
        <line x1="460" y1="50" x2="460" y2="250" />
        <line x1="180" y1="80" x2="500" y2="80" />
        <line x1="180" y1="110" x2="500" y2="110" />
        <line x1="180" y1="140" x2="500" y2="140" />
        <line x1="180" y1="170" x2="500" y2="170" />
        <line x1="180" y1="200" x2="500" y2="200" />
        <line x1="180" y1="230" x2="500" y2="230" />
      </g>

      {/* Center crosshairs */}
      <g clipPath="url(#screenClip)" stroke="#2d6b3d" strokeWidth="0.8" fill="none">
        <line x1="340" y1="50" x2="340" y2="250" />
        <line x1="180" y1="150" x2="500" y2="150" />
      </g>

      {/* Tick marks */}
      <g clipPath="url(#screenClip)" stroke="#2d6b3d" strokeWidth="0.8">
        <line x1="338" y1="80" x2="342" y2="80" />
        <line x1="338" y1="110" x2="342" y2="110" />
        <line x1="338" y1="140" x2="342" y2="140" />
        <line x1="338" y1="170" x2="342" y2="170" />
        <line x1="338" y1="200" x2="342" y2="200" />
        <line x1="338" y1="230" x2="342" y2="230" />
        <line x1="220" y1="148" x2="220" y2="152" />
        <line x1="260" y1="148" x2="260" y2="152" />
        <line x1="300" y1="148" x2="300" y2="152" />
        <line x1="380" y1="148" x2="380" y2="152" />
        <line x1="420" y1="148" x2="420" y2="152" />
        <line x1="460" y1="148" x2="460" y2="152" />
      </g>

      {/* Square wave glow */}
      <polyline
        points="180,180 220,180 220,110 300,110 300,180 380,180 380,110 460,110 460,180 500,180"
        fill="none" stroke="#39ff7a" strokeWidth="6"
        strokeLinecap="round" strokeLinejoin="round" opacity="0.25"
      />
      {/* Square wave main */}
      <polyline
        points="180,180 220,180 220,110 300,110 300,180 380,180 380,110 460,110 460,180 500,180"
        fill="none" stroke="#39ff7a" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round"
      />

      {/* Screen reflection */}
      <rect x="180" y="50" width="320" height="40" rx="8" fill="#39ff7a" opacity="0.03" />

      {/* Wordmark: "SIG" reacts to theme, "SCOPE" stays green */}
      <text
        x="343" y="328"
        textAnchor="middle"
        fontFamily="'Futura', 'Futura PT', 'Century Gothic', 'Avenir Next', sans-serif"
        fontSize="42" fontWeight="500" letterSpacing="6"
      >
        <tspan fill={wordmarkColor}>SIG</tspan>
        <tspan fill="#3a9a55">SCOPE</tspan>
      </text>
    </svg>
  )
}
