//@uniforms-include-only
import { uniform } from "three/tsl";
import * as THREE from "three/webgpu";

/**
 * @gui
 * @range: { min: 0, max: 5, step: 0.01 }
 */
export const noiseStrength = uniform(1.5, "float");

//@gui
export const noiseSpeed = uniform(0.2, "float");
//@gui
export const baseColor = uniform(new THREE.Color(0x8e66ff), "color");
