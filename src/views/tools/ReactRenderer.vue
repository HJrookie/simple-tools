<!-- src/views/tools/ReactRenderer.vue -->
<template>
  <div>
    <div>
      <a-button @click="() => this.$router.push('/')" style="margin-left: 8px"> 返回</a-button>
    </div>

    <div class="button-container">
      <a-button type="primary" size="middle" @click="renderCode">
        <template #icon><PlayCircleOutlined /></template>
        运行 & 渲染
      </a-button>
    </div>

    <a-row :gutter="16">
      <a-col v-if="isEditorVisible" :span="12" class="editor-col">
        <a-typography-title :level="5">粘贴代码</a-typography-title>

        <a-textarea v-model:value="reactCode" placeholder="在此粘贴 React 或 Next.js 组件代码" :rows="25" class="code-input" />
      </a-col>

      <a-col :span="isEditorVisible ? 12 : 24" class="renderer-col">
        <a-typography-title :level="5">实时效果</a-typography-title>
        <div class="renderer-container">
          <iframe :key="iframeKey" :srcdoc="iframeSrcDoc" class="renderer-iframe"></iframe>
        </div>
      </a-col>
    </a-row>
  </div>
</template>

<script>
import { PageHeader, Alert, Row, Col, TypographyTitle, Input, Button, Tooltip } from "ant-design-vue";
import { PlayCircleOutlined, EyeOutlined, EyeInvisibleOutlined } from "@ant-design/icons-vue";

const defaultReactCode = `
  import React, { useState, useEffect } from 'react';
  
  // 模拟异步数据获取
  const fetchUserData = () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockData = {
          id: 101, name: '王小明 (Xiaoming Wang)', title: '前端架构师',
          email: 'xiaoming.w@example.com', status: 'active',
          avatarUrl: 'https://i.pravatar.cc/150?img=68',
        };
        resolve(mockData);
      }, 1500);
    });
  };
  
  const StatusBadge = ({ status }) => {
    const isAvailable = status === 'active';
    const color = isAvailable ? 'bg-green-500' : 'bg-red-500';
    const text = isAvailable ? '在线' : '离线';
    return (
      <div className={\`flex items-center text-xs font-medium \${isAvailable ? 'text-green-700' : 'text-red-700'}\`}>
        <span className={\`w-2.5 h-2.5 rounded-full mr-1 \${color}\`}></span>
        {text}
      </div>
    );
  };
  
  const UserProfileCard = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
  
    useEffect(() => {
      setLoading(true);
      fetchUserData()
        .then((data) => setUser(data))
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }, []);
  
    if (loading) {
      return (
        <div className="bg-gray-100 p-6 rounded-xl shadow-lg w-full max-w-md animate-pulse">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gray-300 rounded-full"></div>
            <div className="flex-1 space-y-3 py-1">
              <div className="h-4 bg-gray-300 rounded w-3/4"></div>
              <div className="h-3 bg-gray-300 rounded w-2/4"></div>
            </div>
          </div>
        </div>
      );
    }
  
    if (error) {
      return (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md w-full max-w-md">
          <p className="font-bold">数据加载失败: {error}</p>
        </div>
      );
    }
  
    return (
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md transform transition-all duration-300 hover:shadow-xl">
        <div className="flex items-start space-x-6">
          <img className="w-20 h-20 rounded-full object-cover ring-2 ring-indigo-500 p-0.5" src={user.avatarUrl} alt={\`Avatar of \${user.name}\`}/>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-gray-900 truncate">{user.name}</h2>
            <p className="text-sm font-medium text-indigo-600 mt-0.5">{user.title}</p>
            <p className="text-sm text-gray-500 mt-1 truncate">{user.email}</p>
            <div className="mt-2"><StatusBadge status={user.status} /></div>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-gray-100">
          <button className="w-full py-2 px-4 border rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">查看完整资料</button>
        </div>
      </div>
    );
  };
  
  export default UserProfileCard;
  `;

export default {
  name: "ReactRenderer",
  components: {
    "a-page-header": PageHeader,
    "a-alert": Alert,
    "a-row": Row,
    "a-col": Col,
    "a-typography-title": TypographyTitle,
    "a-textarea": Input.TextArea,
    "a-button": Button,
    "a-tooltip": Tooltip,
    PlayCircleOutlined,
    EyeOutlined,
    EyeInvisibleOutlined,
  },
  data() {
    return {
      reactCode: defaultReactCode,
      iframeKey: 0,
      iframeSrcDoc: "",
      isEditorVisible: true,
    };
  },
  mounted() {
    this.renderCode();
  },
  methods: {
    toggleEditorVisibility() {
      this.isEditorVisible = !this.isEditorVisible;
    },
    renderCode() {
      let processedCode = this.reactCode;

      // --- 1. 预处理代码 (已修正) ---

      // [修正] 使用正确的单反斜杠 \s。移除所有 'import ... from ...' 语句，包括多行的。
      processedCode = processedCode.replace(/import\s+.*?from\s+['"].*?['"];?/gs, "");

      let componentName = null;
      // [修正] 使用正确的 \s 和 \w。查找 export default 的组件名。
      const exportMatch = processedCode.match(/export\s+default\s+([A-Z]\w+);?/);

      if (exportMatch && exportMatch[1]) {
        componentName = exportMatch[1];
        // [修正] 移除 export default 语句
        processedCode = processedCode.replace(/export\s+default\s+[A-Z]\w+;?/g, "");
      } else {
        // 备用方案：如果找不到 export default，就找最后一个大写字母开头的组件
        const componentMatches = processedCode.match(/function\s+([A-Z]\w*)|const\s+([A-Z]\w*)\s*=/g);
        if (componentMatches && componentMatches.length > 0) {
          const lastMatch = componentMatches[componentMatches.length - 1];
          componentName = lastMatch
            .split(/function\s+|const\s+/)
            .pop()
            .replace(/\s*=/, "")
            .trim();
        }
      }

      // 自动添加渲染器
      if (componentName && !processedCode.includes("ReactDOM.render")) {
        processedCode += `\n\nReactDOM.render(<${componentName} />, document.getElementById('root'));`;
      }

      // --- 2. 构建 iframe 内容 ---
      this.iframeSrcDoc = `
          <!DOCTYPE html><html><head>
            <meta charset="UTF-8"><title>React Sandbox</title>
            <style>
              body { font-family: sans-serif; margin: 0; padding: 20px; display: flex; 
                     justify-content: center; align-items: center; min-height: 100vh; background-color: #f0f2f5; }
            </style>
            <script src="https://unpkg.com/react@18/umd/react.development.js"><\/script>
            <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"><\/script>
            <script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
            <script src="https://cdn.tailwindcss.com"><\/script>
          </head><body>
          <div id="root"></div>
          <script type="text/babel">
            try {
              // [修正] 在执行用户代码前，先从全局 React 对象中解构出常用的 Hooks
              // 这完美模拟了 import { useState, useEffect, ... } from 'react' 的效果
              const { useState, useEffect, useCallback, useMemo, useRef } = React;
              
              ${processedCode}
            } catch (e) {
              const root = document.getElementById('root');
              root.innerHTML = '<div style="color: red; padding: 20px; font-family: monospace; background-color: #ffebeb;"><h3>运行时错误:</h3><pre>' + e.stack + '</pre></div>';
            }
          <\/script>
        </body></html>`;
      this.iframeKey++;
    },
  },
};
</script>

<style scoped>
.code-input {
  font-family: "Courier New", Courier, monospace;
  font-size: 14px;
  background-color: #2b2b2b;
  color: #a9b7c6;
  border-color: #444;
  height: 600px;
}
.button-container {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}
.renderer-container {
  height: 600px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  overflow: hidden;
  background-color: white;
}
.renderer-iframe {
  width: 100%;
  height: 100%;
  border: none;
}
.editor-col,
.renderer-col {
  transition: all 0.3s ease-in-out;
}
</style>
