export type ExtractedBrowserCode = {
  isBrowserCode: boolean;
  fullHtml: string;
  langSummary: string;
  hasHtml: boolean;
  hasJs: boolean;
  hasCss: boolean;
  hasPython: boolean;
};

const RUNNABLE_LANGUAGES = new Set([
  "html",
  "htm",
  "js",
  "javascript",
  "jsx",
  "tsx",
  "css",
  "svg",
  "web",
  "python",
  "py",
  "py3"
]);

export function isBrowserLanguage(lang: string): boolean {
  if (!lang) return false;
  const cleanLang = lang.toLowerCase().replace(/^language-/, "").trim();
  return RUNNABLE_LANGUAGES.has(cleanLang);
}

/**
 * Builds an isolated Pyodide WebAssembly execution runner for Python scripts.
 */
export function buildPythonRunnerHtml(pythonCode: string): string {
  const jsonCode = JSON.stringify(pythonCode);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 16px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      background-color: #0d0d0e;
      color: #f3f4f6;
      font-size: 13px;
      line-height: 1.6;
    }
    .py-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
      padding-bottom: 10px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .py-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: #38bdf8;
      font-weight: 700;
      font-size: 12px;
      letter-spacing: 0.05em;
    }
    .py-status {
      font-size: 11px;
      color: #9ca3af;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .py-terminal {
      background: #09090b;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 14px;
      min-height: 220px;
      max-height: 72vh;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .py-stdout { color: #f3f4f6; }
    .py-stderr { color: #f87171; }
    .py-user-input { color: #38bdf8; font-weight: 600; }
    .py-prompt-text { color: #a78bfa; font-weight: 600; }
    .py-result { color: #4ade80; font-weight: 600; margin-top: 10px; display: block; }
    .py-input-line {
      display: inline-flex;
      align-items: center;
      vertical-align: middle;
      margin: 4px 0;
      width: calc(100% - 8px);
    }
    .py-cli-input {
      background: rgba(255, 255, 255, 0.07);
      border: 1px solid #38bdf8;
      border-radius: 4px;
      color: #38bdf8;
      font-family: inherit;
      font-size: inherit;
      padding: 3px 8px;
      outline: none;
      flex: 1;
      margin-left: 4px;
    }
    .py-cli-input:focus {
      box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.25);
    }
    .py-enter-hint {
      font-size: 10px;
      color: #6b7280;
      margin-left: 8px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
  </style>
  <script src="https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js"></script>
</head>
<body>
  <div class="py-header">
    <div class="py-badge">
      <span>🐍 Python 3.12 (Interactive Terminal)</span>
    </div>
    <div id="py-status" class="py-status">⚡ Initializing Python WebAssembly sandbox...</div>
  </div>
  <div id="py-terminal" class="py-terminal"></div>

  <script>
    (function() {
      const term = document.getElementById("py-terminal");
      const status = document.getElementById("py-status");

      let lineCount = 0;
      const MAX_LINES = 1000;

      function sendLog(type, msg) {
        try {
          window.parent.postMessage({
            type: 'CONSOLE_LOG',
            logType: type,
            message: msg
          }, '*');
        } catch(e) {}
      }

      function appendText(text, className) {
        if (lineCount >= MAX_LINES) {
          if (lineCount === MAX_LINES) {
            lineCount++;
            const warn = document.createElement("div");
            warn.style.color = "#facc15";
            warn.style.padding = "6px 0";
            warn.textContent = "\\n[Output truncated: maximum 1,000 lines limit reached to protect browser memory]";
            term.appendChild(warn);
          }
          return;
        }
        lineCount++;
        const span = document.createElement("span");
        span.textContent = text;
        if (className) span.className = className;
        term.appendChild(span);
        term.scrollTop = term.scrollHeight;
      }

      // Interactive in-terminal CLI input function
      window._getTerminalInput = function(promptText) {
        return new Promise((resolve) => {
          if (promptText) {
            appendText(promptText, "py-prompt-text");
            sendLog("log", promptText);
          }

          const inputWrapper = document.createElement("div");
          inputWrapper.className = "py-input-line";

          const inputEl = document.createElement("input");
          inputEl.type = "text";
          inputEl.className = "py-cli-input";
          inputEl.placeholder = "Type input and press Enter...";

          const hint = document.createElement("span");
          hint.className = "py-enter-hint";
          hint.textContent = "↵ Enter";

          inputWrapper.appendChild(inputEl);
          inputWrapper.appendChild(hint);
          term.appendChild(inputWrapper);
          term.scrollTop = term.scrollHeight;

          setTimeout(() => inputEl.focus(), 25);

          const handleKeyDown = (e) => {
            if (e.key === "Enter") {
              const val = inputEl.value;
              inputWrapper.remove();
              appendText(val + "\\n", "py-user-input");
              sendLog("log", "> " + val);
              resolve(val);
            }
          };

          inputEl.addEventListener("keydown", handleKeyDown);
        });
      };

      async function run() {
        const start = performance.now();
        try {
          status.textContent = "⚡ Loading Pyodide WebAssembly runtime...";
          const pyodide = await loadPyodide({
            stdout: (text) => {
              appendText(text + "\\n", "py-stdout");
              sendLog("log", text);
            },
            stderr: (text) => {
              appendText(text + "\\n", "py-stderr");
              sendLog("error", text);
            }
          });

          // Register in-terminal interactive input handler and comprehensive AST transformer
          window._rawPythonCode = ${jsonCode};
          await pyodide.runPythonAsync("import ast, builtins, js\\n\\nasync def _term_input(prompt=''):\\n    val = await js._getTerminalInput(str(prompt))\\n    return str(val)\\n\\nbuiltins.input = _term_input\\n\\nclass _FullAsyncRewriter(ast.NodeTransformer):\\n    def __init__(self, user_funcs):\\n        self.user_funcs = user_funcs\\n    def visit_FunctionDef(self, node):\\n        self.generic_visit(node)\\n        return ast.copy_location(ast.AsyncFunctionDef(name=node.name, args=node.args, body=node.body, decorator_list=node.decorator_list, returns=node.returns, type_comment=getattr(node, 'type_comment', None)), node)\\n    def visit_Call(self, node):\\n        self.generic_visit(node)\\n        func_name = None\\n        if isinstance(node.func, ast.Name):\\n            func_name = node.func.id\\n        elif isinstance(node.func, ast.Attribute):\\n            func_name = node.func.attr\\n        if func_name in self.user_funcs:\\n            return ast.copy_location(ast.Await(value=node), node)\\n        return node\\n\\ndef _compile_script(source_str):\\n    try:\\n        tree = ast.parse(source_str)\\n        user_funcs = {n.name for n in ast.walk(tree) if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))}\\n        user_funcs.add('input')\\n        new_tree = _FullAsyncRewriter(user_funcs).visit(tree)\\n        ast.fix_missing_locations(new_tree)\\n        return compile(new_tree, '<exec>', 'exec', flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT)\\n    except Exception:\\n        return compile(source_str, '<exec>', 'exec', flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT)\\n");

          status.textContent = "⚡ Running Python script...";
          const result = await pyodide.runPythonAsync("await eval(_compile_script(js._rawPythonCode), globals())");
          const elapsed = ((performance.now() - start) / 1000).toFixed(2);
          status.innerHTML = "<span style='color:#4ade80'>✓ Execution finished (" + elapsed + "s)</span>";

          if (result !== undefined && result !== null) {
            const strResult = String(result);
            if (!term.textContent.includes(strResult)) {
              appendText("\\n[Return]: " + strResult + "\\n", "py-result");
              sendLog("log", "[Return]: " + strResult);
            }
          }
        } catch (err) {
          const elapsed = ((performance.now() - start) / 1000).toFixed(2);
          status.innerHTML = "<span style='color:#f87171'>✗ Execution error (" + elapsed + "s)</span>";
          appendText("\\nTraceback (most recent call last):\\n" + (err.message || String(err)) + "\\n", "py-stderr");
          sendLog("error", err.message || String(err));
        }
      }

      run();
    })();
  </script>
</body>
</html>`;
}

/**
 * Builds an isolated web runner for HTML, CSS, JS and SVG snippets.
 */
export function buildWebRunnerHtml(htmlSnippet: string, cssSnippet: string, jsSnippet: string, svgSnippet: string): string {
  if (htmlSnippet.includes("<html") || htmlSnippet.includes("<!DOCTYPE") || htmlSnippet.includes("<body")) {
    let fullHtml = htmlSnippet;
    if (cssSnippet) {
      if (fullHtml.includes("</head>")) {
        fullHtml = fullHtml.replace("</head>", `<style>${cssSnippet}</style></head>`);
      } else {
        fullHtml = `<style>${cssSnippet}</style>\n` + fullHtml;
      }
    }
    if (jsSnippet) {
      if (fullHtml.includes("</body>")) {
        fullHtml = fullHtml.replace("</body>", `<script>${jsSnippet}</script></body>`);
      } else {
        fullHtml += `\n<script>${jsSnippet}</script>`;
      }
    }
    return fullHtml;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      margin: 0;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: #0d0d0e;
      color: #f3f4f6;
    }
    ${cssSnippet}
  </style>
</head>
<body>
  ${htmlSnippet || (svgSnippet ? svgSnippet : '<div id="app"></div>')}
  <script>
    (function() {
      const _log = console.log;
      const _error = console.error;
      const _warn = console.warn;
      let logCount = 0;
      const MAX_LOGS = 250;

      function send(type, args) {
        if (logCount >= MAX_LOGS) {
          if (logCount === MAX_LOGS) {
            logCount++;
            window.parent.postMessage({
              type: 'CONSOLE_LOG',
              logType: 'warn',
              message: '[Console output capped: max ' + MAX_LOGS + ' logs reached]'
            }, '*');
          }
          return;
        }
        logCount++;
        try {
          window.parent.postMessage({
            type: 'CONSOLE_LOG',
            logType: type,
            message: Array.from(args).map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')
          }, '*');
        } catch(e) {}
      }
      console.log = function(...args) { send('log', args); _log.apply(console, args); };
      console.error = function(...args) { send('error', args); _error.apply(console, args); };
      console.warn = function(...args) { send('warn', args); _warn.apply(console, args); };

      window.addEventListener('error', function(e) {
        send('error', ['Runtime Error: ' + (e.message || 'Unknown script error')]);
      });
      window.addEventListener('unhandledrejection', function(e) {
        send('error', ['Unhandled Promise Rejection: ' + (e.reason?.message || String(e.reason))]);
      });
    })();
  </script>
  ${jsSnippet ? `<script>\ntry {\n${jsSnippet}\n} catch(e) { console.error("Runtime Error: " + (e.message || String(e))); }\n</script>` : ""}
</body>
</html>`;
}

/**
 * Extracts executable code for a single isolated code block (HTML/JS or Python).
 */
export function extractExecutableSnippet(rawCode: string, lang: string): { fullHtml: string; langSummary: string } {
  const cleanLang = (lang || "").toLowerCase().replace(/^language-/, "").trim();

  if (["python", "py", "py3"].includes(cleanLang)) {
    return {
      fullHtml: buildPythonRunnerHtml(rawCode),
      langSummary: "Python (Pyodide Wasm)"
    };
  }

  if (["js", "javascript", "jsx", "tsx"].includes(cleanLang)) {
    return {
      fullHtml: buildWebRunnerHtml("", "", rawCode, ""),
      langSummary: "JavaScript"
    };
  }

  if (["html", "htm"].includes(cleanLang)) {
    return {
      fullHtml: buildWebRunnerHtml(rawCode, "", "", ""),
      langSummary: "HTML"
    };
  }

  if (["svg"].includes(cleanLang)) {
    return {
      fullHtml: buildWebRunnerHtml("", "", "", rawCode),
      langSummary: "SVG"
    };
  }

  if (["css"].includes(cleanLang)) {
    return {
      fullHtml: buildWebRunnerHtml('<div style="padding:20px;">Styled Preview Element</div>', rawCode, "", ""),
      langSummary: "CSS"
    };
  }

  return {
    fullHtml: buildWebRunnerHtml(rawCode, "", "", ""),
    langSummary: "Web Code"
  };
}

/**
 * Extracts and synthesizes executable code across all blocks in a markdown document.
 */
export function extractBrowserCode(markdown: string): ExtractedBrowserCode {
  if (!markdown) {
    return { isBrowserCode: false, fullHtml: "", langSummary: "", hasHtml: false, hasJs: false, hasCss: false, hasPython: false };
  }

  // Regex to match code blocks: ```lang ... ```
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  let htmlSnippet = "";
  let cssSnippet = "";
  let jsSnippet = "";
  let svgSnippet = "";
  let pythonSnippet = "";
  let hasBrowserCode = false;
  const langsFound = new Set<string>();

  while ((match = codeBlockRegex.exec(markdown)) !== null) {
    const lang = (match[1] || "").toLowerCase().trim();
    const code = match[2];

    if (["html", "htm"].includes(lang)) {
      htmlSnippet += code + "\n";
      hasBrowserCode = true;
      langsFound.add("HTML");
    } else if (["js", "javascript", "jsx", "tsx"].includes(lang)) {
      jsSnippet += code + "\n";
      hasBrowserCode = true;
      langsFound.add("JavaScript");
    } else if (["css"].includes(lang)) {
      cssSnippet += code + "\n";
      hasBrowserCode = true;
      langsFound.add("CSS");
    } else if (["svg"].includes(lang)) {
      svgSnippet += code + "\n";
      hasBrowserCode = true;
      langsFound.add("SVG");
    } else if (["python", "py", "py3"].includes(lang)) {
      pythonSnippet += code + "\n";
      hasBrowserCode = true;
      langsFound.add("Python (Pyodide Wasm)");
    }
  }

  if (!hasBrowserCode) {
    return { isBrowserCode: false, fullHtml: "", langSummary: "", hasHtml: false, hasJs: false, hasCss: false, hasPython: false };
  }

  // If python snippet is present and no web markup, use Python runner
  let fullHtml = "";
  if (pythonSnippet && !htmlSnippet && !jsSnippet && !svgSnippet) {
    fullHtml = buildPythonRunnerHtml(pythonSnippet);
  } else {
    fullHtml = buildWebRunnerHtml(htmlSnippet, cssSnippet, jsSnippet, svgSnippet);
  }

  const langSummary = Array.from(langsFound).join(" + ");
  return {
    isBrowserCode: true,
    fullHtml,
    langSummary,
    hasHtml: !!htmlSnippet || !!svgSnippet,
    hasJs: !!jsSnippet,
    hasCss: !!cssSnippet,
    hasPython: !!pythonSnippet
  };
}
