import { Experience } from './experience';
import './style.css'

const canvas = document.getElementById("canvas") as HTMLCanvasElement;

if(!canvas) {
  throw new Error("Canvas not found");
}

new Experience(canvas).startRendering();