/**
 * HAR (HTTP Archive 1.2) 高性能解析器与数据清洗模块
 * 100% 纯本地运行，不向任何外部服务发送请求，保护用户的网络凭证与隐私
 */

/**
 * 格式化字节大小
 */
export function formatBytes(bytes, decimals = 1) {
  if (bytes === undefined || bytes === null || isNaN(bytes) || bytes < 0) return "0 B";
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i >= sizes.length) return (bytes / Math.pow(k, sizes.length - 1)).toFixed(dm) + " " + sizes[sizes.length - 1];
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/**
 * 格式化毫秒耗时
 */
export function formatDuration(ms) {
  if (ms === undefined || ms === null || isNaN(ms) || ms < 0) return "0 ms";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

/**
 * 解析 Cookie 字符串为键值对数组
 * 例如: "a=1; b=2; token=xyz" => [{ key: "a", value: "1" }, ...]
 */
export function parseCookieString(cookieStr) {
  if (!cookieStr || typeof cookieStr !== "string") return [];
  const result = [];
  const parts = cookieStr.split(";");
  for (let part of parts) {
    part = part.trim();
    if (!part) continue;
    const eqIdx = part.indexOf("=");
    if (eqIdx !== -1) {
      result.push({
        key: part.substring(0, eqIdx).trim(),
        value: part.substring(eqIdx + 1).trim(),
      });
    } else {
      result.push({
        key: part,
        value: "",
      });
    }
  }
  return result;
}

/**
 * 智能判断请求资源类型
 */
export function inferResourceType(entry) {
  // 如果 HAR 中已有 Chrome 自带的 _resourceType，优先使用
  if (entry._resourceType) {
    const t = String(entry._resourceType).toLowerCase();
    if (t === "xhr" || t === "fetch") return "fetch/xhr";
    if (t === "script" || t === "js") return "js";
    if (t === "stylesheet" || t === "css") return "css";
    if (t === "image" || t === "img") return "img";
    if (t === "document" || t === "html") return "doc";
    if (t === "font") return "font";
    if (t === "websocket") return "ws";
    if (t === "media") return "media";
    return t;
  }

  const mime = (entry.response?.content?.mimeType || "").toLowerCase();
  const url = (entry.request?.url || "").toLowerCase();

  if (mime.includes("json") || mime.includes("graphql")) return "fetch/xhr";
  if (mime.includes("javascript") || mime.includes("ecmascript") || url.endsWith(".js") || url.includes(".js?")) return "js";
  if (mime.includes("css") || url.endsWith(".css") || url.includes(".css?")) return "css";
  if (
    mime.includes("image") ||
    url.match(/\.(png|jpe?g|gif|webp|svg|ico|bmp|avif)(\?|$)/i)
  ) return "img";
  if (mime.includes("html") || mime.includes("xml")) return "doc";
  if (mime.includes("font") || url.match(/\.(woff2?|ttf|eot|otf)(\?|$)/i)) return "font";
  if (mime.includes("video") || mime.includes("audio")) return "media";
  if (mime.includes("text/plain")) return "text";

  return "other";
}

/**
 * 安全解析 JSON，解析失败返回 null
 */
export function safeJsonParse(str) {
  if (!str || typeof str !== "string") return null;
  const trimmed = str.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return null;
  }
  try {
    return JSON.parse(trimmed);
  } catch (e) {
    return null;
  }
}

/**
 * 解析单个 HAR Entry
 */
export function processEntry(entry, index) {
  const req = entry.request || {};
  const res = entry.response || {};
  const timings = entry.timings || {};

  // URL 与 Path 解析
  let urlObj = null;
  let fullUrl = req.url || "";
  let path = fullUrl;
  let host = "";
  let pathname = "";

  try {
    urlObj = new URL(fullUrl);
    host = urlObj.host;
    pathname = urlObj.pathname;
    path = pathname + urlObj.search;
  } catch (e) {
    host = fullUrl.replace(/^https?:\/\//, "").split("/")[0] || "";
    const slashIdx = fullUrl.indexOf("/", fullUrl.indexOf("://") + 3);
    path = slashIdx !== -1 ? fullUrl.substring(slashIdx) : fullUrl;
    pathname = path.split("?")[0];
  }

  // 状态分类
  const status = Number(res.status) || 0;
  let statusType = "failed";
  if (status >= 200 && status < 300) statusType = "success";
  else if (status >= 300 && status < 400) statusType = "redirect";
  else if (status >= 400 && status < 500) statusType = "client_error";
  else if (status >= 500) statusType = "server_error";

  const isError = status >= 400 || status === 0;
  const duration = Number(entry.time) || 0;
  const isSlow = duration > 1000;

  // 整理 Request Headers
  const reqHeaders = Array.isArray(req.headers) ? req.headers : [];
  let authHeaderValue = "";
  let authHeader = null;
  let rawCookieValue = "";

  for (const h of reqHeaders) {
    const nameLower = (h.name || "").toLowerCase();
    if (
      nameLower === "authorization" ||
      nameLower === "token" ||
      nameLower === "x-token" ||
      nameLower === "access-token"
    ) {
      if (!authHeader) {
        authHeader = {
          name: h.name,
          value: h.value || "",
        };
      }
    } else if (nameLower === "cookie") {
      rawCookieValue = h.value || "";
    }
  }

  // Cookie 键值对解析
  const parsedCookies = parseCookieString(rawCookieValue);

  // Response Headers
  const resHeaders = Array.isArray(res.headers) ? res.headers : [];

  // Query String 参数
  let queryString = Array.isArray(req.queryString) && req.queryString.length > 0
    ? req.queryString
    : [];
  if (queryString.length === 0 && urlObj) {
    // 从 URL 中兜底补全
    for (const [name, value] of urlObj.searchParams.entries()) {
      queryString.push({ name, value });
    }
  }

  // Post Data
  let postData = null;
  if (req.postData) {
    const pText = req.postData.text || "";
    const pMime = req.postData.mimeType || "";
    const pJson = safeJsonParse(pText);
    postData = {
      mimeType: pMime,
      text: pText,
      params: req.postData.params || [],
      isJson: pJson !== null,
      jsonData: pJson,
    };
  }

  // Response Content
  const content = res.content || {};
  const resText = content.text || "";
  const mimeType = content.mimeType || "";
  const isBase64 = content.encoding === "base64";

  let isImage = false;
  let imageDataUrl = "";
  if (
    mimeType.startsWith("image/") ||
    urlObj?.pathname?.match(/\.(png|jpe?g|gif|webp|svg|ico)$/i)
  ) {
    isImage = true;
    if (isBase64) {
      imageDataUrl = `data:${mimeType || "image/png"};base64,${resText}`;
    } else if (mimeType.includes("svg") && resText) {
      imageDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(resText)}`;
    }
  }

  let jsonData = null;
  let isJson = false;
  if (!isImage && !isBase64) {
    jsonData = safeJsonParse(resText);
    isJson = jsonData !== null;
  }

  // 计算传输大小
  const bodySize = Number(res.bodySize) >= 0 ? Number(res.bodySize) : (content.size || 0);
  const contentSize = Number(content.size) || 0;

  // 资源类型
  const resourceType = inferResourceType(entry);

  // 时延阶段计算 (timings)
  const dnsTime = Math.max(0, Number(timings.dns) || 0);
  const connectTime = Math.max(0, Number(timings.connect) || 0);
  const sslTime = Math.max(0, Number(timings.ssl) || 0);
  const sendTime = Math.max(0, Number(timings.send) || 0);
  const waitTime = Math.max(0, Number(timings.wait) || 0); // TTFB
  const receiveTime = Math.max(0, Number(timings.receive) || 0);
  const blockedTime = Math.max(0, Number(timings.blocked) || 0);

  return {
    id: `entry_${index + 1}`,
    index: index + 1,
    method: (req.method || "GET").toUpperCase(),
    url: fullUrl,
    host,
    path,
    pathname,
    status,
    statusText: res.statusText || "",
    statusType,
    isError,
    duration,
    durationFormatted: formatDuration(duration),
    isSlow,
    resourceType,
    size: bodySize,
    sizeFormatted: formatBytes(bodySize),
    contentSize,
    contentSizeFormatted: formatBytes(contentSize),
    httpVersion: req.httpVersion || res.httpVersion || "HTTP/1.1",
    serverIPAddress: entry.serverIPAddress || "",
    connection: entry.connection || "",
    startedDateTime: entry.startedDateTime || "",
    // Headers 深度分析
    reqHeaders,
    resHeaders,
    authHeader,
    cookieHeader: rawCookieValue ? {
      raw: rawCookieValue,
      list: parsedCookies,
      count: parsedCookies.length,
    } : null,
    queryString,
    postData,
    responseContent: {
      text: resText,
      size: contentSize,
      mimeType,
      isBase64,
      isImage,
      imageDataUrl,
      isJson,
      jsonData,
    },
    timings: {
      blocked: blockedTime,
      dns: dnsTime,
      connect: connectTime,
      ssl: sslTime,
      send: sendTime,
      wait: waitTime,
      receive: receiveTime,
      total: duration,
    },
  };
}

/**
 * 解析整个 HAR 数据结构
 */
export function parseHarData(harJson) {
  if (!harJson || !harJson.log) {
    throw new Error("无效的 HAR 格式：未找到 log 根节点");
  }

  const log = harJson.log;
  const rawEntries = Array.isArray(log.entries) ? log.entries : [];
  const entries = rawEntries.map((entry, index) => processEntry(entry, index));

  // 统计指标大盘
  const totalRequests = entries.length;
  let totalSize = 0;
  let errorCount = 0;
  let slowCount = 0;
  const statusCounts = { "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0, other: 0 };
  const typeCounts = {};
  const hostSet = new Set();

  for (const item of entries) {
    totalSize += item.size || 0;
    if (item.isError) errorCount++;
    if (item.isSlow) slowCount++;
    if (item.host) hostSet.add(item.host);

    // 状态码统计
    if (item.status >= 200 && item.status < 300) statusCounts["2xx"]++;
    else if (item.status >= 300 && item.status < 400) statusCounts["3xx"]++;
    else if (item.status >= 400 && item.status < 500) statusCounts["4xx"]++;
    else if (item.status >= 500) statusCounts["5xx"]++;
    else statusCounts.other++;

    // 资源类型统计
    typeCounts[item.resourceType] = (typeCounts[item.resourceType] || 0) + 1;
  }

  return {
    meta: {
      creator: log.creator || { name: "Unknown", version: "1.0" },
      browser: log.browser || null,
      pages: log.pages || [],
    },
    entries,
    stats: {
      totalRequests,
      totalSize,
      totalSizeFormatted: formatBytes(totalSize),
      errorCount,
      slowCount,
      statusCounts,
      typeCounts,
      uniqueHosts: hostSet.size,
      hostList: Array.from(hostSet),
    },
  };
}

/**
 * 生成贴近真实生产业务的演示 HAR 数据
 */
export function generateSampleHar() {
  const now = new Date().toISOString();
  return {
    log: {
      version: "1.2",
      creator: { name: "Network Flow Diagnostics Lab", version: "2.0.0" },
      browser: { name: "Chrome", version: "128.0.6613.120" },
      pages: [{ id: "page_1", title: "电商中台管理系统 - 订单控制台", startedDateTime: now }],
      entries: [
        {
          startedDateTime: now,
          time: 68.5,
          request: {
            method: "GET",
            url: "https://api.mall.internal/v1/auth/user-profile",
            httpVersion: "HTTP/2.0",
            headers: [
              { name: "Host", value: "api.mall.internal" },
              { name: "Accept", value: "application/json, text/plain, */*" },
              { name: "Authorization", value: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJVU1JfOTUyNyIsInJvbGUiOiJhZG1pbiIsIm5hbWUiOiLlvKDlsI/pn68iLCJleHAiOjE3ODk1Nzg5OTl9.SAMPLE_SIGNATURE_FOR_DEMO" },
              { name: "Cookie", value: "SESSIONID=sess_98234ab87cd9f; gr_user_id=usr_8820; theme_mode=dark; locale=zh-CN" },
              { name: "User-Agent", value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36" },
              { name: "X-Request-Id", value: "req_f8b1c4e9021a" },
            ],
            queryString: [],
            headersSize: 680,
            bodySize: 0,
          },
          response: {
            status: 200,
            statusText: "OK",
            httpVersion: "HTTP/2.0",
            headers: [
              { name: "content-type", value: "application/json; charset=utf-8" },
              { name: "server", value: "envoy/1.26.0" },
              { name: "x-response-time", value: "14ms" },
            ],
            content: {
              size: 512,
              mimeType: "application/json",
              text: JSON.stringify(
                {
                  code: 0,
                  message: "success",
                  data: {
                    userId: "USR_9527",
                    username: "zhang_developer",
                    realName: "张三 (核心架构组)",
                    roles: ["SUPER_ADMIN", "OPS_LEAD"],
                    permissions: ["order:read", "order:export", "system:config"],
                    tenant: { id: "TENANT_888", name: "全球电商事业群" },
                    settings: { darkTheme: true, notifications: true },
                  },
                },
                null,
                2
              ),
            },
            bodySize: 512,
          },
          timings: { blocked: 1.2, dns: 4.1, connect: 12.5, ssl: 10.2, send: 0.6, wait: 28.4, receive: 11.5 },
          serverIPAddress: "10.20.108.52",
        },
        {
          startedDateTime: now,
          time: 142.0,
          request: {
            method: "GET",
            url: "https://api.mall.internal/v1/orders/list?page=1&pageSize=3&status=PENDING_PAY",
            httpVersion: "HTTP/2.0",
            headers: [
              { name: "Host", value: "api.mall.internal" },
              { name: "Accept", value: "application/json" },
              { name: "Authorization", value: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJVU1JfOTUyNyJ9.SAMPLE_SIGNATURE" },
              { name: "Cookie", value: "SESSIONID=sess_98234ab87cd9f; locale=zh-CN" },
            ],
            queryString: [
              { name: "page", value: "1" },
              { name: "pageSize", value: "3" },
              { name: "status", value: "PENDING_PAY" },
            ],
            headersSize: 520,
            bodySize: 0,
          },
          response: {
            status: 200,
            statusText: "OK",
            httpVersion: "HTTP/2.0",
            headers: [
              { name: "content-type", value: "application/json; charset=utf-8" },
              { name: "cache-control", value: "no-cache, private" },
            ],
            content: {
              size: 1420,
              mimeType: "application/json",
              text: JSON.stringify(
                {
                  code: 0,
                  total: 128,
                  list: [
                    {
                      orderNo: "ORD-20260916-001",
                      buyer: "李明 (杭州)",
                      amount: 899.0,
                      currency: "CNY",
                      items: [
                        { skuId: "SKU-9921", title: "人体工学电脑椅 PRO", qty: 1, unitPrice: 899.0 },
                      ],
                      status: "PENDING_PAY",
                      createdAt: "2026-09-16 21:30:10",
                    },
                    {
                      orderNo: "ORD-20260916-002",
                      buyer: "王强 (深圳)",
                      amount: 14999.0,
                      currency: "CNY",
                      items: [
                        { skuId: "SKU-3320", title: "MacBook Pro M4 48G", qty: 1, unitPrice: 14999.0 },
                      ],
                      status: "PAID",
                      createdAt: "2026-09-16 21:35:42",
                    },
                    {
                      orderNo: "ORD-20260916-003",
                      buyer: "陈小羽 (上海)",
                      amount: 128.0,
                      currency: "CNY",
                      items: [
                        { skuId: "SKU-1082", title: "Type-C 编织快充线 2M", qty: 2, unitPrice: 64.0 },
                      ],
                      status: "SHIPPED",
                      createdAt: "2026-09-16 22:01:15",
                    },
                  ],
                },
                null,
                2
              ),
            },
            bodySize: 1420,
          },
          timings: { blocked: 0.8, dns: 2.1, connect: 8.3, ssl: 6.5, send: 0.4, wait: 110.2, receive: 13.7 },
          serverIPAddress: "10.20.108.52",
        },
        {
          startedDateTime: now,
          time: 320.0,
          request: {
            method: "POST",
            url: "https://api.mall.internal/v1/orders/checkout",
            httpVersion: "HTTP/2.0",
            headers: [
              { name: "Content-Type", value: "application/json" },
              { name: "Authorization", value: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.SAMPLE_SIGNATURE" },
              { name: "Cookie", value: "SESSIONID=sess_98234ab87cd9f" },
            ],
            queryString: [],
            postData: {
              mimeType: "application/json",
              text: JSON.stringify({
                orderNo: "ORD-20260916-001",
                paymentMethod: "ALIPAY",
                clientPlatform: "PC_WEB",
                couponCode: "SAVE100_VIP",
              }),
            },
            headersSize: 480,
            bodySize: 130,
          },
          response: {
            status: 400,
            statusText: "Bad Request",
            httpVersion: "HTTP/2.0",
            headers: [
              { name: "content-type", value: "application/json; charset=utf-8" },
              { name: "x-error-trace", value: "ERR_COUPON_EXPIRED_OR_INVALID" },
            ],
            content: {
              size: 280,
              mimeType: "application/json",
              text: JSON.stringify(
                {
                  code: 40003,
                  error: "优惠券已失效或不满足满减使用门槛",
                  details: {
                    couponCode: "SAVE100_VIP",
                    requiredThreshold: 1000.0,
                    currentAmount: 899.0,
                    difference: 101.0,
                  },
                  timestamp: 1789558900000,
                },
                null,
                2
              ),
            },
            bodySize: 280,
          },
          timings: { blocked: 1.5, dns: 0, connect: 0, ssl: 0, send: 0.8, wait: 310.0, receive: 7.7 },
          serverIPAddress: "10.20.108.52",
        },
        {
          startedDateTime: now,
          time: 1450.0,
          request: {
            method: "GET",
            url: "https://api.mall.internal/v1/analytics/daily-sales-metrics?from=2026-08-01&to=2026-09-16",
            httpVersion: "HTTP/2.0",
            headers: [
              { name: "Authorization", value: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.SAMPLE_SIGNATURE" },
            ],
            queryString: [
              { name: "from", value: "2026-08-01" },
              { name: "to", value: "2026-09-16" },
            ],
            headersSize: 420,
            bodySize: 0,
          },
          response: {
            status: 504,
            statusText: "Gateway Timeout",
            httpVersion: "HTTP/2.0",
            headers: [
              { name: "content-type", value: "application/json" },
              { name: "x-gateway", value: "nginx/1.24.0" },
            ],
            content: {
              size: 190,
              mimeType: "application/json",
              text: JSON.stringify({
                code: 50401,
                error: "上游大数据 ClickHouse 分析服务响应超时 (>1200ms)",
                querySql: "SELECT sum(amount), date FROM dw_orders GROUP BY date",
              }),
            },
            bodySize: 190,
          },
          timings: { blocked: 0.5, dns: 0, connect: 0, ssl: 0, send: 0.5, wait: 1445.0, receive: 4.0 },
          serverIPAddress: "10.20.108.52",
        },
        {
          startedDateTime: now,
          time: 42.0,
          request: {
            method: "GET",
            url: "https://cdn.mall.internal/static/css/dashboard.8f2d91.css",
            httpVersion: "HTTP/2.0",
            headers: [
              { name: "Accept", value: "text/css,*/*;q=0.1" },
            ],
            queryString: [],
            headersSize: 310,
            bodySize: 0,
          },
          response: {
            status: 200,
            statusText: "OK",
            httpVersion: "HTTP/2.0",
            headers: [
              { name: "content-type", value: "text/css; charset=utf-8" },
              { name: "cache-control", value: "public, max-age=31536000, immutable" },
            ],
            content: {
              size: 38400,
              mimeType: "text/css",
              text: "/* Dashboard Stylesheet */\n.dashboard-layout { display: flex; min-height: 100vh; }\n.sidebar { width: 240px; background: #0f172a; color: #fff; }",
            },
            bodySize: 8900,
          },
          timings: { blocked: 0.3, dns: 0, connect: 0, ssl: 0, send: 0.2, wait: 12.0, receive: 29.5 },
          serverIPAddress: "10.20.108.100",
        },
        {
          startedDateTime: now,
          time: 25.0,
          request: {
            method: "GET",
            url: "https://cdn.mall.internal/static/img/logo.svg",
            httpVersion: "HTTP/2.0",
            headers: [{ name: "Accept", value: "image/svg+xml,image/*,*/*;q=0.8" }],
            queryString: [],
            headersSize: 280,
            bodySize: 0,
          },
          response: {
            status: 304,
            statusText: "Not Modified",
            httpVersion: "HTTP/2.0",
            headers: [
              { name: "etag", value: "\"w/8a391-992f\"" },
              { name: "cache-control", value: "max-age=86400" },
            ],
            content: {
              size: 0,
              mimeType: "image/svg+xml",
              text: "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='#2563eb'><circle cx='12' cy='12' r='10'/></svg>",
            },
            bodySize: 0,
          },
          timings: { blocked: 0.2, dns: 0, connect: 0, ssl: 0, send: 0.1, wait: 24.0, receive: 0.7 },
          serverIPAddress: "10.20.108.100",
        },
      ],
    },
  };
}
