import { S3 } from "./";

export const $S3C = Symbol("solid-three");

/**
 * A utility to augment a `three` instance with additional data.
 * This data can be accessed behind the `S3C` symbol and is used internally in `solid-three`.
 *
 * @param instance - `three` instance
 * @param augmentation - additional data: `{ props }`
 * @returns the `three` instance with the additional data
 */
export const augment = <T>(instance: T, augmentation: any) => {
  instance[$S3C] = { children: new Set(), ...augmentation };
  return instance as T & {
    [$S3C]: S3.Metadata<T>;
  };
};
