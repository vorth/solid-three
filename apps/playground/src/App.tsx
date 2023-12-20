import { Canvas, T } from '@solid-three/fiber'

import { For, createSignal } from 'solid-js'
import Tests from './Tests'

import { OrbitControls } from '@solid-three/drei'
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
      <T.AmbientLight color="white" intensity={0.2} />
      <T.Object3D ref={centerObject} visible={false} />
      <T.DirectionalLight target={centerObject} position={[1,1.62,0]} intensity={1} color="red" />
      <T.DirectionalLight target={centerObject} position={[1,-1.62,0]} intensity={1} color="green" />
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
