import { Component, ParentProps } from "solid-js";
import * as THREE from "three";
import { OrthographicCamera, PerspectiveCamera } from "three";
import { $S3C } from "./augment";

/**********************************************************************************/
/*                                                                                */
/*                                      Misc                                      */
/*                                                                                */
/**********************************************************************************/

export type ThreeContext = {
  canvas: HTMLCanvasElement;
  gl: THREE.WebGLRenderer;
  camera: AugmentedElement<CameraType>;
  raycaster: THREE.Raycaster;
  scene: THREE.Scene;
};

export type Size = {
  left: number;
  top: number;
  height: number;
  width: number;
};

export type ConstructorRepresentation = new (...args: any[]) => any;

/**********************************************************************************/
/*                                                                                */
/*                                     Camera                                     */
/*                                                                                */
/**********************************************************************************/

export type CameraOptions = {
  fov: number;
  near: number;
  far: number;
  position: THREE.Vector3;
  rotation: THREE.Vector3;
};
export type CameraType = PerspectiveCamera | OrthographicCamera;

/**********************************************************************************/
/*                                                                                */
/*                                      Event                                     */
/*                                                                                */
/**********************************************************************************/

export type EventHandlers = {
  onClick: (event: MouseEvent) => void;
  onDoubleClick: (event: MouseEvent) => void;
  onContextMenu: (event: MouseEvent) => void;
  onMouseDown: (event: MouseEvent) => void;
  onMouseEnter: (event: MouseEvent) => void;
  onMouseLeave: (event: MouseEvent) => void;
  onMouseMove: (event: MouseEvent) => void;
  onMouseUp: (event: MouseEvent) => void;
  onPointerUp: (event: MouseEvent) => void;
  onPointerDown: (event: MouseEvent) => void;
  onPointerMove: (event: MouseEvent) => void;
  onPointerEnter: (event: MouseEvent) => void;
  onPointerLeave: (event: MouseEvent) => void;
  onWheel: (event: WheelEvent) => void;
};
export type EventType = keyof EventHandlers;

/**********************************************************************************/
/*                                                                                */
/*                                  Three To JSX                                  */
/*                                                                                */
/**********************************************************************************/

type ThreeConstructor = (typeof THREE)[keyof typeof THREE];
export type ThreeElement<TConstructor = ThreeConstructor> = InstanceFromConstructor<TConstructor>;
export type AugmentedElement<TConstructor = ThreeConstructor> = ThreeElement<TConstructor> & {
  [$S3C]: Augmentation;
};
export type Augmentation = { props: Record<string, any> };

export type ThreeComponentProxy<Source = typeof THREE> = {
  [K in keyof Source]: ThreeComponent<Source[K]>;
};
export type ThreeComponent<Source> = Component<ThreeProps<Source>>;
export type ThreeProps<Source> = Partial<
  ParentProps<Omit<InstanceProps<Source> & EventHandlers & { args: Args<Source> }, "children">>
>;
type InstanceProps<Source> = WithMapProps<InstanceFromConstructor<Source>>;
type Args<T> = T extends new (...args: any[]) => any ? AllConstructorParameters<T> : any[];

type InstanceFromConstructor<TConstructor> = TConstructor extends new (
  ...args: any[]
) => infer TObject
  ? TObject
  : TConstructor;

// Map `three` instance properties to `solid-three` component props
type WithMapProps<T> = {
  [TKey in keyof T]: T[TKey] extends MathRepresentation | THREE.Euler ? MathType<T[TKey]> : T[TKey];
};
type MathType<T extends MathRepresentation | THREE.Euler> = T extends THREE.Color
  ? ConstructorParameters<typeof THREE.Color> | THREE.ColorRepresentation
  : T extends VectorRepresentation | THREE.Layers | THREE.Euler
  ? T | Parameters<T["set"]> | number
  : T | Parameters<T["set"]>;
interface MathRepresentation {
  set(...args: number[]): any;
}
interface VectorRepresentation extends MathRepresentation {
  setScalar(s: number): any;
}

type ExcludeUnknown<T> = T extends Array<infer I> ? ({} extends I & {} ? never : T) : T;
type AllConstructorParameters<T> = ExcludeUnknown<
  T extends {
    new (...o: infer U): void;
    new (...o: infer U2): void;
    new (...o: infer U3): void;
    new (...o: infer U4): void;
    new (...o: infer U5): void;
    new (...o: infer U6): void;
    new (...o: infer U7): void;
  }
    ? U | U2 | U3 | U4 | U5 | U6 | U7
    : T extends {
        new (...o: infer U): void;
        new (...o: infer U2): void;
        new (...o: infer U3): void;
        new (...o: infer U4): void;
        new (...o: infer U5): void;
        new (...o: infer U6): void;
      }
    ? U | U2 | U3 | U4 | U5 | U6
    : T extends {
        new (...o: infer U): void;
        new (...o: infer U2): void;
        new (...o: infer U3): void;
        new (...o: infer U4): void;
        new (...o: infer U5): void;
      }
    ? U | U2 | U3 | U4 | U5
    : T extends {
        new (...o: infer U): void;
        new (...o: infer U2): void;
        new (...o: infer U3): void;
        new (...o: infer U4): void;
      }
    ? U | U2 | U3 | U4
    : T extends {
        new (...o: infer U): void;
        new (...o: infer U2): void;
        new (...o: infer U3): void;
      }
    ? U | U2 | U3
    : T extends {
        new (...o: infer U): void;
        new (...o: infer U2): void;
      }
    ? U | U2
    : T extends {
        new (...o: infer U): void;
      }
    ? U
    : never
>;
