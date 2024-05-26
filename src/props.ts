import {
  Accessor,
  children,
  createRenderEffect,
  mapArray,
  onCleanup,
  splitProps,
  untrack,
} from "solid-js";
import {
  BufferGeometry,
  Color,
  Fog,
  Layers,
  Material,
  Object3D,
  RGBAFormat,
  Texture,
  UnsignedByteType,
} from "three";
import { S3 } from "./";
import { $S3C } from "./augment";
import { isEventType } from "./create-events";
import { useThree } from "./hooks";
import { addToEventListeners, useCanvasProps } from "./internal-context";
import { hasColorSpace } from "./utils/has-colorspace";
import { resolve } from "./utils/resolve";

/**********************************************************************************/
/*                                                                                */
/*                                  Manage Props                                  */
/*                                                                                */
/**********************************************************************************/

/**
 * Manages and applies `solid-three` props to its Three.js object. This function sets up reactive effects
 * to ensure that properties are correctly applied and updated in response to changes. It also manages the
 * attachment of children and the disposal of the object.
 *
 * @template T - The type of the augmented element.
 * @param object - An accessor function that returns the target object to which properties will be applied.
 * @param props - An object containing the props to apply. This includes both direct properties
 *                and special properties like `ref` and `children`.
 */
export function manageProps<T>(object: Accessor<S3.Instance<T>>, props: any) {
  const [local, instanceProps] = splitProps(props, ["ref", "args", "object", "attach", "children"]);

  // Assign ref
  createRenderEffect(() => {
    if (local.ref instanceof Function) local.ref(object());
    else local.ref = object();
  });

  // Connect or attach children to THREE-instance
  const childrenAccessor = children(() => props.children);
  createRenderEffect(() =>
    manageSceneGraph(object(), childrenAccessor as unknown as Accessor<S3.Instance>),
  );

  // Apply the props to THREE-instance
  createRenderEffect(() => {
    const keys = Object.keys(instanceProps);
    for (const key of keys) {
      // An array of sub-property-keys:
      // p.ex in <T.Mesh position={} position-x={}/> position's subKeys will be ['position-x']
      const subKeys = keys.filter(_key => key !== _key && _key.includes(key));
      createRenderEffect(() => {
        applyProp(object(), key, instanceProps[key]);
        // If property updates, apply its sub-properties immediately after.
        for (const subKey of subKeys) {
          applyProp(object(), subKey, instanceProps[subKey]);
        }
      });
    }
    // NOTE: see "onUpdate should not update itself"-test
    untrack(() => props.onUpdate)?.(object());
  });

  // Automatically dispose
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

/**
 * Applies a specified property value to an `AugmentedElement`. This function handles nested properties,
 * automatic updates of the `needsUpdate` flag, color space conversions, and event listener management.
 * It efficiently manages property assignments with appropriate handling for different data types and structures.
 *
 * @param source - The target object for property application.
 * @param type - The property name, which can include nested paths indicated by hyphens.
 * @param value - The value to be assigned to the property; can be of any appropriate type.
 */
export const applyProp = <T>(source: S3.Instance<T>, type: string, value: any) => {
  if (!source) {
    console.error("error while applying prop", source, type, value);
    return;
  }

  // Ignore setting undefined props
  if (value === undefined) return;

  /* If the key contains a hyphen, we're setting a sub property. */
  if (type.indexOf("-") > -1) {
    const [property, ...rest] = type.split("-");
    applyProp(source[property], rest.join("-"), value);
    return;
  }

  if (NEEDS_UPDATE.includes(type) && ((!source[type] && value) || (source[type] && !value))) {
    source.needsUpdate = true;
  }

  // Alias (output)encoding => (output)colorSpace (since r152)
  // https://github.com/pmndrs/react-three-fiber/pull/2829
  if (hasColorSpace(source)) {
    const sRGBEncoding = 3001;
    const SRGBColorSpace = "srgb";
    const LinearSRGBColorSpace = "srgb-linear";

    if (type === "encoding") {
      type = "colorSpace";
      value = value === sRGBEncoding ? SRGBColorSpace : LinearSRGBColorSpace;
    } else if (type === "outputEncoding") {
      type = "outputColorSpace";
      value = value === sRGBEncoding ? SRGBColorSpace : LinearSRGBColorSpace;
    }
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
    return;
  }

  const target = source[type];
  const context = useThree();
  const canvasProps = useCanvasProps();

  try {
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

      // Auto-convert sRGB textures, for now ...
      // https://github.com/pmndrs/react-three-fiber/issues/344
      if (
        source[type] instanceof Texture &&
        // sRGB textures must be RGBA8 since r137 https://github.com/mrdoob/three.js/pull/23129
        source[type].format === RGBAFormat &&
        source[type].type === UnsignedByteType
      ) {
        createRenderEffect(() => {
          // Subscribe manually to linear and flat-prop.
          canvasProps.linear;
          canvasProps.flat;

          const texture = source[type] as Texture;
          if (hasColorSpace(texture) && hasColorSpace(context.gl)) {
            texture.colorSpace = context.gl.outputColorSpace;
          } else {
            texture.encoding = context.gl.outputEncoding;
          }
        });
      }
    }
  } finally {
    if (canvasProps.frameloop === "demand") {
      context.requestRender();
    }
  }
};

/**********************************************************************************/
/*                                                                                */
/*                                   Scene Graph                                  */
/*                                                                                */
/**********************************************************************************/

/**
 * Dynamically attaches/connects child elements to a parent within a scene graph based on specified attachment properties.
 * The function supports different attachment behaviors:
 * - Direct assignment for standard properties like material, geometry, or fog.
 * - Custom attachment logic through a callback function provided in the attach property of the child.
 * - Default behavior for Three.js Object3D instances where children are added to the parent's children array if no specific attach property is provided.
 *
 * @template T The type parameter for the elements in the scene graph.
 * @param parent - The parent element to which children will be attached.
 * @param childAccessor - A function returning the child or children to be managed.
 */
export const manageSceneGraph = <T>(
  parent: S3.Instance<T>,
  childAccessor: Accessor<S3.Instance | S3.Instance[]>,
) => {
  createRenderEffect(
    mapArray(
      () => {
        const result = resolve(childAccessor, true);
        return Array.isArray(result) ? result : result ? [result] : [];
      },
      child =>
        createRenderEffect(() => {
          // NOTE:  this happens currently more then I would expect.
          if (!child) {
            return;
          }

          // Update parent's augmented children-property.
          parent[$S3C].children.add(child);
          onCleanup(() => parent[$S3C].children.delete(child));

          // Attaching children first. If a child is attached it will not be added to the parent's children.
          let attachProp = child[$S3C].props.attach;

          // Attach-prop can be a callback. It returns a cleanup-function.
          if (typeof attachProp === "function") {
            const cleanup = attachProp(parent, child);
            onCleanup(cleanup);
            return;
          }

          // Defaults for Material, BufferGeometry and Fog.
          if (!attachProp) {
            if (child instanceof Material) attachProp = "material";
            else if (child instanceof BufferGeometry) attachProp = "geometry";
            else if (child instanceof Fog) attachProp = "fog";
          }

          // If an attachProp is defined, attach the child to the parent.
          if (attachProp) {
            let target = parent;
            const path = attachProp.split("-");
            while (true) {
              const property = path.shift()!;
              if (path.length === 0) {
                target[property] = child;
                onCleanup(() => (parent[attachProp] = undefined));
                break;
              } else {
                target = parent[property];
              }
            }
            return;
          }

          // If no attach-prop is defined, connect the child to the parent.
          if (
            child instanceof Object3D &&
            parent instanceof Object3D &&
            !parent.children.includes(child)
          ) {
            parent.add(child);
            onCleanup(() => parent.remove(child));
            return child;
          }

          console.error(
            "Error while connecting/attaching child: child does not have attach-props defined and is not an Object3D",
            parent,
            child,
          );
        }),
    ),
  );
};
