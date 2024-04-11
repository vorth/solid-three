import { Accessor, createContext, createResource, useContext } from "solid-js";
import { ThreeContext } from "./types";

/**
 * Custom hook to access all necessary Three.js objects needed to manage a 3D scene.
 * This hook must be used within a component that is a descendant of the `<Canvas/>` component.
 *
 * @template T The expected return type after applying the callback to the context.
 * @param {Function} [callback] - Optional callback function that processes and returns a part of the context.
 * @returns {ThreeContext | Accessor<T>} Returns the ThreeContext directly, or an accessor if a callback is provided.
 * @throws {Error} Throws an error if used outside of the Canvas component context.
 */
export function useThree(): ThreeContext;
export function useThree<T>(callback: (value: ThreeContext) => T): Accessor<T>;
export function useThree(callback?: (value: ThreeContext) => any) {
  const store = useContext(threeContext);
  if (!store) {
    throw new Error("S3F: Hooks can only be used within the Canvas component!");
  }
  if (callback) return () => callback(store);
  return store;
}
export const threeContext = createContext<ThreeContext>(null!);

/**
 * Hook to register a callback that will be executed on each animation frame within the `<Canvas/>` component.
 * This hook must be used within a component that is a descendant of the `<Canvas/>` component.
 *
 * @param {() => void} callback - The callback function to be executed on each frame.
 * @throws {Error} Throws an error if used outside of the Canvas component context.
 */
export const useFrame = (callback: () => void) => {
  const addFrameListener = useContext(frameContext);
  if (!addFrameListener) {
    throw new Error("S3F: Hooks can only be used within the Canvas component!");
  }
  addFrameListener(callback);
};
export const frameContext = createContext<(callback: () => void) => void>();

/**
 * Hook to create and manage a resource using a Three.js loader. It ensures that the loader is
 * reused if it has been instantiated before, and manages the resource lifecycle automatically.
 *
 * @template TResult The type of the resolved data when the loader completes loading.
 * @template TArg The argument type expected by the loader function.
 * @param {new () => { load: (value: TArg, onLoad: (value: TResult) => void) => void }} Constructor - The loader class constructor.
 * @param {Accessor<TArg>} args - The arguments to be passed to the loader function, wrapped in an accessor to enable reactivity.
 * @returns {Accessor<TResult>} An accessor containing the loaded resource, re-evaluating when inputs change.
 */
export const useLoader = <TResult, TArg>(
  Constructor: new () => { load: (value: TArg, onLoad: (value: TResult) => void) => void },
  args: Accessor<TArg>,
) => {
  let loader = LOADER_CACHE.get(Constructor);
  if (!loader) {
    loader = new Constructor();
    LOADER_CACHE.set(Constructor, loader);
  }

  const [resource] = createResource(
    args,
    args => new Promise<TResult>((resolve, reject) => loader.load(args, resolve, null, reject)),
  );
  return resource;
};
const LOADER_CACHE = new Map();
