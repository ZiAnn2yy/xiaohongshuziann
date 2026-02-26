# DeepSeek API 配置与部署指南

按本指南配置 DeepSeek API，即可在前端「开始分析」时调用大模型进行脚本分析。

---

## 一、获取 API Key

1. 打开 [DeepSeek 开放平台](https://platform.deepseek.com)
2. 注册/登录账号
3. 进入 **API Keys** 或 **密钥管理** 页面
4. 创建新密钥，复制生成的 `sk-xxx` 格式 Key  
   - ⚠️ 密钥仅展示一次，请立即保存到安全位置

---

## 二、配置环境变量

1. 在项目根目录复制示例配置：

   ```bash
   copy .env.example .env
   ```

   （Linux/macOS 使用 `cp .env.example .env`）

2. 编辑 `.env`，填入你的 API Key：

   ```
   DEEPSEEK_API_KEY=sk-你的密钥
   ```

3. 可选配置（一般无需修改）：

   | 变量 | 默认值 | 说明 |
   |------|--------|------|
   | `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` | API 基础地址 |
   | `DEEPSEEK_MODEL` | `deepseek-chat` | 模型名称 |
   | `DEEPSEEK_TIMEOUT_SECONDS` | `30` | 请求超时（秒） |
   | `DEEPSEEK_MAX_RETRIES` | `2` | 429/5xx 重试次数 |

---

## 三、安装依赖并启动

### 1. 安装 Python 依赖

```bash
pip install -r backend/requirements.txt
```

### 2. 安装前端依赖并启动

```bash
npm install
npm run dev
```

将同时启动：

- 前端：http://localhost:5173
- 后端：http://localhost:8787（Vite 会把 `/api` 代理到这里）

---

## 四、验证配置

### 方式 1：健康检查接口

```bash
curl http://localhost:8787/api/health
```

返回示例：

```json
{
  "status": "ok",
  "deepseek": "configured"
}
```

若为 `"deepseek": "not_configured"`，说明未设置 `DEEPSEEK_API_KEY` 或 `.env` 未生效。

### 方式 2：前端实际调用

1. 打开 http://localhost:5173
2. 在「素材内容」中粘贴 80～1200 字的脚本
3. 点击「开始分析」
4. 若配置正确，会返回基于 DeepSeek 的结构化分析结果

---

## 五、无 API Key 时的行为

未配置 `DEEPSEEK_API_KEY` 时：

- 前端仍可正常使用
- 分析接口会返回**兜底结果**（预设模板数据），不会调用 DeepSeek
- 适合先体验流程，再配置真实 Key

---

## 六、常见问题

| 现象 | 可能原因 | 处理 |
|------|----------|------|
| 分析结果像模板、无个性化 | 未配置 Key 或 Key 无效 | 检查 `.env` 中 `DEEPSEEK_API_KEY` |
| 请求超时 | 网络或 DeepSeek 服务异常 | 增大 `DEEPSEEK_TIMEOUT_SECONDS` 或稍后重试 |
| 429 错误 | 调用频率超限 | 等待后重试，或升级 DeepSeek 套餐 |
| 401 错误 | API Key 无效或过期 | 在平台重新生成 Key 并更新 `.env` |

---

## 七、安全提醒

- ✅ 将 `.env` 加入 `.gitignore`，不要提交到仓库
- ✅ 生产环境使用环境变量或密钥管理服务
- ❌ 不要在代码中硬编码 API Key
