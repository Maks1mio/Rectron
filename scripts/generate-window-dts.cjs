const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const projectRoot = process.cwd();

const PRELOAD_PATH = path.join(projectRoot, "src", "main", "preload.ts");
const OUT_PATH = path.join(projectRoot, "window.d.ts");

const IPC_SEND_METHOD = "send";
const IPC_INVOKE_METHOD = "invoke";

const ANSI = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

function supportsColor() {
  if (process.env.NO_COLOR) return false;
  if (process.env.FORCE_COLOR === "0") return false;
  if (process.env.FORCE_COLOR === "1") return true;
  return !!process.stdout.isTTY;
}

const COLOR = supportsColor();

function c(s, color) {
  if (!COLOR) return s;
  return `${color}${s}${ANSI.reset}`;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function tsNow() {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function logLine(level, msg) {
  const time = c(tsNow(), ANSI.gray);
  const tag =
    level === "OK"
      ? c("OK  ", ANSI.green)
      : level === "INFO"
        ? c("INFO", ANSI.cyan)
        : level === "WARN"
          ? c("WARN", ANSI.yellow)
          : c("ERR ", ANSI.red);

  const prefix = `${c("RECTRON", ANSI.bold)} ${tag}`;
  process.stdout.write(`${time} ${prefix} ${msg}\n`);
}

function die(msg) {
  logLine("ERR", msg);
  process.exit(1);
}

function readFileSafe(p) {
  if (!fs.existsSync(p))
    die(`File not found: ${path.relative(projectRoot, p)}`);
  return fs.readFileSync(p, "utf8");
}

function writeFileSafe(p, content) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, "utf8");
}

function isStringLiteral(node, value) {
  return ts.isStringLiteral(node) && node.text === value;
}

function getText(sf, node) {
  return node.getText(sf);
}

function isContextBridgeExposeCall(node) {
  if (!ts.isCallExpression(node)) return false;

  const expr = node.expression;
  if (!ts.isPropertyAccessExpression(expr)) return false;

  if (expr.name.text !== "exposeInMainWorld") return false;

  const left = expr.expression;
  if (!ts.isIdentifier(left) || left.text !== "contextBridge") return false;

  const args = node.arguments;
  if (!args || args.length < 2) return false;

  if (!isStringLiteral(args[0], "electron")) return false;
  if (!ts.isObjectLiteralExpression(args[1])) return false;

  return true;
}

function inferReturnTypeFromCall(callExpr) {
  const callee = callExpr.expression;

  if (ts.isPropertyAccessExpression(callee)) {
    const method = callee.name.text;

    if (
      ts.isIdentifier(callee.expression) &&
      callee.expression.text === "ipcRenderer"
    ) {
      if (method === IPC_SEND_METHOD) return "void";
      if (method === IPC_INVOKE_METHOD) return "Promise<any>";
    }
  }

  return "any";
}

function inferReturnTypeFromBody(fnNode) {
  const body = fnNode.body;

  if (ts.isCallExpression(body)) {
    return inferReturnTypeFromCall(body);
  }

  if (ts.isBlock(body)) {
    for (const st of body.statements) {
      if (ts.isReturnStatement(st)) {
        const expr = st.expression;
        if (!expr) return "void";

        if (ts.isCallExpression(expr)) return inferReturnTypeFromCall(expr);

        if (
          ts.isAwaitExpression(expr) &&
          ts.isCallExpression(expr.expression)
        ) {
          const t = inferReturnTypeFromCall(expr.expression);
          if (t.startsWith("Promise<"))
            return t.replace(/^Promise<(.+)>$/, "$1");
          return "any";
        }

        return "any";
      }
    }
    return "void";
  }

  return "any";
}

function printParam(param, sf) {
  const name =
    param.name && ts.isIdentifier(param.name) ? param.name.text : "arg";
  if (param.type) return `${name}: ${getText(sf, param.type)}`;
  return `${name}: any`;
}

function printFunctionType(fnNode, sf) {
  const params = fnNode.parameters.map((p) => printParam(p, sf)).join(", ");
  const returnType = fnNode.type
    ? getText(sf, fnNode.type)
    : inferReturnTypeFromBody(fnNode);
  return `(${params}) => ${returnType}`;
}

function toTypeFromExpression(expr, sf, indentLevel) {
  if (ts.isObjectLiteralExpression(expr)) {
    return objectLiteralToType(expr, sf, indentLevel);
  }
  if (ts.isArrowFunction(expr) || ts.isFunctionExpression(expr)) {
    return printFunctionType(expr, sf);
  }
  return "any";
}

function objectLiteralToType(objLit, sf, indentLevel) {
  const indent = "  ".repeat(indentLevel);
  const innerIndent = "  ".repeat(indentLevel + 1);

  const lines = [];
  lines.push("{");

  for (const prop of objLit.properties) {
    if (ts.isPropertyAssignment(prop)) {
      const nameNode = prop.name;

      let key;
      if (ts.isIdentifier(nameNode)) key = nameNode.text;
      else if (ts.isStringLiteral(nameNode))
        key = JSON.stringify(nameNode.text);
      else key = getText(sf, nameNode);

      const typeStr = toTypeFromExpression(
        prop.initializer,
        sf,
        indentLevel + 1
      );
      lines.push(`${innerIndent}${key}: ${typeStr};`);
      continue;
    }

    if (ts.isShorthandPropertyAssignment(prop)) {
      const key = prop.name.text;
      lines.push(`${innerIndent}${key}: any;`);
      continue;
    }

    if (ts.isMethodDeclaration(prop)) {
      const nameNode = prop.name;
      const key = ts.isIdentifier(nameNode)
        ? nameNode.text
        : getText(sf, nameNode);
      const params = prop.parameters.map((p) => printParam(p, sf)).join(", ");
      const returnType = prop.type ? getText(sf, prop.type) : "any";
      lines.push(`${innerIndent}${key}: (${params}) => ${returnType};`);
      continue;
    }

    lines.push(`${innerIndent}${getText(sf, prop.name || prop)}: any;`);
  }

  lines.push(`${indent}}`);
  return lines.join("\n");
}

function findElectronApiObjectLiteral(sourceFile) {
  let found = null;

  function visit(node) {
    if (found) return;

    if (isContextBridgeExposeCall(node)) {
      found = node.arguments[1];
      return;
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return found;
}

function generateDtsFromPreload(preloadPath, outPath) {
  const t0 = Date.now();
  logLine(
    "INFO",
    `Generating window.d.ts from ${c(path.relative(projectRoot, preloadPath), ANSI.gray)} ...`
  );

  const code = readFileSafe(preloadPath);

  const sf = ts.createSourceFile(
    preloadPath,
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );

  const apiObj = findElectronApiObjectLiteral(sf);

  if (!apiObj) {
    die(
      `contextBridge.exposeInMainWorld("electron", {...}) not found in ${path.relative(projectRoot, preloadPath)}`
    );
  }

  const electronType = objectLiteralToType(apiObj, sf, 3);

  const dts = `// AUTO-GENERATED FILE. DO NOT EDIT MANUALLY.
// Generated from: src/main/preload.ts

declare global {
  interface Window {
    electron: ${electronType};
  }
}

export {};
`;

  writeFileSafe(outPath, dts);

  const ms = Date.now() - t0;
  logLine(
    "OK",
    `Updated: ${c(path.relative(projectRoot, outPath), ANSI.gray)} ${c(`(${ms}ms)`, ANSI.gray)}`
  );
}

generateDtsFromPreload(PRELOAD_PATH, OUT_PATH);
