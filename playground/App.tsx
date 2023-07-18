import { For, createSignal } from 'solid-js'
import { Canvas, T } from '../src'
import Tests from './Tests'

import { Dynamic } from 'solid-js/web'
import styles from './App.module.css'

export function App() {
  const [selection, setSelection] = createSignal(Object.keys(Tests)[0])
  return (
    <>
      <div class={styles.options}>
        <For each={Object.keys(Tests)}>
          {(test) => (
            <button
              style={{
                color: test === selection() ? 'blue' : undefined,
              }}
              onClick={() => setSelection(test)}>
              {test}
            </button>
          )}
        </For>
      </div>
      <Canvas
        camera={{
          position: [3, 3, 3],
        }}
        gl={{
          antialias: true,
        }}
        shadows>
        <Dynamic component={Tests[selection()]} />
        <T.SpotLight position={[0, 5, 10]} intensity={1} />
      </Canvas>
    </>
  )
}
