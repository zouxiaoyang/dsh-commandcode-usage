# dsh-commandcode-usage

CommandCode 用量与余额面板 — 在 DSH（DeepSeek Harness）侧边栏底部显示 CommandCode API 用量、信用额度、5小时/每周窗口。

A CommandCode usage & balance panel for DeepSeek Harness — shows API usage, credit balance, and 5-hour/weekly windows from the sidebar footer.

![usage panel](https://raw.githubusercontent.com/zouxiaoyang/dsh-commandcode-usage/main/assets/screenshot.png)

## Features · 功能

- **CommandCode 用量**：请求次数、成功率、Token 消耗、总花费
- **信用额度**：月额度、5小时窗口、每周窗口，进度条可视化
- **余额与订阅**：套餐信息、订阅状态、计费周期
- **主题自适应**：跟随 DSH 的浅色/深色主题自动切换
- **侧边栏入口**：在 codex-ui 侧边栏底部提供"⚡ 用量"按钮，点击弹出面板

## Install · 安装

### 方式一：插件市场（推荐）

打开 DSH **设置 → 插件市场**，搜索 `dsh-commandcode-usage`，一键安装。

### 方式二：npm

```bash
dsh plugin --profile web add dsh-commandcode-usage
```

### 方式三：手动（双半包）

```bash
# 1. 安装 npm 包
npm install dsh-commandcode-usage

# 2. 在 cordis.patch.yml 注册
# - id: dsh-commandcode-usage
#   name: 'dsh-commandcode-usage'
```

## Configuration · 配置

插件通过 `cordis.patch.yml` 的 `config` 字段配置：

```yaml
- id: dsh-commandcode-usage
  name: 'dsh-commandcode-usage'
  config:
    # API key（可选，默认自动从环境变量/配置文件读取）
    apiKey: 'your-commandcode-api-key'
    # API 基础地址（可选，默认官方）
    apiBase: 'https://api.commandcode.ai'
    # 环境变量名（可选，默认 COMMANDCODE_API_KEY）
    apiKeyEnv: 'COMMANDCODE_API_KEY'
```

### API key 解析顺序

1. 插件 `config.apiKey`
2. 环境变量 `COMMANDCODE_API_KEY`
3. `~/.dsh/.credentials.yaml` 中的 `COMMANDCODE_API_KEY`
4. `launchctl getenv COMMANDCODE_API_KEY`
5. 其他常见配置文件（`~/.config/commandcode/` 等）

## Usage · 使用

安装并重启后，在 codex-ui 侧边栏底部点击 **"⚡ 用量"** 按钮即可查看：

- 请求次数 / 成功率 / 总花费（概览卡片）
- 5小时窗口 / 每周窗口用量（进度条）
- 月额度剩余（进度条）
- 账号、套餐、更新时间（页脚）

同时注册了 `commandcode_usage` 工具，agent 可在对话中查询：

```
查询我的 CommandCode 用量
```

## Development · 开发

```bash
git clone https://github.com/zouxiaoyang/dsh-commandcode-usage.git
cd dsh-commandcode-usage
npm install
# 本地开发：软链到 profile
ln -sfn $PWD ~/.dsh/profiles/web/node_modules/dsh-commandcode-usage
```

## License

MIT
