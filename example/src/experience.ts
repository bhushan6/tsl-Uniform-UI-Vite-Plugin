import { OrbitControls } from "three/examples/jsm/Addons.js";
import { float, Fn, mix, positionGeometry, select, texture, uniform } from "three/tsl";
import * as THREE from "three/webgpu";
import { Pane } from "tweakpane";
import * as TweakpaneFileImportPlugin from "tweakpane-plugin-file-import";

export class Experience {
  private _canvas: HTMLCanvasElement;

  private _scene: THREE.Scene;
  private _camera: THREE.PerspectiveCamera;
  private _renderer: THREE.WebGPURenderer;
  private _controls: OrbitControls;
  private _size: { width: number; height: number } | null = null;

  private _parent = new THREE.Object3D();

  constructor(
    canvas: HTMLCanvasElement,
    size?: { width: number; height: number }
  ) {
    this._canvas = canvas;
    if (size) {
      this._size = size;
    }
    this._camera = new THREE.PerspectiveCamera(
      25,
      this._size
        ? this._size.width / this._size.height
        : window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this._camera.position.set(0, 0, 10);

    this._scene = new THREE.Scene();

    this._renderer = new THREE.WebGPURenderer({
      antialias: true,
      canvas: this._canvas,
    });
    this._renderer.setPixelRatio(window.devicePixelRatio);

    if (this._size) {
      this._renderer.setSize(this._size.width, this._size.height);
    } else {
      this._renderer.setSize(window.innerWidth, window.innerHeight);
    }

    this._controls = new OrbitControls(this._camera, this._renderer.domElement);
    this._controls.enableDamping = true;
    this._controls.minDistance = 0.1;
    this._controls.maxDistance = 50;
    this._controls.target.y = 0;
    this._controls.target.z = 0;
    this._controls.target.x = 0;
    this._controls.addEventListener("change", () => {
      if (!this._currentAnimationFrame)
        this._renderer.render(this._scene, this._camera);
    });
    this._controls.domElement?.addEventListener("wheel", (e) => {
      e.stopImmediatePropagation();
    });

    window.addEventListener("resize", this.onWindowResize);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(0, 5, 5);
    this._scene.add(directionalLight);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight2.position.set(-5, 5, 0);
    this._scene.add(directionalLight2);

    const directionalLight3 = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight3.position.set(5, 5, 0);
    this._scene.add(directionalLight3);

    const directionalLight4 = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight4.position.set(0, 5, -5);
    this._scene.add(directionalLight4);

    const boxGeometry = new THREE.BoxGeometry(2, 2, 2, 1, 1, 1);

    const boxMaterial = new THREE.MeshStandardNodeMaterial({
      transparent: false,
      side: THREE.FrontSide,
    });

    const box = new THREE.Mesh(boxGeometry, boxMaterial);
    this._scene.add(this._parent);

    this._parent.add(box);

    const color1 = uniform(new THREE.Color(0xff0000), "color");
    const color2 = uniform(new THREE.Color(0x00ff00));
    const progress = uniform(0);

    const scale = uniform(1, "float");
    const position = uniform(new THREE.Vector3(0, 0, 0), "vec3");

    const vec4 = uniform(new THREE.Vector4(0, 0, 0, 0));
    const renderTexture = uniform(false, "bool");

    const randomColor = () => new THREE.Color(
      Math.random() * 0xffffff
    );
    
    const randomVector2 = () => new THREE.Vector2(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1
    );
    
    const randomVector3 = () => new THREE.Vector3(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1
    );
    
    const randomVector4 = () => new THREE.Vector4(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1
    );

    const c = new THREE.Color(
      Math.random() * 0xffffff
    );
    
    // Create random uniforms
    const baseColor = uniform(c);
    const highlightColor = uniform(randomColor(), "color");
    // const ambientColor = uniform(randomColor());
    
    const opacity = uniform(Math.random(), "float");
    // const shininess = uniform(Math.random() * 100);
    // const metalness = uniform(Math.random());
    // const roughness = uniform(Math.random());
    
    // const objectScale = uniform(Math.random() * 3);
    // const objectPosition = uniform(randomVector3());
    // const objectRotation = uniform(randomVector3());
    
    // const noiseScale = uniform(Math.random() * 5);
    // const noiseStrength = uniform(Math.random() * 2);
    
    // const uvOffset = uniform(randomVector2());
    // const timeScale = uniform(Math.random() * 2);
    
    // const clipPlane = uniform(randomVector4());
    // const useTexture = uniform(Math.random() > 0.5);
    // const useNormalMap = uniform(Math.random() > 0.5);
    
    // const lightIntensity = uniform(Math.random() * 5);
    // const lightPosition = uniform(randomVector3());
    // const lightColor = uniform(randomColor());

    const tex = new THREE.TextureLoader().load("/uv.png");

    const textureUniform = texture(tex);
 
    boxMaterial.colorNode = Fn(() => {
      return textureUniform;
    })();
    boxMaterial.positionNode = Fn(() => {
      return positionGeometry.add(position).mul(scale);
    })();
  }

  private onWindowResize = () => {
    if (this._size) {
      this._camera.aspect = this._size.width / this._size.height;
    } else {
      this._camera.aspect = window.innerWidth / window.innerHeight;
    }
    this._camera.updateProjectionMatrix();
    if (this._size) {
      this._renderer.setSize(this._size.width, this._size.height);
    } else {
      this._renderer.setSize(window.innerWidth, window.innerHeight);
    }
  };

  private _currentAnimationFrame: number | null = null;

  public render = () => this._renderer.render(this._scene, this._camera);

  private animate = () => {
    this._controls.update();
    this.render();
    this._currentAnimationFrame = requestAnimationFrame(this.animate);
  };

  public startRendering() {
    if (this._currentAnimationFrame) {
      this.stopRendering;
    }
    this.animate();
  }

  public stopRendering() {
    if (this._currentAnimationFrame !== null) {
      cancelAnimationFrame(this._currentAnimationFrame);
      this._currentAnimationFrame = null;
    }
  }

  public dispose() {
    this.stopRendering();
  }
}
