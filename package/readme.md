# tsl-uniform-ui-vite-plugin

A Vite plugin that automatically generates GUI controls for Three.js shader uniforms using Tweakpane. This plugin simplifies shader development by providing real-time controls for uniform values without manual GUI setup.

## Features

- Automatic GUI generation for shader uniforms
- Supports multiple uniform types:
  - Boolean
  - Number
  - Color
  - Vector2/3/4
  - Texture
- Export Configs

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

## Caveat
Passing Types to the uniform Function
When using the uniform() function, the plugin can sometimes automatically infer the type of the uniform based on the value you pass. However, there are specific cases where you must provide the type explicitly as a second argument to ensure the plugin generates the correct GUI controls.
When Type Inference Works
The plugin can automatically determine the type in these situations:

### Literals: 
  When you pass a direct value like a number, boolean, or a Three.js object.

Example: uniform(1.0) is inferred as "number".
Example: uniform(new THREE.Vector3(0, 1, 0)) is inferred as "vector3".


Variables with Obvious Types: When you pass a variable that has a clear type from its declaration.

Example

```javascript
const vec = new THREE.Vector3(0, 1, 0);
const position = uniform(vec); // Inferred as "vector3"
```

In these cases, you don't need to pass the type explicitly—the plugin will handle it for you.

When You Must Pass the Type Explicitly

You must provide the type as a second argument in these situations:

### Function Calls: 
When the value is the result of a function call, as the plugin cannot inspect the return value at compile time.

Example:

```javascript
const position = uniform(randomVector3(), "vec3"); // Type must be specified
```

### Complex Expressions: 
When the value comes from an expression whose type cannot be determined statically.

Example:



```javascript
const value = uniform(Math.random() > 0.5 ? 1 : 0, "float"); // Type should be specified
```

If you don't pass the type in these cases, the plugin won't be able to determine the type and will not generate any GUI controls for that uniform.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.