export interface ObjectMap {
  nodes: { [name: string]: THREE.Object3D };
  materials: { [name: string]: THREE.Material };
}
// Collects nodes and materials from a THREE.Object3D
export function buildGraph(object: THREE.Object3D): ObjectMap {
  const data: ObjectMap = { nodes: {}, materials: {} };
  if (object) {
    object.traverse((obj: any) => {
      if (obj.name) data.nodes[obj.name] = obj;
      if (obj.material && !data.materials[obj.material.name])
        data.materials[obj.material.name] = obj.material;
    });
  }
  return data;
}
