export const RoundedSquare = ({ size = 24, radius = 4 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <rect x="4" y="4" width="16" height="16" rx={radius} ry={radius} />
  </svg>
);
