import { createSignal } from "solid-js";
import { Color, Mesh, SRGBColorSpace } from "three";
import { T, useFrame } from "../src";

export function Box() {
  let mesh: Mesh | undefined;
  const [hovered, setHovered] = createSignal(false);

  useFrame(() => (mesh!.rotation.y += 0.01));

  const green = new Color();
  green .setStyle( "green", SRGBColorSpace );

  return (
    <>
      <T.Mesh
        ref={mesh}
        onPointerEnter={e => setHovered(true)}
        onPointerLeave={e => setHovered(false)}
      >
        <T.BoxGeometry />
        <T.MeshStandardMaterial color={hovered() ? green : "red" } />
      </T.Mesh>
    </>
  );
}
