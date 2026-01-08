export const Cube = ({ size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* front face */}
    <rect x="8" y="8" width="12" height="12" />

    {/* top face */}
    <line x1="20" x2="16" y1="8" y2="5"/>
    <line x1="8" x2="4" y1="8" y2="5"/>
    <line x1="4" x2="16" y1="5" y2="5" />
    <line x1="8" x2="4" y1="20" y2="16"/>
    <line x1="4" x2="4" y1="5" y2="16" />
  </svg>
);
