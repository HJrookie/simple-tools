<template>
  <div class="har-analyzer-container">
    <!-- 1. 顶部操作栏 -->
    <header class="har-header">
      <div class="header-left">
        <a-button @click="$router.push('/')" class="back-btn">
          <template #icon><ArrowLeftOutlined /></template>
          返回首页
        </a-button>
        <div class="title-group">
          <h1 class="page-title">
            <ApiOutlined class="title-icon" /> 超大 HAR 网络流全景诊断器
          </h1>
          <span class="safe-badge">
            <SafetyCertificateOutlined /> 100% 纯本地解析 · 凭证与敏感数据绝不上云
          </span>
        </div>
      </div>

      <div class="header-right">
        <template v-if="hasData">
          <a-space>
            <a-upload :before-upload="handleFileUpload" :show-upload-list="false" accept=".har,.json">
              <a-button type="default">
                <template #icon><UploadOutlined /></template>
                更换 HAR 文件
              </a-button>
            </a-upload>
            <a-button danger ghost @click="clearData">
              <template #icon><DeleteOutlined /></template>
              清空
            </a-button>
          </a-space>
        </template>
        <template v-else>
          <a-button type="primary" ghost @click="loadDemoData">
            <template #icon><ThunderboltOutlined /></template>
            加载演示数据 (Demo)
          </a-button>
        </template>
      </div>
    </header>

    <!-- 2. 空状态：拖拽上传大屏 -->
    <div v-if="!hasData" class="empty-upload-view">
      <div class="upload-box-wrapper">
        <a-upload-dragger
          name="harfile"
          :multiple="false"
          :show-upload-list="false"
          :before-upload="handleFileUpload"
          accept=".har,.json"
          class="har-dragger"
        >
          <div class="dragger-body">
            <div class="dragger-icon-circle">
              <InboxOutlined />
            </div>
            <p class="dragger-title">点击或将浏览器导出的 .har 抓包文件拖拽到此处</p>
            <p class="dragger-desc">
              专为大文件与远程排障优化 · 毫秒级提取请求头、响应体、Cookie 与 Authorization Token
            </p>
            <div class="feature-badges">
              <span class="f-badge">⚡ 50MB+ 大文件流畅解析</span>
              <span class="f-badge">🔑 Token / Cookie 一键脱敏复制</span>
              <span class="f-badge">🌲 交互式 JSON 响应折叠树</span>
              <span class="f-badge">🚨 4xx/5xx 错误与慢接口瞬时高亮</span>
            </div>
          </div>
        </a-upload-dragger>

        <div class="demo-tip-banner">
          <span>暂无 HAR 文件？点击按钮即可体验全套排障功能：</span>
          <a-button type="primary" size="small" @click="loadDemoData">
            立即加载电商中台抓包示例
          </a-button>
        </div>
      </div>
    </div>

    <!-- 3. 主视图：数据表格与统计分析 -->
    <div v-else class="har-main-view">
      <!-- 统计指标大盘 (水平单行紧凑排布) -->
      <div class="stats-bar">
        <div class="stat-item">
          <span class="stat-label">总请求数:</span>
          <span class="stat-val total">{{ stats.totalRequests }}</span>
        </div>
        <div class="stat-divider"></div>
        <div
          class="stat-item"
          :class="{ 'clickable-stat': true, 'active-stat': onlyErrors }"
          @click="toggleOnlyErrors"
          title="点击快速筛选/取消 4xx/5xx 异常接口"
        >
          <span class="stat-label">异常接口 (4xx/5xx):</span>
          <span class="stat-val" :class="stats.errorCount > 0 ? 'error' : 'normal'">
            {{ stats.errorCount }}
          </span>
        </div>
        <div class="stat-divider"></div>
        <div
          class="stat-item"
          :class="{ 'clickable-stat': true, 'active-stat': onlySlow }"
          @click="toggleOnlySlow"
          title="点击快速筛选/取消 >1s 慢接口"
        >
          <span class="stat-label">慢接口 (>1s):</span>
          <span class="stat-val" :class="stats.slowCount > 0 ? 'slow' : 'normal'">
            {{ stats.slowCount }}
          </span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-label">总传输流量:</span>
          <span class="stat-val">{{ stats.totalSizeFormatted }}</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-label">域名总数:</span>
          <span class="stat-val">{{ stats.uniqueHosts }}</span>
        </div>
      </div>

      <!-- 筛选与搜索工具栏 -->
      <div class="filter-bar">
        <div class="filter-left">
          <!-- 关键字过滤 -->
          <a-input
            v-model:value="searchQuery"
            placeholder="搜索路径、URL、状态码或域名..."
            allow-clear
            class="search-input"
          >
            <template #prefix>
              <SearchOutlined style="color: #94a3b8" />
            </template>
          </a-input>

          <!-- 状态分类胶囊 -->
          <div class="filter-pills status-pills">
            <span
              class="pill"
              :class="{ active: statusFilter === 'all' }"
              @click="statusFilter = 'all'"
            >
              全部 ({{ stats.totalRequests }})
            </span>
            <span
              class="pill pill-success"
              :class="{ active: statusFilter === '2xx' }"
              @click="statusFilter = '2xx'"
            >
              2xx ({{ stats.statusCounts['2xx'] || 0 }})
            </span>
            <span
              class="pill pill-warning"
              :class="{ active: statusFilter === '4xx' }"
              @click="statusFilter = '4xx'"
            >
              4xx ({{ stats.statusCounts['4xx'] || 0 }})
            </span>
            <span
              class="pill pill-danger"
              :class="{ active: statusFilter === '5xx' }"
              @click="statusFilter = '5xx'"
            >
              5xx ({{ stats.statusCounts['5xx'] || 0 }})
            </span>
          </div>

          <!-- 资源类型分类胶囊 -->
          <div class="filter-pills type-pills">
            <span
              v-for="typeKey in availableTypes"
              :key="typeKey"
              class="pill"
              :class="{ active: typeFilter === typeKey }"
              @click="typeFilter = typeKey"
            >
              {{ typeKey.toUpperCase() }}
              <small v-if="typeKey !== 'all'">({{ stats.typeCounts[typeKey] || 0 }})</small>
            </span>
          </div>
        </div>

        <div class="filter-right">
          <a-checkbox v-model:checked="onlyErrors">仅看 4xx/5xx 异常</a-checkbox>
          <a-checkbox v-model:checked="onlySlow">仅看慢接口 (>1s)</a-checkbox>
          <span class="match-count">显示 {{ filteredEntries.length }} / {{ entries.length }} 条</span>
        </div>
      </div>

      <!-- 主视图分栏区域 (左侧表格 + 右侧抽屉/详情卡片) -->
      <div class="workspace-area">
        <!-- 请求表格 -->
        <div class="table-container">
          <a-table
            :dataSource="filteredEntries"
            :columns="tableColumns"
            :pagination="tablePagination"
            rowKey="id"
            size="small"
            :scroll="{ x: 1000, y: 'calc(100vh - 280px)' }"
            :customRow="customRowHandler"
            :rowClassName="getRowClassName"
          >
            <!-- 状态码列 -->
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'status'">
                <div class="status-cell">
                  <span class="status-dot" :class="`dot-${record.statusType}`"></span>
                  <span class="status-code" :class="`text-${record.statusType}`">
                    {{ record.status || "FAIL" }}
                  </span>
                </div>
              </template>

              <!-- Method 方法列 -->
              <template v-else-if="column.key === 'method'">
                <span class="method-tag" :class="`method-${record.method.toLowerCase()}`">
                  {{ record.method }}
                </span>
              </template>

              <!-- 路径与名称列 -->
              <template v-else-if="column.key === 'path'">
                <div class="path-cell-wrapper">
                  <a-tooltip :title="record.url" placement="topLeft">
                    <span class="path-text" :class="{ 'error-path': record.isError }">
                      {{ record.pathname || record.path }}
                    </span>
                  </a-tooltip>
                  <a-tooltip title="复制完整 URL">
                    <button class="copy-url-btn" @click.stop="copyText(record.url, 'URL 已复制')">
                      <CopyOutlined />
                    </button>
                  </a-tooltip>
                </div>
              </template>

              <!-- 域名列 -->
              <template v-else-if="column.key === 'host'">
                <span class="host-cell" :title="record.host">{{ record.host }}</span>
              </template>

              <!-- 资源类型列 -->
              <template v-else-if="column.key === 'resourceType'">
                <span class="type-badge-sm">{{ record.resourceType }}</span>
              </template>

              <!-- 大小列 -->
              <template v-else-if="column.key === 'size'">
                <span class="size-cell">{{ record.sizeFormatted }}</span>
              </template>

              <!-- 耗时列 -->
              <template v-else-if="column.key === 'time'">
                <span class="time-cell" :class="{ 'slow-time': record.isSlow }">
                  {{ record.durationFormatted }}
                </span>
              </template>

              <!-- 耗时条/时延可视化列 -->
              <template v-else-if="column.key === 'waterfall'">
                <a-tooltip placement="top">
                  <template #title>
                    <div class="waterfall-tip">
                      <div>等待首字节 (TTFB): {{ Math.round(record.timings.wait) }} ms</div>
                      <div>内容下载: {{ Math.round(record.timings.receive) }} ms</div>
                      <div>总耗时: {{ record.durationFormatted }}</div>
                    </div>
                  </template>
                  <div class="mini-waterfall-bar">
                    <div
                      class="bar-segment bar-wait"
                      :style="{ width: getWaterfallWidth(record.timings.wait, record.duration) }"
                    ></div>
                    <div
                      class="bar-segment bar-receive"
                      :style="{ width: getWaterfallWidth(record.timings.receive, record.duration) }"
                    ></div>
                  </div>
                </a-tooltip>
              </template>
            </template>
          </a-table>
        </div>
      </div>
    </div>

    <!-- 4. 核心抽屉：请求全景深度详情面板 -->
    <a-drawer
      :open="drawerVisible"
      :title="null"
      :closable="false"
      placement="right"
      width="780px"
      :bodyStyle="{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%' }"
      @close="drawerVisible = false"
    >
      <div v-if="selectedEntry" class="drawer-container">
        <!-- 抽屉头部 -->
        <div class="drawer-header">
          <div class="dh-left">
            <span class="method-tag" :class="`method-${selectedEntry.method.toLowerCase()}`">
              {{ selectedEntry.method }}
            </span>
            <div class="status-cell">
              <span class="status-dot" :class="`dot-${selectedEntry.statusType}`"></span>
              <span class="status-code" :class="`text-${selectedEntry.statusType}`">
                {{ selectedEntry.status }} {{ selectedEntry.statusText }}
              </span>
            </div>
            <span class="dh-time">耗时: {{ selectedEntry.durationFormatted }}</span>
            <span class="dh-size">体积: {{ selectedEntry.sizeFormatted }}</span>
          </div>

          <div class="dh-right">
            <!-- 上一个/下一个切换 -->
            <a-button-group size="small">
              <a-button :disabled="selectedEntryIndex <= 0" @click="navigateEntry(-1)">
                <LeftOutlined /> 上一个
              </a-button>
              <a-button :disabled="selectedEntryIndex >= filteredEntries.length - 1" @click="navigateEntry(1)">
                下一个 <RightOutlined />
              </a-button>
            </a-button-group>
            <a-button size="small" type="text" class="close-drawer-btn" @click="drawerVisible = false">
              ✕
            </a-button>
          </div>
        </div>

        <!-- 完整 URL 快捷复制栏 -->
        <div class="drawer-url-bar">
          <span class="url-label">URL:</span>
          <span class="url-text" :title="selectedEntry.url">{{ selectedEntry.url }}</span>
          <a-button size="small" type="link" @click="copyText(selectedEntry.url, '已复制完整 URL')">
            <CopyOutlined /> 复制 URL
          </a-button>
          <a-button size="small" type="link" @click="copyAsCurl(selectedEntry)">
            <CodeOutlined /> 复制 cURL
          </a-button>
        </div>

        <!-- 选项卡切换 -->
        <div class="drawer-tabs-wrapper">
          <a-tabs v-model:activeKey="activeDetailTab" class="custom-tabs">
            <!-- TAB 1: 标头 (Headers) -->
            <a-tab-pane key="headers" tab="标头 (Headers)">
              <div class="tab-scroll-content">
                <!-- 标头局部过滤搜索栏 -->
                <div class="header-search-bar-box">
                  <a-input
                    v-model:value="headerSearchQuery"
                    placeholder="在请求头/响应头中搜索名称或值 (如: cookie, token, content-type...)"
                    allow-clear
                    size="small"
                    class="header-filter-input"
                  >
                    <template #prefix>
                      <SearchOutlined style="color: #94a3b8" />
                    </template>
                  </a-input>
                </div>

                <!-- 认证与凭证提取 (仅在有相关标头时展示，原样完整呈现，不剥离任何内容) -->
                <div v-if="selectedEntry.authHeader || selectedEntry.cookieHeader" class="credentials-card">
                  <!-- 认证标头 (有什么显示什么) -->
                  <div v-if="selectedEntry.authHeader" class="auth-section">
                    <div class="cred-header-line">
                      <span class="cred-tag">
                        <KeyOutlined /> {{ selectedEntry.authHeader.name }}
                      </span>
                      <a-button
                        size="small"
                        type="primary"
                        ghost
                        @click="copyText(selectedEntry.authHeader.value, `已复制 ${selectedEntry.authHeader.name}`)"
                      >
                        <CopyOutlined /> 复制完整值
                      </a-button>
                    </div>
                    <div class="cred-code-box">{{ selectedEntry.authHeader.value }}</div>
                  </div>

                  <!-- Cookie 列表与一键复制 -->
                  <div v-if="selectedEntry.cookieHeader" class="cookie-section">
                    <div class="cred-header-line">
                      <span class="cred-tag">
                        Cookie (共 {{ selectedEntry.cookieHeader.count }} 个键值对)
                      </span>
                      <a-button
                        size="small"
                        type="primary"
                        ghost
                        @click="copyText(selectedEntry.cookieHeader.raw, '已复制完整 Cookie 串')"
                      >
                        <CopyOutlined /> 复制完整 Cookie
                      </a-button>
                    </div>

                    <!-- 展开的 Cookie 键值表格 -->
                    <div class="cookie-table">
                      <div
                        v-for="(ck, ckIdx) in selectedEntry.cookieHeader.list"
                        :key="ckIdx"
                        class="cookie-row"
                      >
                        <span class="ck-name">{{ ck.key }}</span>
                        <span class="ck-val" :title="ck.value">{{ ck.value }}</span>
                        <button
                          class="ck-copy-btn"
                          @click="copyText(ck.value, `已复制 Cookie [${ck.key}] 的值`)"
                        >
                          复制值
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- General 概览 -->
                <div class="headers-block">
                  <div class="block-header">常规 (General)</div>
                  <div class="kv-grid">
                    <div class="kv-row">
                      <span class="kv-key">Request URL:</span>
                      <span class="kv-value">{{ selectedEntry.url }}</span>
                    </div>
                    <div class="kv-row">
                      <span class="kv-key">Request Method:</span>
                      <span class="kv-value">{{ selectedEntry.method }}</span>
                    </div>
                    <div class="kv-row">
                      <span class="kv-key">Status Code:</span>
                      <span class="kv-value" :class="`text-${selectedEntry.statusType}`">
                        {{ selectedEntry.status }} {{ selectedEntry.statusText }}
                      </span>
                    </div>
                    <div class="kv-row" v-if="selectedEntry.serverIPAddress">
                      <span class="kv-key">Remote Address:</span>
                      <span class="kv-value">{{ selectedEntry.serverIPAddress }}</span>
                    </div>
                    <div class="kv-row">
                      <span class="kv-key">HTTP Version:</span>
                      <span class="kv-value">{{ selectedEntry.httpVersion }}</span>
                    </div>
                  </div>
                </div>

                <!-- 响应头 (Response Headers) - 原汁原味展示 -->
                <div class="headers-block">
                  <div class="block-header">
                    <span>
                      响应标头 (Response Headers) -
                      <template v-if="headerSearchQuery">
                        匹配 {{ filteredResHeaders.length }} / 共 {{ selectedEntry.resHeaders.length }} 项
                      </template>
                      <template v-else>
                        {{ selectedEntry.resHeaders.length }} 项
                      </template>
                    </span>
                    <a-button size="small" type="link" @click="copyHeadersAsText(filteredResHeaders)">
                      <CopyOutlined /> 复制全部
                    </a-button>
                  </div>
                  <div class="kv-table">
                    <div v-if="filteredResHeaders.length === 0" class="empty-header-search">
                      未找到匹配的响应标头
                    </div>
                    <div v-for="(h, idx) in filteredResHeaders" :key="idx" class="kv-table-row">
                      <span class="h-name">{{ h.name }}:</span>
                      <span class="h-val">{{ h.value }}</span>
                      <button class="h-copy-btn" @click="copyText(h.value, `已复制标头 [${h.name}] 的值`)">
                        复制值
                      </button>
                    </div>
                  </div>
                </div>

                <!-- 请求头 (Request Headers) - 原汁原味展示 -->
                <div class="headers-block">
                  <div class="block-header">
                    <span>
                      请求标头 (Request Headers) -
                      <template v-if="headerSearchQuery">
                        匹配 {{ filteredReqHeaders.length }} / 共 {{ selectedEntry.reqHeaders.length }} 项
                      </template>
                      <template v-else>
                        {{ selectedEntry.reqHeaders.length }} 项
                      </template>
                    </span>
                    <a-button size="small" type="link" @click="copyHeadersAsText(filteredReqHeaders)">
                      <CopyOutlined /> 复制全部
                    </a-button>
                  </div>
                  <div class="kv-table">
                    <div v-if="filteredReqHeaders.length === 0" class="empty-header-search">
                      未找到匹配的请求标头
                    </div>
                    <div v-for="(h, idx) in filteredReqHeaders" :key="idx" class="kv-table-row">
                      <span class="h-name">{{ h.name }}:</span>
                      <span class="h-val">{{ h.value }}</span>
                      <button class="h-copy-btn" @click="copyText(h.value, `已复制标头 [${h.name}] 的值`)">
                        复制值
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </a-tab-pane>

            <!-- TAB 2: 响应 (Response) -->
            <a-tab-pane key="response" tab="响应 (Response)">
              <div class="tab-response-container">
                <!-- 响应头部控制栏 -->
                <div class="res-control-bar">
                  <div class="rc-left">
                    <span class="rc-mime">{{ selectedEntry.responseContent.mimeType || "text/plain" }}</span>
                    <span class="rc-size">{{ selectedEntry.responseContent.size }} 字节</span>
                  </div>

                  <div class="rc-right">
                    <!-- 视图模式切换 -->
                    <a-radio-group v-model:value="responseViewMode" size="small" button-style="solid">
                      <a-radio-button value="tree" v-if="selectedEntry.responseContent.isJson">
                        结构化树 (JSON)
                      </a-radio-button>
                      <a-radio-button value="formatted">格式化代码</a-radio-button>
                      <a-radio-button value="raw">原始文本</a-radio-button>
                      <a-radio-button value="image" v-if="selectedEntry.responseContent.isImage">
                        图片预览
                      </a-radio-button>
                    </a-radio-group>

                    <a-button size="small" type="primary" ghost @click="copyResponseText">
                      <CopyOutlined /> 复制响应体
                    </a-button>
                    <a-button size="small" @click="downloadResponse">
                      <DownloadOutlined /> 下载文件
                    </a-button>
                  </div>
                </div>

                <!-- 视图展示区 -->
                <div class="res-view-wrapper">
                  <!-- 1. JSON 树状视图 -->
                  <div v-if="responseViewMode === 'tree' && selectedEntry.responseContent.isJson" class="tree-view-area">
                    <JsonTreeView :data="selectedEntry.responseContent.jsonData" />
                  </div>

                  <!-- 2. 图片预览 -->
                  <div v-else-if="responseViewMode === 'image' && selectedEntry.responseContent.isImage" class="image-preview-box">
                    <img :src="selectedEntry.responseContent.imageDataUrl" alt="Response Image" class="preview-img" />
                    <div class="img-meta-hint">
                      图片格式: {{ selectedEntry.responseContent.mimeType }}
                    </div>
                  </div>

                  <!-- 3. 格式化代码视图 / 4. 原始文本视图 -->
                  <div v-else class="raw-code-box">
                    <pre class="code-pre"><code>{{ getDisplayResponseText() }}</code></pre>
                  </div>
                </div>
              </div>
            </a-tab-pane>

            <!-- TAB 3: 载荷 (Payload / Query) -->
            <a-tab-pane key="payload" tab="载荷 (Payload / Query)">
              <div class="tab-scroll-content">
                <!-- 查询参数 Query Parameters (GET) -->
                <div class="headers-block" v-if="selectedEntry.queryString.length > 0">
                  <div class="block-header">
                    <span>查询参数 (Query String Parameters) - {{ selectedEntry.queryString.length }} 项</span>
                    <a-button size="small" type="link" @click="copyQueryParams(selectedEntry.queryString)">
                      <CopyOutlined /> 复制全部参数
                    </a-button>
                  </div>
                  <div class="kv-table">
                    <div v-for="(q, idx) in selectedEntry.queryString" :key="idx" class="kv-table-row">
                      <span class="h-name">{{ q.name }}:</span>
                      <span class="h-val">{{ q.value }}</span>
                      <button class="h-copy-btn" @click="copyText(q.value, `已复制参数 [${q.name}]`)">
                        复制
                      </button>
                    </div>
                  </div>
                </div>

                <!-- 请求体 (Request Payload / POST Data) -->
                <div class="headers-block" v-if="selectedEntry.postData">
                  <div class="block-header">
                    <span>请求主体 (Request Payload) - {{ selectedEntry.postData.mimeType }}</span>
                    <a-button size="small" type="link" @click="copyText(selectedEntry.postData.text, '已复制请求主体')">
                      <CopyOutlined /> 复制
                    </a-button>
                  </div>

                  <!-- 若请求体是 JSON，提供树状图 -->
                  <div v-if="selectedEntry.postData.isJson" style="height: 380px; margin-top: 8px">
                    <JsonTreeView :data="selectedEntry.postData.jsonData" />
                  </div>
                  <div v-else class="raw-code-box" style="margin-top: 8px">
                    <pre class="code-pre"><code>{{ selectedEntry.postData.text }}</code></pre>
                  </div>
                </div>

                <div
                  v-if="selectedEntry.queryString.length === 0 && !selectedEntry.postData"
                  class="empty-tip-box"
                >
                  该请求无 URL 查询参数或 POST 请求载荷
                </div>
              </div>
            </a-tab-pane>

            <!-- TAB 4: 时延剖析 (Timings) -->
            <a-tab-pane key="timings" tab="耗时分析 (Timings)">
              <div class="tab-scroll-content">
                <div class="timings-summary-banner">
                  <div class="total-duration-label">总请求耗时</div>
                  <div class="total-duration-val">{{ selectedEntry.durationFormatted }}</div>
                </div>

                <div class="timing-stages-list">
                  <div class="stage-row" v-if="selectedEntry.timings.blocked > 0">
                    <span class="stage-name">排队与阻塞 (Queueing & Blocked):</span>
                    <span class="stage-val">{{ Math.round(selectedEntry.timings.blocked) }} ms</span>
                  </div>
                  <div class="stage-row" v-if="selectedEntry.timings.dns > 0">
                    <span class="stage-name">DNS 域名解析 (DNS Lookup):</span>
                    <span class="stage-val">{{ Math.round(selectedEntry.timings.dns) }} ms</span>
                  </div>
                  <div class="stage-row" v-if="selectedEntry.timings.connect > 0">
                    <span class="stage-name">TCP 握手连接 (Initial Connection):</span>
                    <span class="stage-val">{{ Math.round(selectedEntry.timings.connect) }} ms</span>
                  </div>
                  <div class="stage-row" v-if="selectedEntry.timings.ssl > 0">
                    <span class="stage-name">SSL/TLS 证书加密握手 (SSL):</span>
                    <span class="stage-val">{{ Math.round(selectedEntry.timings.ssl) }} ms</span>
                  </div>
                  <div class="stage-row">
                    <span class="stage-name">等待首字节响应 (TTFB - Waiting):</span>
                    <span class="stage-val highlight-wait">{{ Math.round(selectedEntry.timings.wait) }} ms</span>
                  </div>
                  <div class="stage-row">
                    <span class="stage-name">内容下载传输 (Content Download):</span>
                    <span class="stage-val">{{ Math.round(selectedEntry.timings.receive) }} ms</span>
                  </div>
                </div>

                <!-- 耗时图谱条 -->
                <div class="timing-chart-box">
                  <div class="chart-title">各阶段时间占比条:</div>
                  <div class="large-waterfall-bar">
                    <div
                      class="l-bar l-dns"
                      :style="{ width: getWaterfallWidth(selectedEntry.timings.dns, selectedEntry.duration) }"
                      :title="`DNS: ${selectedEntry.timings.dns}ms`"
                    ></div>
                    <div
                      class="l-bar l-connect"
                      :style="{ width: getWaterfallWidth(selectedEntry.timings.connect, selectedEntry.duration) }"
                      :title="`Connect: ${selectedEntry.timings.connect}ms`"
                    ></div>
                    <div
                      class="l-bar l-wait"
                      :style="{ width: getWaterfallWidth(selectedEntry.timings.wait, selectedEntry.duration) }"
                      :title="`TTFB: ${selectedEntry.timings.wait}ms`"
                    ></div>
                    <div
                      class="l-bar l-receive"
                      :style="{ width: getWaterfallWidth(selectedEntry.timings.receive, selectedEntry.duration) }"
                      :title="`Download: ${selectedEntry.timings.receive}ms`"
                    ></div>
                  </div>
                  <div class="chart-legend">
                    <span class="lg-item"><span class="lg-dot dot-dns"></span> DNS</span>
                    <span class="lg-item"><span class="lg-dot dot-connect"></span> Connect</span>
                    <span class="lg-item"><span class="lg-dot dot-wait"></span> TTFB (首字节等待)</span>
                    <span class="lg-item"><span class="lg-dot dot-receive"></span> Download (数据传输)</span>
                  </div>
                </div>
              </div>
            </a-tab-pane>
          </a-tabs>
        </div>
      </div>
    </a-drawer>
  </div>
</template>

<script>
import {
  Button,
  ButtonGroup,
  Upload,
  Table,
  Input,
  Drawer,
  Tabs,
  Radio,
  Tooltip,
  Checkbox,
  Space,
  message,
} from "ant-design-vue";

import {
  UploadOutlined,
  DeleteOutlined,
  InboxOutlined,
  SearchOutlined,
  CopyOutlined,
  DownloadOutlined,
  ThunderboltOutlined,
  CodeOutlined,
  ApiOutlined,
  ArrowLeftOutlined,
  KeyOutlined,
  SafetyCertificateOutlined,
  LeftOutlined,
  RightOutlined,
} from "@ant-design/icons-vue";

import JsonTreeView from "../../components/har/JsonTreeView.vue";
import { parseHarData, generateSampleHar } from "../../utils/har/harParser.js";

export default {
  name: "HarAnalyzer",
  components: {
    JsonTreeView,
    "a-button": Button,
    "a-button-group": ButtonGroup,
    "a-upload": Upload,
    "a-upload-dragger": Upload.Dragger,
    "a-table": Table,
    "a-input": Input,
    "a-drawer": Drawer,
    "a-tabs": Tabs,
    "a-tab-pane": Tabs.TabPane,
    "a-radio-group": Radio.Group,
    "a-radio-button": Radio.Button,
    "a-tooltip": Tooltip,
    "a-checkbox": Checkbox,
    "a-space": Space,
    UploadOutlined,
    DeleteOutlined,
    InboxOutlined,
    SearchOutlined,
    CopyOutlined,
    DownloadOutlined,
    ThunderboltOutlined,
    CodeOutlined,
    ApiOutlined,
    ArrowLeftOutlined,
    KeyOutlined,
    SafetyCertificateOutlined,
    LeftOutlined,
    RightOutlined,
  },
  data() {
    return {
      hasData: false,
      entries: [],
      stats: {
        totalRequests: 0,
        totalSize: 0,
        totalSizeFormatted: "0 B",
        errorCount: 0,
        slowCount: 0,
        statusCounts: { "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0, other: 0 },
        typeCounts: {},
        uniqueHosts: 0,
      },
      // 筛选条件
      searchQuery: "",
      statusFilter: "all",
      typeFilter: "all",
      onlyErrors: false,
      onlySlow: false,
      // 表格分页
      tablePagination: {
        current: 1,
        pageSize: 50,
        showSizeChanger: true,
        pageSizeOptions: ["20", "50", "100", "200"],
        showTotal: (total) => `共 ${total} 条请求`,
      },
      // 抽屉详情
      drawerVisible: false,
      selectedEntryId: null,
      activeDetailTab: "headers",
      responseViewMode: "tree", // 'tree' | 'formatted' | 'raw' | 'image'
      headerSearchQuery: "",
      // 列定义
      tableColumns: [
        { title: "状态", key: "status", width: 90, fixed: "left" },
        { title: "方法", key: "method", width: 85 },
        { title: "请求路径 (Path)", key: "path", ellipsis: true },
        { title: "域名 (Host)", key: "host", width: 180, ellipsis: true },
        { title: "类型", key: "resourceType", width: 95 },
        { title: "大小", key: "size", width: 95, sorter: (a, b) => a.size - b.size },
        { title: "耗时", key: "time", width: 95, sorter: (a, b) => a.duration - b.duration },
        { title: "耗时分布", key: "waterfall", width: 140 },
      ],
    };
  },
  computed: {
    availableTypes() {
      const types = ["all", "fetch/xhr", "js", "css", "img", "doc", "other"];
      return types;
    },
    filteredEntries() {
      let list = this.entries;
      const q = this.searchQuery.trim().toLowerCase();

      // 关键词搜索
      if (q) {
        list = list.filter((item) => {
          return (
            item.url.toLowerCase().includes(q) ||
            item.path.toLowerCase().includes(q) ||
            item.method.toLowerCase().includes(q) ||
            String(item.status).includes(q) ||
            item.host.toLowerCase().includes(q) ||
            item.resourceType.toLowerCase().includes(q)
          );
        });
      }

      // 状态码筛选
      if (this.statusFilter !== "all") {
        if (this.statusFilter === "2xx") list = list.filter((i) => i.status >= 200 && i.status < 300);
        else if (this.statusFilter === "4xx") list = list.filter((i) => i.status >= 400 && i.status < 500);
        else if (this.statusFilter === "5xx") list = list.filter((i) => i.status >= 500);
      }

      // 资源类型筛选
      if (this.typeFilter !== "all") {
        list = list.filter((i) => i.resourceType === this.typeFilter);
      }

      // 仅看异常
      if (this.onlyErrors) {
        list = list.filter((i) => i.isError);
      }

      // 仅看慢接口
      if (this.onlySlow) {
        list = list.filter((i) => i.isSlow);
      }

      return list;
    },
    selectedEntry() {
      if (!this.selectedEntryId) return null;
      return this.entries.find((i) => i.id === this.selectedEntryId) || null;
    },
    selectedEntryIndex() {
      if (!this.selectedEntryId) return -1;
      return this.filteredEntries.findIndex((i) => i.id === this.selectedEntryId);
    },
    filteredReqHeaders() {
      if (!this.selectedEntry) return [];
      const headers = this.selectedEntry.reqHeaders || [];
      const q = this.headerSearchQuery.trim().toLowerCase();
      if (!q) return headers;
      return headers.filter(
        (h) =>
          (h.name || "").toLowerCase().includes(q) ||
          (h.value || "").toLowerCase().includes(q)
      );
    },
    filteredResHeaders() {
      if (!this.selectedEntry) return [];
      const headers = this.selectedEntry.resHeaders || [];
      const q = this.headerSearchQuery.trim().toLowerCase();
      if (!q) return headers;
      return headers.filter(
        (h) =>
          (h.name || "").toLowerCase().includes(q) ||
          (h.value || "").toLowerCase().includes(q)
      );
    },
  },
  methods: {
    handleFileUpload(file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target.result);
          const parsed = parseHarData(json);
          this.entries = parsed.entries;
          this.stats = parsed.stats;
          this.hasData = true;
          this.selectedEntryId = null;
          this.drawerVisible = false;
          message.success(`成功载入 ${this.entries.length} 个网络请求`);
        } catch (err) {
          message.error("HAR 文件解析失败，请确保格式正确：" + err.message);
        }
      };
      reader.readAsText(file, "utf-8");
      return false; // 阻止默认上传行为
    },
    loadDemoData() {
      const demoHar = generateSampleHar();
      const parsed = parseHarData(demoHar);
      this.entries = parsed.entries;
      this.stats = parsed.stats;
      this.hasData = true;
      // 默认选中第一个演示项并打开
      if (this.entries.length > 0) {
        this.selectEntry(this.entries[0]);
      }
      message.success("已加载模拟中台抓包演示数据！");
    },
    clearData() {
      this.hasData = false;
      this.entries = [];
      this.selectedEntryId = null;
      this.drawerVisible = false;
      this.searchQuery = "";
      this.statusFilter = "all";
      this.typeFilter = "all";
      this.onlyErrors = false;
      this.onlySlow = false;
      message.info("已清空抓包数据");
    },
    customRowHandler(record) {
      return {
        onClick: () => {
          this.selectEntry(record);
        },
      };
    },
    getRowClassName(record) {
      const classes = ["clickable-row"];
      if (record.id === this.selectedEntryId) classes.push("selected-row");
      if (record.isError) classes.push("error-row-bg");
      return classes.join(" ");
    },
    selectEntry(record) {
      this.selectedEntryId = record.id;
      // 自动切换视图模式
      if (record.responseContent.isJson) {
        this.responseViewMode = "tree";
      } else if (record.responseContent.isImage) {
        this.responseViewMode = "image";
      } else {
        this.responseViewMode = "formatted";
      }
      this.drawerVisible = true;
    },
    navigateEntry(offset) {
      const nextIdx = this.selectedEntryIndex + offset;
      if (nextIdx >= 0 && nextIdx < this.filteredEntries.length) {
        this.selectEntry(this.filteredEntries[nextIdx]);
      }
    },
    toggleOnlyErrors() {
      this.onlyErrors = !this.onlyErrors;
    },
    toggleOnlySlow() {
      this.onlySlow = !this.onlySlow;
    },
    getWaterfallWidth(partMs, totalMs) {
      if (!totalMs || totalMs <= 0 || !partMs || partMs <= 0) return "0%";
      const pct = Math.min(100, Math.max(4, (partMs / totalMs) * 100));
      return `${pct}%`;
    },
    getDisplayResponseText() {
      if (!this.selectedEntry) return "";
      const rc = this.selectedEntry.responseContent;
      if (this.responseViewMode === "raw") {
        return rc.text;
      }
      if (rc.isJson) {
        return JSON.stringify(rc.jsonData, null, 2);
      }
      return rc.text || "(无响应正文)";
    },
    copyText(text, successMsg = "已复制到剪贴板") {
      if (!text) {
        message.warning("内容为空");
        return;
      }
      navigator.clipboard.writeText(text).then(
        () => message.success(successMsg),
        () => message.error("复制失败，请手动选取")
      );
    },
    copyHeadersAsText(headers) {
      if (!headers || headers.length === 0) return;
      const lines = headers.map((h) => `${h.name}: ${h.value}`);
      this.copyText(lines.join("\n"), "已复制全部标头");
    },
    copyQueryParams(params) {
      if (!params || params.length === 0) return;
      const lines = params.map((p) => `${p.name}=${p.value}`);
      this.copyText(lines.join("&"), "已复制查询参数");
    },
    copyResponseText() {
      if (!this.selectedEntry) return;
      const rc = this.selectedEntry.responseContent;
      const content = rc.isJson ? JSON.stringify(rc.jsonData, null, 2) : rc.text;
      this.copyText(content, "已复制响应主体");
    },
    copyAsCurl(entry) {
      if (!entry) return;
      let curl = `curl '${entry.url}'`;
      if (entry.method !== "GET") {
        curl += ` -X '${entry.method}'`;
      }
      for (const h of entry.reqHeaders) {
        if (!h.name.startsWith(":")) {
          curl += ` -H '${h.name}: ${h.value.replace(/'/g, "\\'")}'`;
        }
      }
      if (entry.postData && entry.postData.text) {
        curl += ` --data-raw '${entry.postData.text.replace(/'/g, "\\'")}'`;
      }
      curl += " --compressed";
      this.copyText(curl, "已复制为 cURL 命令");
    },
    downloadResponse() {
      if (!this.selectedEntry) return;
      const rc = this.selectedEntry.responseContent;
      const content = rc.isJson ? JSON.stringify(rc.jsonData, null, 2) : rc.text;
      const ext = rc.isJson ? "json" : rc.mimeType.includes("html") ? "html" : "txt";
      const blob = new Blob([content], { type: rc.mimeType || "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `response_${this.selectedEntry.pathname.split("/").pop() || "data"}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      message.success("已启动下载");
    },
  },
};
</script>

<style scoped>
.har-analyzer-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f8fafc;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

/* 顶部操作栏 */
.har-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
  z-index: 10;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-btn {
  border-radius: 6px;
}

.title-group {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-icon {
  color: #2563eb;
  font-size: 20px;
}

.safe-badge {
  font-size: 12px;
  color: #059669;
  background: #ecfdf5;
  padding: 2px 8px;
  border-radius: 12px;
  border: 1px solid #a7f3d0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* 空状态拖拽大屏 (占页面 90%+ 宽度) */
.empty-upload-view {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 24px;
  box-sizing: border-box;
  overflow: hidden;
}

.upload-box-wrapper {
  width: 92%;
  max-width: 1680px;
  height: calc(100vh - 100px);
  max-height: 680px;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
}

.har-dragger {
  flex: 1;
  background: #ffffff !important;
  border: 2px dashed #94a3b8 !important;
  border-radius: 16px !important;
  transition: all 0.25s ease-in-out;
  display: flex !important;
  flex-direction: column !important;
}

:deep(.har-dragger .ant-upload.ant-upload-drag) {
  height: 100% !important;
  display: flex !important;
  flex-direction: column !important;
}

:deep(.har-dragger .ant-upload-btn) {
  display: flex !important;
  flex-direction: column !important;
  justify-content: center !important;
  align-items: center !important;
  height: 100% !important;
  padding: 32px 24px !important;
}

.har-dragger:hover {
  border-color: #2563eb !important;
  background: #f0f7ff !important;
  box-shadow: 0 12px 32px -4px rgba(37, 99, 235, 0.12) !important;
}

.dragger-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.dragger-icon-circle {
  width: 84px;
  height: 84px;
  margin: 0 auto 20px;
  background: #eff6ff;
  color: #2563eb;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 42px;
  box-shadow: 0 6px 18px rgba(37, 99, 235, 0.14);
  transition: transform 0.2s ease;
}

.har-dragger:hover .dragger-icon-circle {
  transform: translateY(-4px) scale(1.06);
}

.dragger-title {
  font-size: 21px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 8px;
  letter-spacing: -0.3px;
}

.dragger-desc {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 28px;
  max-width: 600px;
  line-height: 1.6;
}

.feature-badges {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px;
}

.f-badge {
  font-size: 13px;
  background: #f8fafc;
  color: #334155;
  padding: 6px 16px;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  font-weight: 500;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.demo-tip-banner {
  margin-top: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 13px;
  color: #64748b;
  background: #ffffff;
  padding: 10px 20px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
}

/* 主视图 */
.har-main-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 8px 14px;
  gap: 8px;
}

/* 统计条 (水平紧凑排布，大幅释放 Y 轴视口) */
.stats-bar {
  display: flex;
  align-items: center;
  background: #ffffff;
  padding: 6px 14px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  gap: 16px;
  flex-wrap: wrap;
  min-height: 34px;
}

.stat-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  user-select: none;
}

.clickable-stat {
  cursor: pointer;
  padding: 2px 8px;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.clickable-stat:hover {
  background: #f1f5f9;
}

.clickable-stat.active-stat {
  background: #fee2e2;
  box-shadow: 0 0 0 1px #fca5a5;
}

.stat-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
  white-space: nowrap;
}

.stat-val {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.stat-val.error {
  color: #dc2626;
  background: #fee2e2;
  padding: 1px 6px;
  border-radius: 4px;
}

.stat-val.slow {
  color: #d97706;
  background: #fef3c7;
  padding: 1px 6px;
  border-radius: 4px;
}

.stat-val.normal {
  color: #059669;
}

.stat-divider {
  width: 1px;
  height: 14px;
  background: #cbd5e1;
}

/* 过滤工具栏 */
.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #ffffff;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  flex-wrap: wrap;
  gap: 12px;
}

.filter-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.search-input {
  width: 260px;
  border-radius: 4px;
}

.filter-pills {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pill {
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 12px;
  background: #f1f5f9;
  color: #475569;
  cursor: pointer;
  border: 1px solid #e2e8f0;
  user-select: none;
  transition: all 0.15s;
}

.pill:hover {
  background: #e2e8f0;
}

.pill.active {
  background: #2563eb;
  border-color: #1d4ed8;
  color: #ffffff;
  font-weight: 600;
}

.pill-warning.active {
  background: #d97706;
  border-color: #b45309;
}

.pill-danger.active {
  background: #dc2626;
  border-color: #b91c1c;
}

.filter-right {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 12px;
  color: #64748b;
}

/* 表格样式 */
.workspace-area {
  flex: 1;
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.table-container {
  flex: 1;
  height: 100%;
}

:deep(.clickable-row) {
  cursor: pointer;
  transition: background-color 0.15s;
}

:deep(.clickable-row:hover) td {
  background-color: #f1f5f9 !important;
}

:deep(.selected-row) td {
  background-color: #eff6ff !important;
}

:deep(.error-row-bg) td {
  background-color: #fff5f5 !important;
}

:deep(.error-row-bg.selected-row) td {
  background-color: #fee2e2 !important;
}

/* 单元格内容 */
.status-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  font-size: 12px;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  display: inline-block;
}

.dot-success { background: #16a34a; }
.dot-redirect { background: #2563eb; }
.dot-client_error { background: #ea580c; }
.dot-server_error, .dot-failed { background: #dc2626; }

.text-success { color: #16a34a; }
.text-redirect { color: #2563eb; }
.text-client_error { color: #ea580c; }
.text-server_error, .text-failed { color: #dc2626; }

.method-tag {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
}

.method-get { background: #dcfce7; color: #15803d; }
.method-post { background: #dbeafe; color: #1d4ed8; }
.method-put { background: #fef3c7; color: #b45309; }
.method-delete { background: #fee2e2; color: #b91c1c; }
.method-patch { background: #f3e8ff; color: #7e22ce; }
.method-options { background: #f1f5f9; color: #64748b; }

.path-cell-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.path-text {
  font-family: ui-monospace, monospace;
  font-size: 12px;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.error-path {
  color: #dc2626;
  font-weight: 600;
}

.copy-url-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 2px;
  opacity: 0;
  transition: opacity 0.15s;
}

.clickable-row:hover .copy-url-btn {
  opacity: 1;
}

.copy-url-btn:hover {
  color: #2563eb;
}

.host-cell {
  font-size: 12px;
  color: #64748b;
}

.type-badge-sm {
  font-size: 11px;
  color: #64748b;
  background: #f1f5f9;
  padding: 1px 6px;
  border-radius: 4px;
}

.size-cell, .time-cell {
  font-family: ui-monospace, monospace;
  font-size: 12px;
}

.slow-time {
  color: #d97706;
  font-weight: 600;
}

/* 迷你瀑布条 */
.mini-waterfall-bar {
  display: flex;
  width: 100%;
  height: 6px;
  background: #f1f5f9;
  border-radius: 3px;
  overflow: hidden;
}

.bar-segment {
  height: 100%;
}

.bar-wait {
  background: #38bdf8;
}

.bar-receive {
  background: #34d399;
}

/* 抽屉内部样式 */
.drawer-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #ffffff;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 18px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.dh-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dh-time, .dh-size {
  font-size: 12px;
  color: #64748b;
  background: #e2e8f0;
  padding: 2px 6px;
  border-radius: 4px;
}

.dh-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.close-drawer-btn {
  font-size: 16px;
  font-weight: bold;
  color: #64748b;
}

/* 抽屉 URL 栏 */
.drawer-url-bar {
  display: flex;
  align-items: center;
  padding: 8px 18px;
  background: #f1f5f9;
  border-bottom: 1px solid #e2e8f0;
  gap: 8px;
}

.url-label {
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
}

.url-text {
  font-family: ui-monospace, monospace;
  font-size: 12px;
  color: #1e293b;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drawer-tabs-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.custom-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
}

:deep(.ant-tabs-content) {
  height: 100%;
}

:deep(.ant-tabs-tabpane) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.ant-tabs-nav) {
  margin-bottom: 0 !important;
  padding: 0 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.tab-scroll-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* 凭证卡片 (Authorization & Cookie) */
.credentials-card {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 4px 14px;
}

.card-title {
  font-size: 13px;
  font-weight: 700;
  color: #1e40af;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.cred-header-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.cred-tag {
  font-size: 12px;
  font-weight: 600;
  color: #1e3a8a;
}

.cred-buttons {
  display: flex;
  gap: 6px;
}

.cred-code-box {
  font-family: ui-monospace, monospace;
  font-size: 11px;
  background: #ffffff;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid #dbeafe;
  color: #1e293b;
  word-break: break-all;
  max-height: 70px;
  overflow-y: auto;
}

.cookie-section {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px dashed #bfdbfe;
}

.cookie-table {
  background: #ffffff;
  border: 1px solid #dbeafe;
  border-radius: 6px;
  max-height: 140px;
  overflow-y: auto;
}

.cookie-row {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 11px;
}

.cookie-row:last-child {
  border-bottom: none;
}

.ck-name {
  font-weight: 600;
  color: #0369a1;
  width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ck-val {
  flex: 1;
  color: #475569;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: ui-monospace, monospace;
  margin: 0 8px;
}

.ck-copy-btn {
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  color: #475569;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}

.ck-copy-btn:hover {
  background: #2563eb;
  color: #ffffff;
  border-color: #2563eb;
}

/* Headers 块 */
.headers-block {
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
}

.block-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8fafc;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 700;
  color: #334155;
  border-bottom: 1px solid #e2e8f0;
}

.kv-grid {
  padding: 8px 12px;
}

.kv-row {
  display: flex;
  font-size: 12px;
  padding: 3px 0;
}

.kv-key {
  width: 130px;
  font-weight: 600;
  color: #64748b;
}

.kv-value {
  flex: 1;
  color: #1e293b;
  font-family: ui-monospace, monospace;
  word-break: break-all;
}

.kv-table {
  max-height: 240px;
  overflow-y: auto;
}

.kv-table-row {
  display: flex;
  align-items: baseline;
  padding: 4px 12px;
  border-bottom: 1px solid #f8fafc;
  font-size: 12px;
  transition: background 0.1s;
}

.kv-table-row:hover {
  background: #f1f5f9;
}

.h-name {
  width: 180px;
  color: #475569;
  font-weight: 600;
  word-break: break-all;
}

.h-val {
  flex: 1;
  color: #0f172a;
  font-family: ui-monospace, monospace;
  word-break: break-all;
}

.header-search-bar-box {
  margin-bottom: 4px;
}

.header-filter-input {
  width: 100%;
  border-radius: 4px;
}

.empty-header-search {
  padding: 16px;
  text-align: center;
  color: #94a3b8;
  font-size: 12px;
}

.h-copy-btn {
  opacity: 0.6;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  color: #475569;
  font-size: 10px;
  padding: 1px 8px;
  border-radius: 4px;
  cursor: pointer;
  margin-left: 8px;
  white-space: nowrap;
  transition: all 0.15s;
}

.kv-table-row:hover .h-copy-btn {
  opacity: 1;
  background: #2563eb;
  color: #ffffff;
  border-color: #2563eb;
}

/* 响应 Tab 布局 */
.tab-response-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.res-control-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  flex-wrap: wrap;
  gap: 8px;
}

.rc-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rc-mime {
  font-size: 12px;
  font-weight: 600;
  color: #0284c7;
  background: #e0f2fe;
  padding: 2px 8px;
  border-radius: 4px;
}

.rc-size {
  font-size: 12px;
  color: #64748b;
}

.rc-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.res-view-wrapper {
  flex: 1;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
}

.tree-view-area {
  flex: 1;
  height: 100%;
  padding: 12px;
  background: #f8fafc;
}

.raw-code-box {
  flex: 1;
  overflow: auto;
  padding: 12px 16px;
  background: #ffffff;
}

.code-pre {
  margin: 0;
  font-family: ui-monospace, monospace;
  font-size: 12px;
  line-height: 1.6;
  color: #1e293b;
  white-space: pre-wrap;
  word-break: break-all;
}

.image-preview-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: #f8fafc;
}

.preview-img {
  max-width: 90%;
  max-height: 320px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid #e2e8f0;
}

.img-meta-hint {
  margin-top: 12px;
  font-size: 12px;
  color: #64748b;
}

.empty-tip-box {
  padding: 40px;
  text-align: center;
  color: #94a3b8;
  font-size: 13px;
}

/* Timings 耗时 Tab */
.timings-summary-banner {
  background: #f1f5f9;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}

.total-duration-label {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 4px;
}

.total-duration-val {
  font-size: 28px;
  font-weight: 800;
  color: #0f172a;
}

.timing-stages-list {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px 16px;
}

.stage-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f8fafc;
  font-size: 13px;
}

.stage-name {
  color: #475569;
}

.stage-val {
  font-family: ui-monospace, monospace;
  font-weight: 600;
  color: #1e293b;
}

.highlight-wait {
  color: #0284c7;
}

.timing-chart-box {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
}

.chart-title {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 10px;
}

.large-waterfall-bar {
  display: flex;
  width: 100%;
  height: 16px;
  background: #f1f5f9;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 12px;
}

.l-bar {
  height: 100%;
  transition: width 0.3s;
}

.l-dns { background: #60a5fa; }
.l-connect { background: #f59e0b; }
.l-wait { background: #38bdf8; }
.l-receive { background: #34d399; }

.chart-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.lg-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #64748b;
}

.lg-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot-dns { background: #60a5fa; }
.dot-connect { background: #f59e0b; }
.dot-wait { background: #38bdf8; }
.dot-receive { background: #34d399; }
</style>
