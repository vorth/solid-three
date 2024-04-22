import { Augmentation, AugmentedElement, ThreeElement } from "./types";

export const $S3C = Symbol("solid-three");

/**
 * A utility to augment a `three` instance with additional data.
 * This data can be accessed behind the `S3C` symbol and is used internally in `solid-three`.
 *
 * @param {ThreeElement} instance - `three` instance
 * @param {Augmentation} augmentation - additional data: `{ props }`
 * @returns {AugmentedElement} the `three` instance with the additional data
 */
export const augment = <T extends ThreeElement>(instance: T, augmentation: any) => {
  instance[$S3C] = { children: new Set(), ...augmentation };
  return instance as AugmentedElement<T>;
};
