import { JSXElement, ParentProps, createMemo, createRenderEffect } from "solid-js";
import { JSX } from "solid-js/jsx-runtime";
import { augment } from "./augment";
import { addPortal } from "./internal-context";
import { manageProps } from "./props";
import { ThreeElement, ThreeProps } from "./types";

/**
 * A component for placing its children outside the regular `solid-three` scene graph managed by Solid's reactive system.
 * This is useful for bypassing the normal rendering flow and manually managing children, similar to Solid's Portal but specific to `solid-three`.
 *
 * @function Portal
 * @param {ParentProps} props - The component props containing children to be rendered.
 * @returns {JSX.Element} An empty JSX element, as the actual content is managed through portals elsewhere.
 */
export const Portal = (props: ParentProps) => {
  createRenderEffect(() => addPortal(props.children));
  return <></>;
};

type PrimitiveProps<T> = Omit<ThreeProps<T>, "object" | "children" | "ref" | "args"> & {
  object: T;
  children?: JSXElement;
  ref?: T | ((value: T) => void);
};

/**
 * Wraps a `Three.js` object instance and allows it to be used as a JSX component within a `solid-three` scene.
 *
 * @function Primitive
 * @template T - Extends ThreeElement which includes types from Three.js (like Mesh, Light, etc.).
 * @param {PrimitiveProps<T>} props - The properties for the Three.js object including the object instance's methods,
 *                                    optional children, and a ref that provides access to the object instance.
 * @returns {JSX.Element} The Three.js object wrapped as a JSX element, allowing it to be used within Solid's component system.
 */
export function Primitive<T extends ThreeElement>(props: PrimitiveProps<T>) {
  const memo = createMemo(() => augment(props.object, { props }));

  manageProps(memo, props);

  return memo as unknown as JSX.Element;
}
