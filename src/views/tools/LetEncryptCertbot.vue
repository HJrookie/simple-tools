<template>
  <div class="acme-final-generator">
    <a-row :gutter="0" style="height: 100%; overflow: hidden">
      <!-- 左侧配置区 -->
      <a-col :span="10" class="config-panel">
        <div class="header">
          <h2>acme.sh 自动化助手</h2>
          <a-space>
            <a-button @click="resetConfig">重置</a-button>
            <a-button type="primary" @click="copyAll">复制完整脚本</a-button>
          </a-space>
        </div>

        <div class="scroll-container">
          <a-form layout="vertical">
            <!-- 1. 域名与账号 -->
            <a-card title="1. 域名与身份" size="small" class="mb-3">
              <a-form-item label="您的主域名">
                <a-input v-model:value="form.domain" placeholder="32323323.xyz" />
                <div class="tip">
                  脚本将自动申请 <strong>{{ form.domain }}</strong> 和 <strong>*.{{ form.domain }}</strong>
                </div>
              </a-form-item>
              <a-form-item label="管理员邮箱">
                <a-input v-model:value="form.email" placeholder="1181400768@qq.com" />
              </a-form-item>
            </a-card>

            <!-- 2. DNS 验证配置 (Cloudflare 专场) -->
            <a-card title="2. DNS 验证 (Cloudflare API)" size="small" class="mb-3">
              <a-form-item label="验证模式">
                <a-radio-group v-model:value="form.cfMode" button-style="solid" size="small">
                  <a-radio-button value="key">Global Key (经典模式)</a-radio-button>
                  <a-radio-button value="token">API Token (安全模式)</a-radio-button>
                </a-radio-group>
              </a-form-item>

              <div v-if="form.cfMode === 'key'">
                <a-form-item label="CF_Key">
                  <a-input-password v-model:value="form.apiAuth.CF_Key" placeholder="Cloudflare Global API Key" />
                </a-form-item>
                <a-form-item label="CF_Email">
                  <a-input v-model:value="form.apiAuth.CF_Email" placeholder="Cloudflare 账号邮箱" />
                </a-form-item>
              </div>

              <div v-else>
                <a-form-item label="CF_Token">
                  <a-input-password v-model:value="form.apiAuth.CF_Token" placeholder="Cloudflare 区域 DNS 编辑令牌" />
                </a-form-item>
                <a-form-item label="CF_Account_ID">
                  <a-input v-model:value="form.apiAuth.CF_Account_ID" placeholder="Cloudflare 账户 ID" />
                </a-form-item>
              </div>
            </a-card>

            <!-- 3. 部署路径 -->
            <a-card title="3. 生产环境部署路径" size="small" class="mb-3">
              <a-form-item label="Nginx 证书存放目录">
                <a-input v-model:value="form.installPath" placeholder="/etc/nginx/ssl/" />
                <div class="tip">acme.sh 会将证书“安装”到此目录，并持久化续期任务</div>
              </a-form-item>
            </a-card>
          </a-form>
        </div>
      </a-col>

      <!-- 右侧预览区 -->
      <a-col :span="14" class="preview-panel">
        <div class="code-container">
          <pre class="bash-preview"><code class="language-bash" v-html="highlightedCode"></code></pre>
        </div>
      </a-col>
    </a-row>
  </div>
</template>

<script>
import Prism from "prismjs";
import "prismjs/components/prism-bash";
import { message } from "ant-design-vue";

const DEFAULT_FORM = {
  domain: "3232323233.xyz",
  email: "",
  cfMode: "key", // 默认你习惯的 key 模式
  installPath: "/etc/nginx/ssl/",
  apiAuth: {
    CF_Key: "", // 预设示例
    CF_Email: "",
    CF_Token: "",
    CF_Account_ID: "",
  },
};

export default {
  name: "AcmeFinalGenerator",
  data() {
    return {
      form: JSON.parse(JSON.stringify(DEFAULT_FORM)),
    };
  },
  computed: {
    generatedCode() {
      const f = this.form;
      const d = f.domain || "example.com";
      const path = f.installPath.endsWith("/") ? f.installPath : f.installPath + "/";

      let cmds = [];

      cmds.push(`# -----------------------------------------------------------------`);
      cmds.push(`#  acme.sh 自动化泛域名证书部署脚本 (一次配置，永久自动续期)`);
      cmds.push(`#  目标: ${d} & *.${d}`);
      cmds.push(`# -----------------------------------------------------------------\n`);

      cmds.push(`# 1. 下载并安装 acme.sh 脚本`);
      cmds.push(`curl https://get.acme.sh | sh -s email=${f.email}`);
      cmds.push(`alias acme.sh=~/.acme.sh/acme.sh\n`);

      cmds.push(`# 2. 配置 Cloudflare API 凭证 (acme.sh 会自动将其加密持久化)`);
      if (f.cfMode === "key") {
        cmds.push(`export CF_Key="${f.apiAuth.CF_Key || "YOUR_CF_KEY"}"`);
        cmds.push(`export CF_Email="${f.apiAuth.CF_Email || "YOUR_CF_EMAIL"}"`);
      } else {
        cmds.push(`export CF_Token="${f.apiAuth.CF_Token || "YOUR_CF_TOKEN"}"`);
        cmds.push(`export CF_Account_ID="${f.apiAuth.CF_Account_ID || "YOUR_CF_ID"}"`);
      }
      cmds.push(``);

      cmds.push(`# 3. 申请证书 (泛域名 + DNS 验证 + 强制 Let's Encrypt 核心)`);
      cmds.push(`acme.sh --issue --dns dns_cf \\`);
      cmds.push(`  -d ${d} \\`);
      cmds.push(`  -d *.${d} \\`);
      cmds.push(`  --server letsencrypt\n`);

      cmds.push(`# 4. 创建生产环境存放目录`);
      cmds.push(`mkdir -p ${path}\n`);

      cmds.push(`# 5. 将证书安装到 Nginx 路径，并关联「自动重载」命令`);
      cmds.push(`# 只有执行了 install-cert，未来的自动续期才会触发 Nginx 重启`);
      cmds.push(`acme.sh --install-cert -d ${d} \\`);
      cmds.push(`  --key-file       ${path}privkey.pem  \\`);
      cmds.push(`  --fullchain-file ${path}fullchain.pem \\`);
      cmds.push(`  --reloadcmd      "nginx -s reload"\n`);

      cmds.push(`# -----------------------------------------------------------------`);
      cmds.push(`#  6. 验证检查`);
      cmds.push(`# -----------------------------------------------------------------`);
      cmds.push(`acme.sh --list               # 查看证书列表与续期时间`);
      cmds.push(`ls -la ${path}               # 检查证书文件是否已安装`);
      cmds.push(`nginx -t                     # 确保 Nginx 配置无语法错误`);

      return cmds.join("\n");
    },
    highlightedCode() {
      return Prism.highlight(this.generatedCode, Prism.languages.bash, "bash");
    },
  },
  methods: {
    copyAll() {
      navigator.clipboard.writeText(this.generatedCode).then(() => {
        message.success("脚本已复制到剪贴板");
      });
    },
    resetConfig() {
      this.form = JSON.parse(JSON.stringify(DEFAULT_FORM));
    },
  },
};
</script>

<style lang="scss" scoped>
.acme-final-generator {
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
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      h2 {
        margin: 0;
        font-size: 18px;
        font-weight: bold;
      }
    }

    .scroll-container {
      flex: 1;
      overflow-y: auto;
    }
  }

  .preview-panel {
    height: 100%;
    background-color: #1e1e1e;
    .code-container {
      height: 100%;
    }
  }

  .tip {
    font-size: 12px;
    color: #888;
    margin-top: 4px;
    strong {
      color: #1890ff;
    }
  }
  .mb-3 {
    margin-bottom: 16px;
  }
}

pre.bash-preview {
  margin: 0;
  padding: 24px;
  width: 100%;
  height: 100%;
  overflow: auto;
  font-family: "Menlo", "Monaco", "Consolas", monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #fff;

  :deep(.token.comment) {
    color: #6a9955 !important;
    font-style: italic;
  }
  :deep(.token.function),
  :deep(.token.command) {
    color: #fff;
    font-weight: bold;
  }
  :deep(.token.string) {
    color: #ce9178;
  }
  :deep(.token.operator),
  :deep(.token.punctuation) {
    color: #ccc;
  }
}
</style>
    