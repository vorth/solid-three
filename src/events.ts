import { onCleanup } from "solid-js";
import { Intersection, Object3D, Vector2 } from "three";
import { $S3C } from "./augment";
import { AugmentedElement, EventType, ThreeContext } from "./types";
import { removeElementFromArray } from "./utils/remove-element-from-array";

/**
 * Checks if a given string is a valid event type within the system.
 *
 * @param {string} type - The type of the event to check.
 * @returns {boolean} `true` if the type is a recognized `EventType`, otherwise `false`.
 */
export const isEventType = (type: string): type is EventType =>
  /^on(Pointer|Click|DoubleClick|ContextMenu|Wheel|Mouse)/.test(type);

/**
 * Initializes and manages event handling for 3D objects within a given context.
 *
 * @param {Omit<ThreeContext, "addEventListener">} api - The context excluding the `addEventListener` to setup event handling.
 * @returns {Function} A function to register a 3D object with the event system.
 */
export const initializeEvents = (api: Omit<ThreeContext, "addEventListener">) => {
  const eventRegistry = {
    onMouseMove: [] as AugmentedElement<Object3D>[],
    onMouseUp: [] as AugmentedElement<Object3D>[],
    onMouseDown: [] as AugmentedElement<Object3D>[],
    onPointerMove: [] as AugmentedElement<Object3D>[],
    onPointerUp: [] as AugmentedElement<Object3D>[],
    onPointerDown: [] as AugmentedElement<Object3D>[],
    onWheel: [] as AugmentedElement<Object3D>[],
    onClick: [] as AugmentedElement<Object3D>[],
    onDoubleClick: [] as AugmentedElement<Object3D>[],
  } as const;

  const priorIntersects = {
    Mouse: new Set<AugmentedElement<Object3D>>(),
    Pointer: new Set<AugmentedElement<Object3D>>(),
  };

  let shouldStopPropagation = false;

  /**
   * Prepares the event object by adding a custom stopPropagation method.
   *
   * @template T Type of the event (MouseEvent or WheelEvent).
   * @param {T} event - The event to prepare.
   */
  const prepareEvent = <T extends MouseEvent | WheelEvent>(event: T) => {
    shouldStopPropagation = false;
    event.stopPropagation = () => (shouldStopPropagation = true);
  };

  const mouse = new Vector2();

  /**
   * Performs a raycast from the camera through the mouse position to find intersecting 3D objects.
   *
   * @template T Type of the event (MouseEvent or WheelEvent).
   * @param {T} event - The event containing the mouse coordinates.
   * @param {keyof typeof eventRegistry} type - The type of event to handle.
   * @returns {Intersection<AugmentedElement<Object3D>>[]} An array of intersections sorted by distance.
   */
  const raycast = <T extends MouseEvent | WheelEvent>(
    event: T,
    type: keyof typeof eventRegistry,
  ): Intersection<AugmentedElement<Object3D>>[] => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    api.raycaster.setFromCamera(mouse, api.camera);

    return api.raycaster.intersectObjects(eventRegistry[type]);
  };

  /**
   * Creates a handler for mouse or pointer move events, managing enter and leave events.
   *
   * @param {"Pointer" | "Mouse"} type - The type of movement ("Mouse" or "Pointer").
   * @returns {Function} The event handler function for the specified move type.
   */
  const createMoveHandler = (type: "Pointer" | "Mouse") => (event: MouseEvent) => {
    prepareEvent(event);

    let staleIntersects = new Set(priorIntersects[type]);

    for (const { object } of raycast(event, `on${type}Move`)) {
      const props = object[$S3C].props;

      if (!priorIntersects[type].has(object)) {
        props[`on${type}Enter`]?.(event);
      }

      props[`on${type}Move`]?.(event);

      staleIntersects.delete(object);
      priorIntersects[type].add(object);

      if (shouldStopPropagation) break;
    }

    staleIntersects.forEach(object => {
      const props = object[$S3C].props;

      props[`on${type}Leave`]?.(event);

      priorIntersects[type].delete(object);
    });
  };

  /**
   * Creates a generic event handler for events other than move.
   *
   * @template T Type of the event (MouseEvent or WheelEvent).
   * @param {keyof typeof eventRegistry} type - The type of event to handle.
   * @returns {Function} The event handler function for the specified type.
   */
  const createEventHandler =
    <T extends MouseEvent | WheelEvent>(type: keyof typeof eventRegistry) =>
    (event: T) => {
      prepareEvent(event);
      for (const { object } of raycast(event, type)) {
        object[$S3C].props[type]?.(event);
        if (shouldStopPropagation) break;
      }
    };

  // Register event handlers to the canvas
  api.canvas.addEventListener("mousemove", createMoveHandler("Mouse"));
  api.canvas.addEventListener("mousedown", createEventHandler("onMouseDown"));
  api.canvas.addEventListener("mouseup", createEventHandler("onMouseUp"));

  api.canvas.addEventListener("pointermove", createMoveHandler("Pointer"));
  api.canvas.addEventListener("pointerdown", createEventHandler("onMouseDown"));
  api.canvas.addEventListener("pointerup", createEventHandler("onPointerUp"));

  api.canvas.addEventListener("wheel", createEventHandler("onWheel"));
  api.canvas.addEventListener("click", createEventHandler("onClick"));
  api.canvas.addEventListener("dblclick", createEventHandler("onDoubleClick"));

  /**
   * Registers a 3D object with the event handling system, ensuring it can receive and handle events.
   *
   * @param {AugmentedElement<Object3D>} object - The 3D object to register.
   * @param {EventType} type - The type of event the object should listen for.
   */
  return (object: AugmentedElement<Object3D>, type: EventType) => {
    const isDerivedEvent = type.includes("Enter") || type.includes("Leave");
    const isPointerEvent = type.includes("Pointer");

    // Derived events are handled by onMouseMove / onPointerMove
    const derivedType = isDerivedEvent ? `on${isPointerEvent ? "Pointer" : "Mouse"}Move` : type;

    if (!eventRegistry[derivedType].find(value => value === object)) {
      eventRegistry[derivedType].push(object);
    }

    onCleanup(() => {
      // When a derived/move event-handler cleans up, it only removes the object from
      // the registry if the object is currently not listening to another derived/move-event.
      if (derivedType.includes("Move")) {
        const props = object[$S3C].props;
        if (isPointerEvent) {
          if ("onPointerMove" in props || "onPointerEnter" in props || "onPointerLeave" in props) {
            return;
          }
        } else {
          if ("onMouseMove" in props || "onMouseEnter" in props || "onMouseLeave" in props) {
            return;
          }
        }
      }
      removeElementFromArray(eventRegistry[type], object);
    });
  };
};
