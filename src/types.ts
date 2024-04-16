import { Component, ParentProps, Setter } from "solid-js";
import * as THREE from "three";
import { OrthographicCamera, PerspectiveCamera } from "three";
import { $S3C } from "./augment";
import { Portal, Primitive } from "./components";

declare global {
  namespace SolidThree {
    interface Components {
      Primitive: typeof Primitive;
      Portal: typeof Portal;
    }
    interface ThreeElements {}
  }
}

/**********************************************************************************/
/*                                                                                */
/*                                      Misc                                      */
/*                                                                                */
/**********************************************************************************/

export type ThreeContext = {
  camera: AugmentedElement<PerspectiveCamera | OrthographicCamera>;
  canvas: HTMLCanvasElement;
  gl: AugmentedElement<THREE.WebGLRenderer>;
  pointer: THREE.Vector2;
  setPointer: Setter<THREE.Vector2>;
  raycaster: AugmentedElement<THREE.Raycaster>;
  render: (delta: number) => void;
  requestRender: () => void;
  scene: AugmentedElement<THREE.Object3D>;
  xr: {
    connect: () => void;
    disconnect: () => void;
  };
};

export type Size = {
  left: number;
  top: number;
  height: number;
  width: number;
};

export type Constructor<T = any> = new (...args: any[]) => T;
type ExtractConstructors<T> = T extends Constructor ? T : never;

export type CameraType = PerspectiveCamera | OrthographicCamera;

export type KeyOfOptionals<T> = keyof {
  [K in keyof T as T extends Record<K, T[K]> ? never : K]: T[K];
};

/**********************************************************************************/
/*                                                                                */
/*                                      Event                                     */
/*                                                                                */
/**********************************************************************************/

export type ThreeEvent<TEvent extends WheelEvent | MouseEvent = WheelEvent | MouseEvent> = {
  nativeEvent: TEvent;
  stopped: boolean;
  stopPropagation: () => void;
};

export type EventHandlers = {
  onClick: (event: ThreeEvent<MouseEvent>) => void;
  onDoubleClick: (event: ThreeEvent<MouseEvent>) => void;
  onContextMenu: (event: ThreeEvent<MouseEvent>) => void;
  onMouseDown: (event: ThreeEvent<MouseEvent>) => void;
  onMouseEnter: (event: ThreeEvent<MouseEvent>) => void;
  onMouseLeave: (event: ThreeEvent<MouseEvent>) => void;
  onMouseMove: (event: ThreeEvent<MouseEvent>) => void;
  onMouseUp: (event: ThreeEvent<MouseEvent>) => void;
  onPointerUp: (event: ThreeEvent<MouseEvent>) => void;
  onPointerDown: (event: ThreeEvent<MouseEvent>) => void;
  onPointerMove: (event: ThreeEvent<MouseEvent>) => void;
  onPointerEnter: (event: ThreeEvent<MouseEvent>) => void;
  onPointerLeave: (event: ThreeEvent<MouseEvent>) => void;
  onPointerMissed: (event: ThreeEvent<MouseEvent>) => void;
  onWheel: (event: ThreeEvent<WheelEvent>) => void;
};

export type EventType = keyof EventHandlers;

/**********************************************************************************/
/*                                                                                */
/*                                  Three To JSX                                  */
/*                                                                                */
/**********************************************************************************/

type ThreeConstructor = ExtractConstructors<(typeof THREE)[keyof typeof THREE]>;
export type ThreeElement<TConstructor = ThreeConstructor> = InstanceFromConstructor<TConstructor>;
export type AugmentedElement<TConstructor = ThreeConstructor> = ThreeElement<TConstructor> & {
  [$S3C]: Augmentation;
};
export type Augmentation = { props: ThreeProps<ThreeElement>; children: Set<AugmentedElement> };

export type ThreeComponentProxy<Source> = {
  [K in keyof Source]: ThreeComponent<Source[K]>;
};
export type ThreeComponent<Source> = Component<ThreeProps<Source>>;
export type ThreeProps<Source> = Partial<
  ParentProps<
    Omit<InstanceProps<Source>, "children" | "attach"> &
      EventHandlers & {
        args: Args<Source>;
        onUpdate: (self: AugmentedElement<InstanceFromConstructor<Source>>) => void;
        attach:
          | string
          | ((
              parent: AugmentedElement<THREE.Object3D>,
              self: AugmentedElement<InstanceFromConstructor<Source>>,
            ) => () => void);
      }
  >
>;
type InstanceProps<Source> = WithMapProps<InstanceFromConstructor<Source>>;
type Args<T> = T extends new (...args: any[]) => any ? AllConstructorParameters<T> : any[];

export type InstanceFromConstructor<TConstructor> = TConstructor extends new (
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
