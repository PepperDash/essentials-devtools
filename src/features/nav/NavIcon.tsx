export type NavIconName =
  | 'versions'
  | 'apiPaths'
  | 'exceptions'
  | 'plugins'
  | 'console'
  | 'config'
  | 'devices'
  | 'types'
  | 'routing'
  | 'mobileControl'
  | 'secrets';

// Thin outlined icons, drawn on a 24px grid
const PATHS: Record<NavIconName, React.ReactNode> = {
  versions: (
    <>
      <path d="M12 2 3 7l9 5 9-5-9-5z" />
      <path d="m3 12 9 5 9-5" />
      <path d="m3 17 9 5 9-5" />
    </>
  ),
  apiPaths: (
    <>
      <path d="m8 6-5 6 5 6" />
      <path d="m16 6 5 6-5 6" />
    </>
  ),
  exceptions: (
    <>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  plugins: (
    <>
      <path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0V8z" />
      <path d="M12 18v4" />
    </>
  ),
  console: (
    <>
      <path d="m4 17 6-6-6-6" />
      <path d="M12 19h8" />
    </>
  ),
  config: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M8 13h8M8 17h5" />
    </>
  ),
  devices: (
    <>
      <rect x="5" y="5" width="14" height="14" rx="2" />
      <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
    </>
  ),
  types: (
    <>
      <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z" />
      <path d="M7 7h.01" />
    </>
  ),
  routing: (
    <>
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6" />
    </>
  ),
  mobileControl: (
    <>
      <rect x="6" y="2" width="12" height="20" rx="2" />
      <path d="M12 18h.01" />
    </>
  ),
  secrets: (
    <>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
};

const NavIcon = ({
  name,
  className = 'side-nav-icon',
}: {
  name: NavIconName;
  className?: string;
}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {PATHS[name]}
  </svg>
);

export default NavIcon;
