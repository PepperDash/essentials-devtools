import useTheme from '../hooks/useTheme';

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

const SunIcon = ({ className }: { className: string }) => (
  <svg className={className} {...iconProps}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
  </svg>
);

const MoonIcon = ({ className }: { className: string }) => (
  <svg className={className} {...iconProps}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
  </svg>
);

/**
 * Light/dark switch. On is dark mode (moon showing); off is light mode (sun showing). Both icons
 * sit in the track and the knob slides over whichever mode isn't active.
 */
const ThemeToggle = ({ className = '' }: { className?: string }) => {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === 'dark';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Dark theme" // Fixed name; aria-checked says whether it's on
      title={`Switch to ${dark ? 'light' : 'dark'} theme`}
      className={`theme-toggle${dark ? ' theme-toggle-on' : ''} ${className}`.trim()}
      onClick={toggleTheme}
    >
      <SunIcon className="theme-toggle-icon theme-toggle-sun" />
      <MoonIcon className="theme-toggle-icon theme-toggle-moon" />
      <span className="theme-toggle-knob" />
    </button>
  );
};

export default ThemeToggle;
