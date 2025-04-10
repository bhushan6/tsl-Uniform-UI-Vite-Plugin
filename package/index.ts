import { Plugin } from "vite";
import * as parser from "@babel/parser";
import traverseDefault from "@babel/traverse";
import type { NodePath } from "@babel/traverse";
import * as t from "@babel/types";
import { uniformPaneClass } from "./UIController";

// Plugin configuration interface
interface ThreeUniformGuiOptions {
  persistent?: boolean;
  devOnly?: boolean; // New option to control if the plugin only works in dev mode
}

// Default options
const defaultOptions: ThreeUniformGuiOptions = {
  persistent: false,
  devOnly: true, // Default to only work in dev mode
};

// Rest of the utility functions...
const pathUtils = {
  basename: (filePath: string, ext?: string): string => {
    // Extract file name from path
    const parts = filePath.split(/[/\\]/);
    let fileName = parts[parts.length - 1];

    // Remove extension if provided
    if (ext && fileName.endsWith(ext)) {
      fileName = fileName.slice(0, -ext.length);
    }

    return fileName;
  },

  extname: (filePath: string): string => {
    // Extract extension from filename
    const lastDotIndex = filePath.lastIndexOf(".");
    return lastDotIndex !== -1 ? filePath.slice(lastDotIndex) : "";
  },
};

// @ts-ignore
const traverse = (traverseDefault.default ||
  // @ts-ignore
  traverseDefault) as typeof traverseDefault.default;

interface UniformInfo {
  name: string;
  type:
    | "boolean"
    | "number"
    | "color"
    | "vector2"
    | "vector3"
    | "vector4"
    | "matrix3"
    | "matrix4"
    | "texture";
  position: number;
}

const debug = {
  log: (...args: any[]) =>
    console.log("\x1b[36m%s\x1b[0m", "[three-uniform-gui]", ...args),
  warn: (...args: any[]) =>
    console.log("\x1b[33m%s\x1b[0m", "[three-uniform-gui][warn]", ...args),
  error: (...args: any[]) =>
    console.log("\x1b[31m%s\x1b[0m", "[three-uniform-gui][error]", ...args),
};

// All the existing type detection and control generation functions...
function getUniformType(
  valueNode: t.Node,
  typeNode?: t.Node | null
): UniformInfo["type"] | null {
  // Existing implementation...
  if (typeNode && t.isStringLiteral(typeNode)) {
    const explicitType = typeNode.value.toLowerCase();
    switch (explicitType) {
      case "float":
        return "number";
      case "bool":
        return "boolean";
      case "color":
        return "color";
      case "vec2":
        return "vector2";
      case "vec3":
        return "vector3";
      case "vec4":
        return "vector4";
      default:
        return null;
    }
  }

  if (t.isNewExpression(valueNode)) {
    const className = t.isMemberExpression(valueNode.callee)
      ? (valueNode.callee.property as t.Identifier).name
      : t.isIdentifier(valueNode.callee)
      ? valueNode.callee.name
      : null;

    switch (className) {
      case "Color":
        return "color";
      case "Vector2":
        return "vector2";
      case "Vector3":
        return "vector3";
      case "Vector4":
        return "vector4";
      case "Matrix3":
        return "matrix3";
      case "Matrix4":
        return "matrix4";
      default:
        return null;
    }
  }

  if (t.isNumericLiteral(valueNode)) return "number";
  if (t.isBooleanLiteral(valueNode)) return "boolean";
  if (t.isMemberExpression(valueNode)) return "number";

  return null;
}

const addSubfolder = (folderName: string, subfolderInit: string) => {
  return `{
    let folder = window.uniformPane.pane.children.find(child => child.title === '${folderName}');
      if(folder){
        ${subfolderInit}
      }else{
        
      }
    }
  `;
};

function generateControl(
  uniform: UniformInfo,
  folderName: string,
  persistent?: boolean
): string {
  // Existing implementation...
  // [All the existing control generation code here]
  switch (uniform.type) {
    case "boolean":
      return addSubfolder(
        folderName,
        `
          if(window.uniformPane.initialUniformState){
            if(window.uniformPane.initialUniformState.${folderName}?.${uniform.name}){
              ${uniform.name}.value = window.uniformPane.initialUniformState.${folderName}.${uniform.name}
            }
          }else{
            const uniformState = window.uniformPane.uniformStateSerializer();
            window.uniformPane.currentState = uniformState
          }
          folder.addBinding(${uniform.name}, 'value', {
            label: '${uniform.name}'
          }).on("change", () => {
              ${persistent} && window.uniformPane.uniformSaveDebounced()
          });
      `
      );

    // [All other cases]
    case "number":
      return addSubfolder(
        folderName,
        `
          if(window.uniformPane.initialUniformState){
            if(window.uniformPane.initialUniformState.${folderName}?.${uniform.name}){
              ${uniform.name}.value = window.uniformPane.initialUniformState.${folderName}.${uniform.name}
            }
          }else{
            const uniformState = window.uniformPane.uniformStateSerializer();
            window.uniformPane.currentState = uniformState
          }
        folder.addBinding(${uniform.name}, 'value', {
            label: '${uniform.name}',
            step: 0.01
          }).on("change", () => {
              ${persistent} && window.uniformPane.uniformSaveDebounced()
          });
      `
      );
      case "color":
        return addSubfolder(
          folderName,
          `
          if(window.uniformPane.initialUniformState){
              if(window.uniformPane.initialUniformState.${folderName}?.${uniform.name}){
                const color = JSON.parse(window.uniformPane.initialUniformState.${folderName}.${uniform.name} )
                ${uniform.name}.value.setRGB(color.r, color.g, color.b) 
              }
          }else{
            const uniformState = window.uniformPane.uniformStateSerializer();
            window.uniformPane.currentState = uniformState
          }
          folder.addBinding(${uniform.name}, 'value', {
              label: '${uniform.name}',
              view: 'color',
              picker: 'inline',
              color: {type: 'float'},
          }).on("change", () => {
                ${persistent} && window.uniformPane.uniformSaveDebounced()
          });
        `
        );
  
      case "vector2":
      case "vector3":
      case "vector4":
        const axes =
          uniform.type === "vector2"
            ? ["x", "y"]
            : uniform.type === "vector3"
            ? ["x", "y", "z"]
            : ["x", "y", "z", "w"];
  
        return addSubfolder(
          folderName,
          `
          const ${uniform.name}Folder = folder.addFolder({
            title: '${uniform.name}'
          }) 
          
          ${axes
            .map((axis) => {
              return `
              if(window.uniformPane.initialUniformState){
                if(window.uniformPane.initialUniformState.${folderName}?.${uniform.name}){
                  const value = window.uniformPane.initialUniformState.${folderName}.${uniform.name}
                  ${uniform.name}.value.${axis} = value.${axis}
                }
              }else{
                const uniformState = window.uniformPane.uniformStateSerializer();
                window.uniformPane.currentState = uniformState
              }
            ${uniform.name}Folder.addBinding(${uniform.name}.value, '${axis}', {
              label: '${axis}',
              step: 0.01
            }).on("change", () => {
              ${persistent} &&  window.uniformPane.uniformSaveDebounced()
            });
          `;
            })
            .join("\n")}
        `
        );
      case "texture":
        return addSubfolder(
          folderName,
          ` const ${uniform.name}Params = {
              file: "",
            }
            const ${uniform.name}Folder = folder.addFolder({
              title: '${uniform.name}'
            });
            ${uniform.name}Folder.addBinding(${uniform.name}Params, "file", {
              view: "file-input",
              lineCount: 3,
              filetypes: [".png", ".jpg"],
              invalidFiletypeMessage: "We can't accept those filetypes!",
            })
            .on("change", (ev) => {
              if (!ev.value) {
                return;
              }
              const imageFile = ev.value;
              const blobUrl = URL.createObjectURL(imageFile);
              const texture = new THREE.TextureLoader().load(blobUrl);
              ${uniform.name}.value = texture;
              ${persistent} && window.uniformPane.uniformSaveDebounced()
            });`
        );
      default:
        return "";
  }
}

// Updated plugin function to accept options
export default function threeUniformGuiPlugin(options?: ThreeUniformGuiOptions | boolean): Plugin {
  // Handle backward compatibility - if a boolean is passed, treat it as the persistent option
  const opts = typeof options === 'boolean' 
    ? { ...defaultOptions, persistent: options } 
    : { ...defaultOptions, ...options };

    debug.log("Options:", opts);

  return {
    name: "three-uniform-gui",
    apply: (config, { command }) => {
      // Only apply in development mode if devOnly is true
      if (opts.devOnly && command !== 'serve') {
        return false;
      }
      return true;
    },
    transform(code, id) {
      if (!id.match(/\.[jt]sx?$/)) return;

      debug.log("Processing file:", id);

      try {
        const ast = parser.parse(code, {
          sourceType: "module",
          plugins: ["typescript", "jsx"],
        });

        const uniforms: UniformInfo[] = [];
        let paneExists = false;

        traverse(ast, {
          VariableDeclarator(path: NodePath<t.VariableDeclarator>) {
            // Existing implementation...
            if (
              t.isCallExpression(path.node.init) &&
              t.isIdentifier(path.node.init.callee) &&
              path.node.init.callee.name === "uniform" &&
              t.isIdentifier(path.node.id)
            ) {
              const [valueArg, typeArg] = path.node.init.arguments;

              let type = getUniformType(valueArg, typeArg);

              if (!type && t.isIdentifier(valueArg)) {
                const binding = path.scope.getBinding(valueArg.name);
                if (
                  binding &&
                  binding.kind !== "module" &&
                  binding.path.node.init
                ) {
                  const initNode = binding.path.node.init;
                  type = getUniformType(initNode);
                }
              }

              if (type && path.node.end) {
                uniforms.push({
                  name: path.node.id.name,
                  type,
                  position: path.node.end,
                });
              }
            }
            // Check for texture uniform patterns
            if (
              t.isIdentifier(path.node.id) &&
              t.isCallExpression(path.node.init) &&
              t.isIdentifier(path.node.init.callee) &&
              path.node.init.callee.name === "texture" &&
              path.node.end
            ) {
              uniforms.push({
                name: path.node.id.name,
                type: "texture",
                position: path.node.end,
              });
            }
          },
          //@ts-ignore
          ImportDeclaration(path) {
            if (
              path.node.source.value === "tweakpane" &&
              path.node.specifiers.some(
                //@ts-ignore
                (spec) =>
                  //@ts-ignore
                  t.isImportSpecifier(spec) && spec.imported.name === "Pane"
              )
            ) {
              paneExists = true;
            }
          },
        });

        if (uniforms.length === 0) {
          debug.log("No uniforms found in file");
          return;
        }

        const ext = pathUtils.extname(id);
        const fileName = pathUtils.basename(id, ext);

        debug.log("Found uniforms:", uniforms);

        uniforms.sort((a, b) => b.position - a.position);

        let modifiedCode = code;

        let lastImportIndex = 0;
        traverse(ast, {
          //@ts-ignore
          ImportDeclaration(path) {
            const endIndex = path.node.end || 0;
            lastImportIndex = Math.max(lastImportIndex, endIndex);
          },
        });

        uniforms.forEach((uniform) => {
          const control = generateControl(
            uniform,
            `uniform_${fileName}`,
            opts.persistent
          );
          modifiedCode =
            modifiedCode.slice(0, uniform.position) +
            ";\n" +
            control +
            modifiedCode.slice(uniform.position);
        });

        modifiedCode =
          modifiedCode.slice(0, lastImportIndex) +
          `
          if (!window.uniformPane) {
            ${uniformPaneClass}
            window.uniformPane = new UniformUIController(${opts.persistent});
            window.uniformPane.pane.registerPlugin(TweakpaneEssentialsPlugin);
            window.uniformPane.pane.registerPlugin(TweakpaneFileImportPlugin);
            window.uniformPane.setupUI()
          }
          
          let folder = window.uniformPane.pane.children.find(child => child.title === 'uniform_${fileName}');
          if (folder) {
            folder.dispose();
          }

          window.uniformPane.pane.addFolder({ title: 'uniform_${fileName}'})

          ` +
          modifiedCode.slice(lastImportIndex);

        if (!paneExists) {
          modifiedCode =
            `
            import { Pane } from 'tweakpane';
            import * as TweakpaneEssentialsPlugin from '@tweakpane/plugin-essentials';
            import * as TweakpaneFileImportPlugin from 'tweakpane-plugin-file-import';
          ` + modifiedCode;
        }

        debug.log("Successfully transformed file");
        return {
          code: modifiedCode,
          map: null,
        };
      } catch (error) {
        debug.error("Error processing file:", error);
        return null;
      }
    },
  };
}