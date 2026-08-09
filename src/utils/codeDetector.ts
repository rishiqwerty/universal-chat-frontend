export type ExtractedBrowserCode = {
  isBrowserCode: boolean;
  fullHtml: string;
  langSummary: string;
  hasHtml: boolean;
  hasJs: boolean;
  hasCss: boolean;
};

const BROWSER_LANGUAGES = new Set([
  "html",
  "htm",
  "js",
  "javascript",
  "jsx",
  "tsx",
  "css",
  "svg",
  "web"
]);

export function isBrowserLanguage(lang: string): boolean {
  if (!lang) return false;
  const cleanLang = lang.toLowerCase().replace(/^language-/, "").trim();
  return BROWSER_LANGUAGES.has(cleanLang);
}

export function extractBrowserCode(markdown: string): ExtractedBrowserCode {
  if (!markdown) {
    return { isBrowserCode: false, fullHtml: "", langSummary: "", hasHtml: false, hasJs: false, hasCss: false };
  }

  // Regex to match code blocks: ```lang ... ```
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  let htmlSnippet = "";
  let cssSnippet = "";
  let jsSnippet = "";
  let svgSnippet = "";
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
    }
  }

  if (!hasBrowserCode) {
    return { isBrowserCode: false, fullHtml: "", langSummary: "", hasHtml: false, hasJs: false, hasCss: false };
  }

  // Synthesize complete runnable HTML document
  let fullHtml = "";

  if (htmlSnippet.includes("<html") || htmlSnippet.includes("<!DOCTYPE") || htmlSnippet.includes("<body")) {
    fullHtml = htmlSnippet;
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
  } else {
    fullHtml = `<!DOCTYPE html>
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
      function send(type, args) {
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
    })();
  </script>
  ${jsSnippet ? `<script>\ntry {\n${jsSnippet}\n} catch(e) { console.error("Runtime Error: " + e.message); }\n</script>` : ""}
</body>
</html>`;
  }

  const langSummary = Array.from(langsFound).join(" + ");
  return {
    isBrowserCode: true,
    fullHtml,
    langSummary,
    hasHtml: !!htmlSnippet || !!svgSnippet,
    hasJs: !!jsSnippet,
    hasCss: !!cssSnippet
  };
}
