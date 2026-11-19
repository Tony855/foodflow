# FoodFlow 功能与工程审计状态

> 审计日期：2026-11-19  
> 仓库：`Tony855/foodflow`  
> 原始审计基准：`331e30db62e1f2846813e2ad07c142024dcc22de`（历史基准；最新状态见第 9 节）  
> 本文件区分“代码已实现”“自动化测试通过”和“真实生产验收”，不能仅凭代码或文档存在就判定功能已完成。

## 1. 本轮已合并的治理修复

| PR | 合并提交 | 内容 |
|---|---|---|
| #2 | `8b7b2384f43b27c6be3417eeeed87f89b51d04e0` | 每日依赖/代码/回归审计、CodeQL、修复 minimatch 漏洞、修正 Dependabot 配置 |
| #5 | `e8d2304e45e810941f96f4c71b062d5c0cef79a8` | Telegram 外发 worker 改为显式 opt-in，首次安装默认关闭 |
| #3 | `752cb0b71a44f7ccd6acb4ac9683fcce6fec90f8` | 安装器、升级脚本、部署文档统一使用 Tony855/foodflow |
| #4 | `3eea5f62a3e6d222e7efc68b4870d37b8a4e9f46` | 每日完整审计、每日安装兼容矩阵、重复路由/函数审计、GitHub Actions Dependabot |
| #6 | `81707ea6b9ccf763b7be32c725a936e6defbb095` | 新增当前功能与工程审计状态追踪文档 |
| #7 | `331e30db62e1f2846813e2ad07c142024dcc22de` | Dependabot 将 GitHub Actions checkout 从 v6 更新至 v7，所有适用检查通过 |\n| #8 | `5f58bdf45c7815966bbefa8aa84cb8fe622b99bb` | 更新审计状态文档基准 |\n| #9 | `e30879db26caadae6d19d46e1904c92a6278e122` | 刷新审计证据并将长期路线图标记为历史规划 |

## 2. 自动化审计机制

- `daily-security-audit.yml`：每天 08:00 柬埔寨时间执行；运行完整 npm 依赖漏洞审计、仓库静态审计、重复路由/跨文件函数检查、多语言检查和完整 Node 测试。
- CodeQL：对 PR、main push、每日计划任务执行 JavaScript/TypeScript `security-extended` 分析。
- `installer-compat.yml`：每天 08:00 柬埔寨时间运行 Debian/Ubuntu 安装兼容矩阵，并在 PR/main push 时运行。
- Dependabot：npm 与 GitHub Actions 每周检查更新。
- ChatGPT 每日审计任务：`Asia/Phnom_Penh`，每日 08:00；检查最新 main、PR head、CI、依赖、安全、财务、租户隔离和部署进度。只在所有适用检查成功后才允许通过 PR 合并；需要生产凭据或人工验收的项目必须阻止自动合并。

## 3. 已验证的自动化基线

以下数据来自 PR #2 合并后 main 提交 `8b7b2384f43b27c6be3417eeeed87f89b51d04e0` 的完整审计和 CI。PR #3、#4、#5 的最终 PR head 也分别通过其适用 CI、CodeQL、数据库矩阵和安装兼容检查。

- Node 测试：805 项，779 通过、0 失败、26 跳过。
- 26 项跳过原因是通用测试作业未设置 `MYSQL_INTEGRATION_URL`；MySQL 8.4 与 MariaDB 10.11、11.4、11.8、12.3 的独立数据库集成作业会执行相应财务、迁移、备份恢复和 Telegram outbox 测试，并已通过。
- npm 全依赖审计：0 vulnerabilities。
- 生产依赖审计：CI 通过。
- CodeQL 分析作业：通过。作业成功不等于声明安全告警数量为零。
- 安装兼容矩阵：Debian 12、Debian 13、Ubuntu 22.04、24.04、26.04 均通过。
- 最新 main `331e30db62e1f2846813e2ad07c142024dcc22de` 的合并后 CI、CodeQL/每日安全工作流和五种 Linux 安装兼容工作流均已通过；CI 中 MySQL 8.4 与 MariaDB 10.11/11.4/11.8/12.3 全部成功。
- 静态审计：306 个 JavaScript 文件语法通过；8 个前端页面的内联事件处理器对账通过；8 个页面的静态 DOM ID 对账通过。
- 后端：23 个路由文件全部被 server.js 注册；48 个 service、7 个 middleware、3 个 db、7 个 config 模块均被引用。
- API 对账：102 个前端 API 调用均能找到后端定义（静态识别到 170 个后端接口定义）。
- 多语言：中文、英文、越南语、泰语、高棉语严格 key 检查通过；每种语言 1232 个顶层 key、17 个分类。

静态审计仍报告候选项：157 个疑似未使用的语言 key、90 个疑似未使用的 CSS class、6 个疑似未使用的 window 导出。它们是静态启发式结果，可能包含动态引用；未核实前不得批量删除。另有 174 个动态拼接候选被审计脚本标记为误报。

## 4. 功能完成状态

| 功能域 | 当前判断 | 尚未完成的验收 |
|---|---|---|
| 顾客扫码点餐、菜单、购物车、下单 | 核心代码和自动化测试已交付 | 真实手机、扫码桌台和门店现场 E2E |
| 服务员桌台、订单操作 | 核心代码和自动化测试已交付 | 多设备并发和现场验收 |
| 后厨 KDS、出餐状态 | 核心代码和自动化测试已交付 | 实际厨房屏幕、打印机和断网恢复验收 |
| 收银、现金结算、退款 | 核心代码和自动化测试已交付 | 真实收款、真实退款及交班验收 |
| 商户/门店/超级管理 | 核心权限与租户测试已交付 | 生产权限矩阵及跨租户攻击测试 |
| 财务总账、对账、人工匹配、异常/SLA、月结、导出 | provider-neutral 核心及数据库集成已交付 | 真实银行流水格式、财务签字和真实月结验收 |
| ABA PayWay / Bakong | 有验证/查询 adapter 和测试 | 尚无可投入生产的 HTTP provider callback ingress 与完整 verified-event processor；未自动结算订单、自动过账总账 |
| Telegram 通知 | outbox、门店接收者、客户绑定/webhook 代码和测试已交付；worker 默认关闭 | 真实 Bot、Webhook、多商户 staging、重试/恢复和备份恢复 E2E |
| 备份/恢复 | MySQL/MariaDB 自动化集成测试已交付 | 真实生产备份恢复演练、RPO/RTO 验收 |
| 单机安装 | 五种 Debian/Ubuntu 安装 CI 通过 | 用户目标服务器的实际安装验收 |
| 多节点/Redis/Socket.IO | 有配置与启动保护代码 | 真实多节点部署、节点故障和网络分区测试 |
| 监控与运维 | 健康检查、日志、备份和诊断工具存在 | 生产 APM、指标、告警、值班流程和恢复演练 |

## 5. 重要未解决风险与阻塞

1. **main 分支保护未启用**：本次检查 `main.protected=false`，且仓库 rulesets 列表为空。需要仓库管理员在 GitHub Settings 配置 main 分支规则：要求 PR、要求最新 CI/CodeQL/数据库矩阵/安装矩阵通过、禁止直接推送和强制推送。当前自动化仍采用 PR 流程，但 GitHub 服务器端没有强制保护。
2. **支付生产闭环未完成**：PayWay/Bakong helper 和 provider-neutral inbox 不等于已接通 callback、订单状态转换、退款和财务分录。需要商户 sandbox 凭据、账户映射、支付方官方合同和财务确认。
3. **Telegram 生产验收未完成**：worker 已安全改为 opt-in；完成 staging 验收后才能显式启用。
4. **缺少浏览器端 E2E 和代码覆盖率门槛**：现有 805 项 Node 测试很有价值，但不能替代真实浏览器、设备、打印机和用户流程验收。
5. **生产环境未部署/未操作**：本轮没有访问真实生产数据库、支付凭据、Telegram token 或客户数据；没有执行生产迁移、真实支付、真实退款或灾备恢复。
6. **静态死代码候选尚未逐项人工分类**：语言 key、CSS 和全局导出告警需要逐项验证，不得直接删除。
7. **历史路线图需要整理**：`LONG_TERM_IMPROVEMENT_PLAN.md` 和部分旧审计/财务跟踪文档包含历史阶段、旧仓库链接和过期状态。此状态文件作为当前功能验收基线；历史文档应逐步标注为历史记录或更新。

## 6. 下一批优先顺序

1. 验证 PR #2/#3/#4/#5 合并后的最新 main CI、每日审计和安装矩阵；每日任务下次执行为 2026-11-20 08:00（柬埔寨时间）。
2. 请求管理员启用 main 分支保护与 required status checks。
3. 对 157 个语言 key、90 个 CSS class、6 个全局导出逐项分类，删除前必须有静态/动态引用证据。
4. 增加浏览器 E2E（顾客下单→厨房接单→收银结算→退款）和跨商户隔离场景。
5. 完成 ABA/Bakong callback ingress、事件处理器、订单/总账闭环和 sandbox 验收。
6. 完成 Telegram staging 验收、真实备份恢复演练和多节点故障注入。
7. 每日更新本文件中的已实现/部分实现/未实现/阻塞状态，记录最新 main SHA、PR、CI、风险和证据。

## 7. 进度统计规则

当前不报告虚构的“完成百分比”。必须先为每个功能建立可执行验收项和权重，再按“已实现且测试通过 / 部分实现 / 未实现 / 生产验收阻塞”统计。只有有自动化或人工验收证据的功能才能计入完成。


## 8. 2026-11-19 最新主分支复核补充

本节覆盖上述原始审计基准之后的 PR #7、#8 以及 PR #8 合并后的主分支验证；若与前文旧基准 SHA 或旧待办描述冲突，以本节为准。

- 最新 main：`5f58bdf45c7815966bbefa8aa84cb8fe622b99bb`。
- 已合并 PR：#2、#3、#4、#5、#6、#7、#8；当前开放 PR：0。
- PR #8 刷新了本审计状态文档，合并后需要再次核实其自身 post-merge 检查。
- 最新 main 的 GitHub Actions 运行结果：
  - Daily Security and Quality Audit run `44458740786`：CodeQL static security analysis = success；Dependencies and regression suite = skipped（该任务只在 schedule / workflow_dispatch 运行，push 触发时跳过符合 workflow 条件，不代表当日完整依赖/回归审计已执行）。
  - CI run `44458740763`：validate、MySQL finance integration、MariaDB finance integration 10.11 / 11.4 / 11.8 / 12.3 全部 success。
  - Installer Compatibility run `44458740772`：Debian 12 / 13、Ubuntu 22.04 / 24.04 / 26.04 全部 success。
- 因此，最新 main 的 post-merge CI、数据库集成、CodeQL 和安装兼容矩阵已完成并通过；每日完整依赖审计仍以每日 schedule / 手动触发结果为准，不能把 push 触发时 skipped 的 job 计作成功执行。
- 仓库仍未启用 main branch protection，Rulesets 仍需管理员在 GitHub Settings 中手动配置；不能把 PR 流程等同于服务器端分支保护。
- 历史路线图 `LONG_TERM_IMPROVEMENT_PLAN.md` 中描述的若干待办是早期规划，不应直接视为当前事实；应结合当前代码和本审计状态文档重新核对后再执行。



## 9. PR #9 合并后的最新状态（2026-11-19）

本节为当前最新状态，优先级高于第 1、3、6、8 节中较早的 main SHA、PR 数量和待办描述。

- 最新 main：`e30879db26caadae6d19d46e1904c92a6278e122`（PR #9 squash merge）。
- 已合并 PR：#2、#3、#4、#5、#6、#7、#8、#9；PR #9 已合并，无开放 PR（应以每次每日检查时 GitHub 实时结果为准）。
- PR #9 head `0900e529807b4f839e9d71827188d1d57bef691d` 的适用检查全部通过：
  - CI `44542782284`：validate、MySQL 8.4、MariaDB 10.11/11.4/11.8/12.3 全部 success。
  - CodeQL `44542782346`：success；Dependencies and regression suite = skipped（PR/push 不运行该 job，只有 schedule / workflow_dispatch 运行）。
  - Installer Compatibility `44542782312`：Debian 12/13、Ubuntu 22.04/24.04/26.04 全部 success。
- PR #9 合并后 main push 触发的工作流：
  - CI run `44543453401`。
  - Daily Security and Quality Audit run `44543453475`；CodeQL 正在运行，完整依赖/回归 job 在 push 事件中按设计 skipped。
  - 本节写入时，以上 post-merge main runs 尚未全部完成；不得把 PR head 检查等同于 main push 检查。
- 每日完整依赖审计实际 job 只在 `schedule` / `workflow_dispatch` 运行，命令包括 `npm audit --audit-level=moderate`、Python 审计脚本编译、代码/重复路由审计、多语言严格检查和 `npm test`。PR/push 的 skipped 是预期条件，不是成功执行记录。
- 每日安装兼容矩阵每天 08:00 柬埔寨时间执行；PR #9 head 的五种 Linux 环境均已成功。
- 仓库 main branch protection / rulesets 尚未启用。管理员仍需手动设置要求 PR、required checks、禁止 force-push 和删除；在 GitHub 确认生效前，不得报告已启用。
- `LONG_TERM_IMPROVEMENT_PLAN.md` 已加历史规划提示；当前实际功能状态以本文件的证据矩阵为准。
