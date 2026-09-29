# 字体调校（font-tuner）

CC GUI 插件：自定义窗口与内容字体，并对字体渲染做配置化调整。

## 功能

安装后在 **设置 →「字体调校」** 出现配置页，所有配置实时生效并持久化到本机插件存储：

| 配置项 | 说明 |
|---|---|
| 窗口字体 | 整个应用界面的 `font-family`，留空跟随宿主 |
| 内容字体 | 对话 / Markdown 区域与输入框的字体族 |
| 代码字体 | `pre` / `code` 等宽区域的字体族 |
| 内容字号 | 12–28px 滑杆，0 位 = 跟随宿主 |
| 行高 | 1.0–2.6 滑杆，0 位 = 跟随宿主 |
| 字距 | -0.05–0.3em 滑杆，0 位 = 跟随宿主 |
| 字体平滑 | `-webkit-font-smoothing`：跟随宿主 / antialiased / none |
| 文本渲染 | `text-rendering`：跟随宿主 / optimizeLegibility / optimizeSpeed / geometricPrecision |
| 字体描边 | `-webkit-text-stroke` 0–2px 滑杆，描边色跟随文字色，视觉上加粗字形；0 位 = 关闭 |
| 阴影大小 | `text-shadow` 模糊半径 0–12px 滑杆，偏移随大小联动；0 位 = 关闭 |
| 阴影颜色 | HSLA 四通道滑杆（色相 0–360° / 饱和度 / 亮度 / 透明度）+ 实时色块预览 |
| 启用开关 | 一键停用全部修改，方便 A/B 对比 |
| 实时预览 | 中英文 + 数字样例即时反映当前配置 |

字体输入框填标准 CSS font-family 栈，例如：

```
Inter, "Microsoft YaHei", sans-serif
```

## 实现方式

- 通过 `ctx.theme.injectCss` 注入样式（卸载插件即自动移除，不残留）
- 内容区域精确匹配宿主聊天输出容器 `.prose-chat` 与输入框 `.composer-editable`，标题/列表等子元素字号按 `em` 相对级联
- 字体栈输入会过滤 `; { } / * @ \` 等字符，防止越界注入

## 权限说明

| 权限 | 用途 |
|---|---|
| `ui:settings-section` | 注册「字体调校」设置页 |
| `theme` | 注入字体/渲染相关 CSS |
| `storage` | 持久化你的字体配置 |

不出网、不执行命令、不读写会话数据。

## 许可

[MIT](LICENSE)
