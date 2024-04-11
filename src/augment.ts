import { Augmentation, AugmentedElement, ThreeElement } from "./types";

export const $S3C = Symbol("solid-three");

export const augment = <T extends ThreeElement>(object: T, augmentation: Augmentation) => {
  object[$S3C] = augmentation;
  return object as AugmentedElement<T>;
};
