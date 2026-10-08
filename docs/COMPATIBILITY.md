# 浏览器与设备兼容性（TASK-028）

目标：Display 与主要小部件在常见手机/平板浏览器上可用。

## 检查表模板

| Device | Browser | Version | Feature | Result | Issue |
|--------|---------|---------|---------|--------|-------|
| iPad | Safari | _ | Display 加载 | | |
| iPad | Safari | _ | 长时间运行 | | |
| iPad | Safari | _ | 自动刷新 | | |
| iPad | Safari | _ | 网络短断恢复 | | |
| iPad | Safari | _ | 响应式布局 | | |
| iPhone | Safari | _ | Display 加载 | | |
| Android | Chrome | _ | Display 加载 | | |
| Desktop | Chrome | _ | Admin 编辑器 | | |
| Desktop | Chrome | _ | Widget 配置 | | |
| Desktop | Firefox | _ | Display 加载 | | |
| macOS | Safari | _ | Display 加载 | | |

Widget 行可复制：Clock / Calendar / 传统挂历 / Weather / HA / Google Tasks / Touch / Checkbox。

**Result**：`pass` / `fail` / `n/a`  
**Issue**：简短描述；无则留空。

---

## 静态审计结论（本仓库）

| 区域 | 结论 | 说明 |
|------|------|------|
| Display 运行时 | 兼容 | `online`/`offline`/`visibilitychange` 目标浏览器均支持 |
| 缓存与刷新 | 兼容 | 无 Service Worker 强依赖；短断后保留上次数据（TASK-024） |
| Error Boundary | 兼容 | 类组件边界，单 Widget 失败不拖垮整页（TASK-023） |
| 布局 | 兼容 | CSS Grid + 断点；避免仅依赖 hover 完成关键操作 |
| 复制展示链接 | 已加固 | Clipboard API 失败时回退 `textarea` + `execCommand` |
| 视口 | 已加固 | Next `viewport`：`device-width` + `viewportFit: cover` |
| 触控 | 已加固 | `touch-action: manipulation`；Display 减少长按呼出 |
| `crypto.randomUUID` | 服务端 | 仅 Node/API 层生成 ID；不依赖旧版 Safari 客户端 |
| 颜色/CSS | 保守 | 未使用 `oklch` / `:has` 作为唯一样式路径 |

---

## 实机建议步骤

1. 部署或 `npm run dev`，创建展示链接。  
2. 在 **iPad Safari** 打开 Display：检查是否白屏、字体是否错位、卡片是否溢出。  
3. 等待超过一次刷新周期（天气约 15 分钟，或临时改短验证），确认数据仍更新。  
4. 打开飞行模式数秒再关闭：应仍见旧数据，恢复后自动同步；无需手动刷整页。  
5. **待办**勾选：触控是否可点。  
6. **Admin**（桌面 Chrome）：拖拽布局、打开设置、保存。  
7. 将结果填入上表；`fail` 项开 issue 或在本分支做最小修复。

---

## 已知限制

- 极旧系统（如 iOS 12 以下）不在支持范围。  
- Admin 拖拽布局在桌面最舒适；手机上可配置但体验次于平板/桌面。  
- `navigator.onLine` 在部分网络下可能偏乐观，恢复仍依赖 visibility/心跳刷新。

---

## 本分支已做最小修复

1. `TokenManageModal` 复制链接兼容旧 Safari  
2. 根布局 `viewport` 元数据  
3. 全局触控与文字缩放样式  
4. Display 横向溢出抑制  
