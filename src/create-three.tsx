import {
  Accessor,
  children,
  createMemo,
  createRenderEffect,
  createSignal,
  mergeProps,
  onCleanup,
} from "solid-js";
import {
  ACESFilmicToneMapping,
  BasicShadowMap,
  Camera,
  LinearEncoding,
  NoToneMapping,
  OrthographicCamera,
  PCFShadowMap,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Raycaster,
  Scene,
  VSMShadowMap,
  Vector2,
  WebGLRenderer,
  sRGBEncoding,
} from "three";
import { augment } from "./augment";
import { CanvasProps } from "./canvas";
import { createEvents } from "./create-events";
import { frameContext, threeContext } from "./hooks";
import { canvasPropsContext, eventContext } from "./internal-context";
import { manageProps, manageSceneGraph } from "./props";
import { AugmentedElement, ThreeContext } from "./types";
import { defaultProps } from "./utils/default-props";
import { removeElementFromArray } from "./utils/remove-element-from-array";
import { withMultiContexts } from "./utils/with-context";

/**
 * Creates and manages a `solid-three` scene. It initializes necessary objects like
 * camera, renderer, raycaster, and scene, manages the scene graph, setups up an event system
 * and rendering loop based on the provided properties.
 *
 * @param {HTMLCanvasElement} canvas - The HTML canvas element on which Three.js will render.
 * @param {CanvasProps} props - Configuration properties.
 * @returns - a `ThreeContext` with additional properties including eventRegistry and addFrameListener.
 */
export function createThree(canvas: HTMLCanvasElement, props: CanvasProps) {
  const canvasProps = defaultProps(props, { frameloop: "always" });

  const [pointer, setPointer] = createSignal(new Vector2(), { equals: false });
  const frameListeners: ((context: ThreeContext, delta: number, frame?: XRFrame) => void)[] = [];

  // Adds a callback to be called on each frame
  const addFrameListener = (
    callback: (context: ThreeContext, delta: number, frame?: XRFrame) => void,
  ) => {
    frameListeners.push(callback);
    const cleanup = () => removeElementFromArray(frameListeners, callback);
    onCleanup(cleanup);
    return cleanup;
  };

  // Create core elements
  const { camera, gl, raycaster, scene } = createCoreElements(canvas, canvasProps);

  // Handle frame behavior in WebXR
  const handleXRFrame: XRFrameRequestCallback = (timestamp: number, frame?: XRFrame) => {
    if (canvasProps.frameloop === "never") return;
    render(timestamp, frame);
  };
  // Toggle render switching on session
  const handleSessionChange = () => {
    context.gl.xr.enabled = context.gl.xr.isPresenting;
    context.gl.xr.setAnimationLoop(context.gl.xr.isPresenting ? handleXRFrame : null);
  };
  // WebXR session-manager
  const xr = {
    connect() {
      context.gl.xr.addEventListener("sessionstart", handleSessionChange);
      context.gl.xr.addEventListener("sessionend", handleSessionChange);
    },
    disconnect() {
      context.gl.xr.removeEventListener("sessionstart", handleSessionChange);
      context.gl.xr.removeEventListener("sessionend", handleSessionChange);
    },
  };

  // Render-functions
  let isRenderPending = false;
  const render = (timestamp: number, frame?: XRFrame) => {
    isRenderPending = false;
    context.gl.render(context.scene, context.camera);
    frameListeners.forEach(listener => listener(context, timestamp, frame));
  };
  const requestRender = () => {
    if (isRenderPending) return;
    isRenderPending = true;
    requestAnimationFrame(render);
  };

  // Compose three-context
  const context: ThreeContext = {
    canvas,
    // Add core elements
    get camera() {
      return camera();
    },
    get gl() {
      return gl();
    },
    get raycaster() {
      return raycaster();
    },
    get scene() {
      return scene();
    },
    // Current normalized, centric pointer coordinates
    get pointer() {
      return pointer();
    },
    setPointer,
    render,
    requestRender,
    xr,
  };

  // Manage core elements
  withMultiContexts(
    () => manageCoreElements(canvasProps, context),
    [
      [threeContext, context],
      [canvasPropsContext, canvasProps],
    ],
  );

  // Initialize event-system
  const { addEventListener, eventRegistry } = createEvents(context);

  // Manage scene-graph
  manageSceneGraph(
    context.scene,
    children(
      withMultiContexts(
        () => canvasProps.children,
        [
          // Dependency Injection
          [threeContext, context],
          [frameContext, addFrameListener],
          [eventContext, addEventListener],
          [canvasPropsContext, canvasProps],
        ],
      ),
    ) as unknown as Accessor<AugmentedElement[]>,
  );

  // Render-loop
  const loop = (value: number) => {
    if (canvasProps.frameloop === "always") {
      requestAnimationFrame(loop);
      context.render(value);
    }
  };
  createRenderEffect(() => {
    if (canvasProps.frameloop === "always") {
      requestAnimationFrame(loop);
    }
  });

  return mergeProps(context, { eventRegistry, addFrameListener });
}

/**
 * Initializes the core components of a `solid-three` rendering context. This function creates
 * essential elements like the camera, scene, raycaster, and WebGL renderer that are required
 * to setup a fully functional `solid-three` environment.
 *
 * @param {HTMLCanvasElement} canvas - The HTML canvas element to be used for the WebGL renderer.
 * @param {CanvasProps} props - Configuration properties that define specifics such as camera type,
 *                              scene configuration, raycaster parameters, and renderer options.
 * @returns - Returns objects providing reactive access to the camera, WebGL renderer, raycaster,
 *            and scene, allowing these elements to be integrated into the Solid.js reactive system.
 */
const createCoreElements = (canvas: HTMLCanvasElement, props: CanvasProps) => ({
  camera: createMemo(() =>
    augment(
      props.camera instanceof Camera
        ? (props.camera as OrthographicCamera | PerspectiveCamera)
        : props.orthographic
        ? new OrthographicCamera()
        : new PerspectiveCamera(),
      {
        get props() {
          return props.camera || {};
        },
      },
    ),
  ),
  scene: createMemo(() =>
    augment(props.scene instanceof Scene ? props.scene : new Scene(), {
      get props() {
        return props.scene || {};
      },
    }),
  ),
  raycaster: createMemo(() =>
    augment(props.raycaster instanceof Raycaster ? props.raycaster : new Raycaster(), {
      get props() {
        return props.raycaster || {};
      },
    }),
  ),
  gl: createMemo(() =>
    augment(
      props.gl instanceof WebGLRenderer
        ? // props.gl can be a WebGLRenderer provided by the user
          props.gl
        : typeof props.gl === "function"
        ? // or a callback that returns a Renderer
          props.gl(canvas)
        : // if props.gl is not defined we default to a WebGLRenderer
          new WebGLRenderer({ canvas }),
      {
        get props() {
          return props.gl || {};
        },
      },
    ),
  ),
});

/**
 * Manages and updates the properties of core Three.js components such as the camera, scene, and
 * WebGL renderer based on external properties. This function applies reactive effects to update
 * these components dynamically as their configurations change. It handles details like shadow mapping,
 * color management, and tone mapping to align with the provided properties.
 *
 * @param {CanvasProps} props - The properties containing configuration updates for the camera,
 *                              scene, renderer, and other related settings.
 * @param {ThreeContext} context - The current Three.js context that contains the core elements
 *                                 (camera, scene, raycaster, renderer) which will be managed.
 */
export const manageCoreElements = (props: CanvasProps, context: ThreeContext) => {
  // Manage context.camera
  createRenderEffect(() => {
    if (!props.camera || props.camera instanceof Camera) return;
    manageProps(() => context.camera, props.camera);
    // NOTE:  Manually update camera's matrix with updateMatrixWorld is needed.
    //        Otherwise casting a ray immediately after start-up will cause the incorrect matrix to be used.
    context.camera.updateMatrixWorld(true);
  });
  // Manage context.scene
  createRenderEffect(() => {
    if (!props.scene || props.scene instanceof Scene) return;
    manageProps(() => context.scene, props.scene);
  });
  // Manage context.gl
  createRenderEffect(() => {
    // Set shadow-map
    createRenderEffect(() => {
      if (context.gl.shadowMap) {
        const oldEnabled = context.gl.shadowMap.enabled;
        const oldType = context.gl.shadowMap.type;
        context.gl.shadowMap.enabled = !!props.shadows;

        if (typeof props.shadows === "boolean") {
          context.gl.shadowMap.type = PCFSoftShadowMap;
        } else if (typeof props.shadows === "string") {
          const types = {
            basic: BasicShadowMap,
            percentage: PCFShadowMap,
            soft: PCFSoftShadowMap,
            variance: VSMShadowMap,
          };
          context.gl.shadowMap.type = types[props.shadows] ?? PCFSoftShadowMap;
        } else if (typeof props.shadows === "object") {
          Object.assign(context.gl.shadowMap, props.shadows);
        }

        if (oldEnabled !== context.gl.shadowMap.enabled || oldType !== context.gl.shadowMap.type)
          context.gl.shadowMap.needsUpdate = true;
      }
    });
    // Color management and tone-mapping
    manageProps(() => context.gl, {
      get outputEncoding() {
        return props.linear ? LinearEncoding : sRGBEncoding;
      },
      get toneMapping() {
        return props.flat ? NoToneMapping : ACESFilmicToneMapping;
      },
    });
    // Connect to xr if property exists
    if (context.gl.xr) context.xr.connect();
    // Manage props
    if (!props.gl || props.gl instanceof WebGLRenderer) return;
    manageProps(() => context.gl, props.gl);
  });
  // Manage context.raycaster
  createRenderEffect(() => {
    if (!props.raycaster || props.raycaster instanceof Raycaster) return;
    manageProps(() => context.raycaster, props.raycaster);
  });
};
