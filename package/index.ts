import { Plugin } from "vite";
import * as parser from "@babel/parser";
import traverseDefault from "@babel/traverse";
import type { NodePath } from "@babel/traverse";
import * as t from "@babel/types";

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

function getUniformType(
  valueNode: t.Node,
  typeNode?: t.Node | null
): UniformInfo["type"] | null {
  if (typeNode && t.isStringLiteral(typeNode)) {
    const explicitType = typeNode.value.toLowerCase();
    switch (explicitType) {
      case "boolean":
      case "number":
      case "color":
      case "vector2":
      case "vector3":
      case "vector4":
      case "matrix3":
      case "matrix4":
        return explicitType;
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

function generateControl(uniform: UniformInfo): string {
  switch (uniform.type) {
    case "boolean":
      return `
        pane.addBinding(${uniform.name}, 'value', {
          label: '${uniform.name}'
        });
      `;

    case "number":
      return `
        pane.addBinding(${uniform.name}, 'value', {
          label: '${uniform.name}',
          step: 0.01
        });
      `;

    case "color":
      return `
        pane.addBinding(${uniform.name}, 'value', {
          label: '${uniform.name}',
          view: 'color',
          picker: 'inline',
          color: {type: 'float'},
        });
      `;

    case "vector2":
    case "vector3":
    case "vector4":
      const axes =
        uniform.type === "vector2"
          ? ["x", "y"]
          : uniform.type === "vector3"
          ? ["x", "y", "z"]
          : ["x", "y", "z", "w"];

      return `
        const ${uniform.name}Folder = pane.addFolder({
          title: '${uniform.name}'
        });
        ${axes
          .map(
            (axis) => `
          ${uniform.name}Folder.addBinding(${uniform.name}.value, '${axis}', {
            label: '${axis}',
            step: 0.01
          });
        `
          )
          .join("\n")}
      `;
    case "texture":
      return `const ${uniform.name}Params = {
          file: "",
      }
      const ${uniform.name}Folder = pane.addFolder({
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
      });`;
    default:
      return "";
  }
}

export default function threeUniformGuiPlugin(): Plugin {
  return {
    name: "three-uniform-gui",
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
            if (
              t.isCallExpression(path.node.init) &&
              t.isIdentifier(path.node.init.callee) &&
              path.node.init.callee.name === "uniform" &&
              t.isIdentifier(path.node.id)
            ) {
              const [valueArg, typeArg] = path.node.init.arguments;

              const type = getUniformType(valueArg, typeArg);

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
          const control = generateControl(uniform);
          modifiedCode =
            modifiedCode.slice(0, uniform.position) +
            ";\n" +
            control +
            modifiedCode.slice(uniform.position);
        });

        modifiedCode =
          modifiedCode.slice(0, lastImportIndex) +
          `\nconst pane = new Pane({ title: "Shader Uniforms" });\n
          pane.registerPlugin(TweakpaneFileImportPlugin);\n
          ` +
          modifiedCode.slice(lastImportIndex);

        if (!paneExists) {
          modifiedCode =
            `
          import { Pane } from 'tweakpane';\n
          import * as TweakpaneFileImportPlugin from 'tweakpane-plugin-file-import';\n
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
