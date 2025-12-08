
import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import * as THREE from "three/webgpu";
import Core from "./core";

function App() {
  return (
    <>
      <Canvas
        style={{
          width: '100vw',
          height: '100vh',
          margin: 0,
          padding: 0
        }}
        shadows
        gl={async (props) => {
          // @ts-ignore
          const renderer = new THREE.WebGPURenderer({
            ...props,
          });
          await renderer.init();
          return renderer;
        }}
      >
        <Suspense>
          <OrbitControls />
          <Core />
        </Suspense>
      </Canvas>
    </>
  )
}

export default App
