export const Card = ({ size = 24 }) => (
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
    <line x1="6" y1="9.2" x2="6" y2="21" />
    <line x1="18" y1="5" x2="18" y2="21" />
  <line x1="6" y1="9" x2="9" y2="5" />
  <line x1="9" y1="5" x2="18" y2="5"/>
    <line x1="6.14" x2="18" y1="21" y2="21"/>
  </svg>
);
