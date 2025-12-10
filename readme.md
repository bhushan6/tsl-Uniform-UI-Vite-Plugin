# tsl-uniform-ui-vite-plugin

A Vite plugin that automatically generates GUI controls for Three.js shader
uniforms using Tweakpane. This plugin simplifies shader development by providing
real-time controls for uniform values without manual GUI setup.

## Features

- Automatic GUI generation for shader uniforms
- Supports multiple uniform types:
  - Boolean
  - Number
  - Color
  - Vector2/3/4
  - Texture
- Export Configs
- Persistent configs
- Undo/redo
- Presets
- Draggable panel
- Development-only mode (disabled in production by default)

## Installation

```bash
npm install tsl-uniform-ui-vite-plugin @tweakpane/core tweakpane @tweakpane/plugin-essentials tweakpane-plugin-file-import
```

## Usage

1. Add the plugin to your Vite config:

```javascript
// vite.config.js
import threeUniformGui from "tsl-uniform-ui-vite-plugin";

export default {
  plugins: [threeUniformGui()],
};
```

2. Define your uniforms using the `uniform()` function:

```javascript
import { uniform } from "three/tsl";
const brightness = uniform(1.0); // number
const color = uniform(new THREE.Color(1, 0, 0)); // color
const position = uniform(new THREE.Vector3(0, 1, 0)); // vector3
```

The plugin will automatically generate appropriate Tweakpane controls for each
uniform based on its type.

## React Three Fiber Usage

This plugin is fully compatible with React Three Fiber! However, there's an important caveat regarding plugin order in your Vite configuration.

> [!IMPORTANT]
> When using this plugin with React, you **must** place `threeUniformGui()` **before** the `react()` plugin in your `vite.config.ts`. Otherwise, the app will break.

**Correct Configuration:**

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import threeUniformGui from 'tsl-uniform-ui-vite-plugin'

export default defineConfig({
  plugins: [
    threeUniformGui({ devOnly: false, persistent: true }), // ✅ BEFORE react()
    react(),
  ],
})
```

**Incorrect Configuration:**

```typescript
// vite.config.ts - ❌ DON'T DO THIS
export default defineConfig({
  plugins: [
    react(),
    threeUniformGui(), // ❌ After react() - will break!
  ],
})
```

**Example with React Three Fiber:**

```tsx
import { useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import { uniform } from 'three/tsl'

const MyComponent = () => {
  const { nodes } = useMemo(() => {
    const color1 = uniform(new THREE.Color(0x8e66ff), "color")
    
    /**
     * @gui
     * @range: { min: -50, max: 50, step: 1 }
     */
    const displacement = uniform(0)
    
    return { nodes: { color1, displacement } }
  }, [])
  
  return (
    <mesh>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicNodeMaterial colorNode={nodes.color1} />
    </mesh>
  )
}
```

### React StrictMode + TSL Compatibility

> [!WARNING]
> When using React's **StrictMode** with TSL's `Fn` function, there's a caching behavior that can cause uniforms to become disconnected from the Tweakpane UI.

**The Problem:**

TSL's `Fn()` function caches shader nodes internally. In StrictMode, React runs `useMemo` twice, creating two different uniform objects. However, `Fn` may cache and reuse the shader node from the first run, causing it to reference stale uniforms while Tweakpane binds to the new ones.

**Solution 1: Define uniforms inside `Fn` callbacks** ✅

If you define uniforms inside the `Fn` callback, TSL always uses the correct reference:

```tsx
const { nodes } = useMemo(() => {
  const gradientNode = Fn(() => {
    // ✅ Uniforms defined INSIDE Fn - works with StrictMode
    const color1 = uniform(new THREE.Color("red"), "color");
    const color2 = uniform(new THREE.Color("yellow"), "color");
    return mix(color1, color2, uv().y);
  });

  return { nodes: { colorNode: gradientNode() } };
}, []);
```

**Solution 2: Disable StrictMode** 

If you prefer to define uniforms outside `Fn` callbacks, disable StrictMode:

```tsx
// main.tsx
createRoot(document.getElementById('root')!).render(
  // <StrictMode>  ← Comment out or remove
  <App />
  // </StrictMode>
)
```

Then you can define uniforms outside `Fn`:

```tsx
const { nodes } = useMemo(() => {
  // Works without StrictMode
  const color1 = uniform(new THREE.Color("red"), "color");
  
  const gradientNode = Fn(() => {
    return mix(color1, color2, uv().y);  // Uses external uniform
  });

  return { nodes: { colorNode: gradientNode() } };
}, []);
```

## Configuration Options

You can configure the plugin with the following options:

```javascript
// vite.config.js
import threeUniformGui from "tsl-uniform-ui-vite-plugin";

export default {
  plugins: [
    threeUniformGui({
      persistent: true, // Save configurations in localStorage
      devOnly: true, // Only active in development mode (default)
      presets: true, // Enable the presets feature
      draggable: true, // Make the panel draggable
    }),
  ],
};
```

| Option       | Type    | Default | Description                                                                 |
| ------------ | ------- | ------- | --------------------------------------------------------------------------- |
| `persistent` | boolean | `false` | Save UI state in localStorage                                               |
| `devOnly`    | boolean | `true`  | Only enable the plugin in development mode                                  |
| `presets`    | boolean | `false` | Enable the presets feature                                                  |
| `draggable`  | boolean | `false` | Make the panel draggable by clicking and dragging the title bar             |

For backward compatibility, you can still use the old configuration style:

```javascript
// vite.config.js - Legacy style
import threeUniformGui from "tsl-uniform-ui-vite-plugin";

export default {
  plugins: [threeUniformGui(true)], // Persistent mode, dev only
};
```

## Supported Types

| Type    | Example                                              | GUI Control     |
| ------- | ---------------------------------------------------- | --------------- |
| Boolean | `uniform(false)`                                     | Checkbox        |
| Number  | `uniform(1.0)`                                       | Slider          |
| Color   | `uniform(new THREE.Color())`                         | Color Picker    |
| Vector2 | `uniform(new THREE.Vector2())`                       | X/Y Sliders     |
| Vector3 | `uniform(new THREE.Vector3())`                       | X/Y/Z Sliders   |
| Vector4 | `uniform(new THREE.Vector4())`                       | X/Y/Z/W Sliders |
| Texture | `texture(new THREE.TextureLoader().load("/uv.png"))` | File Picker     |

## Range Configuration

You can specify custom ranges for number and vector uniforms using comment-based
configuration:

```javascript
// @range: { min: 0, max: 2, step: 0.1 }
const brightness = uniform(1.0);

// @range: { min: -5, max: 5, step: 0.5 }
const position = uniform(new THREE.Vector3(0, 0, 0), "vec3");
```

The comment must be placed directly above the uniform declaration. Supported
options:

- `min`: Minimum value for the slider
- `max`: Maximum value for the slider
- `step`: Step size for the slider (default: 0.01)

## Controlling GUI Generation

By default, the plugin generates controls for all uniforms it finds. You can
control this behavior on a per-file or per-uniform basis using special
comments.

### Excluding Uniforms (Default Mode)

In the default mode, you can exclude specific files or uniforms from the GUI.

#### Exclude an Entire File

Place this comment at the top of your JavaScript or TypeScript file to prevent
the plugin from processing it.

```javascript
//@no-gui-file

import { uniform } from "three/tsl";

// No GUI will be generated for any uniforms in this file.
const myUniform = uniform(0.5);
```

#### Exclude a Single Uniform

Place this comment directly above a uniform declaration to exclude just that
one.

```javascript
import { uniform } from "three/tsl";

const includedUniform = uniform(0.5);

//@no-gui
const excludedUniform = uniform(1.0); // No control will be generated for this.
```

### Include-Only Mode

For more precise control, you can switch to an "include-only" mode. In this
mode, no uniforms are included by default, and you must explicitly mark the ones
you want.

#### Enable Include-Only Mode for a File

Place this comment at the top of your file.

```javascript
//@uniforms-include-only

import { uniform } from "three/tsl";

// By default, no GUI is generated in this mode.
const ignoredUniform = uniform(0.5);
```

#### Include a Specific Uniform

In include-only mode, place the `//@gui` comment directly above a uniform to
generate a control for it.

```javascript
//@uniforms-include-only

import { uniform } from "three/tsl";

const ignoredUniform = uniform(0.5); // Ignored by default.

//@gui
const includedUniform = uniform(1.0); // A control will be generated for this.

/**
 * @gui
 * @range: { min: 0, max: 5 }
 */
export const anotherIncludedUniform = uniform(2.5); // Also included.
```

## Caveat

### Passing Types to the uniform Function

When using the uniform() function, the plugin can sometimes automatically infer
the type of the uniform based on the value you pass. However, there are specific
cases where you must provide the type explicitly as a second argument to ensure
the plugin generates the correct GUI controls.

### When Type Inference Works

The plugin can automatically determine the type in these situations:

- **Literals**: When you pass a direct value like a number, boolean, or a
  Three.js object.
  - Example: `uniform(1.0)` is inferred as "number".
  - Example: `uniform(new THREE.Vector3(0, 1, 0))` is inferred as "vector3".
- **Variables with Obvious Types**: When you pass a variable that has a clear
  type from its declaration.
  - Example:
    ```javascript
    const vec = new THREE.Vector3(0, 1, 0);
    const position = uniform(vec); // Inferred as "vector3"
    ```

In these cases, you don't need to pass the type explicitly—the plugin will
handle it for you.

### When You Must Pass the Type Explicitly

You must provide the type as a second argument in these situations:

- **Function Calls**: When the value is the result of a function call, as the
  plugin cannot inspect the return value at compile time.
  - Example:
    ```javascript
    const position = uniform(randomVector3(), "vec3"); // Type must be specified
    ```
- **Complex Expressions**: When the value comes from an expression whose type
  cannot be determined statically.
  - Example:
    ```javascript
    const value = uniform(Math.random() > 0.5 ? 1 : 0, "float"); // Type should be specified
    ```

If you don't pass the type in these cases, the plugin won't be able to determine
the type and will not generate any GUI controls for that uniform.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
