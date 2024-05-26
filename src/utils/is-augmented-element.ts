import { S3 } from "../";
import { $S3C } from "../augment";

export const isAugmentedElement = (element: any): element is S3.Instance =>
  typeof element === "object" && $S3C in element;
