var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);
var import_adapter_mail = require("@satorijs/adapter-mail");
var import_nodemailer = require("nodemailer");
__reExport(index_exports, require("@satorijs/adapter-mail"), module.exports);
var SMTPCompat = class {
  static {
    __name(this, "SMTPCompat");
  }
  transporter;
  from;
  constructor(config) {
    const smtpConfig = config.smtp || { host: "localhost", port: 465, tls: true };
    const useSsl = smtpConfig.tls && smtpConfig.port === 465;
    const useStartTls = smtpConfig.tls && smtpConfig.port !== 465;
    this.transporter = (0, import_nodemailer.createTransport)({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: useSsl,
      requireTLS: useStartTls,
      auth: {
        user: config.username,
        pass: config.password
      }
    });
    const address = config.selfId || config.username;
    this.from = config.name ? `${config.name} <${address}>` : address;
  }
  async send(options) {
    const mailOptions = {
      to: options.to,
      html: options.html,
      subject: options.subject,
      inReplyTo: options.inReplyTo,
      from: options.from || this.from,
      attachments: options.attachments?.map((att) => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType,
        cid: att.cid
      }))
    };
    const info = await this.transporter.sendMail(mailOptions);
    return info.messageId || "";
  }
};
var MailMessageEncoder = class extends import_adapter_mail.MailMessageEncoder {
  static {
    __name(this, "MailMessageEncoder");
  }
  // 修复：将私有属性改为受保护属性，允许子类访问
  subjectOverride;
  fromNameOverride;
  // 严格遵循基类构造函数签名
  constructor(bot, channelId, referrer, options) {
    super(bot, channelId, referrer, options);
  }
  async flush() {
    if (!this.buffer || this.attachments.length === 0 && this.buffer.trim() === "") return;
    const botConfig = this.bot.config;
    const subject = this.subjectOverride ?? botConfig.subject ?? "Koishi 邮件消息";
    const address = this.bot.config.selfId || this.bot.config.username || botConfig.auth?.user;
    let from;
    if (this.fromNameOverride && address) {
      from = `${this.fromNameOverride} <${address}>`;
    }
    try {
      const messageId = await this.bot.internal.send({
        to: this.session?.channelId?.substring(8) || "",
        html: `<pre>${this.buffer}</pre>`,
        attachments: this.attachments,
        inReplyTo: this.reply,
        subject,
        from
      });
      if (messageId && this.bot) {
        const session = this.bot.session();
        session.messageId = messageId;
        session.timestamp = Date.now();
        session.userId = this.bot.selfId || address || "";
        if (session.event?.message) {
          this.results.push(session.event.message);
        }
        session.app?.emit(session, "send", session);
      }
    } catch (error) {
      console.error("邮件发送失败:", error);
    }
    this.buffer = "";
    this.reply = void 0;
    this.attachments = [];
    this.subjectOverride = void 0;
    this.fromNameOverride = void 0;
  }
  async visit(element) {
    if (element.type === "message" && element.attrs) {
      if (element.attrs.subject) {
        this.subjectOverride = String(element.attrs.subject);
      }
      if (element.attrs.fromName) {
        this.fromNameOverride = String(element.attrs.fromName);
      }
    }
    return super.visit(element);
  }
};
var MailBotMessageEncoder = class extends MailMessageEncoder {
  static {
    __name(this, "MailBotMessageEncoder");
  }
  constructor(bot, channelId, referrer, options) {
    super(bot, channelId, referrer, options);
  }
};
var MailBot = class extends import_adapter_mail.MailBot {
  static {
    __name(this, "MailBot");
  }
  // 修复：使用具名类而非匿名类，解决泛型兼容性问题
  static MessageEncoder = MailBotMessageEncoder;
  constructor(ctx, config) {
    super(ctx, config);
    this.internal = new SMTPCompat(config);
  }
  // 创建消息编码器实例
  createMessageEncoder(channelId, referrer, options) {
    return new MailBotMessageEncoder(this, channelId, referrer, options);
  }
};
var index_default = MailBot;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ...require("@satorijs/adapter-mail")
});
