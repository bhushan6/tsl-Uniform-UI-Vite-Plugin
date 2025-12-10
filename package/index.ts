import { Plugin } from "vite";
import * as parser from "@babel/parser";
import traverseDefault from "@babel/traverse";
import type { NodePath } from "@babel/traverse";
import * as t from "@babel/types";
import { uniformPaneClass } from "./UIController";
import micromatch from "micromatch";

// Plugin configuration interface
interface ThreeUniformGuiOptions {
  persistent?: boolean;
  devOnly?: boolean;
  exclude?: string[];
  presets?: boolean;
  draggable?: boolean;
}

// Default options
const defaultOptions: ThreeUniformGuiOptions = {
  persistent: false,
  devOnly: true,
  exclude: [],
  presets: false,
  draggable: false,
};

// Rest of the utility functions...
const pathUtils = {
  basename: (filePath: string, ext?: string): string => {
    const parts = filePath.split(/[/\\]/);
    let fileName = parts[parts.length - 1];

    if (ext && fileName.endsWith(ext)) {
      fileName = fileName.slice(0, -ext.length);
    }

    return fileName;
  },

  extname: (filePath: string): string => {
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
  range?: {
    min?: number;
    max?: number;
    step?: number;
  };
}

const debug = {
  log: (...args: any[]) =>
    console.log("\x1b[36m%s\x1b[0m", "[three-uniform-gui]", ...args),
  warn: (...args: any[]) =>
    console.log("\x1b[33m%s\x1b[0m", "[three-uniform-gui][warn]", ...args),
  error: (...args: any[]) =>
    console.log("\x1b[31m%s\x1b[0m", "[three-uniform-gui][error]", ...args),
};

function hasNoGuiComment(comments: any[]): boolean {
  if (!comments) return false;
  return comments.some((comment) => comment.value.includes("@no-gui"));
}

function hasGuiComment(comments: any[]): boolean {
  if (!comments) return false;
  return comments.some((comment) => comment.value.includes("@gui"));
}

function parseRangeComment(comments: any[]): UniformInfo["range"] | undefined {
  if (!comments) return undefined;

  for (const comment of comments) {
    const match = comment.value.match(/@range:\s*(\{[\s\S]*?\})/);
    if (match) {
      let configStr = match[1];
      try {
        return JSON.parse(configStr);
      } catch (e) {
        const quotedStr = configStr.replace(
          /([{,]\s*)([a-zA-Z_]\w*)\s*:/g,
          '$1"$2":',
        );
        try {
          return JSON.parse(quotedStr);
        } catch (e2) {
          debug.warn("Invalid uniform range configuration:", configStr);
          return undefined;
        }
      }
    }
  }
  return undefined;
}

function getUniformType(
  valueNode: t.Node,
  typeNode?: t.Node | null,
): UniformInfo["type"] | null {
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
      }
    }
  `;
};

function generateControl(
  uniform: UniformInfo,
  folderName: string,
  persistent?: boolean,
): string {
  const captureCall = `
    window.uniformPane.captureInitialValue('${folderName}', '${uniform.name}', ${uniform.name});
    console.log(${uniform.name})
    `;

  // Cleanup call - dispose existing binding before creating new one
  console.log(uniform.name, folderName);
  const cleanupCall = `
    window.uniformPane.disposeUniformBinding('${folderName}', '${uniform.name}');
  `;

  switch (uniform.type) {
    case "boolean":
      return addSubfolder(
        folderName,
        `
          ${captureCall}
          ${cleanupCall}
          if(window.uniformPane.initialUniformState){
            if(window.uniformPane.initialUniformState.${folderName}?.${uniform.name}){
              ${uniform.name}.value = window.uniformPane.initialUniformState.${folderName}.${uniform.name}
            }
          }else{
            const uniformState = window.uniformPane.uniformStateSerializer();
            window.uniformPane.currentState = uniformState
          }
          const binding_${uniform.name} = folder.addBinding(${uniform.name}, 'value', {
            label: '${uniform.name}'
          }).on("change", () => {
              ${persistent} && window.uniformPane.uniformSaveDebounced()
          });
          window.uniformPane.storeUniformBinding('${folderName}', '${uniform.name}', binding_${uniform.name});
      `,
      );

    case "number":
      const rangeOptions = uniform.range
        ? Object.entries(uniform.range)
          .filter(([_, value]) => value !== undefined)
          .map(([key, value]) => `${key}: ${value}`)
          .join(",\n            ")
        : "step: 0.01";

      return addSubfolder(
        folderName,
        `
          ${captureCall}
          ${cleanupCall}
          if(window.uniformPane.initialUniformState){
            if(window.uniformPane.initialUniformState.${folderName}?.${uniform.name}){
              ${uniform.name}.value = window.uniformPane.initialUniformState.${folderName}.${uniform.name}
            }
          }else{
            const uniformState = window.uniformPane.uniformStateSerializer();
            window.uniformPane.currentState = uniformState
          }
          const binding_${uniform.name} = folder.addBinding(${uniform.name}, 'value', {
            label: '${uniform.name}',
            ${rangeOptions}
          }).on("change", () => {
              ${persistent} && window.uniformPane.uniformSaveDebounced()
          });
          window.uniformPane.storeUniformBinding('${folderName}', '${uniform.name}', binding_${uniform.name});
      `,
      );

    case "color":
      return addSubfolder(
        folderName,
        `
          ${captureCall}
          ${cleanupCall}
          if(window.uniformPane.initialUniformState){
              if(window.uniformPane.initialUniformState.${folderName}?.${uniform.name}){
                const color = JSON.parse(window.uniformPane.initialUniformState.${folderName}.${uniform.name} )
                ${uniform.name}.value.setRGB(color.r, color.g, color.b)
              }
          }else{
            const uniformState = window.uniformPane.uniformStateSerializer();
            window.uniformPane.currentState = uniformState
          }
          const binding_${uniform.name} = folder.addBinding(${uniform.name}, 'value', {
              label: '${uniform.name}',
              view: 'color',
              picker: 'inline',
              color: {type: 'float'},
          }).on("change", () => {
                ${persistent} && window.uniformPane.uniformSaveDebounced()
          });
          window.uniformPane.storeUniformBinding('${folderName}', '${uniform.name}', binding_${uniform.name});
        `,
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

      const vectorRangeOptions = uniform.range
        ? Object.entries(uniform.range)
          .filter(([_, value]) => value !== undefined)
          .map(([key, value]) => `${key}: ${value}`)
          .join(",\n              ")
        : "step: 0.01";

      return addSubfolder(
        folderName,
        `
          ${captureCall}
          ${cleanupCall}

          ${axes.map(axis => `window.uniformPane.disposeUniformBinding('${folderName}', '${uniform.name}_${axis}');`).join('\n')}
          const ${uniform.name}Folder = folder.addFolder({
            title: '${uniform.name}'
          })

          window.uniformPane.storeUniformBinding('${folderName}', '${uniform.name}', ${uniform.name}Folder);

          ${axes
          .map((axis, index) => {
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
            const binding_${uniform.name}_${axis} = ${uniform.name}Folder.addBinding(${uniform.name}.value, '${axis}', {
              label: '${axis}',
              ${vectorRangeOptions}
            }).on("change", () => {
              ${persistent} &&  window.uniformPane.uniformSaveDebounced()
            });
            window.uniformPane.storeUniformBinding('${folderName}', '${uniform.name}_${axis}', binding_${uniform.name}_${axis});
          `;
          })
          .join("\n")}
        `,
      );

    case "texture":
      return addSubfolder(
        folderName,
        `
          ${cleanupCall}
          const ${uniform.name}Params = {
              file: "",
            }
            const ${uniform.name}Folder = folder.addFolder({
              title: '${uniform.name}'
            });
            const binding_${uniform.name} = ${uniform.name}Folder.addBinding(${uniform.name}Params, "file", {
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
            });
            window.uniformPane.storeUniformBinding('${folderName}', '${uniform.name}', binding_${uniform.name});
        `,
      );

    default:
      return "";
  }
}

export default function threeUniformGuiPlugin(
  options?: ThreeUniformGuiOptions | boolean,
): Plugin {
  const opts =
    typeof options === "boolean"
      ? { ...defaultOptions, persistent: options }
      : { ...defaultOptions, ...options };

  debug.log("Options:", opts);

  return {
    name: "three-uniform-gui",
    enforce: "pre",
    apply: (config, { command }) => {
      if (opts.devOnly && command !== "serve") {
        return false;
      }
      return true;
    },
    transform(code, id) {
      if (!id.match(/\.[jt]sx?$/)) return;

      if (
        opts.exclude &&
        opts.exclude.length > 0 &&
        micromatch.isMatch(id, opts.exclude)
      ) {
        debug.log("Skipping file due to exclude option:", id);
        return;
      }

      const codeFirstBlock = code.substring(0, 300);
      if (codeFirstBlock.includes("@no-gui-file")) {
        debug.log("Skipping file due to @no-gui-file comment (raw text check)");
        return;
      }
      const includeOnlyMode = codeFirstBlock.includes("@uniforms-include-only");

      if (includeOnlyMode) {
        debug.log("Include-only mode enabled for this file (raw text check).");
      }

      try {
        const ast = parser.parse(code, {
          sourceType: "module",
          plugins: ["typescript", "jsx"],
          comments: true,
          attachComments: true,
        } as any);

        const uniforms: UniformInfo[] = [];
        let paneExists = false;
        const fileComments: any[] = (ast as any).comments || [];

        traverse(ast, {
          VariableDeclarator(path: NodePath<t.VariableDeclarator>) {
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
                  t.isVariableDeclarator(binding.path.node) &&
                  binding.path.node.init
                ) {
                  const initNode = binding.path.node.init;
                  type = getUniformType(initNode);
                }
              }

              if (type && path.node.end) {
                const nodeStart = (path.node.start as number) || 0;
                let nearestComment: any | undefined;
                for (let i = fileComments.length - 1; i >= 0; i -= 1) {
                  const c = fileComments[i];
                  if (typeof c.end === "number" && c.end <= nodeStart) {
                    const between = code.slice(c.end, nodeStart);
                    const newlineCount = (between.match(/\n/g) || []).length;
                    if (/^[\s;]*$/.test(between) && newlineCount <= 1) {
                      nearestComment = c;
                      break;
                    }
                    if (newlineCount > 1) break;
                  }
                }
                const grandParentNode = path.parentPath.parent;
                const candidateComments = [
                  ...(nearestComment ? [nearestComment] : []),
                  ...((grandParentNode as any).leadingComments || []),
                  ...((path.parent as any).leadingComments || []),
                  ...((path.node as any).leadingComments || []),
                  ...((path.node as any).trailingComments || []),
                ];

                if (includeOnlyMode) {
                  if (!hasGuiComment(candidateComments)) {
                    return;
                  }
                } else {
                  if (hasNoGuiComment(candidateComments)) {
                    return;
                  }
                }

                const rangeConfig = parseRangeComment(candidateComments);

                uniforms.push({
                  name: path.node.id.name,
                  type,
                  position: path.node.end,
                  range: rangeConfig,
                });
              }
            }

            if (
              t.isIdentifier(path.node.id) &&
              t.isCallExpression(path.node.init) &&
              t.isIdentifier(path.node.init.callee) &&
              path.node.init.callee.name === "texture" &&
              path.node.end
            ) {
              const grandParentNode = path.parentPath.parent;
              const candidateComments = [
                ...((grandParentNode as any).leadingComments || []),
                ...((path.parent as any).leadingComments || []),
                ...((path.node as any).leadingComments || []),
                ...((path.node as any).trailingComments || []),
              ];

              if (includeOnlyMode) {
                if (!hasGuiComment(candidateComments)) {
                  return;
                }
              } else {
                if (hasNoGuiComment(candidateComments)) {
                  return;
                }
              }

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
                  t.isImportSpecifier(spec) && spec.imported.name === "Pane",
              )
            ) {
              paneExists = true;
            }
          },
        });

        if (uniforms.length === 0) {
          return;
        }

        const ext = pathUtils.extname(id);
        const rawFileName = pathUtils.basename(id, ext);
        const fileName = rawFileName.replace(/[^a-zA-Z0-9_]/g, "_");

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
            opts.persistent,
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
            window.uniformPane = new UniformUIController(${opts.persistent}, ${opts.presets}, ${opts.draggable});
            window.uniformPane.pane.registerPlugin(TweakpaneEssentialsPlugin);
            window.uniformPane.pane.registerPlugin(TweakpaneFileImportPlugin);
            window.uniformPane.setupUI()
          }

          
         

          if (import.meta.hot ) {
            import.meta.hot.on('vite:beforeUpdate', (data) => {
              console.log('🔥 HMR update about to start!', data);
               if (window.uniformPane.persistent) {
                const savedState = localStorage.getItem("threeUniformGuiPluginState");

                if (savedState) {
                  try {
                    const parsedState = JSON.parse(savedState);
                    setTimeout(() => {
                      window.uniformPane.applyConfigs(parsedState);
                    }, 500);
                  } catch (err) {
                    console.error(err);
                  }
                }
              }
            });

            import.meta.hot.on('vite:afterUpdate', () => {
              console.log('✅ HMR update finished!');
            });

            import.meta.hot.on('vite:beforeFullReload', () => {
              console.log('⚠️ A full page reload is about to happen!');
            });
            
            import.meta.hot.on('vite:error', (error) => {
              console.error('❌ HMR error occurred:', error);
            });
          }

          let folder = window.uniformPane.pane.children.find(child => child.title === 'uniform_${fileName}');

          if(!folder) {
            window.uniformPane.pane.addFolder({ title: 'uniform_${fileName}'}).on('fold', () => {
              window.uniformPane.uniformSaveDebounced()
            })
          }

          setTimeout(() => {
            if (window.uniformPane.initialUniformState) {
              window.uniformPane.applyConfigs(window.uniformPane.initialUniformState);
              window.uniformPane.initialUniformState = null;
            }
          }, 500)

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