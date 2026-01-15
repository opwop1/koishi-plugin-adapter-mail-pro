import { MailBot as BaseMailBot, MailMessageEncoder as BaseMailMessageEncoder } from '@satorijs/adapter-mail'
import { Context, Element, Universal } from '@satorijs/core'
import { createTransport, Transporter } from 'nodemailer'

interface SendOptions {
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

class SMTPCompat {
  transporter: Transporter
  from: string

  constructor(config: BaseMailBot.Config) {
    const useSsl = config.smtp.tls && config.smtp.port === 465
    const useStartTls = config.smtp.tls && config.smtp.port !== 465
    this.transporter = createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
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

  async send(options: SendOptions): Promise<string> {
    const info = await this.transporter.sendMail({
      ...options,
      from: this.from,
    })
    return info.messageId
  }
}

class MailMessageEncoder<C extends Context = Context> extends BaseMailMessageEncoder<C> {
  private subjectOverride?: string
  private fromNameOverride?: string

  async flush() {
    if (!this.buffer && this.attachments.length === 0) return
    const subject = this.subjectOverride ?? this.bot.config.subject
    const address = this.bot.config.selfId || this.bot.config.username
    const from = this.fromNameOverride ? `${this.fromNameOverride} <${address}>` : undefined
    const messageId = await this.bot.internal.send({
      to: this.session.channelId.substring(8),
      html: `<pre>${this.buffer}</pre>`,
      attachments: this.attachments,
      inReplyTo: this.reply,
      subject,
      from,
    })
    const session = this.bot.session()
    session.messageId = messageId
    session.timestamp = +new Date()
    session.userId = this.bot.selfId
    this.results.push(session.event.message as Universal.Message)
    session.app.emit(session, 'send', session)

    this.buffer = ''
    this.reply = undefined
    this.attachments = []
    this.subjectOverride = undefined
    this.fromNameOverride = undefined
  }

  async visit(element: Element) {
    if (element.type === 'message' && element.attrs?.subject) {
      this.subjectOverride = String(element.attrs.subject)
    }
    if (element.type === 'message' && element.attrs?.fromName) {
      this.fromNameOverride = String(element.attrs.fromName)
    }
    return super.visit(element)
  }
}

class MailBot<C extends Context = Context> extends BaseMailBot<C> {
  static MessageEncoder = MailMessageEncoder
  internal: SMTPCompat

  constructor(ctx: C, config: BaseMailBot.Config) {
    super(ctx, config)
    this.internal = new SMTPCompat(config)
  }
}

export default MailBot
export * from '@satorijs/adapter-mail'
