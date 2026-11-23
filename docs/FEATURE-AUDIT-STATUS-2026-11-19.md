# FoodFlow 功能与工程审计状态

> 审计日期：2026-11-20  
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
| #7 | `331e30db62e1f2846813e2ad07c142024dcc22de` | Dependabot 将 GitHub Actions checkout 从 v6 更新至 v7，所有适用检查通过 |
| #8 | `5f58bdf45c7815966bbefa8aa84cb8fe622b99bb` | 更新审计状态文档基准 |
| #9 | `e30879db26caadae6d19d46e1904c92a6278e122` | 刷新审计证据并将长期路线图标记为历史规划 |

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


## 10. 2026-11-20 每日复核

本节为 2026-11-20 08:37（Asia/Phnom_Penh）的最新复核记录；旧章节中的 PR 数量、待办日期和运行状态均视为历史记录，以本节为准。

### 仓库与变更状态

- 最新 main：`e30879db26caadae6d19d46e1904c92a6278e122`，提交信息为 PR #9 的审计基准更新。
- 已合并 PR：#2、#3、#4、#5、#6、#7、#8、#9。
- 当前开放 PR：#10（`docs/update-audit-after-pr9`），base 为 main，检查时 head 为 `956c1283915aff08a0c0fd60b3ccbe200a9c9bbd`；mergeable=true，无 review submissions、无 inline review threads。
- 当前开放 issue：0。
- PR #10 仅修改本审计文档。复核发现合并记录表中 #7/#8/#9 行被写入字面量 `\n`，导致 Markdown 表格断行错误；本次已修正为真实换行。此修正会产生新的 PR head，旧 head 的检查结果不得用于新 head 的合并判定。

### main 合并后验证证据

- CI run [44543453401](https://github.com/Tony855/foodflow/actions/runs/44543453401)：validate、MySQL 8.4、MariaDB 10.11、11.4、11.8、12.3 全部 success。
- Daily Security and Quality Audit run [44543453475](https://github.com/Tony855/foodflow/actions/runs/44543453475)：CodeQL static security analysis = success；Dependencies and regression suite = skipped（push 事件按 workflow 条件跳过，不代表执行通过）。
- Installer Compatibility run [44543453444](https://github.com/Tony855/foodflow/actions/runs/44543453444)：Debian 12、Debian 13、Ubuntu 22.04、24.04、26.04 全部 success。
- 因此，main SHA `e30879db26caadae6d19d46e1904c92a6278e122` 的合并后 CI、数据库矩阵、CodeQL 作业和安装矩阵均已完成并成功；但上述 push 触发的完整依赖/回归 job 被跳过。

### PR #10 原 head 检查证据（修正文档前）

- CI run [44543671786](https://github.com/Tony855/foodflow/actions/runs/44543671786)：validate、MySQL 8.4、MariaDB 10.11/11.4/11.8/12.3 全部 success。
- CodeQL run [44543671719](https://github.com/Tony855/foodflow/actions/runs/44543671719)：CodeQL success；Dependencies and regression suite skipped（PR 事件按条件跳过）。
- Installer run [44543671724](https://github.com/Tony855/foodflow/actions/runs/44543671724)：五种 Debian/Ubuntu 环境全部 success。
- 以上仅属于旧 head `956c1283915aff08a0c0fd60b3ccbe200a9c9bbd`。修正提交后必须重新检查新 head 的所有适用工作流；当前不合并 PR #10。

### 每日依赖审计与漏洞状态

- 截至本次检查时间 08:37，Actions 最近运行列表中尚未出现 2026-11-20 的 schedule 事件。今日完整 `npm audit --audit-level=moderate`、静态审计、多语言严格检查和完整 `npm test` 尚无新的运行证据；不能用 push/PR 中被 skipped 的 job 替代。
- 已知的 `npm audit` 0 vulnerabilities 证据属于 2026-11-19 的历史审计基线，不代表本日重新扫描。
- main 的 CodeQL 作业成功，但本轮未能取得 Dependabot / code-scanning alerts 的实时告警清单；不得据此宣称当前告警数为零。
- Dependabot 的 npm 与 GitHub Actions 周更配置仍在；最近可见的自动升级 PR 均已完成，但这不等同于实时漏洞告警清单。
- 本次 PR 同时将 `daily-security-audit.yml` 的完整依赖/回归 job 条件扩展为 `schedule` / `workflow_dispatch` / `pull_request`，确保每个 PR head 运行全量 `npm audit --audit-level=moderate`、静态审计、严格 i18n 与完整 `npm test`；新 head 的该 job 结果必须重新核验。

### 分支治理状态

- main 分支 API 当前返回 `protected=false`，branch protection 显示 disabled；仓库 rulesets 列表为空。
- **高优先级治理风险：main 未启用服务器端分支保护。** 必须由仓库管理员配置要求 PR、required status checks（validate、MySQL/MariaDB 数据库矩阵、CodeQL、Debian/Ubuntu 安装矩阵）、禁止 force-push 和删除。不能把现有 PR 协作流程当作分支保护已经生效。

### 功能与安全状态

- 顾客扫码点餐、服务员桌台、KDS、收银/退款、商户与门店管理、财务对账/月结：核心代码与自动化测试已有历史证据；真实设备、门店、财务签字和跨租户生产攻击验收仍未完成。
- ABA PayWay / Bakong / KHQR：存在 adapter、查询/验证 helper 和测试；生产 callback ingress、verified-event processor、订单自动结算、退款回调与总账自动过账闭环仍未完成，必须等待官方协议、sandbox 凭据和财务映射确认。
- Telegram：outbox/webhook 代码已交付，worker 默认关闭；需要真实 Bot、Webhook、多商户 staging 与失败恢复 E2E。
- 数据库迁移与备份恢复：MySQL/MariaDB 自动化集成矩阵历史通过；没有生产备份恢复演练、RPO/RTO 签收，也不得在没有环境验收时执行破坏性迁移。
- 多节点 Redis/Socket.IO：有实现与配置，缺真实多节点和故障注入验收。
- 浏览器 E2E 与覆盖率门槛：尚无完整用户旅程 E2E / coverage gate 证据。
- 静态审计警告的最近已知基线仍为 157 个疑似未用 i18n key、90 个疑似未用 CSS class、6 个疑似未用 window export；174 个动态拼接候选被标记为误报。由于本日完整 schedule 审计尚无运行结果，这些数字不是本日重新计算结果，禁止据此批量删除。

### 下一批优先事项

1. 复核今日 schedule 是否启动；取得运行后检查 npm audit、静态审计、严格 i18n 与完整 Node 测试的逐项结果。
2. 修正 PR #10 的 Markdown 表格换行后，等待新 head 的 CI、CodeQL、数据库矩阵和安装矩阵全部完成，再决定是否 squash merge。
3. 管理员启用 main branch protection / rulesets，并设置全部 required checks。
4. 增加浏览器端顾客下单→KDS→收银→退款和跨商户隔离 E2E。
5. 继续推进 ABA/Bakong callback 与 KHQR 支付状态、退款、总账的 sandbox 闭环；没有凭据和财务审批时不得合并业务规则变更。
6. 完成 Telegram staging、生产备份恢复演练、RPO/RTO 和多节点故障注入验收。


## 11. PR #10 合并与 2026-11-20 最终复核

本节为本日最新状态，覆盖第 10 节中 PR #10 尚未合并时的快照。

### 主分支与 PR 状态

- 最新 main：`f3dce0696aa2b24d40965396e114ddc0bca63307`，由 PR #10 squash merge 产生；PR #10 合并提交：`f3dce0696aa2b24d40965396e114ddc0bca63307`。
- 已合并 PR：#2、#3、#4、#5、#6、#7、#8、#9、#10。
- PR #10 合并后、PR #11 创建前：开放 PR 0、开放 issue 0；本节审计文档当前通过 PR #11（`docs/audit-nov20-after-pr10`）提交，PR #11 仍待验证。
- PR #10 head：`5828fd37e818d1cf40dcff8e466aaa9ed936d807`；变更仅涉及 `.github/workflows/daily-security-audit.yml` 与本审计文档，无业务/支付规则、数据库迁移或生产凭据变更。

### PR #10 head 的完整验证

- CI run [44655378276](https://github.com/Tony855/foodflow/actions/runs/44655378276)：validate、MySQL 8.4、MariaDB 10.11、11.4、11.8、12.3 全部 success。
- Daily Security and Quality Audit run [44655377896](https://github.com/Tony855/foodflow/actions/runs/44655377896)：Dependencies and regression suite = success；CodeQL static security analysis = success。
- Installer Compatibility run [44655378107](https://github.com/Tony855/foodflow/actions/runs/44655378107)：Debian 12、Debian 13、Ubuntu 22.04、24.04、26.04 全部 success。
- 全量 `npm audit --audit-level=moderate`：`found 0 vulnerabilities`。
- 完整 Node 测试：805 项，779 pass、0 fail、26 skipped；26 项因通用 job 未设置 `MYSQL_INTEGRATION_URL` 而跳过，MySQL 8.4 与 MariaDB 10.11/11.4/11.8/12.3 的独立数据库集成作业均成功。
- 静态审计：306 个 JS 文件语法通过；8 个页面 inline handler 与 DOM ID 对账通过；23 个 route files 全部注册；48 services、7 middleware、3 db、7 config 均被引用；102 个前端 API 调用均能找到后端定义（识别到 170 个后端定义）；206 个接口未发现同 method/path 重复。
- 静态候选警告：157 个疑似未使用 i18n key、90 个疑似未使用 CSS class、6 个疑似未使用 window export；174 个动态拼接候选为已知误报。不得在未逐项确认动态引用前删除。CodeQL 作业成功不等于告警数量为零；本轮未取得独立的 Dependabot/code-scanning alerts 清单。

### PR #10 合并后的 main 验证

- CI run [44655672200](https://github.com/Tony855/foodflow/actions/runs/44655672200)：validate、MySQL 8.4、MariaDB 10.11/11.4/11.8/12.3 全部 success。
- Daily Security and Quality Audit run [44655672860](https://github.com/Tony855/foodflow/actions/runs/44655672860)：CodeQL success；Dependencies and regression suite skipped（push 事件按条件跳过；PR #10 head 的完整 job 已成功执行）。
- Installer Compatibility run [44655672068](https://github.com/Tony855/foodflow/actions/runs/44655672068)：Debian 12/13、Ubuntu 22.04/24.04/26.04 全部 success。
- 因此 main `f3dce0696aa2b24d40965396e114ddc0bca63307` 的合并后 CI、数据库矩阵、CodeQL 作业与安装矩阵均已完成并通过。

### 每日 schedule 与分支治理

- 截至 2026-11-20 08:47（柬埔寨时间），main 的 Actions 最近运行列表仍未出现今日 `schedule` 事件；本日全量依赖/回归审计已通过 PR #10 head 的 run `44655377896` 完成，但不能将其冒充为 main 上的 schedule run。
- PR #10 已把完整依赖/回归 job 扩展为在 `schedule`、`workflow_dispatch` 和 `pull_request` 事件运行，避免后续 PR 的全量审计被跳过。
- main 当前 `protected=false`、branch protection disabled、rulesets 列表为空。**高优先级治理风险仍未解除**：管理员必须启用要求 PR、required status checks、禁止 force-push 和删除；在服务器端规则生效前不得声称 main 已受保护。

### 功能验收状态与阻塞

- 已实现且有自动化测试证据：顾客扫码点餐、服务员桌台、KDS、收银基础流程、租户/角色核心授权、财务对账与月结核心、备份/恢复集成测试、KHQR 状态与并发保护测试。
- 部分实现：ABA PayWay / Bakong adapters 与查询/验证 helper；财务 provider-neutral ledger/reconciliation；Telegram outbox/webhook；Redis/Socket.IO 多节点配置。
- 未实现/未闭环：生产可用支付 callback ingress 与 verified-event processor、自动订单结算与总账自动过账、完整自动退款回调、浏览器端完整 E2E/覆盖率门槛。
- 生产验收阻塞：支付方 sandbox/商户凭据与官方合同、财务账户映射和签字；真实 Telegram Bot/Webhook staging；生产备份恢复与 RPO/RTO 演练；多节点故障注入；真实门店设备/打印机/浏览器验收。
- 不报告虚构完成百分比；生产凭据、真实支付方、客户数据与生产数据库均未在本轮访问。

### 下一批优先事项

1. 管理员启用 main branch protection / rulesets 并配置全部 required checks。
2. 继续补充浏览器 E2E：顾客下单→KDS→收银→退款，并增加跨商户对象授权攻击测试。
3. 在 sandbox 与财务审批后实现 ABA/Bakong callback、verified-event processor、订单状态与总账/退款闭环。
4. 完成 Telegram 多商户 staging、备份恢复演练、RPO/RTO 与 Redis 多节点故障注入。
5. 逐项人工分类静态死代码候选；禁止按静态启发式结果直接批量删除。


## 12. 2026-11-21 每日复核

本节为 2026-11-21（Asia/Phnom_Penh）复核；旧章节中的开放 PR 数量与运行状态仅作为历史记录。

### 仓库状态与合并记录

- main 最新 SHA：`b7fa1228dee85ce17db1897eca81822b20bcea86`，由 PR #11 squash merge 产生。
- 已合并 PR：#2、#3、#4、#5、#6、#7、#8、#9、#10、#11（共 10 个已记录合并 PR）。
- 当前开放 PR：0；当前开放 issue：0（GitHub 搜索实时结果）。
- PR #11：`docs/audit-nov20-after-pr10`，head `52232557ec95618a05dbd53c4a66f9e668bdaca5`，已于 2026-11-21 squash merge，合并 commit `b7fa1228dee85ce17db1897eca81822b20bcea86`。仅更新审计文档，无业务/支付规则、数据库迁移或生产凭据变更。

### PR #11 head 的适用验证

- CI run [44656018085](https://github.com/Tony855/foodflow/actions/runs/44656018085)：validate、MySQL 8.4、MariaDB 10.11、11.4、11.8、12.3 全部 success。
- Daily Security and Quality Audit run [44656018044](https://github.com/Tony855/foodflow/actions/runs/44656018044)：CodeQL success；完整 Dependencies and regression suite success。
- Installer Compatibility run [44656018047](https://github.com/Tony855/foodflow/actions/runs/44656018047)：Debian 12/13、Ubuntu 22.04/24.04/26.04 全部 success。
- 完整依赖审计：`npm audit --audit-level=moderate` 输出 `found 0 vulnerabilities`。
- Node 回归：805 tests，779 pass、0 fail、26 skipped；26 项是通用测试任务未设置 `MYSQL_INTEGRATION_URL` 的独立集成测试，数据库矩阵单独执行成功。
- 静态审计、严格 i18n 和审计脚本编译步骤全部成功。历史静态候选警告仍需人工分类；未逐项验证前禁止批量删除。
- Codex PR review 任务曾因使用额度限制而失败；该失败关联旧 commit `9c3463a...`，没有形成 inline review thread 或正式 review submission。不能将它称为通过的 review；但 PR #11 最新 head 的所有 GitHub Actions 适用检查均成功。

### PR #11 合并后 main 检查

- GitHub API 确认 main 指向 `b7fa1228dee85ce17db1897eca81822b20bcea86`，PR #11 已合并。
- follow-up API 复核取得 post-merge run：CI [44853077364](https://github.com/Tony855/foodflow/actions/runs/44853077364) 仍运行中，validate、MySQL 8.4、MariaDB 11.4/11.8 success，MariaDB 10.11/12.3 pending；Installer Compatibility [44853077336](https://github.com/Tony855/foodflow/actions/runs/44853077336) 五个 Debian/Ubuntu job 全部 success；Daily Security and Quality Audit [44853077274](https://github.com/Tony855/foodflow/actions/runs/44853077274) CodeQL success，Dependencies and regression suite = skipped（push 事件按条件跳过）。
- PR #11 head 的完整依赖/回归与测试通过可作为该文档变更的验证证据，但不能替代 post-merge main 的完整验证。今日 schedule run 尚未取得独立记录；上一份 schedule 成功运行属于 2026-11-20 的旧 main SHA `f3dce...`，不作为本日证据。

### 安全与治理

- main branch protection：`protected=false`、protection disabled、required status checks enforcement off。
- Rulesets：API 返回空列表。
- **高优先级治理风险仍存在**：必须由管理员启用 PR、required checks、禁止 force-push 和删除；当前连接无权修改这些管理设置。
- npm audit 最新证据为 PR #11 head（合并前）0 vulnerabilities；本轮未取得独立实时 Dependabot/code-scanning alerts 列表，不能宣称所有安全告警为零。

### 功能与验收状态

- 已实现且有自动化测试证据：扫码点餐、桌台/服务员、KDS、收银基础流程、租户与角色核心授权、财务对账/月结核心、备份恢复集成测试等。
- 部分实现：ABA PayWay/Bakong adapters 和验证查询 helper、provider-neutral 财务核心、Telegram outbox/webhook、多节点配置。
- 未闭环：生产支付 callback ingress 与 verified-event processor、自动订单结算/总账过账、完整自动退款 callback、浏览器完整 E2E 与覆盖率门槛。
- 生产验收阻塞：支付方 sandbox/商户凭据与官方协议、财务账户映射及签字、真实 Telegram Bot/webhook staging、生产恢复演练与 RPO/RTO、多节点故障注入、门店设备/打印机验收。
- 未访问生产数据库、支付凭据、客户数据或真实生产环境；未执行生产迁移/支付/退款。

### 下一批优先事项

1. 继续验证 main post-merge Actions 与每日 schedule；需获得完整 run/check 数据后才能确认。
2. 管理员启用 main protection / rulesets 与 required checks。
3. 增加顾客下单→KDS→收银→退款的浏览器 E2E，并补跨租户攻击验证。
4. 在 sandbox 和财务审批后闭环 ABA/Bakong callback、KHQR、退款和总账。
5. 完成 Telegram staging、生产备份恢复、RPO/RTO 和多节点故障注入。
6. 分类静态死代码候选，禁止凭启发式结果批量删除。


## 13. 2026-11-22 每日复核

本节记录 2026-11-22（Asia/Phnom_Penh）复核。所有状态均以本节注明的 SHA、run ID 和检查时间为准；后续状态变化应追加更新，不覆盖历史证据。

### 仓库、PR 与 issue 状态

- main 最新 SHA：`9028373d4331a1b99d21d6036b4a3730d44051cf`，由 PR #12 squash merge 产生。
- 已合并 PR：#2、#3、#4、#5、#6、#7、#8、#9、#10、#11、#12（共 11 个已记录合并 PR）。
- 当前开放 PR：0；当前开放 issue：0（分别读取 pulls?state=open 与 issues?state=open，并从 issues 响应中过滤 pull_request 项）。
- PR #12：`docs/audit-nov21`，head `2980673ffa585061d18f9c3f34564a61ca94a3a4`，base `b7fa1228dee85ce17db1897eca81822b20bcea86`；于 2026-11-22 01:41:54Z squash merge，合并 commit `9028373d4331a1b99d21d6036b4a3730d44051cf`。仅修改本审计文档（1 个文件、52 additions、0 deletions），无业务/支付规则、数据库迁移或生产凭据变更；无 review threads、review comments 或 issue comments。

### PR #12 最新 head 的完整验证

- CI run [44853252313](https://github.com/Tony855/foodflow/actions/runs/44853252313)：validate、MySQL 8.4、MariaDB 10.11、11.4、11.8、12.3 全部 success。
- Daily Security and Quality Audit run [44853252312](https://github.com/Tony855/foodflow/actions/runs/44853252312)：Dependencies and regression suite success；CodeQL static security analysis success。
- Installer Compatibility run [44853252319](https://github.com/Tony855/foodflow/actions/runs/44853252319)：Debian 12/13、Ubuntu 22.04/24.04/26.04 全部 success。
- 完整依赖审计：`npm audit --audit-level=moderate` 输出 `found 0 vulnerabilities`；生产依赖额外审计 `npm audit --omit=dev --audit-level=high` 也输出 `found 0 vulnerabilities`。
- Node 回归：805 tests，779 pass、0 fail、26 skipped。26 项因通用测试任务未配置 `MYSQL_INTEGRATION_URL` 而跳过；数据库矩阵在独立服务中执行。MySQL 集成日志另报告 23 tests、23 pass、0 fail、0 skipped。
- 依赖审计、审计脚本编译、仓库静态审计、重复路由/跨文件函数检查、严格多语言检查及完整测试均成功。
- 回归覆盖的具体安全路径包括：财务路由要求管理员认证与 finance permission；缺少 actor context 时拒绝 body/query actor spoofing；租户/门店对象范围 fail-closed；PayWay callback 缺少 secret、无效 JSON 和嵌套字段时拒绝；Bakong 未找到/失败结果不视为已付款；KHQR 重试幂等、旧 QR 确认窗口失效及并发状态变更保护；退款请求要求有界 idempotency key；备份恢复审计与 session invalidation 在同一事务中。
- CodeQL job 成功仅表示分析作业成功，不等同于 GitHub 所有安全告警为零。

### PR #12 合并后的 main 验证（截至 2026-11-22 08:43，Asia/Phnom_Penh）

- main 当前指向 `9028373d4331a1b99d21d6036b4a3730d44051cf`。
- CI [44972668588](https://github.com/Tony855/foodflow/actions/runs/44972668588)：validate success、MySQL 8.4 success；MariaDB 10.11/11.4/11.8/12.3 仍 in_progress。
- Daily Security and Quality Audit [44972668571](https://github.com/Tony855/foodflow/actions/runs/44972668571)：CodeQL in_progress；Dependencies and regression suite = skipped（push 事件按当前 workflow 条件跳过，不代表通过）。PR #12 head 的完整依赖/回归任务已成功。
- Installer Compatibility [44972668536](https://github.com/Tony855/foodflow/actions/runs/44972668536)：Debian 12/13、Ubuntu 22.04/24.04/26.04 全部 success。
- 因 CI 数据库矩阵和 CodeQL 仍在运行，当前 main combined status 为 pending；不得标记 post-merge 全部通过。

### 每日 schedule、依赖漏洞与安全告警

- 当前 workflow 文件 `.github/workflows/daily-security-audit.yml` 和 `.github/workflows/installer-compat.yml` 均配置 `cron: "0 1 * * *"`，注释目标为柬埔寨时间 08:00（UTC+7）。
- 最近 schedule：Daily Security and Quality Audit [44883532490](https://github.com/Tony855/foodflow/actions/runs/44883532490)，2026-11-21 08:09:26Z，在 main SHA `b7fa1228dee85ce17db1897eca81822b20bcea86` 上 success；Installer Compatibility [44883331634](https://github.com/Tony855/foodflow/actions/runs/44883331634) 同日 success。2026-11-20 的 schedule run [44701412839](https://github.com/Tony855/foodflow/actions/runs/44701412839) 与 [44700979704](https://github.com/Tony855/foodflow/actions/runs/44700979704) 也 success。
- 截至 2026-11-22 08:43（柬埔寨时间），Actions schedule 列表尚无 2026-11-22 的 schedule run。应继续观察 GitHub schedule dispatch 是否延迟/漏触发；不能用 PR 或 push run 冒充当日 schedule。
- PR #12 head 的全量 npm audit 为 0 vulnerabilities。Dependabot 与 code-scanning alerts 的独立实时列表无法通过当前 GitHub 集成端点读取，告警状态未知；不得宣称告警数为零。
- main branch push 的 CodeQL 仍运行中；PR #12 head CodeQL success。不能把不同 SHA 的结果混用。

### 静态审计警告

- PR #12 head 的审计脚本编译、静态仓库审计、重复路由/跨文件函数检查、严格 i18n 检查全部 success。
- 最近可核实的候选警告基线仍为：157 个疑似未使用 i18n key、90 个疑似未使用 CSS class、6 个疑似未使用 window export；174 个动态拼接候选属于已知误报。上述数值是最近已记录的静态候选基线，不声称在本日重新人工确认；不得仅凭启发式结果删除。
- CI 环境日志包含 Redis memory overcommit 未启用提示、MariaDB io_uring 权限不足后回退 libaio、测试容器 MySQL TLS/临时配置提示；相关任务成功，这些是 runner/容器环境警告，不应误报为应用测试失败。

### main 分支治理

- GitHub branch API 返回 `protected=false`、protection disabled、required status checks enforcement off。
- Repository rulesets API 返回空列表。
- **高优先级治理风险仍存在**：管理员须在 Settings → Rules → Rulesets 对 main 启用 PR required、required status checks（validate、MySQL 8.4、MariaDB 10.11/11.4/11.8/12.3、CodeQL、Debian 12/13、Ubuntu 22.04/24.04/26.04）、禁止 force-push 和删除。当前集成无权写入/读取 branch protection 管理接口；不得声称 main 已受保护。

### 功能实现与生产验收状态

- 已实现且有自动化测试证据：扫码点餐、桌台/服务员、KDS、收银基础流程、租户与角色核心授权、财务对账/月结核心、备份恢复集成测试。
- 部分实现：ABA PayWay/Bakong adapters 与查询/验证 helper、provider-neutral ledger/reconciliation、Telegram outbox/webhook、多节点 Redis/Socket.IO 配置。
- 未闭环：生产支付 callback ingress 与 verified-event processor、自动订单结算/总账过账、完整自动退款 callback、完整浏览器用户旅程 E2E 与覆盖率门槛。
- 生产验收阻塞：支付方 sandbox/商户凭据与官方协议、财务账户映射及签字、真实 Telegram Bot/Webhook 多商户 staging、生产备份恢复演练与 RPO/RTO、多节点故障注入、真实门店设备/打印机/浏览器验收。
- 本轮未访问生产数据库、客户数据、生产支付凭据或真实生产环境；未执行生产迁移、支付或退款。

### 下一批优先事项

1. 等待 main SHA `9028373...` 的 CI 数据库矩阵与 CodeQL 全部完成，再记录 post-merge 最终结果。
2. 持续观察 2026-11-22 schedule run 是否触发；若连续延迟/漏触发，再调整 cron 到避开整点高峰的分钟并经 PR 验证。
3. 管理员启用 main branch protection / rulesets 与 required checks。
4. 增加顾客下单→KDS→收银→退款的浏览器 E2E，并补跨租户对象授权攻击测试。
5. 在支付方 sandbox 与财务审批后闭环 ABA/Bakong callback、KHQR、退款和总账；无凭据/审批时不得修改业务规则。
6. 完成 Telegram 多商户 staging、生产备份恢复演练、RPO/RTO 与 Redis 多节点故障注入。
7. 人工分类静态候选警告；不得按启发式结果批量删除。


## 14. 2026-11-23 每日复核

本节记录 2026-11-23 08:05（Asia/Phnom_Penh）复核。由于当前 GitHub 集成无法列出所有 Actions runs 或直接读取 branch protection/rulesets 管理接口，本节对这两类项目明确区分最新已核实证据与今日未能重新读取的状态，不把历史数据冒充今日实时结果。

### 仓库、PR、Issue 与 main

- 最新已确认 main SHA：`5d3060b45f9ff7f8f4f26806bafd494432a8103f`（PR #13 squash merge）。
- 最近提交搜索结果仍指向该 main commit；本次未发现更晚提交。
- 当前开放 PR：0（GitHub PR 查询）。
- 当前开放 Issue：0（GitHub Issue 搜索）。
- 已记录合并 PR：#2–#13，共 12 个（含 PR #12、#13）。
- PR #13 合并后 main 的 post-merge CI、CodeQL 和安装矩阵已完成，结果见下节。

### main post-merge 验证

- CI run [44973055785](https://github.com/Tony855/foodflow/actions/runs/44973055785)：validate、MySQL 8.4、MariaDB 10.11、11.4、11.8、12.3 全部 success。工作任务日志确认 finance integration、migration、backup/restore 和 Telegram outbox integration 子任务执行成功。
- Daily Security and Quality Audit run [44973055766](https://github.com/Tony855/foodflow/actions/runs/44973055766)：CodeQL static security analysis success；Dependencies and regression suite = skipped（push 事件按 workflow 条件跳过，不能计为执行通过）。
- Installer Compatibility run [44973055751](https://github.com/Tony855/foodflow/actions/runs/44973055751)：Debian 12/13、Ubuntu 22.04/24.04/26.04 全部 success。
- 因此 main SHA `5d3060b...` 的 post-merge CI/数据库矩阵、CodeQL job 和安装兼容矩阵已完成并成功；完整依赖/回归任务没有在该 push run 上执行。
- 该 main commit 对应 PR #13 的合并内容。PR #13 head 上已执行完整 Dependencies and regression suite、CodeQL、CI/数据库矩阵和安装矩阵并全部成功；该 head 的全量 npm audit 输出 0 vulnerabilities。此 PR-head 证据不能冒充 main schedule run。

### 依赖、测试和安全证据

- PR #13 head 的 `npm audit --audit-level=moderate`：0 vulnerabilities；生产依赖审计 `npm audit --omit=dev --audit-level=high`：0 vulnerabilities。
- Node suite：805 tests，779 pass、0 fail、26 skipped；26 项为通用测试任务未配置 `MYSQL_INTEGRATION_URL` 的独立数据库测试。
- MySQL/MariaDB 集成测试单独运行。可核实的 MariaDB 10.11 日志显示 finance integration 23 tests、23 pass、0 fail、0 skipped；session migration、backup/restore 和 Telegram outbox integration 子任务各自通过。
- CodeQL job success 不等于 GitHub 所有安全告警为零。当前集成仍未取得独立 Dependabot / code-scanning alerts 的实时列表，告警清单状态未知。
- 本次未访问生产数据库、客户数据、支付凭据或真实生产环境；未执行生产支付、退款或数据库迁移。

### 每日 schedule 状态

- `daily-security-audit.yml` 与 `installer-compat.yml` 配置 `cron: "0 1 * * *"`（UTC 01:00，即柬埔寨时间 08:00）。
- 当前运行时为 08:05，GitHub Actions runs 列表端点不可由当前连接读取；本次未能确认 2026-11-23 schedule 是否已启动/完成，也未能独立确认 2026-11-22 schedule run。
- 最新可核实的 schedule 记录仍是前述历史 run（2026-11-21）。不能用 PR/push run 代替每日 schedule run。
- 过去记录中的 schedule 时间戳与预期 UTC 时间有偏差，需要继续观察；目前不擅自修改 cron，待取得完整 run list 后再判断是否漏触发或延迟。

### 静态审计与功能验收

- 最近可核实静态候选基线：157 个疑似未使用 i18n key、90 个疑似未使用 CSS class、6 个疑似未使用 window export、174 个动态拼接候选（已识别为误报）。本日 schedule 未能独立确认，因此不声称这些数字今日重新计算。
- 已实现且有自动化测试证据：顾客扫码点餐、桌台/服务员、KDS、收银基础流程、租户/角色核心授权、财务对账/月结核心、备份恢复集成测试。
- 部分实现：ABA PayWay/Bakong adapters 与查询/验证 helper、provider-neutral 财务核心、Telegram outbox/webhook、多节点 Redis/Socket.IO 配置。
- 未闭环：生产支付 callback ingress 与 verified-event processor、自动订单结算/总账过账、完整自动退款 callback、浏览器完整 E2E 与 coverage gate。
- 生产验收阻塞：支付方 sandbox/商户凭据与官方协议、财务账户映射和签字、真实 Telegram staging、生产备份恢复/RPO/RTO、Redis/Socket.IO 多节点故障注入、真实门店设备/打印机验收。

### main branch protection / rulesets

- 最新可核实管理状态来自 2026-11-22 的读取：`protected=false`、branch protection disabled、required status enforcement off、rulesets 列表为空。
- 本日无法通过当前 GitHub 集成重新读取这些管理端点；不得把 2026-11-22 的读数冒充 2026-11-23 的实时确认。
- **高优先级治理风险仍未解除（最新已核实状态为未启用）**。管理员必须在 Settings → Rules → Rulesets 对 main 启用 PR、required checks（validate、MySQL 8.4、MariaDB 10.11/11.4/11.8/12.3、CodeQL、Debian 12/13、Ubuntu 22.04/24.04/26.04）、禁止 force-push 和删除，并在生效后重新验证。

### 下一批优先事项

1. 取得 main SHA `5d3060b...` 的每日 schedule runs/checks 列表，核实 2026-11-23 完整依赖审计、静态审计、i18n 与测试结果；若未触发，分析时间偏差后通过 PR 调整。
2. 管理员启用 main branch protection / rulesets 和全部 required checks。
3. 增加浏览器 E2E（顾客下单 → KDS → 收银 → 退款）与跨租户对象授权攻击测试。
4. 在 sandbox 与财务审批后推进 ABA/Bakong callback、KHQR、退款及总账闭环。
5. 完成 Telegram 多商户 staging、生产备份恢复演练/RPO/RTO 与多节点故障注入。
6. 对静态候选逐项分类；不得仅凭启发式结果批量删除。
