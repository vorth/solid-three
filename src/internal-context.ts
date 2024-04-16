import { JSX, createContext, useContext } from "solid-js";
import { Object3D } from "three";
import { CanvasProps } from "./canvas";
import { AugmentedElement, EventType } from "./types";

/**
 * Registers an event listener for an `AugmentedElement` to the nearest Canvas component up the component tree.
 * This function must be called within components that are descendants of the Canvas component.
 *
 * @param {AugmentedElement<Object3D>} object - The Three.js object to attach the event listener to.
 * @param {EventType} type - The type of event to listen for (e.g., 'click', 'mouseenter').
 * @throws {Error} Throws an error if used outside of the Canvas component context.
 */
export const addToEventListeners = (object: AugmentedElement<Object3D>, type: EventType) => {
  const addToEventListeners = useContext(eventContext);
  if (!addToEventListeners) {
    throw new Error("S3F: Hooks can only be used within the Canvas component!");
  }
  addToEventListeners(object, type);
};
export const eventContext =
  createContext<(object: AugmentedElement<Object3D>, type: EventType) => void>();

/**
 * This function facilitates the rendering of JSX elements outside the normal scene
 * graph, and must be used within components that are descendants of the Canvas component.
 *
 * @param {JSX.Element | JSX.Element[]} children - The child elements to be rendered through the portal.
 * @throws {Error} Throws an error if used outside of the Canvas component context.
 */
export const addPortal = (children: JSX.Element | JSX.Element[]) => {
  const addPortal = useContext(portalContext);
  if (!addPortal) {
    throw new Error("S3F: Hooks can only be used within the Canvas component!");
  }
  addPortal(children);
};
export const portalContext = createContext<(children: JSX.Element | JSX.Element[]) => void>();

/**
 * Hook that provides access to the props of the nearest Canvas component up the component tree.
 * This hook must be used within components that are descendants of the Canvas component.
 *
 * @returns {CanvasProps} The current properties of the Canvas component.
 * @throws {Error} Throws an error if used outside of a Canvas component context.
 */
export const useCanvasProps = () => {
  const canvasProps = useContext(canvasPropsContext);
  if (!canvasProps) {
    throw new Error("S3F: Hooks can only be used within the Canvas component!");
  }
  return canvasProps;
};
export const canvasPropsContext = createContext<CanvasProps>();
