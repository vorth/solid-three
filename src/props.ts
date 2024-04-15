import { Accessor, children, createRenderEffect, mapArray, onCleanup, splitProps } from "solid-js";
import { BufferGeometry, Color, Fog, Layers, Material, Object3D, Scene } from "three";
import { $S3C } from "./augment";
import { isEventType } from "./events";
import { addToEventListeners } from "./internal-context";
import { AugmentedElement } from "./types";
import { resolve } from "./utils/resolve";

/**********************************************************************************/
/*                                                                                */
/*                                  Manage Props                                  */
/*                                                                                */
/**********************************************************************************/

export function manageProps<T>(object: Accessor<AugmentedElement<T>>, props: any) {
  const [local, instanceProps] = splitProps(props, ["ref", "args", "object", "attach", "children"]);

  /* Assign ref */
  createRenderEffect(() => {
    if (local.ref instanceof Function) local.ref(object());
    else local.ref = object();
  });

  /* Connect or attach children to THREE-instance */
  const childrenAccessor = children(() => props.children);
  manageSceneGraph(object(), childrenAccessor as unknown as Accessor<AugmentedElement>);

  /* Apply the props to THREE-instance */
  applyProps(object(), instanceProps);

  /* Automatically dispose */
  onCleanup(() => object()?.dispose?.());
}

/**********************************************************************************/
/*                                                                                */
/*                                   Apply Prop                                   */
/*                                                                                */
/**********************************************************************************/

const NEEDS_UPDATE = [
  "map",
  "envMap",
  "bumpMap",
  "normalMap",
  "transparent",
  "morphTargets",
  "skinning",
  "alphaTest",
  "useVertexColors",
  "flatShading",
];

const applyProps = (object: AugmentedElement, props: { [key: string]: any }) =>
  createRenderEffect(() => {
    for (const key of Object.keys(props)) {
      createRenderEffect(() => applyProp(object, key, props[key], NEEDS_UPDATE.includes(key)));
    }
  });

export const applyProp = (
  source: AugmentedElement,
  type: string,
  value: any,
  needsUpdate: boolean,
) => {
  /* If the key contains a hyphen, we're setting a sub property. */
  if (type.indexOf("-") > -1) {
    const [property, ...rest] = type.split("-");
    applyProps(source[property], { [rest.join("-")]: value });
    return;
  }
  if (needsUpdate && ((!source[type] && value) || (source[type] && !value))) {
    source.needsUpdate = true;
  }

  if (isEventType(type)) {
    if (source instanceof Object3D) {
      addToEventListeners(source, type);
    } else {
      console.error(
        "Event handlers can only be added to Three elements extending from Object3D. Ignored event-type:",
        type,
        "from element",
        source,
      );
    }
  }

  // Ignore setting undefined props
  if (value === undefined) return;

  let target = source[type];

  // Copy if properties match signatures
  if (target?.copy && target?.constructor === value?.constructor) {
    target.copy(value);
  }
  // Layers have no copy function, we must therefore copy the mask property
  else if (target instanceof Layers && value instanceof Layers) {
    target.mask = value.mask;
  }
  // Set array types
  else if (target?.set && Array.isArray(value)) {
    if (target.fromArray) target.fromArray(value);
    else target.set(...value);
  }
  // Set literal types, ignore undefined
  // https://github.com/pmndrs/react-three-fiber/issues/274
  else if (target?.set && typeof value !== "object") {
    const isColor = target instanceof Color;
    // Allow setting array scalars
    if (!isColor && target.setScalar && typeof value === "number") target.setScalar(value);
    // Otherwise just set ...
    else if (value !== undefined) target.set(value);
  }
  // Else, just overwrite the value
  else {
    source[type] = value;
  }
};

/**********************************************************************************/
/*                                                                                */
/*                                   Scene Graph                                  */
/*                                                                                */
/**********************************************************************************/

/* manages the relationship between parent and children */
export function manageSceneGraph(
  parent: AugmentedElement | Scene,
  childAccessor: Accessor<AugmentedElement | AugmentedElement[]>,
) {
  const memo = () => {
    const result = resolve(childAccessor, true);
    return Array.isArray(result) ? result : result ? [result] : [];
  };

  createRenderEffect(
    mapArray(memo, child => {
      createRenderEffect(() => {
        // NOTE:  this happens currently more then I would expect.
        if (!child) {
          return;
        }
        /* Connect children */
        if (
          child instanceof Object3D &&
          parent instanceof Object3D &&
          !parent.children.includes(child)
        ) {
          parent.add(child);
          onCleanup(() => parent.remove(child));
          return;
        }

        /* Attach children */
        let attachType = child[$S3C].props.attach as "material" | "geometry" | "fog";

        if (!attachType) {
          if (child instanceof Material) attachType = "material";
          else if (child instanceof BufferGeometry) attachType = "geometry";
          else if (child instanceof Fog) attachType = "fog";
        }

        /* If the instance has an "attach" property, attach it to the parent */
        if (attachType) {
          // @ts-ignore s3f
          let previous = parent[attachType];
          parent[attachType] = child;
          // @ts-ignore s3f
          onCleanup(() => {
            parent[attachType] = previous;
          });
        }
      });
    }),
  );
}
