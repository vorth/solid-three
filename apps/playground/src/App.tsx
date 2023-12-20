import { Canvas, T } from '@solid-three/fiber'

import { For, createSignal } from 'solid-js'
import Tests from './Tests'

import { OrbitControls, PerspectiveCamera } from '@solid-three/drei'
import { Dynamic } from 'solid-js/web'
import styles from './App.module.css'

const Setup = (props) => {

  let centerObject;

  return (
    <Canvas
      camera={{
        position: [3, 3, 3],
      }}
      gl={{
        antialias: true,
      }}
      shadows>
      {props.children}
      <OrbitControls />
      <PerspectiveCamera makeDefault={true} position={[3, 3, 3]}>
        {/* <T.AmbientLight color="white" intensity={0.5} /> */}
        <T.Object3D ref={centerObject} visible={false} />
        <T.DirectionalLight target={centerObject} position={[1,1,1]} intensity={1.7} color="#FF0000" />
        <T.DirectionalLight target={centerObject} position={[-1,-1,-1]} intensity={1.7} color="#00FF00" />
      </PerspectiveCamera>
      {/* <T.SpotLight position={[0, 5, 10]} intensity={1} /> */}
    </Canvas>
  )
}

export function App() {
  const [selection, setSelection] = createSignal('Parenting') //Object.keys(Tests)[0])
  return (
    <>
      <div class={styles.options}>
        <For each={Object.keys(Tests)}>
          {(test) => (
            <button
              style={{
                color: test === selection() ? 'blue' : undefined,
              }}
              onClick={() => {
                // console.clear()
                setSelection(test)
              }}>
              {test}
            </button>
          )}
        </For>
      </div>
      <Setup>
        <Dynamic component={Tests[selection()]} />
      </Setup>
    </>
  )
}
