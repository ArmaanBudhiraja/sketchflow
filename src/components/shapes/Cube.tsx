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
    <path d="M12 3l8 4-8 4-8-4 8-4z" />
    <path d="M4 7v10l8 4 8-4V7" />
  </svg>
);
