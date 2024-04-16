import { createResizeObserver } from "@solid-primitives/resize-observer";
import { ComponentProps, JSX, createRenderEffect, splitProps } from "solid-js";
import { OrthographicCamera, PerspectiveCamera, Raycaster, Scene, WebGLRenderer } from "three";
import { createThree } from "./create-three";
import { ThreeProps } from "./types";

export interface CanvasProps extends ComponentProps<"div"> {
  camera?: Partial<ThreeProps<PerspectiveCamera> | ThreeProps<OrthographicCamera>>;
  fallback?: JSX.Element;
  gl?: Partial<ThreeProps<WebGLRenderer>> | ((canvas: HTMLCanvasElement) => WebGLRenderer);
  orthographic?: boolean;
  raycaster?: Partial<ThreeProps<Raycaster>>;
  scene?: Partial<ThreeProps<Scene>>;
  style?: JSX.CSSProperties;
  shadows?: boolean | "basic" | "percentage" | "soft" | "variance" | WebGLRenderer["shadowMap"];
  linear?: boolean;
  flat?: boolean;
  frameloop?: "never" | "demand" | "always";
}

/**
 * Serves as the root component for all 3D scenes created with `solid-three`. It initializes
 * the Three.js rendering context, including a WebGL renderer, a scene, and a camera.
 * All `<T/>`-components must be children of this Canvas. Hooks such as `useThree` and
 * `useFrame` should only be used within this component to ensure proper context.
 *
 * @function Canvas
 * @param {CanvasProps} props - Configuration options include camera settings, style, and children elements.
 * @returns {JSX.Element} A div element containing the WebGL canvas configured to occupy the full available space.
 */
export function Canvas(_props: CanvasProps) {
  const [props, canvasProps] = splitProps(_props, ["fallback", "camera", "children", "ref"]);

  const canvas = (<canvas style={{ width: "100%", height: "100%" }} />) as HTMLCanvasElement;
  const container = (
    <div style={{ width: "100%", height: "100%" }}>{canvas}</div>
  ) as HTMLDivElement;

  const context = createThree(canvas, props);

  // Resize observer for the canvas to adjust camera and renderer on size change
  createResizeObserver(
    () => container,
    () => {
      context.gl.setSize(window.innerWidth, window.innerHeight);
      context.gl.setPixelRatio(window.devicePixelRatio);

      if (context.camera instanceof OrthographicCamera) {
        context.camera.left = window.innerWidth / -2;
        context.camera.right = window.innerWidth / 2;
        context.camera.top = window.innerHeight / 2;
        context.camera.bottom = window.innerHeight / -2;
      } else {
        context.camera.aspect = window.innerWidth / window.innerHeight;
      }
      context.camera.updateProjectionMatrix();
    },
  );

  // Assign ref
  createRenderEffect(() => {
    if (props.ref instanceof Function) props.ref(container);
    else props.ref = container;
  });

  return (
    <div
      {...canvasProps}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        ...canvasProps.style,
      }}
    >
      {container}
    </div>
  );
}
