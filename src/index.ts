import { MailBot as BaseMailBot, MailMessageEncoder as BaseMailMessageEncoder } from '@satorijs/adapter-mail'
import { Context, Element, Universal } from '@satorijs/core'
import { createTransport, Transporter, SendMailOptions } from 'nodemailer'

// 定义自己的 SendOptions 类型，避免依赖 @satorijs/core 的导出
interface SendOptions {
  [key: string]: any
}

// 定义发送选项接口，兼容 nodemailer 的类型
interface SMTPSendOptions extends Partial<SendMailOptions> {
  to: string
  html: string
  attachments?: {
    filename?: string
    content: Buffer
    contentType: string
    cid?: string
  }[]
  subject?: string
  inReplyTo?: string
  from?: string
}

// SMTP 兼容层，封装 nodemailer 传输逻辑
class SMTPCompat {
  transporter: Transporter
  from: string

  constructor(config: BaseMailBot.Config) {
    const smtpConfig = config.smtp || { host: 'localhost', port: 465, tls: true }
    const useSsl = smtpConfig.tls && smtpConfig.port === 465
    const useStartTls = smtpConfig.tls && smtpConfig.port !== 465

    this.transporter = createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: useSsl,
      requireTLS: useStartTls,
      auth: {
        user: config.username,
        pass: config.password,
      },
    })
    
    const address = config.selfId || config.username
    this.from = config.name ? `${config.name} <${address}>` : address
  }

  async send(options: SMTPSendOptions): Promise<string> {
    const mailOptions: SendMailOptions = {
      to: options.to,
      html: options.html,
      subject: options.subject,
      inReplyTo: options.inReplyTo,
      from: options.from || this.from,
      attachments: options.attachments?.map(att => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType,
        cid: att.cid,
      })),
    }
    
    const info = await this.transporter.sendMail(mailOptions)
    return info.messageId || ''
  }
}

// 自定义消息编码器 - 修复私有属性和泛型问题
class MailMessageEncoder<C extends Context = Context> extends BaseMailMessageEncoder<C> {
  // 修复：将私有属性改为受保护属性，允许子类访问
  protected subjectOverride?: string
  protected fromNameOverride?: string

  // 严格遵循基类构造函数签名
  constructor(bot: BaseMailBot<C>, channelId: string, referrer?: any, options?: SendOptions) {
    super(bot, channelId, referrer, options)
  }

  async flush() {
    if (!this.buffer || (this.attachments.length === 0 && this.buffer.trim() === '')) return
    
    // 安全访问配置属性
    const botConfig = this.bot.config as any
    const subject = this.subjectOverride ?? botConfig.subject ?? 'Koishi 邮件消息'
    const address = this.bot.config.selfId || this.bot.config.username || botConfig.auth?.user
    
    let from: string | undefined
    if (this.fromNameOverride && address) {
      from = `${this.fromNameOverride} <${address}>`
    }
    
    try {
      // 类型断言解决 internal 属性访问问题
      const messageId = await (this.bot as any).internal.send({
        to: this.session?.channelId?.substring(8) || '',
        html: `<pre>${this.buffer}</pre>`,
        attachments: this.attachments,
        inReplyTo: this.reply,
        subject,
        from,
      })
      
      if (messageId && this.bot) {
        const session = this.bot.session()
        session.messageId = messageId
        session.timestamp = Date.now()
        session.userId = this.bot.selfId || address || ''
        
        if (session.event?.message) {
          this.results.push(session.event.message as Universal.Message)
        }
        
        session.app?.emit(session, 'send', session)
      }
    } catch (error) {
      console.error('邮件发送失败:', error)
    }

    // 重置状态
    this.buffer = ''
    this.reply = undefined
    this.attachments = []
    this.subjectOverride = undefined
    this.fromNameOverride = undefined
  }

  async visit(element: Element) {
    if (element.type === 'message' && element.attrs) {
      if (element.attrs.subject) {
        this.subjectOverride = String(element.attrs.subject)
      }
      if (element.attrs.fromName) {
        this.fromNameOverride = String(element.attrs.fromName)
      }
    }
    return super.visit(element)
  }
}

// 修复静态 MessageEncoder 的泛型定义
class MailBotMessageEncoder<C extends Context = Context> extends MailMessageEncoder<C> {
  constructor(bot: BaseMailBot<C>, channelId: string, referrer?: any, options?: SendOptions) {
    super(bot, channelId, referrer, options)
  }
}

// 自定义 MailBot 类 - 最终修复版
class MailBot<C extends Context = Context> extends BaseMailBot<C> {
  // 修复：使用具名类而非匿名类，解决泛型兼容性问题
  static MessageEncoder = MailBotMessageEncoder

  // 声明 internal 属性
  declare internal: SMTPCompat

  constructor(ctx: C, config: BaseMailBot.Config) {
    super(ctx, config)
    this.internal = new SMTPCompat(config)
  }

  // 创建消息编码器实例
  createMessageEncoder(channelId: string, referrer?: any, options?: SendOptions) {
    return new MailBotMessageEncoder(this, channelId, referrer, options)
  }
}

export default MailBot
export * from '@satorijs/adapter-mail'