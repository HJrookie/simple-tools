// src/views/tools/CssConverterLogic.js

// =======================================================
//  1. Tailwind -> CSS Iframe Content
// =======================================================
export const TW_TO_CSS_IFRAME_CONTENT = `
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <div id="dummy"></div>
  <script>
    window.addEventListener('message', (event) => {
      const tailwindClasses = event.data;
      // 使用 @apply 将类应用到一个虚拟选择器上
      const styleSheetContent = \`.dummy-class { @apply \${tailwindClasses}; }\`;
      
      // 创建 style 标签并注入内容
      const styleEl = document.createElement('style');
      styleEl.setAttribute('type', 'text/tailwindcss');
      styleEl.innerHTML = styleSheetContent;
      document.head.appendChild(styleEl);

      // Tailwind 的 JIT 编译器是异步的，需要短暂延迟后才能读取到结果
      setTimeout(() => {
        // 编译后的 CSS 会在 id="tailwind-css" 的 style 标签里
        const generatedStyle = document.getElementById('tailwind-css');
        if (generatedStyle) {
            // 清理 CSS，只返回花括号内的内容
            let css = generatedStyle.innerHTML.replace(/\\.dummy-class\\s*\\{[^}]*\\}/, (match) => {
                return match.substring(match.indexOf('{') + 1, match.lastIndexOf('}')).trim();
            });
            // 美化格式
            css = css.split(';').map(s => s.trim()).join(';\\n  ');
            if (!css.endsWith(';')) css += ';';

            event.source.postMessage(css, event.origin);
        } else {
            event.source.postMessage('/* 编译失败，请检查类名是否正确 */', event.origin);
        }
      }, 200); // 200ms 延迟通常足够 JIT 编译完成
    });
  <\/script>
</body>
</html>
`;

// =======================================================
//  2. CSS -> Tailwind Conversion Logic (Best-Effort)
// =======================================================

// 简化的映射表，实际应用中会更庞大
const cssToTailwindMap = {
  "display": { "flex": "flex", "block": "block", "inline-block": "inline-block", "grid": "grid", "none": "hidden" },
  "flex-direction": { "row": "flex-row", "column": "flex-col" },
  "justify-content": {
    "flex-start": "justify-start",
    "flex-end": "justify-end",
    "center": "justify-center",
    "space-between": "justify-between",
    "space-around": "justify-around",
  },
  "align-items": { "flex-start": "items-start", "flex-end": "items-end", "center": "items-center", "baseline": "items-baseline" },
  "text-align": { "left": "text-left", "center": "text-center", "right": "text-right" },
  "font-weight": { "400": "font-normal", "500": "font-medium", "600": "font-semibold", "700": "font-bold" },
  "position": { "absolute": "absolute", "relative": "relative", "fixed": "fixed" },
  // 更多...
};

// 将 px 或 rem 转换为 Tailwind spacing unit (1 unit = 0.25rem = 4px)
function sizeToTailwind(value) {
  if (value === "0") return "0";
  let px = 0;
  if (value.endsWith("px")) {
    px = parseFloat(value);
  } else if (value.endsWith("rem")) {
    px = parseFloat(value) * 16;
  } else {
    return null; // 无法处理的单位
  }
  const unit = Math.round(px / 4);
  if (unit > 96) return null; // 超出 Tailwind 默认范围
  return unit.toString();
}

function colorToTailwind(value) {
  // 这是一个极简化的实现，真实场景需要一个庞大的颜色映射表
  const colorMap = {
    "#ffffff": "white",
    "#000000": "black",
    "transparent": "transparent",
    "#f87171": "red-400",
    "#ef4444": "red-500", //...
    "#3b82f6": "blue-500", //...
    "#1f2937": "gray-800", //...
  };
  return colorMap[value.toLowerCase()] || null;
}

export function convertCssToTailwind(cssText) {
  // 移除注释和选择器部分，只关注花括号内的样式规则
  const cssBody = cssText.substring(cssText.indexOf("{") + 1, cssText.lastIndexOf("}"));

  const rules = cssBody
    .split(";")
    .map((r) => r.trim())
    .filter(Boolean);
  const tailwindClasses = [];

  for (const rule of rules) {
    const [property, value] = rule.split(":").map((s) => s.trim());
    let twClass = null;

    // 1. 查表法
    if (cssToTailwindMap[property] && cssToTailwindMap[property][value]) {
      twClass = cssToTailwindMap[property][value];
    }
    // 2. 动态值处理
    else if (["padding", "margin", "width", "height", "top", "left", "right", "bottom"].includes(property)) {
      const prefix = { "padding": "p", "margin": "m", "width": "w", "height": "h" }[property] || property;
      const size = sizeToTailwind(value);
      if (size) twClass = `${prefix}-${size}`;
    } else if (property === "border-radius") {
      const size = sizeToTailwind(value);
      if (size) {
        const sizeMap = { "1": "sm", "2": "", "3": "lg", "4": "xl", "6": "2xl", "8": "3xl" };
        twClass = sizeMap[size] ? `rounded-${sizeMap[size]}` : "rounded";
      }
    } else if (property.endsWith("color")) {
      const prefix = property.startsWith("background") ? "bg" : "text";
      const colorName = colorToTailwind(value);
      if (colorName) twClass = `${prefix}-${colorName}`;
    }

    if (twClass) {
      tailwindClasses.push(twClass);
    } else {
      // 对于无法转换的，可以用 arbitrary values 语法
      tailwindClasses.push(`[${property}:${value.replace(/\s/g, "_")}]`);
    }
  }
  return tailwindClasses.join(" ");
}
