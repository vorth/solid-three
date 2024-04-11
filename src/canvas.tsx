import { createResizeObserver } from "@solid-primitives/resize-observer";
import {
  Accessor,
  For,
  JSX,
  children,
  createRenderEffect,
  createSignal,
  onCleanup,
  splitProps,
} from "solid-js";
import { OrthographicCamera, PerspectiveCamera, Raycaster, Scene, WebGLRenderer } from "three";
import { augment } from "./augment";
import { initializeEvents } from "./events";
import { frameContext, threeContext } from "./hooks";
import { eventContext, portalContext } from "./internal-context";
import { manageProps, manageSceneGraph } from "./props";
import { AugmentedElement, CameraOptions, ThreeContext } from "./types";
import { removeElementFromArray } from "./utils/remove-element-from-array";
import { withMultiContexts } from "./utils/with-context";

export interface CanvasProps {
  children: JSX.Element;
  fallback?: JSX.Element;
  style?: JSX.CSSProperties;
  camera?: Partial<CameraOptions>;
}

export interface Props extends CanvasProps {}

/**
 * Serves as the root component for all 3D scenes created with `solid-three`. It initializes
 * the Three.js rendering context, including a WebGL renderer, a scene, and a camera.
 * All `<T/>`-components must be children of this Canvas. Hooks such as `useThree` and
 * `useFrame` should only be used within this component to ensure proper context.
 *
 * @function Canvas
 * @param {Props} props - Configuration options include camera settings, style, and children elements.
 * @returns {JSX.Element} A div element containing the WebGL canvas configured to occupy the full available space.
 */
export function Canvas(props: Props) {
  const [_, rest] = splitProps(props, ["children", "style"]);
  const [portals, setPortals] = createSignal<JSX.Element[]>([], {
    equals: false,
  });
  const frameListeners: ((value: number) => void)[] = [];

  const canvas = (<canvas style={{ width: "100%", height: "100%" }} />) as HTMLCanvasElement;
  const container = (
    <div style={{ width: "100%", height: "100%" }}>{canvas}</div>
  ) as HTMLDivElement;

  // Setup of the Three.js context
  const context: ThreeContext = {
    canvas,
    // Augment camera with camera-props
    camera: augment(new PerspectiveCamera() as AugmentedElement<PerspectiveCamera>, {
      get props() {
        return props.camera || {};
      },
    }),
    gl: new WebGLRenderer({ canvas }),
    raycaster: new Raycaster(),
    scene: new Scene(),
  };

  // Internal methods injected through context
  const addEventListener = initializeEvents(context);
  const addFrameListener = (callback: () => void) => {
    frameListeners.push(callback);
    onCleanup(() => removeElementFromArray(frameListeners, callback));
  };
  const addPortal = (element: JSX.Element) => {
    setPortals(portals => (portals.push(element), portals));
    onCleanup(() => setPortals(portals => removeElementFromArray(portals, element)));
  };

  // Resize observer for the canvas to adjust camera and renderer on size change
  createResizeObserver(
    () => container,
    size => {
      context.gl.setSize(window.innerWidth, window.innerHeight);
      context.gl.setPixelRatio(window.devicePixelRatio);

      if (context.camera instanceof OrthographicCamera) {
        context.camera.left = size.width / -2;
        context.camera.right = size.width / 2;
        context.camera.top = size.height / 2;
        context.camera.bottom = size.height / -2;
      } else {
        context.camera.aspect = size.width / size.height;
      }
      context.camera.updateProjectionMatrix();
    },
  );

  // Management of scene graph
  manageSceneGraph(
    context.scene,
    children(
      withMultiContexts(
        () => (
          <>
            {props.children}
            <For each={portals()}>{Portal => Portal}</For>
          </>
        ),
        [
          // Dependency Injection
          [threeContext, context],
          [frameContext, addFrameListener],
          [portalContext, addPortal],
          [eventContext, addEventListener],
        ],
      ),
    ) as unknown as Accessor<AugmentedElement[]>,
  );

  // Management of camera
  createRenderEffect(() => manageProps(() => context.camera, props.camera || {}));

  // Render loop
  const loop = (value: number) => {
    requestAnimationFrame(loop);
    context.gl.render(context.scene, context.camera);
    frameListeners.forEach(listener => listener(value));
  };
  requestAnimationFrame(loop);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        ...props.style,
      }}
      {...rest}
    >
      {container}
    </div>
  );
}
