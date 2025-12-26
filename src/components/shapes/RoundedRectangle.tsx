export const RoundedRectangle = ({ size = 24, radius = 6 }) => (
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
    <rect
      x="3"
      y="5"
      width="18"
      height="14"
      rx={radius}
      ry={radius}
    />
  </svg>
);
