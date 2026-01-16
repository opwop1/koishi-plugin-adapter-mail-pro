# koishi-plugin-adapter-email

这是一个邮件适配器，基于 `@satorijs/adapter-mail`。  
它支持：
- SMTP 发送邮件
- IMAP 接收邮件

下面是给新手的完整说明。

---

## 1. 需要准备什么

你需要邮箱账号和“授权码/密码”，以及邮箱服务商提供的服务器信息。

通常可以在邮箱后台找到这些信息（如：QQ 邮箱、163 邮箱、Gmail 等）。

你需要知道：
- SMTP 服务器地址和端口（用于发送）
- IMAP 服务器地址和端口（用于接收）
- 是否开启 TLS（一般都开启）

---

## 2. 安装依赖

进入插件目录安装依赖：

```powershell
cd d:\HugoMoveData\User\16832\Music\koishi\koishi-app\external\adapter-email
npm install
```

如果你用的是 pnpm 或 yarn，替换为对应命令即可。

---

## 3. 配置示例（Koishi 配置里）

下面是完整配置项说明与示例。  
把它填进 Koishi 的配置里即可启用。

```json
{
  "username": "your@email.com",
  "password": "your_authorization_code",
  "selfId": "your@email.com",
  "subject": "Koishi",
  "imap": {
    "host": "imap.example.com",
    "port": 993,
    "tls": true
  },
  "smtp": {
    "host": "smtp.example.com",
    "port": 465,
    "tls": true
  }
}
```

字段解释：
- `username`：邮箱账号（必填）
- `password`：密码或授权码（必填）
- `selfId`：邮件地址（默认同 username，可不写）
- `name`：发件人显示名称（可选）
- `subject`：机器人发送邮件的主题
- `imap`：接收服务器配置
- `smtp`：发送服务器配置

---

## 4. 发送邮件（最简单用法）

Koishi 里给邮件发送消息，本质是“给 mail 适配器发私聊消息”。

频道格式固定是：
```
private:对方邮箱地址
```

示例（代码里发送）：

```ts
const bot = ctx.bots.find(b => b.platform === 'mail')
await bot.sendMessage('private:someone@example.com', '你好，这是一封测试邮件')
```

如果你想做成指令，可以像这样：

```ts
ctx.command('sendmail <to> <content:text>')
  .action(async ({ session }, to, content) => {
    const bot = ctx.bots.find(b => b.platform === 'mail')
    if (!bot) return 'mail 适配器未启用'
    await bot.sendMessage(`private:${to}`, content)
    return '已发送'
  })
```

### 自定义邮件标题（给其他插件用）

默认标题来自配置项 `subject`。  
如果你希望某一封邮件用自定义标题，可以这样发：

```ts
import { h } from 'koishi'

const bot = ctx.bots.find(b => b.platform === 'mail')
await bot.sendMessage(
  'private:someone@example.com',
  h('message', { subject: '这里是标题' }, '这里是正文内容')
)
```

### 自定义发件人名字（给其他插件用）

默认发件人名字来自配置项 `name`（如果未设置，则只显示邮箱地址）。  
你可以在单封邮件里覆盖发件人名字：

```ts
import { h } from 'koishi'

const bot = ctx.bots.find(b => b.platform === 'mail')
await bot.sendMessage(
  'private:someone@example.com',
  h('message', { fromName: '这里是发件人名字' }, '这里是正文内容')
)
```

---

## 5. 接收邮件（IMAP）

开启 IMAP 后，收到的新邮件会触发 Koishi 消息事件。  
它会被当作“私聊消息”，发送者邮箱就是 userId。

你可以像处理普通私聊一样处理邮件内容。  
下面是一个最简单的“收到邮件就回复”的示例：

```ts
ctx.on('message', async (session) => {
  if (session.platform !== 'mail') return
  // session.userId 就是发件人邮箱
  await session.send(`已收到你的邮件：${session.content}`)
})
```

---

## 6. 常见问题

1) **一直发不出去**  
检查 SMTP 配置是否正确，端口是否匹配 TLS。

2) **收不到邮件**  
检查 IMAP 是否开启，端口和 TLS 是否正确。

3) **需要授权码**  
大部分邮箱不允许直接用登录密码，需要在邮箱后台生成“授权码”。

---

## 7. 适配 Outlook / 微软邮箱 / 企业邮箱

本适配器走标准 SMTP/IMAP 协议，一般的邮箱服务都能用。  
下面是常见服务的参数参考（以官方文档为准）：

### 关于 SSL / STARTTLS（微软官方推荐）

微软官方推荐使用 **STARTTLS**（端口 587）。  
本适配器已支持 STARTTLS：
- SMTP 端口 `587`
- `smtp.tls` 设为 `true`

如果你使用 **SSL 直连**（端口 465）：
- SMTP 端口 `465`
- `smtp.tls` 设为 `true`

如果端口是 `587` 且 `smtp.tls` 为 `true`，会自动走 STARTTLS。

示例（Outlook + STARTTLS）：

```json
{
  "username": "your@outlook.com",
  "password": "your_app_password",
  "selfId": "your@outlook.com",
  "subject": "Koishi",
  "imap": {
    "host": "outlook.office365.com",
    "port": 993,
    "tls": true
  },
  "smtp": {
    "host": "smtp.office365.com",
    "port": 587,
    "tls": true
  }
}
```

### Outlook / Microsoft 365 / 企业邮箱（Exchange Online）

SMTP：
- `smtp.office365.com`
- 端口 `587`
- TLS `true`（STARTTLS）

IMAP：
- `outlook.office365.com`
- 端口 `993`
- TLS `true`

注意：
- 如果开启了双重验证，需要生成“应用专用密码”。
- 某些企业邮箱管理员可能禁用了 IMAP/SMTP，需要在管理后台开启。

### Outlook 个人邮箱（@outlook.com / @hotmail.com / @live.com）

SMTP：
- `smtp.office365.com`
- 端口 `587`
- TLS `true`

IMAP：
- `outlook.office365.com`
- 端口 `993`
- TLS `true`

### 其他企业邮箱

请向管理员获取以下信息：
- SMTP 服务器地址 / 端口 / TLS
- IMAP 服务器地址 / 端口 / TLS
- 是否需要“应用专用密码”

---
