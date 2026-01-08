type RulersProps = {
  scale: number;
  offset: { x: number; y: number };
};

const BASE_UNIT = 100;
const RULER_SIZE = 24;

export default function Rulers({ scale, offset }: RulersProps) {
  return (
    <>
      {/* TOP */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: RULER_SIZE,
          right: 0,
          height: RULER_SIZE,
          background: "#111",
          overflow: "hidden",
          zIndex: 10,
        }}
      >
        {Array.from({ length: 200 }).map((_, i) => {
          const x = i * BASE_UNIT * scale + offset.x;

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: x,
                top: 0,
                height: "100%",
                width: 1,
                background: "#333",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  bottom: 2,
                  left: 2,
                  fontSize: 10,
                  color: "#777",
                }}
              >
                {i * BASE_UNIT}
              </span>
            </div>
          );
        })}
      </div>

      {/* LEFT */}
      <div
        style={{
          position: "absolute",
          top: RULER_SIZE,
          left: 0,
          bottom: 0,
          width: RULER_SIZE,
          background: "#111",
          overflow: "hidden",
          zIndex: 10,
        }}
      >
        {Array.from({ length: 200 }).map((_, i) => {
          const y = i * BASE_UNIT * scale + offset.y;

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                top: y,
                left: 0,
                width: "100%",
                height: 1,
                background: "#333",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  right: 2,
                  top: 2,
                  fontSize: 10,
                  color: "#777",
                  writingMode: "vertical-rl",
                  transform: "rotate(180deg)",
                }}
              >
                {i * BASE_UNIT}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}
