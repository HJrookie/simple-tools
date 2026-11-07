/**
 * HAR 请求数据抽离与导出工具模块
 * 支持按条件抽离请求参数 (Query/Body) 及响应结果 (Response)，支持 JSON、CSV、Markdown、标准 HAR 等格式导出
 */

/**
 * 将 Query 参数数组转换为易读的 Key-Value 对象
 */
export function formatQueryParamsToObject(queryParams) {
  if (!Array.isArray(queryParams) || queryParams.length === 0) {
    return null;
  }
  const obj = {};
  for (const item of queryParams) {
    const key = item.name;
    const val = item.value;
    if (obj[key] !== undefined) {
      if (Array.isArray(obj[key])) {
        obj[key].push(val);
      } else {
        obj[key] = [obj[key], val];
      }
    } else {
      obj[key] = val;
    }
  }
  return obj;
}

/**
 * 将 URL 编码的表单文本解析为 Key-Value 对象
 */
export function parseUrlEncoded(text) {
  if (!text || typeof text !== "string") return null;
  const obj = {};
  const pairs = text.split("&");
  for (const pair of pairs) {
    if (!pair) continue;
    const eqIdx = pair.indexOf("=");
    if (eqIdx !== -1) {
      const k = decodeURIComponent(pair.substring(0, eqIdx).replace(/\+/g, " "));
      const v = decodeURIComponent(pair.substring(eqIdx + 1).replace(/\+/g, " "));
      obj[k] = v;
    } else {
      obj[decodeURIComponent(pair)] = "";
    }
  }
  return obj;
}

/**
 * 抽离单条 Entry 的核心业务参数与返回值
 * @param {Object} entry processEntry 解析后的对象
 * @param {Object} options 抽离选项
 */
export function extractEntryData(entry, options = {}) {
  const {
    includeHeaders = false,
    includeTimings = false,
    parseJson = true,
  } = options;

  // 1. 处理 Query 参数
  let queryData = null;
  if (entry.queryString && entry.queryString.length > 0) {
    queryData = formatQueryParamsToObject(entry.queryString);
  }

  // 2. 处理 Request Body / Payload
  let requestBodyData = null;
  if (entry.postData) {
    if (parseJson && entry.postData.isJson && entry.postData.jsonData !== null) {
      requestBodyData = entry.postData.jsonData;
    } else if (
      entry.postData.mimeType &&
      entry.postData.mimeType.includes("application/x-www-form-urlencoded")
    ) {
      requestBodyData = parseUrlEncoded(entry.postData.text) || entry.postData.text;
    } else {
      requestBodyData = entry.postData.text || null;
    }
  }

  // 3. 处理 Response Content / 返回值
  let responseData = null;
  const rc = entry.responseContent || {};
  if (rc.isImage) {
    responseData = `[图片资源, MIME: ${rc.mimeType}, 大小: ${entry.sizeFormatted}]`;
  } else if (rc.isBase64) {
    responseData = `[Base64 二进制数据, MIME: ${rc.mimeType}, 大小: ${entry.sizeFormatted}]`;
  } else if (parseJson && rc.isJson && rc.jsonData !== null) {
    responseData = rc.jsonData;
  } else {
    responseData = rc.text || "(无响应体内容)";
  }

  // 4. 组装抽离后的精简对象
  const extracted = {
    index: entry.index,
    method: entry.method,
    url: entry.url,
    pathname: entry.pathname || entry.path,
    status: entry.status,
    statusText: entry.statusText,
    durationMs: Math.round(entry.duration),
    durationFormatted: entry.durationFormatted,
    sizeFormatted: entry.sizeFormatted,
    resourceType: entry.resourceType,
    startedDateTime: entry.startedDateTime,
    // 参数部分
    queryParams: queryData,
    requestBody: requestBodyData,
    // 返回值部分
    response: responseData,
  };

  // 可选附带信息
  if (includeHeaders) {
    extracted.requestHeaders = (entry.reqHeaders || []).reduce((acc, h) => {
      acc[h.name] = h.value;
      return acc;
    }, {});
    extracted.responseHeaders = (entry.resHeaders || []).reduce((acc, h) => {
      acc[h.name] = h.value;
      return acc;
    }, {});
  }

  if (includeTimings) {
    extracted.timings = entry.timings;
  }

  return extracted;
}

/**
 * 导出为精炼抽离的 JSON 格式
 */
export function generateExtractedJson(entries, options = {}) {
  const { asArrayOnly = false, filterSummary = null } = options;
  const list = entries.map((e) => extractEntryData(e, options));

  if (asArrayOnly) {
    return JSON.stringify(list, null, 2);
  }

  const result = {
    meta: {
      tool: "HAR Analyzer - Request & Response Extractor",
      exportedAt: new Date().toISOString(),
      totalExtracted: list.length,
      filters: filterSummary || "None",
    },
    requests: list,
  };

  return JSON.stringify(result, null, 2);
}

/**
 * CSV 单元格内容安全转义 (RFC 4180)
 */
function escapeCsvCell(val) {
  if (val === undefined || val === null) return '""';
  let str = "";
  if (typeof val === "object") {
    str = JSON.stringify(val);
  } else {
    str = String(val);
  }
  // 替换双引号为两对双引号
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * 导出为 CSV 表格 (带 UTF-8 BOM，Excel 双击无乱码)
 */
export function generateExtractedCsv(entries, options = {}) {
  const rows = [];
  // 表头
  const headers = [
    "序号",
    "请求方式(Method)",
    "状态码(Status)",
    "耗时(ms)",
    "体积",
    "接口路径(Path)",
    "完整URL",
    "URL查询参数(Query)",
    "请求载荷(Request Body)",
    "响应返回值(Response Body)",
    "请求时间",
  ];
  rows.push(headers.map(escapeCsvCell).join(","));

  for (const entry of entries) {
    const data = extractEntryData(entry, options);
    const row = [
      data.index,
      data.method,
      `${data.status} ${data.statusText || ""}`.trim(),
      data.durationMs,
      data.sizeFormatted,
      data.pathname,
      data.url,
      data.queryParams ? JSON.stringify(data.queryParams) : "",
      data.requestBody ? (typeof data.requestBody === "object" ? JSON.stringify(data.requestBody) : data.requestBody) : "",
      data.response ? (typeof data.response === "object" ? JSON.stringify(data.response) : data.response) : "",
      data.startedDateTime || "",
    ];
    rows.push(row.map(escapeCsvCell).join(","));
  }

  // \uFEFF 是 UTF-8 的 BOM 头，确保 Excel 正确识别编码
  return "\uFEFF" + rows.join("\r\n");
}

/**
 * 导出为 API 接口文档 Markdown 格式
 */
export function generateExtractedMarkdown(entries, options = {}) {
  const { filterSummary = "" } = options;
  const lines = [];

  lines.push("# HAR 请求与响应数据抽离清单");
  lines.push("");
  lines.push(`- **导出时间**: ${new Date().toLocaleString()}`);
  lines.push(`- **抽离请求数**: 共 ${entries.length} 条接口`);
  if (filterSummary) {
    lines.push(`- **过滤条件**: ${filterSummary}`);
  }
  lines.push("");
  lines.push("---");
  lines.push("");

  entries.forEach((entry, idx) => {
    const data = extractEntryData(entry, options);
    lines.push(`## ${idx + 1}. [${data.method}] ${data.pathname}`);
    lines.push("");
    lines.push(`- **完整 URL**: \`${data.url}\``);
    lines.push(`- **响应状态**: \`${data.status} ${data.statusText}\``);
    lines.push(`- **请求耗时**: ${data.durationFormatted} (${data.durationMs} ms)`);
    lines.push(`- **传输大小**: ${data.sizeFormatted}`);
    if (data.startedDateTime) {
      lines.push(`- **发起时间**: ${data.startedDateTime}`);
    }
    lines.push("");

    // 查询参数
    if (data.queryParams) {
      lines.push("### 🔹 URL 查询参数 (Query String)");
      lines.push("```json");
      lines.push(JSON.stringify(data.queryParams, null, 2));
      lines.push("```");
      lines.push("");
    }

    // 请求体
    if (data.requestBody) {
      lines.push("### 📤 请求体载荷 (Request Body)");
      if (typeof data.requestBody === "object") {
        lines.push("```json");
        lines.push(JSON.stringify(data.requestBody, null, 2));
        lines.push("```");
      } else {
        lines.push("```text");
        lines.push(data.requestBody);
        lines.push("```");
      }
      lines.push("");
    }

    // 响应返回值
    lines.push("### 📥 响应返回值 (Response Body)");
    if (typeof data.response === "object") {
      lines.push("```json");
      lines.push(JSON.stringify(data.response, null, 2));
      lines.push("```");
    } else {
      lines.push("```text");
      lines.push(data.response || "(无响应内容)");
      lines.push("```");
    }
    lines.push("");
    lines.push("---");
    lines.push("");
  });

  return lines.join("\n");
}

/**
 * 导出过滤后的标准 HAR 1.2 JSON
 */
export function generateFilteredHar(rawHar, filteredEntries) {
  if (!rawHar || !rawHar.log) {
    // 降级兜底方案
    return JSON.stringify({
      log: {
        version: "1.2",
        creator: { name: "HAR Analyzer", version: "1.0.0" },
        entries: filteredEntries.map((e) => e._raw || {}),
      },
    }, null, 2);
  }

  const selectedIds = new Set(filteredEntries.map((e) => e.id));
  const newEntries = (rawHar.log.entries || []).filter((_, idx) => {
    return selectedIds.has(`entry_${idx + 1}`);
  });

  const cloned = JSON.parse(JSON.stringify(rawHar));
  cloned.log.entries = newEntries;
  return JSON.stringify(cloned, null, 2);
}

/**
 * 纯前端触发文件下载
 */
export function downloadFile(content, filename, mimeType = "application/json;charset=utf-8") {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
