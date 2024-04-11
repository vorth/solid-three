import { Component, createMemo, JSX, mergeProps } from "solid-js";
import { augment } from "./augment";
import { Portal, Primitive } from "./components";
import { manageProps } from "./props";
import { ConstructorRepresentation, ThreeComponent, ThreeComponentProxy } from "./types";

/**********************************************************************************/
/*                                                                                */
/*                                    Catalogue                                   */
/*                                                                                */
/**********************************************************************************/

/**
 * Global catalogue object storing mappings from names to constructor representations.
 */
const CATALOGUE = {};

/**
 * Predefined components that can be used directly within the system.
 */
const COMPONENTS = {
  Primitive,
  Portal,
};

/**
 * Extends the global CATALOGUE with additional objects.
 *
 * @param {Record<string, ConstructorRepresentation>} objects - The objects to add to the catalogue.
 */
export const extend = (objects: Record<string, ConstructorRepresentation>): void =>
  void Object.assign(CATALOGUE, objects);

/**********************************************************************************/
/*                                                                                */
/*                                        T                                       */
/*                                                                                */
/**********************************************************************************/

/**
 * Cache for storing initialized components.
 */
const T_CACHE = new Map<string, Component<any>>(Object.entries(COMPONENTS));

/**
 * A proxy that provides on-demand creation and caching of `solid-three` components.
 * It represents a dynamic layer over the predefined components and any added through extend function.
 */
export const T = new Proxy<ThreeComponentProxy & typeof COMPONENTS>({} as any, {
  get: (_, name: string) => {
    /* Create and memoize a wrapper component for the specified property. */
    if (!T_CACHE.has(name)) {
      /* Try and find a constructor within the THREE namespace. */
      const constructor = CATALOGUE[name];

      /* If no constructor is found, return undefined. */
      if (!constructor) return undefined;

      /* Otherwise, create and memoize a component for that constructor. */
      T_CACHE.set(name, createThreeComponent(constructor));
    }

    return T_CACHE.get(name);
  },
});

/**
 * Creates a ThreeComponent instance for a given source constructor.
 *
 * @template TSource The source constructor type.
 * @param {TSource} source - The constructor from which the component will be created.
 * @returns {ThreeComponent<TSource>} The created component.
 */
function createThreeComponent<TSource>(source: TSource): ThreeComponent<TSource> {
  const Component = (props: any) => {
    const merged = mergeProps({ args: [] }, props);
    const memo = createMemo(() => {
      try {
        return augment(new source(...merged.args), { props });
      } catch (e) {
        console.error(e);
        throw new Error("");
      }
    });
    manageProps(memo, props);
    return memo as unknown as JSX.Element;
  };

  return Component;
}
