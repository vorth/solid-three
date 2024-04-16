import { JSXElement, ParentProps, createMemo, createRenderEffect, mergeProps } from "solid-js";
import { JSX } from "solid-js/jsx-runtime";
import { Object3D } from "three";
import { augment } from "./augment";
import { threeContext, useThree } from "./hooks";
import { manageProps, manageSceneGraph } from "./props";
import { AugmentedElement, ThreeElement, ThreeProps } from "./types";
import { isAugmentedElement } from "./utils/is-augmented-element";
import { withContext } from "./utils/with-context";

/**
 * A component for placing its children outside the regular `solid-three` scene graph managed by Solid's reactive system.
 * This is useful for bypassing the normal rendering flow and manually managing children, similar to Solid's Portal but specific to `solid-three`.
 *
 * @function Portal
 * @param {PortalProps} props - The component props containing `children` to be rendered and an optional Object3D `element` to be rendered into.
 * @returns {JSX.Fragment} An empty JSX element.
 */
export const Portal = (props: PortalProps) => {
  const context = useThree();
  const scene = createMemo(() =>
    props.element
      ? isAugmentedElement(props.element)
        ? props.element
        : augment(props.element, { props: {} })
      : context.scene,
  );

  createRenderEffect(() => {
    manageSceneGraph(
      scene(),
      withContext(
        () => props.children as unknown as AugmentedElement | AugmentedElement[],
        threeContext,
        mergeProps(context, {
          get scene() {
            return scene();
          },
        }),
      ),
    );
  });
  return <></>;
};
type PortalProps = ParentProps<{ element?: ThreeElement<Object3D> | AugmentedElement<Object3D> }>;

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
type PrimitiveProps<T> = Omit<ThreeProps<T>, "object" | "children" | "ref" | "args"> & {
  object: T;
  children?: JSXElement;
  ref?: T | ((value: T) => void);
};
