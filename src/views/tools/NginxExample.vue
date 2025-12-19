<template>
  <div class="nginx-generator">
    <a-row :gutter="0" style="height: 100%; overflow: hidden">
      <!-- 左侧配置区域 -->
      <a-col :span="14" class="config-panel">
        <div class="header">
          <h2>Nginx 配置生成器</h2>
          <a-space>
            <a-button @click="() => this.$router.push('/')"> 返回</a-button>
            <a-button @click="resetConfig" style="margin-left: 8px; margin-right: 8px">重置</a-button>
            <a-button type="primary" @click="copyConfig">一键复制配置</a-button>
          </a-space>
        </div>

        <div class="scroll-container">
          <a-tabs v-model:activeKey="activeTab">
            <!-- 1. 基础配置 (保持不变) -->
            <a-tab-pane key="basic" tab="基础设置">
              <a-form layout="vertical">
                <a-card title="核心参数" size="small" class="mb-2">
                  <a-row :gutter="16">
                    <a-col :span="12">
                      <a-form-item label="Worker Processes">
                        <a-input v-model:value="form.worker_processes" placeholder="auto" />
                      </a-form-item>
                    </a-col>
                    <a-col :span="12">
                      <a-form-item label="Worker Connections">
                        <a-input-number v-model:value="form.worker_connections" style="width: 100%" :min="1024" />
                      </a-form-item>
                    </a-col>
                    <a-col :span="12">
                      <a-form-item label="最大上传限制 (client_max_body_size)">
                        <a-input v-model:value="form.client_max_body_size" placeholder="e.g. 4096m" />
                        <div class="tip">解决上传大文件报错 413 问题</div>
                      </a-form-item>
                    </a-col>
                  </a-row>
                </a-card>

                <a-card title="服务器监听" size="small" class="mb-2">
                  <a-row :gutter="16">
                    <a-col :span="8">
                      <a-form-item label="监听端口">
                        <a-input-number v-model:value="form.port" style="width: 100%" />
                      </a-form-item>
                    </a-col>
                    <a-col :span="16">
                      <a-form-item label="Server Name">
                        <a-input v-model:value="form.server_name" placeholder="localhost" />
                      </a-form-item>
                    </a-col>
                  </a-row>
                </a-card>
              </a-form>
            </a-tab-pane>

            <!-- 2. 路径规则 -->
            <a-tab-pane key="proxy" tab="路径规则 (Location)">
              <div v-for="(loc, index) in form.locations" :key="index" class="location-card">
                <a-card size="small" :title="`规则 #${index + 1}`">
                  <template #extra>
                    <a-button danger type="text" size="small" @click="removeLocation(index)" v-if="form.locations.length > 1">删除</a-button>
                  </template>

                  <a-form layout="vertical">
                    <!-- 路径与模式选择 -->
                    <a-row :gutter="16">
                      <a-col :span="12">
                        <a-form-item label="监听路径 (Path)">
                          <a-input v-model:value="loc.path" placeholder="/file/" />
                        </a-form-item>
                      </a-col>
                      <a-col :span="12">
                        <a-form-item label="规则类型">
                          <a-radio-group v-model:value="loc.type" button-style="solid" size="small">
                            <a-radio-button value="static">SPA/静态(Root)</a-radio-button>
                            <a-radio-button value="file">文件下载(Alias)</a-radio-button>
                            <a-radio-button value="proxy">反向代理</a-radio-button>
                          </a-radio-group>
                        </a-form-item>
                      </a-col>
                    </a-row>

                    <!-- 模式 A: 静态资源 (Root) -->
                    <div v-if="loc.type === 'static'" class="mode-area static-mode">
                      <div class="mode-label">Root 模式: 适用于前端项目 (Vue/React)</div>
                      <a-row :gutter="16">
                        <a-col :span="12">
                          <a-form-item label="根目录 (root)">
                            <a-input v-model:value="loc.root" placeholder="/usr/share/nginx/html" />
                          </a-form-item>
                        </a-col>
                        <a-col :span="12">
                          <a-form-item label="默认文件 (index)">
                            <a-input v-model:value="loc.index" placeholder="index.html" />
                          </a-form-item>
                        </a-col>
                        <a-col :span="24">
                          <a-form-item label="Try Files (SPA 路由)">
                            <a-input v-model:value="loc.try_files" placeholder="$uri $uri/ /index.html" />
                          </a-form-item>
                        </a-col>
                      </a-row>
                    </div>

                    <!-- 模式 B: 文件下载 (Alias) [新增] -->
                    <div v-if="loc.type === 'file'" class="mode-area file-mode">
                      <div class="mode-label">Alias 模式: 适用于文件服务器/图片映射</div>
                      <a-row :gutter="16">
                        <a-col :span="16">
                          <a-form-item label="本地实际路径 (alias)">
                            <a-input v-model:value="loc.alias_path" placeholder="/usr/local/files/" />
                          </a-form-item>
                        </a-col>
                        <a-col :span="8">
                          <a-form-item label="目录浏览">
                            <a-checkbox v-model:checked="loc.autoindex">开启 Autoindex</a-checkbox>
                            <div v-if="loc.autoindex" style="margin-top: 5px">
                              <a-checkbox v-model:checked="loc.autoindex_exact_size">显示精确大小</a-checkbox>
                            </div>
                          </a-form-item>
                        </a-col>
                      </a-row>

                      <!-- Root vs Alias 模拟器 -->
                      <div class="path-simulator">
                        <div class="sim-header">路径映射解析器 (Root vs Alias)</div>
                        <div class="sim-box">
                          <div class="sim-row">
                            <span class="label">客户端请求:</span>
                            <span class="value request">{{ getSimulatedRequest(loc.path, "demo.pdf") }}</span>
                          </div>
                          <div class="sim-divider"></div>

                          <!-- Alias 结果 -->
                          <div class="sim-row">
                            <span class="label active">✅ Alias (当前):</span>
                            <span class="value result">{{ getFileSimulatedResult(loc, "alias") }}</span>
                          </div>
                          <div class="sim-explain">
                            Alias <strong>替换</strong>匹配到的路径: <code>{{ loc.path }}</code> 被替换为 <code>{{ loc.alias_path }}</code>
                          </div>

                          <div class="sim-divider dashed"></div>

                          <!-- Root 结果 (对比) -->
                          <div class="sim-row dimmed">
                            <span class="label">❌ 若用 Root:</span>
                            <span class="value result">{{ getFileSimulatedResult(loc, "root") }}</span>
                          </div>
                          <div class="sim-explain dimmed">
                            Root <strong>追加</strong>匹配到的路径: <code>{{ loc.alias_path }}</code> + <code>{{ loc.path }}</code
                            >...
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- 模式 C: 反向代理 -->
                    <div v-if="loc.type === 'proxy'" class="mode-area proxy-mode">
                      <div class="mode-label">Proxy 模式: 适用于后端 API 转发</div>
                      <a-row :gutter="16">
                        <a-col :span="16">
                          <a-form-item label="目标地址 (Upstream)">
                            <a-input v-model:value="loc.proxy_pass" placeholder="http://127.0.0.1:3000" />
                          </a-form-item>
                        </a-col>
                        <a-col :span="8">
                          <a-form-item label="WebSocket">
                            <a-checkbox v-model:checked="loc.websocket">支持</a-checkbox>
                          </a-form-item>
                        </a-col>
                      </a-row>

                      <!-- Proxy 模拟器 -->
                      <div class="path-simulator">
                        <div class="sim-header">转发策略模拟</div>
                        <a-radio-group v-model:value="loc.strip_type" class="mb-2">
                          <a-radio value="no_strip">保留前缀 (Append)</a-radio>
                          <a-radio value="strip">去除前缀 (Strip /)</a-radio>
                        </a-radio-group>
                        <div class="sim-box">
                          <div class="sim-row">
                            <span class="label">请求:</span>
                            <span class="value request">{{ getSimulatedRequest(loc.path, "api/data") }}</span>
                          </div>
                          <div class="sim-row">
                            <span class="label">转发到:</span>
                            <span class="value result" :class="{ 'strip-highlight': loc.strip_type === 'strip' }">
                              {{ getProxySimulatedResult(loc) }}
                            </span>
                          </div>
                        </div>
                        <div class="sim-tip" v-if="loc.strip_type === 'strip'">
                          <strong>Strip:</strong> <code>proxy_pass</code> 结尾加 <code>/</code>，Nginx 会自动剔除 <code>{{ loc.path }}</code
                          >。
                        </div>
                      </div>
                    </div>

                    <a-divider style="margin: 12px 0" />

                    <!-- 通用配置 -->
                    <a-row :gutter="16">
                      <a-col :span="24">
                        <a-form-item label="自定义 Header">
                          <a-input v-model:value="loc.custom_header" placeholder="X-Custom-Header value" />
                        </a-form-item>
                      </a-col>
                      <a-col :span="8">
                        <a-checkbox v-model:checked="loc.cors">跨域 (CORS)</a-checkbox>
                      </a-col>
                      <a-col :span="8">
                        <a-checkbox v-model:checked="loc.cache_enable">开启 expires 缓存</a-checkbox>
                      </a-col>
                    </a-row>
                  </a-form>
                </a-card>
              </div>
              <a-button type="dashed" block @click="addLocation" style="margin-top: 10px">+ 添加新路径规则</a-button>
            </a-tab-pane>

            <!-- 3. 高级配置 -->
            <a-tab-pane key="advanced" tab="SSL / Gzip / 优化">
              <a-form layout="vertical">
                <a-card title="Gzip" size="small" class="mb-2">
                  <a-switch v-model:checked="form.gzip.enabled" checked-children="开" un-checked-children="关" />
                  <div v-if="form.gzip.enabled" class="mt-2">
                    <a-form-item label="压缩级别">
                      <a-slider v-model:value="form.gzip.level" :min="1" :max="9" />
                    </a-form-item>
                    <a-form-item label="类型">
                      <a-textarea v-model:value="form.gzip.types" :rows="2" />
                    </a-form-item>
                  </div>
                </a-card>

                <a-card title="SSL" size="small" class="mb-2">
                  <a-switch v-model:checked="form.ssl.enabled" checked-children="HTTPS" un-checked-children="HTTP" />
                  <div v-if="form.ssl.enabled" class="mt-2">
                    <a-form-item label="证书路径">
                      <a-input v-model:value="form.ssl.cert_path" />
                    </a-form-item>
                    <a-form-item label="私钥路径">
                      <a-input v-model:value="form.ssl.key_path" />
                    </a-form-item>
                    <a-checkbox v-model:checked="form.ssl.force_https">强制跳转 HTTPS</a-checkbox>
                  </div>
                </a-card>

                <a-card title="缓存" size="small" class="mb-2">
                  <a-form-item label="默认过期时间">
                    <a-input v-model:value="form.cache_expires" placeholder="e.g. 12h" />
                  </a-form-item>
                </a-card>
              </a-form>
            </a-tab-pane>
          </a-tabs>
        </div>
      </a-col>

      <!-- 右侧预览区域 -->
      <a-col :span="10" class="preview-panel">
        <div class="code-container">
          <pre class="nginx-preview"><code class="language-nginx" v-html="highlightedCode"></code></pre>
        </div>
      </a-col>
    </a-row>
  </div>
</template>

<script>
import Prism from "prismjs";
import "prismjs/components/prism-nginx";
import { message } from "ant-design-vue";

const DEFAULT_FORM = {
  worker_processes: "auto",
  worker_connections: 1024,
  client_max_body_size: "4096m",
  port: 80,
  server_name: "localhost",
  cache_expires: "12h",
  ssl: {
    enabled: false,
    force_https: false,
    http2: true,
    cert_path: "/etc/nginx/ssl/server.crt",
    key_path: "/etc/nginx/ssl/server.key",
  },
  gzip: {
    enabled: true,
    level: 6,
    min_len: "1k",
    types: "text/plain application/javascript text/css application/xml text/javascript application/json image/svg+xml",
  },
  locations: [
    // 例子1: 前端静态资源
    {
      type: "static",
      path: "/",
      root: "/usr/share/nginx/html",
      index: "index.html",
      try_files: "$uri $uri/ /index.html",
      websocket: false,
      cors: false,
      cache_enable: false,
      custom_header: "Cache-Control no-cache,max-age=600",
    },
    // 例子2: 文件下载 (Alias)
    {
      type: "file",
      path: "/file/",
      alias_path: "/usr/local/file/", // 注意这里
      autoindex: false,
      autoindex_exact_size: false, // off -> 显示 MB/GB
      cors: true,
      cache_enable: false,
      custom_header: "",
    },
    // 例子3: 接口代理
    {
      type: "proxy",
      path: "/api/",
      proxy_pass: "http://127.0.0.1:8080",
      strip_type: "strip",
      websocket: false,
      cors: true,
      cache_enable: false,
    },
  ],
};

export default {
  name: "NginxConfigurator",
  data() {
    return {
      activeTab: "basic",
      form: JSON.parse(JSON.stringify(DEFAULT_FORM)),
    };
  },
  computed: {
    rawConfigCode() {
      const f = this.form;
      let conf = [];
      const timestamp = new Date().toLocaleString();

      conf.push(`# Generated at: ${timestamp}`);
      conf.push(`user nginx;`);
      conf.push(`worker_processes ${f.worker_processes};`);
      conf.push(`error_log /var/log/nginx/error.log warn;`);
      conf.push(`pid /var/run/nginx.pid;\n`);

      conf.push(`events {`);
      conf.push(`    worker_connections ${f.worker_connections};`);
      conf.push(`}\n`);

      conf.push(`http {`);
      conf.push(`    include       /etc/nginx/mime.types;`);
      conf.push(`    default_type  application/octet-stream;`);
      conf.push(`    sendfile        on;`);
      conf.push(`    keepalive_timeout  65;`);
      if (f.client_max_body_size) conf.push(`    client_max_body_size ${f.client_max_body_size};`);
      conf.push(``);

      if (f.gzip.enabled) {
        conf.push(`    gzip on;`);
        conf.push(`    gzip_types ${f.gzip.types};\n`);
      }

      conf.push(`    server {`);

      const listenPort = f.port;
      if (f.ssl.enabled) {
        conf.push(`        listen ${listenPort} ssl${f.ssl.http2 ? " http2" : ""};`);
        conf.push(`        server_name ${f.server_name};`);
        conf.push(`        ssl_certificate ${f.ssl.cert_path};`);
        conf.push(`        ssl_certificate_key ${f.ssl.key_path};`);
      } else {
        conf.push(`        listen ${listenPort};`);
        conf.push(`        server_name ${f.server_name};`);
      }
      conf.push(`        charset utf-8;\n`);

      f.locations.forEach((loc) => {
        let typeLabel = "Unknown";
        if (loc.type === "static") typeLabel = "Static (Root)";
        if (loc.type === "file") typeLabel = "File (Alias)";
        if (loc.type === "proxy") typeLabel = "Proxy";

        conf.push(`        # Location: ${loc.path} [${typeLabel}]`);
        conf.push(`        location ${loc.path} {`);

        // CORS
        if (loc.cors) {
          conf.push(`            add_header 'Access-Control-Allow-Origin' '*';`);
          conf.push(`            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';`);
          conf.push(`            if ($request_method = 'OPTIONS') { return 204; }`);
        }

        if (loc.custom_header) conf.push(`            add_header ${loc.custom_header};`);

        // --- 逻辑分支 ---
        if (loc.type === "static") {
          if (loc.root) conf.push(`            root ${loc.root};`);
          if (loc.index) conf.push(`            index ${loc.index};`);
          if (loc.try_files) conf.push(`            try_files ${loc.try_files};`);
        } else if (loc.type === "file") {
          // Alias 逻辑
          if (loc.alias_path) {
            // 确保 alias 目录以 / 结尾，这在 Nginx alias 中通常是最佳实践，避免拼接错误
            let safeAlias = loc.alias_path;
            if (!safeAlias.endsWith("/")) safeAlias += "/";
            conf.push(`            alias ${safeAlias};`);
          }
          if (loc.autoindex) {
            conf.push(`            autoindex false;`);
            conf.push(`            autoindex_exact_size ${loc.autoindex_exact_size ? "on" : "off"}; # off = 显示人性化大小(MB/GB)`);
            conf.push(`            autoindex_localtime on; # 显示服务器时间`);
          }
        } else if (loc.type === "proxy") {
          if (loc.proxy_pass) {
            let finalProxy = loc.proxy_pass;
            if (finalProxy.endsWith("/")) finalProxy = finalProxy.slice(0, -1);

            if (loc.strip_type === "strip") {
              conf.push(`            proxy_pass ${finalProxy}/;`);
            } else {
              conf.push(`            proxy_pass ${finalProxy};`);
            }

            conf.push(`            proxy_set_header Host $host;`);
            conf.push(`            proxy_set_header X-Real-IP $remote_addr;`);
            conf.push(`            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`);
          }
          if (loc.websocket) {
            conf.push(`            proxy_http_version 1.1;`);
            conf.push(`            proxy_set_header Upgrade $http_upgrade;`);
            conf.push(`            proxy_set_header Connection "upgrade";`);
          }
        }

        if (loc.cache_enable) {
          conf.push(`            expires ${f.cache_expires};`);
          conf.push(`            access_log off;`);
        }

        conf.push(`        }\n`);
      });

      conf.push(`    }`);

      if (f.ssl.enabled && f.ssl.force_https) {
        conf.push(`\n    server {`);
        conf.push(`        listen 80;`);
        conf.push(`        server_name ${f.server_name};`);
        conf.push(`        return 301 https://$host$request_uri;`);
        conf.push(`    }`);
      }

      conf.push(`}`);
      return conf.join("\n");
    },
    highlightedCode() {
      return Prism.highlight(this.rawConfigCode, Prism.languages.nginx, "nginx");
    },
  },
  methods: {
    addLocation() {
      this.form.locations.push({
        type: "file",
        path: "/download/",
        alias_path: "/var/www/files/",
        autoindex: false,
        autoindex_exact_size: false,
        cors: true,
        cache_enable: false,
      });
    },
    removeLocation(index) {
      this.form.locations.splice(index, 1);
    },
    copyConfig() {
      navigator.clipboard.writeText(this.rawConfigCode).then(() => {
        message.success("配置已复制");
      });
    },
    resetConfig() {
      this.form = JSON.parse(JSON.stringify(DEFAULT_FORM));
      message.info("已重置");
    },

    // --- 模拟器辅助函数 ---
    getSimulatedRequest(path, file) {
      const p = path.endsWith("/") ? path : path + "/";
      return `${p}${file}`;
    },
    // 计算 Alias 和 Root 的路径区别
    getFileSimulatedResult(loc, mode) {
      const file = "demo.pdf";
      const reqPath = loc.path.endsWith("/") ? loc.path : loc.path + "/";
      const rawTarget = loc.alias_path || loc.root || "/data/";
      const targetPath = rawTarget.endsWith("/") ? rawTarget : rawTarget + "/";

      if (mode === "alias") {
        // Alias: 替换
        // 规则: 把 request 中的 loc.path 部分替换为 loc.alias_path
        // 实际上就是 alias_path + filename
        return `${targetPath}${file}`;
      } else {
        // Root: 追加
        // 规则: root + request_uri
        // 即 targetPath + reqPath + file
        // 把 reqPath 开头的 / 去掉，避免双重斜杠 (浏览器显示逻辑)
        const cleanReq = reqPath.startsWith("/") ? reqPath.slice(1) : reqPath;
        return `${targetPath}${cleanReq}${file}`;
      }
    },
    getProxySimulatedResult(loc) {
      if (!loc.proxy_pass) return "等待输入...";
      let baseProxy = loc.proxy_pass.endsWith("/") ? loc.proxy_pass.slice(0, -1) : loc.proxy_pass;
      if (loc.strip_type === "strip") {
        return `${baseProxy}/api/data`;
      } else {
        const displayPath = loc.path.endsWith("/") ? loc.path : loc.path + "/";
        return `${baseProxy}${displayPath}api/data`;
      }
    },
  },
};
</script>

<style lang="scss">
/* PrismJS Theme */
pre.nginx-preview {
  margin: 0;
  padding: 16px;
  width: 100%;
  height: 100%;
  overflow: auto;
  font-family: "Menlo", "Monaco", "Consolas", monospace;
  font-size: 10px;
  line-height: 1.4;
  color: #e0e0e0;

  code {
    font-family: inherit;
  }

  .token.comment {
    color: #6a9955 !important;
    font-style: italic;
  }
  .token.directive {
    color: #ffffff;
    font-weight: bold;
  }
  .token.keyword {
    color: #569cd6;
  }
  .token.string {
    color: #ce9178;
  }
  .token.variable {
    color: #9cdcfe;
  }
  .token.number {
    color: #b5cea8;
  }
}
</style>

<style lang="scss" scoped>
.nginx-generator {
  height: calc(100vh - 50px);
  background-color: #f0f2f5;

  .config-panel {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 16px;
    background: #fff;
    border-right: 1px solid #e8e8e8;

    .header {
      flex-shrink: 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      h2 {
        margin: 0;
        font-size: 20px;
        font-weight: bold;
      }
    }

    .scroll-container {
      flex: 1;
      overflow-y: auto;
      padding-right: 8px;
    }
  }

  .preview-panel {
    height: 100%;
    background-color: #1e1e1e;
    .code-container {
      height: 100%;
      overflow: hidden;
    }
  }

  .location-card {
    margin-bottom: 16px;
    border: 1px solid #f0f0f0;
    border-radius: 4px;
    background: #fafafa;

    :deep(.ant-card-head) {
      min-height: 40px;
      background: #fff;
    }
  }

  /* 不同模式的背景色区分 */
  .mode-area {
    background: #fff;
    padding: 12px;
    border: 1px dashed #d9d9d9;
    border-radius: 4px;
    margin-bottom: 12px;
    position: relative;

    .mode-label {
      position: absolute;
      top: -10px;
      right: 10px;
      background: #fff;
      padding: 0 5px;
      font-size: 12px;
      color: #999;
    }

    &.static-mode {
      border-color: #52c41a;
      background: #f6ffed;
      .mode-label {
        color: #52c41a;
      }
    }
    &.file-mode {
      border-color: #faad14;
      background: #fffbe6;
      .mode-label {
        color: #faad14;
      }
    }
    &.proxy-mode {
      border-color: #1890ff;
      background: #e6f7ff;
      .mode-label {
        color: #1890ff;
      }
    }
  }

  /* 模拟器通用样式 */
  .path-simulator {
    margin-top: 12px;
    padding: 10px;
    background: #f0f2f5;
    border-radius: 6px;
    border: 1px solid #d9d9d9;

    .sim-header {
      font-weight: bold;
      margin-bottom: 8px;
      color: #333;
    }

    .sim-box {
      background: #2d2d2d;
      color: #ccc;
      padding: 8px 12px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 13px;

      .sim-row {
        display: flex;
        align-items: center;
        margin: 4px 0;
        &.dimmed {
          opacity: 0.6;
        }

        .label {
          width: 120px;
          color: #888;
          text-align: right;
          margin-right: 10px;
        }
        .label.active {
          color: #4ec9b0;
          font-weight: bold;
        }

        .value {
          color: #fff;
          word-break: break-all;
        }
        .value.request {
          color: #9cdcfe;
        }
        .value.result {
          color: #ce9178;
          transition: color 0.3s;
        }
        .value.result.strip-highlight {
          color: #4ec9b0;
        }
      }

      .sim-divider {
        height: 1px;
        background: #444;
        margin: 8px 0;
      }
      .sim-divider.dashed {
        border-top: 1px dashed #444;
        background: none;
      }

      .sim-explain {
        margin-left: 110px;
        font-size: 12px;
        color: #888;
        &.dimmed {
          color: #666;
        }
        code {
          background: #444;
          padding: 1px 4px;
          border-radius: 2px;
          color: #ccc;
        }
      }
    }

    .sim-tip {
      margin-top: 8px;
      font-size: 12px;
      color: #666;
      line-height: 1.4;
      code {
        background: #e6f7ff;
        border: 1px solid #91d5ff;
        padding: 1px 4px;
        border-radius: 3px;
      }
    }
  }

  .tip {
    font-size: 12px;
    color: #888;
    margin-top: 4px;
  }
  .mb-2 {
    margin-bottom: 16px;
  }
  .mt-2 {
    margin-top: 16px;
  }
}
</style>
