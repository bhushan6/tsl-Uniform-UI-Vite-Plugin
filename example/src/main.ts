import { uniform } from 'three/tsl';
import { Experience } from './experience';
import './style.css'
import { Color, Vector2, Vector3, Vector4 } from 'three';

const canvas = document.getElementById("canvas") as HTMLCanvasElement;

if(!canvas) {
  throw new Error("Canvas not found");
}

// Generate random uniforms with various primitive types
const randomColor = () => new Color(
  Math.random() * 0xffffff
);

const randomVector2 = () => new Vector2(
  Math.random() * 2 - 1,
  Math.random() * 2 - 1
);

const randomVector3 = () => new Vector3(
  Math.random() * 2 - 1,
  Math.random() * 2 - 1,
  Math.random() * 2 - 1
);

const randomVector4 = () => new Vector4(
  Math.random() * 2 - 1,
  Math.random() * 2 - 1,
  Math.random() * 2 - 1,
  Math.random() * 2 - 1
);

// Create random uniforms
const baseColor = uniform(randomColor());
const highlightColor = uniform(randomColor());
const ambientColor = uniform(randomColor());

const opacity = uniform(Math.random());
const shininess = uniform(Math.random() * 100);
const metalness = uniform(Math.random());
const roughness = uniform(Math.random());

const objectScale = uniform(Math.random() * 3);
const objectPosition2 = uniform(randomVector3(), "vec3");
const objectRotation2 = uniform(randomVector3(), "vec3");

const noiseScale = uniform(Math.random() * 5);
const noiseStrength = uniform(Math.random() * 2);

const uvOffset = uniform(randomVector2());
const timeScale = uniform(Math.random() * 2);

const clipPlane2 = uniform(randomVector4(), "vec4");
const useTexture = uniform(Math.random() > 0.5);
const useNormalMap = uniform(Math.random() > 0.5);

const lightIntensity = uniform(Math.random() * 5);
const lightPosition = uniform(randomVector3());
const lightColor = uniform(randomColor());

new Experience(canvas).startRendering();