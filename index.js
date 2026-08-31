// dsh-commandcode-usage 宿主半：注册 commandcode_usage 工具 + /dsh-usage RPC channel。
// 数据来自 CommandCode /alpha/* 端点（whoami、usage/summary、billing/credits、
// billing/subscriptions）。
//
// API key 解析顺序（通用化，兼容不同用户环境）：
//   1. 插件 config.apiKey（cordis.patch.yml 里配置，优先级最高）
//   2. 环境变量 COMMANDCODE_API_KEY
//   3. ~/.dsh/.credentials.yaml 里的 COMMANDCODE_API_KEY
//   4. launchctl getenv COMMANDCODE_API_KEY
//   5. 其他常见配置文件（~/.config/commandcode/credentials.json 等）
'use strict';
const { readFileSync } = require('node:fs');
const os = require('node:os');
const path = require('node:path');

module.exports.name = 'dsh-commandcode-usage';
module.exports.inject = ['tools', 'connection'];

// 4 个 /alpha 端点（来自 @mars-sea/dsh-commandcode-provider 源码 adapter.ts）
const ENDPOINTS = [
  { key: 'account', path: '/alpha/whoami' },
  { key: 'usage', path: '/alpha/usage/summary' },
  { key: 'credits', path: '/alpha/billing/credits' },
  { key: 'subscription', path: '/alpha/billing/subscriptions' },
];

// 默认配置
const DEFAULT_CONFIG = {
  apiBase: 'https://api.commandcode.ai',
  apiKeyEnv: 'COMMANDCODE_API_KEY',
  timeoutMs: 12000,
};

// 从 yaml 里提取 key（宽松匹配）
function keyFromYaml(raw) {
  const m = raw.match(/COMMANDCODE_API_KEY:\s*['"]?([^'"\n\s]+)['"]?/);
  return m ? m[1] : '';
}

// 尝试多个候选配置文件
function readApiKeyFromFiles() {
  const home = os.homedir();
  const candidates = [
    path.join(home, '.dsh', '.credentials.yaml'),
    path.join(home, '.config', 'commandcode', 'credentials.yaml'),
    path.join(home, '.config', 'commandcode', 'config.json'),
    path.join(home, '.commandcode', 'credentials.json'),
  ];
  for (const file of candidates) {
    try {
      const raw = readFileSync(file, 'utf8');
      if (file.endsWith('.yaml') || file.endsWith('.yml')) {
        const k = keyFromYaml(raw);
        if (k) return k;
      } else {
        try {
          const d = JSON.parse(raw);
          const k = d && (d.apiKey || d.api_key || d.COMMANDCODE_API_KEY || (d.refs && d.refs.COMMANDCODE_API_KEY));
          if (k) return String(k);
        } catch { /* not json */ }
      }
    } catch { /* file not found */ }
  }
  return '';
}

function readApiKey(config) {
  // 1. 插件 config（patch 里配置）
  if (config.apiKey) return config.apiKey;
  // 2. 环境变量
  const envName = config.apiKeyEnv || DEFAULT_CONFIG.apiKeyEnv;
  if (process.env[envName]) return process.env[envName];
  // 3. 配置文件
  const fromFiles = readApiKeyFromFiles();
  if (fromFiles) return fromFiles;
  // 4. launchctl getenv
  try {
    const { execFileSync } = require('node:child_process');
    const out = execFileSync('launchctl', ['getenv', envName], { encoding: 'utf8' }).trim();
    if (out) return out;
  } catch {}
  return '';
}

async function fetchJson(url, apiKey, config) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs || DEFAULT_CONFIG.timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'x-command-code-version': '1.0.0',
        'x-cli-environment': 'production',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36',
      },
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchUsageReport(config) {
  const apiKey = readApiKey(config);
  if (!apiKey) {
    return { error: '未找到 COMMANDCODE_API_KEY（可通过 cordis.patch.yml config.apiKey 配置，或设置环境变量）' };
  }
  const base = config.apiBase || DEFAULT_CONFIG.apiBase;
  const results = {};
  const failures = [];
  for (const ep of ENDPOINTS) {
    try {
      results[ep.key] = await fetchJson(base + ep.path, apiKey, config);
    } catch (e) {
      failures.push(ep.path + ': ' + (e instanceof Error ? e.message : String(e)));
    }
  }
  return { fetchedAt: new Date().toISOString(), failures, ...results };
}

// 同步 apply：避免 async + await 导致 ctx.connection 状态不完整
module.exports.apply = function apply(ctx, rawConfig) {
  const config = Object.assign({}, DEFAULT_CONFIG, rawConfig || {});

  // 1. 注册工具（agent 可用 / 对话可查）
  try {
    const { defineTool } = require('@deepseek-ai/dsh-tools');
    ctx.tools.register(defineTool({
      name: 'commandcode_usage',
      description: '查询 CommandCode 账号用量与余额（/alpha/whoami、usage/summary、billing/credits、billing/subscriptions）。返回账号信息、累计用量、信用额度、5小时/每周窗口、订阅套餐。',
      parameters: {},
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute() {
        const report = await fetchUsageReport(config);
        return report.error ? report.error : JSON.stringify(report, null, 2);
      },
    }));
    console.log('[dsh-commandcode-usage] 已注册 commandcode_usage 工具');
  } catch (e) {
    console.error('[dsh-commandcode-usage] 工具注册失败:', e instanceof Error ? e.message : String(e));
  }

  // 2. 注册 RPC channel（client 侧面板取数）
  try {
    const rpc = ctx && ctx.connection && ctx.connection.rpc;
    if (rpc && typeof rpc.handle === 'function') {
      rpc.handle('/dsh-usage', async (endpoint, _payload, _signal) => {
        if (endpoint === 'report') {
          const report = await fetchUsageReport(config);
          return { ok: !report.error, value: report };
        }
        return { ok: false, error: 'unknown endpoint: ' + endpoint };
      }, { authority: 'loopback' });
      console.log('[dsh-commandcode-usage] 已注册 RPC channel /dsh-usage');
    } else {
      console.log('[dsh-commandcode-usage] 无 rpc.handle 可用，跳过 RPC channel');
    }
  } catch (e) {
    console.error('[dsh-commandcode-usage] RPC 注册失败:', e instanceof Error ? e.message : String(e));
  }
};
