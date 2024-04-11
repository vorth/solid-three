import { createSignal } from "solid-js";
import * as THREE from "three";
import { Mesh } from "three";
import { T, extend, useFrame } from "../src";

extend(THREE);

export function Box() {
  let mesh: Mesh | undefined;
  const [hovered, setHovered] = createSignal(false);

  useFrame(() => (mesh!.rotation.y += 0.01));

  return (
    <>
      <T.Mesh
        ref={mesh}
        onPointerEnter={e => setHovered(true)}
        onPointerLeave={e => setHovered(false)}
      >
        <T.BoxGeometry />
        <T.MeshBasicMaterial color={hovered() ? "green" : "red"} />
      </T.Mesh>
    </>
  );
}
