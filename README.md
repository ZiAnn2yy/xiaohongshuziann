# 内容逆向实验室 | Content Reverse Lab

[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.2-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![DeepSeek](https://img.shields.io/badge/DeepSeek-API-blue)](https://www.deepseek.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwindcss)](https://tailwindcss.com/)

**中文** | [English](#english)

一个基于 AI 的小红书脚本分析工具，帮助内容创作者深度分析文案结构，优化内容质量。

## ✨ 功能特性

### 📝 脚本文案分析
- **AI 深度分析**：基于 DeepSeek API，智能分析脚本结构
- **逐句拆解**：自动识别每句话的角色（开场/钩子/兑现/金句）
- **评分诊断**：给出整体评分和改进建议
- **爆款标题**：生成 3 个优化后的标题建议
- **行动清单**：提供具体的优化步骤
- **历史记录**：本地保存最近 5 次分析结果

### 🎬 视频解析
- **无水印下载**：解析小红书视频链接，提取无水印原视频
- **支持短链**：支持 `xhslink.com` 短链接和完整笔记链接
- **在线预览**：直接在浏览器预览视频
- **一键下载**：下载 MP4/M3U8 格式视频

## 🛠️ 技术栈

| 前端 | 后端 |
|------|------|
| React 18 | FastAPI |
| Vite 5 | DeepSeek API |
| Tailwind CSS 3 | httpx |
| React Router 7 | Pydantic |

## 📦 项目结构

```
content-reverse-lab/
├── src/                    # 前端源码
│   ├── api/client.js       # API 客户端
│   ├── components/         # React 组件
│   ├── pages/              # 页面组件
│   ├── config/             # 配置文件
│   └── utils/              # 工具函数
├── backend/                # 后端源码
│   ├── main.py             # FastAPI 主应用
│   ├── analyzer.py         # 分析服务
│   ├── deepseek_client.py  # DeepSeek 客户端
│   ├── video_parser.py     # 视频解析服务
│   └── models.py           # 数据模型
├── docs/                   # 文档
├── Dockerfile              # Docker 部署
└── requirements.txt        # Python 依赖
```

## 🚀 快速开始

### 环境要求

- Node.js 18+
- Python 3.10+
- DeepSeek API Key

### 本地开发

1. **克隆项目**
```bash
git clone https://github.com/ZiAnn2yy/xiaohongshuziann.git
cd xiaohongshuziann
```

2. **配置环境变量**
```bash
# 创建 .env 文件
cp .env.example .env

# 编辑 .env，添加 DeepSeek API Key
DEEPSEEK_API_KEY=your_api_key_here
DEEPSEEK_MODEL=deepseek-chat
```

3. **安装依赖**
```bash
# 前端依赖
npm install

# 后端依赖
pip install -r requirements.txt
```

4. **启动开发服务器**
```bash
# 同时启动前后端
npm run dev

# 或分别启动
npm run dev:web      # 前端 http://localhost:5173
npm run dev:api      # 后端 http://127.0.0.1:8787
```

5. **访问应用**
打开浏览器访问 http://localhost:5173

## 🌐 部署

### Railway（后端）

1. 连接 GitHub 仓库到 Railway
2. 设置环境变量 `DEEPSEEK_API_KEY`
3. Railway 自动检测 Dockerfile 并部署

### Vercel（前端）

1. 连接 GitHub 仓库到 Vercel
2. 设置环境变量 `VITE_API_BASE_URL` 指向 Railway 后端地址
3. 自动部署

## 📖 API 文档

### 分析脚本
```http
POST /api/analyze
Content-Type: application/json

{
  "sourceText": "你的脚本内容..."
}
```

### 解析视频
```http
POST /api/video/parse
Content-Type: application/json

{
  "url": "https://www.xiaohongshu.com/explore/xxxxxx"
}
```

### 健康检查
```http
GET /api/health
```

## 🎨 UI 设计

- **配色**：紫玫渐变（violet/fuchsia）+ 青色点缀（teal）
- **风格**：玻璃态（glassmorphism）+ 圆角卡片
- **动效**：hover scale + ring 光晕
- **响应式**：支持桌面端和移动端

## 📄 许可证

MIT License

---

# English

An AI-powered Xiaohongshu (Little Red Book) script analysis tool that helps content creators deeply analyze copy structure and optimize content quality.

## ✨ Features

### 📝 Script Analysis
- **AI Deep Analysis**: Intelligent script structure analysis powered by DeepSeek API
- **Sentence-by-Sentence Breakdown**: Automatically identifies each sentence's role (Opening/Hook/Delivery/Golden Line)
- **Score Diagnosis**: Provides overall score and improvement suggestions
- **Viral Titles**: Generates 3 optimized title suggestions
- **Action Plan**: Provides specific optimization steps
- **History**: Saves last 5 analysis results locally

### 🎬 Video Parser
- **Watermark-Free Download**: Parse Xiaohongshu video links to extract original watermark-free videos
- **Short Link Support**: Supports `xhslink.com` short links and full note links
- **Online Preview**: Preview videos directly in browser
- **One-Click Download**: Download MP4/M3U8 format videos

## 🛠️ Tech Stack

| Frontend | Backend |
|----------|---------|
| React 18 | FastAPI |
| Vite 5 | DeepSeek API |
| Tailwind CSS 3 | httpx |
| React Router 7 | Pydantic |

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.10+
- DeepSeek API Key

### Local Development

1. **Clone the repository**
```bash
git clone https://github.com/ZiAnn2yy/xiaohongshuziann.git
cd xiaohongshuziann
```

2. **Configure environment variables**
```bash
# Create .env file
cp .env.example .env

# Edit .env, add your DeepSeek API Key
DEEPSEEK_API_KEY=your_api_key_here
DEEPSEEK_MODEL=deepseek-chat
```

3. **Install dependencies**
```bash
# Frontend dependencies
npm install

# Backend dependencies
pip install -r requirements.txt
```

4. **Start development servers**
```bash
# Start both frontend and backend
npm run dev

# Or start separately
npm run dev:web      # Frontend http://localhost:5173
npm run dev:api      # Backend http://127.0.0.1:8787
```

5. **Open in browser**
Visit http://localhost:5173

## 🌐 Deployment

### Railway (Backend)

1. Connect GitHub repository to Railway
2. Set environment variable `DEEPSEEK_API_KEY`
3. Railway auto-detects Dockerfile and deploys

### Vercel (Frontend)

1. Connect GitHub repository to Vercel
2. Set environment variable `VITE_API_BASE_URL` pointing to Railway backend URL
3. Auto deploys

## 📖 API Documentation

### Analyze Script
```http
POST /api/analyze
Content-Type: application/json

{
  "sourceText": "Your script content..."
}
```

### Parse Video
```http
POST /api/video/parse
Content-Type: application/json

{
  "url": "https://www.xiaohongshu.com/explore/xxxxxx"
}
```

### Health Check
```http
GET /api/health
```

## 🎨 UI Design

- **Colors**: Purple-Magenta gradient (violet/fuchsia) + Teal accents
- **Style**: Glassmorphism + Rounded cards
- **Animations**: Hover scale + Ring glow effects
- **Responsive**: Supports desktop and mobile

## 📄 License

MIT License
