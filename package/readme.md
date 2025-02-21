# tsl-uniform-ui-vite-plugin

A Vite plugin that automatically generates GUI controls for Three.js shader uniforms using Tweakpane. This plugin simplifies shader development by providing real-time controls for uniform values without manual GUI setup.

<video src="../assets/demo.mp4" width="320" height="240" controls></video>

## Features

- Automatic GUI generation for shader uniforms
- Supports multiple uniform types:
  - Boolean
  - Number
  - Color
  - Vector2/3/4
  - Texture
- Seamless integration with Vite and Three.js

## Installation

```bash
npm install tsl-uniform-ui-vite-plugin @tweakpane/core tweakpane tweakpane-plugin-file-import
```

## Usage

1. Add the plugin to your Vite config:

```javascript
// vite.config.js
import threeUniformGui from 'tsl-uniform-ui-vite-plugin';

export default {
  plugins: [threeUniformGui()]
}
```

2. Define your uniforms using the `uniform()` function:

```javascript
import { uniform } from 'three/tsl';

const brightness = uniform(1.0);  // number
const color = uniform(new THREE.Color(1, 0, 0));  // color
const position = uniform(new THREE.Vector3(0, 1, 0));  // vector3
```

The plugin will automatically generate appropriate Tweakpane controls for each uniform based on its type.

## Supported Types

| Type | Example | GUI Control |
|------|---------|------------|
| Boolean | `uniform(false)` | Checkbox |
| Number | `uniform(1.0)` | Slider |
| Color | `uniform(new THREE.Color())` | Color Picker |
| Vector2 | `uniform(new THREE.Vector2())` | X/Y Sliders |
| Vector3 | `uniform(new THREE.Vector3())` | X/Y/Z Sliders |
| Vector4 | `uniform(new THREE.Vector4())` | X/Y/Z/W Sliders |
| Texture | `texture(new THREE.TextureLoader().load("/uv.png"))` | File Picker |

## Requirements

- Vite
- Three.js
- Tweakpane

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.