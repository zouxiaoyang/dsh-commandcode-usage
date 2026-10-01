# 发布流程 · Releasing

> `dsh-commandcode-usage` 的发布手册。**动手前先看「二、两条铁律」**。
> 最后更新：2026-10-01。

## 一、发布地图

| 东西 | 位置 / 值 | 说明 |
|---|---|---|
| 发布仓库 | `~/Downloads/chat/dsh-commandcode-usage`（本机 git clone） | **只从这里发布** |
| GitHub 远端 | `git@github.com:zouxiaoyang/dsh-commandcode-usage.git`（分支 `main`） | push 即触发市场更新检测 |
| npm 包名 | `dsh-commandcode-usage`（**无 scope**，账号 `jane1998` 拥有） | 也是加载器 id / bundle patch 行名 |
| 市场条目 | `awesome-dsh-plugin/awesome-dsh-plugin` → `data/plugins/zouxiaoyang__dsh-commandcode-usage.yml` | PR #3921（2026-09-04 合并）；条目指向**仓库 URL**，不是 npm 包名 |
| 市场安装 spec | `github:zouxiaoyang/dsh-commandcode-usage` | 所以**发不上 npm 不影响上架/更新** |
| 本机 live 插件 | `~/.dsh/profiles/web/plugins/usage-panel/`，包名 `@deepseek-ai/usage-panel`（`link:` 安装） | **有意保持不动**，见第四节 |

## 二、两条铁律

1. **永远不要用 `@deepseek-ai/*` 发第三方插件。** 那是 DeepSeek 官方 npm scope，第三方必然 403
   （实测 `npm org ls deepseek-ai` → 403），市场也会把它当官方包处理。用 `dsh-commandcode-usage`。
2. **每次发布必须 bump 版本号**，否则 npm 报
   `E403 You cannot publish over the previously published versions: <x.y.z>`。
   这是本包历史上唯一一次「发布失败」的原因（当时 `package.json` 还停在已发布的 1.1.1）。

## 三、发布步骤

```bash
cd ~/Downloads/chat/dsh-commandcode-usage

# 0) 工作区必须干净，先看一遍要发什么
git status --short

# 1) bump 版本（patch / minor / major 按需）
npm version patch --no-git-tag-version

# 2) 更新 CHANGELOG.md —— 市场卡片的「更新内容」会用它

# 3) 打包预演：确认文件列表与版本号
npm publish --dry-run

# 4) 发布（无 scope 默认 public，不需要 --access）
npm publish
#    输出 + dsh-commandcode-usage@x.y.z 之后可能跟一句
#    "being processed and may take a few minutes" —— npm 返回 202 异步校验，
#    通常 1~2 分钟生效。所以第 5 步必须做。

# 5) 确认 npm 上真的有了（不要只信 publish 的输出）
curl -s https://registry.npmjs.org/dsh-commandcode-usage \
  | python3 -c "import json,sys;d=json.load(sys.stdin);print(list(d['versions']), d['dist-tags'])"

# 6) 提交并推送 —— 市场靠这个发现新版本
git add -A
git commit -m "feat|fix: <一句话> (vX.Y.Z)"
git push origin main
```

## 四、本地 live 与发布仓库的关系

- 本机 `~/.dsh/profiles/web/plugins/usage-panel/` 是**实际在跑的那份**（desktop profile 通过 `link:` 引用），
  包名是 `@deepseek-ai/usage-panel`。**不要为了「统一」去改它** —— 改它要动 4 处引用 + pnpm 重链 +
  重启/刷新客户端。
- 把 live 的改动搬到仓库时，有两个 id **必须改回仓库的包名**，否则该插件行 `failed to import`、
  插件页点「启用」必报「启用失败」：
  - `client.js`：`window.__ModuleLoader__.load({ id: "<包名>" })`
  - `cordis.patch.yml`：`name: '<包名>'`
  （两者都要等于 `package.json` 的 `name`）

```bash
# 同步 live → 仓库的常用做法
L=~/.dsh/profiles/web/plugins/usage-panel
R=~/Downloads/chat/dsh-commandcode-usage
cp "$L/client.js" "$R/client.js"
# 然后把 $R/client.js 里的 id 改回 dsh-commandcode-usage（以及 cordis.patch.yml 的 name）
```

## 五、排错对照表

| 症状 | 原因 | 处理 |
|---|---|---|
| 403 / "You do not have permission to publish @deepseek-ai/…" | 用了官方 scope | 改回 `dsh-commandcode-usage` |
| `E403 cannot publish over the previously published versions` | 忘了 bump 版本 | `npm version patch` 后重发 |
| 插件页「启用失败」 | bundle patch 的 `name` ≠ 真实包名 | 让 `cordis.patch.yml` 的 `name` 与 `package.json` 的 `name` 一致，重载插件树 |
| 侧栏找不到入口 | 客户端半没用官方槽位（旧代码写死 `.dcu-footer-actions`） | 用 `ctx.slots.inject("sidebar.footer.action", …)` + `ctx.slots.register(…, React 组件)` |
| 月额度百分比偏大（5% vs 官网 3%） | 分母用了「已用 + 剩余」 | 分母 = 套餐月额度（表见 `client.js` 的 `PLAN_MONTHLY_LIMIT`），分子 = 额度 − 剩余额度；只算计费周期、不结转 |
| publish 显示成功但 `npm view` 看不到 | npm 返回 202 异步处理 | 等 1~2 分钟并按第 5 步轮询；**不要重复发同一版本** |
| `npm view` 报 404 但包确实发过 | 包名带 scope 或拼错 | 核对 `package.json` 的 `name` |

## 六、市场更新机制

- 市场列表来自 `awesome-dsh-plugin` 仓库的 `data/plugins/*.yml`（**一个插件一个文件**，README 由脚本生成，
  不要手改）。上架或改条目要提 PR；本插件条目已存在，**正常发版不用重提**。
- 条目 `url` 指向 GitHub 仓库 ⇒ 市场按**版本 / HEAD commit** 对比检测更新；`git push` 后老用户卡片会出现
  「更新」，卡片信息通常一天内刷新。
- 收录要求：仓库 `package.json` 必须声明 `dsh.bundle`（本仓库已声明，指向 `./cordis.patch.yml`）。
