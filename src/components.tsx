import { JSX, ParentProps, createMemo, createRenderEffect, mergeProps } from "solid-js";
import { Object3D } from "three";
import { S3 } from "./";
import { augment } from "./augment";
import { threeContext, useThree } from "./hooks";
import { manageProps, manageSceneGraph } from "./props";
import { InstanceFromConstructor } from "./type-utils";
import { isAugmentedElement } from "./utils/is-augmented-element";
import { withContext } from "./utils/with-context";

type PortalProps = ParentProps<{
  element?: InstanceFromConstructor<Object3D> | S3.Instance<Object3D>;
}>;
/**
 * A component for placing its children outside the regular `solid-three` scene graph managed by Solid's reactive system.
 * This is useful for bypassing the normal rendering flow and manually managing children, similar to Solid's Portal but specific to `solid-three`.
 *
 * @function Portal
 * @param props - The component props containing `children` to be rendered and an optional Object3D `element` to be rendered into.
 * @returns An empty JSX element.
 */
export const Portal = (props: PortalProps) => {
  const context = useThree();
  const scene = createMemo(() => {
    return props.element
      ? isAugmentedElement(props.element)
        ? (props.element as S3.Instance<Object3D>)
        : augment(props.element, { props: {} })
      : context.scene;
  });

  createRenderEffect(() => {
    manageSceneGraph(
      scene(),
      withContext(
        () => props.children as unknown as S3.Instance | S3.Instance[],
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

type PrimitiveProps<T> = Omit<S3.Props<T>, "object" | "children" | "ref" | "args"> & {
  object: T;
  children?: JSX.Element;
  ref?: T | ((value: T) => void);
};
/**
 * Wraps a `ThreeElement` and allows it to be used as a JSX-component within a `solid-three` scene.
 *
 * @function Primitive
 * @template T - Extends `S3.ThreeInstance`
 * @param props - The properties for the Three.js object including the object instance's methods,
 *                                    optional children, and a ref that provides access to the object instance.
 * @returns The Three.js object wrapped as a JSX element, allowing it to be used within Solid's component system.
 */
export function Primitive<T extends S3.ThreeInstance>(props: PrimitiveProps<T>) {
  const memo = createMemo(() => augment(props.object, { props }) as S3.Instance<T>);
  manageProps(memo, props);
  return memo as unknown as JSX.Element;
}
