import { $S3C } from "../augment";
import { AugmentedElement } from "../types";

export const isAugmentedElement = (element: any): element is AugmentedElement =>
  typeof element === "object" && $S3C in element;
