# 小克

三合一：普通聊天 / 角色扮演 / 写作工作台。数据全部存在浏览器本地（localStorage），API Key 存在 Vercel 后端，不会进前端代码，也不会进 GitHub。

## 部署（第一次，跟着做一遍就行）

### 1. 传到 GitHub
在 GitHub 上新建一个仓库（New repository），空的就行，不用勾任何初始化选项。
然后在这个文件夹里执行：

```bash
git init
git add .
git commit -m "init"
git branch -M main
git remote add origin 你的仓库地址.git
git push -u origin main
```

### 2. Vercel 连接
- vercel.com 用 GitHub 账号登录
- Add New → Project → 选你刚建的仓库 → Import
- **不用改任何构建设置**，Vercel 会自动识别（Vite 项目）
- 展开 "Environment Variables"，加一条：
  - Key: `ANTHROPIC_API_KEY`
  - Value: 你的 API key（sk-ant-开头那串）
- 点 Deploy

等一两分钟，Vercel 会给你一个 `xxx.vercel.app` 的链接，手机电脑都能开，可以加到手机主屏幕当app用。

### 3. 以后怎么改代码
改完文件后：
```bash
git add .
git commit -m "改了什么"
git push
```
push 上去 Vercel 自动重新部署，不用手动点。

## 结构

```
src/
  App.jsx           顶层：三个 tab + 设置弹窗（Profile / Instructions）
  store.js          所有本地存储的读写（chats / chars / novel...）
  api.js            调用后端 /api/chat 的流式请求
  styles.css        全局样式
  components/
    Message.jsx     消息气泡（支持简单 markdown + 图片）
    ChatInput.jsx    输入框（含图片上传、模型切换）
    Modal.jsx        弹窗
  tabs/
    ChatTab.jsx      普通聊天：历史侧栏 + 对话
    RoleplayTab.jsx  角色扮演：角色列表 / 编辑角色（人设+世界观+输出设定+文风+世界书）/ 角色对话
    WritingTab.jsx   写作台：写作 / 总纲 / 人物库 / 章节 / 灵感 五个子页
api/
  chat.js            Vercel 边缘函数，转发到 Anthropic API，Key 存在这里，前端拿不到
```

## 备份

数据都在本地浏览器里，换设备/清缓存会丢。之后可以加一个"导出/导入 JSON"的按钮——如果想要现在就加，跟我说一声。

## 已知限制（第一版，能跑但简单）

- 没有消息编辑/重新生成
- 没有对话导出
- 没有记忆自动摘要（长对话会一直堆 token）
- 角色扮演的世界书是全量塞进 system prompt，没做按关键词触发（酒馆那种）
