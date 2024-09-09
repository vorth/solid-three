import { createSignal } from "solid-js";
import { Color, LinearSRGBColorSpace, Mesh } from "three";
import { T, useFrame } from "../src";

export function Box() {
  let mesh: Mesh | undefined;
  const [hovered, setHovered] = createSignal(false);

  useFrame(() => (mesh!.rotation.y += 0.01));

  const green = new Color() .setStyle( "green", LinearSRGBColorSpace );
  const red = new Color() .setStyle( "red", LinearSRGBColorSpace );

  return (
    <>
      <T.Mesh
        ref={mesh}
        onPointerEnter={e => setHovered(true)}
        onPointerLeave={e => setHovered(false)}
      >
        <T.BoxGeometry />
        <T.MeshStandardMaterial color={hovered() ? green : red } />
      </T.Mesh>
    </>
  );
}
