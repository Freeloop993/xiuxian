# OpenClaw LLM Integration

本项目现在支持直接调用 OpenClaw 的 LLM 入口做叙事增强，不需要额外接第三方模型 API。

## 架构

1. 规则引擎先执行：
- 状态推进
- 规则校验
- 数值结算
- 媒体触发

2. 将规则结果发送到 OpenClaw LLM：
- 保持规则事实不变
- 增强叙事质量与角色对白
- 输出更接近角色扮演体验

3. OpenClaw LLM 不可用时自动回退模板文本（不中断流程）

## 环境变量

```bash
OPENCLAW_LLM_URL=https://<你的-openclaw-llm-endpoint>
OPENCLAW_MODEL=<你的模型名>
OPENCLAW_API_KEY=<可选，若网关需要鉴权>
```

说明：
- 只使用 OpenClaw 的 LLM 网关，不接入其他 LLM 平台。
- 若 `OPENCLAW_LLM_URL` 未设置，系统使用规则引擎原始文本。

## 请求格式

代码按 OpenAI 兼容格式向 OpenClaw 发请求：
- `model`
- `temperature`
- `messages`

返回兼容字段：
- `choices[0].message.content`
- 或 `output_text`
- 或 `content`

## 文件

- `src/integrations/openclawLlm.ts`
- `src/integrations/openclaw.ts`
