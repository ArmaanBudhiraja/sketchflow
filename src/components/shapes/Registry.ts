import { Rectangle } from "./Rectangle";
import { Circle } from "./Circle";
// import more as needed

export const SHAPE_REGISTRY: Record<
  string,
  React.FC<{ size?: number }>
> = {
  Rectangle,
  Circle,
};
