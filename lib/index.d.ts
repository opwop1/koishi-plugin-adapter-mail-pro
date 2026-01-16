import { MailBot as BaseMailBot, MailMessageEncoder as BaseMailMessageEncoder } from '@satorijs/adapter-mail';
import { Context, Element } from '@satorijs/core';
import { Transporter, SendMailOptions } from 'nodemailer';
interface SendOptions {
    [key: string]: any;
}
interface SMTPSendOptions extends Partial<SendMailOptions> {
    to: string;
    html: string;
    attachments?: {
        filename?: string;
        content: Buffer;
        contentType: string;
        cid?: string;
    }[];
    subject?: string;
    inReplyTo?: string;
    from?: string;
}
declare class SMTPCompat {
    transporter: Transporter;
    from: string;
    constructor(config: BaseMailBot.Config);
    send(options: SMTPSendOptions): Promise<string>;
}
declare class MailMessageEncoder<C extends Context = Context> extends BaseMailMessageEncoder<C> {
    protected subjectOverride?: string;
    protected fromNameOverride?: string;
    constructor(bot: BaseMailBot<C>, channelId: string, referrer?: any, options?: SendOptions);
    flush(): Promise<void>;
    visit(element: Element): Promise<void>;
}
declare class MailBotMessageEncoder<C extends Context = Context> extends MailMessageEncoder<C> {
    constructor(bot: BaseMailBot<C>, channelId: string, referrer?: any, options?: SendOptions);
}
declare class MailBot<C extends Context = Context> extends BaseMailBot<C> {
    static MessageEncoder: typeof MailBotMessageEncoder;
    internal: SMTPCompat;
    constructor(ctx: C, config: BaseMailBot.Config);
    createMessageEncoder(channelId: string, referrer?: any, options?: SendOptions): MailBotMessageEncoder<C>;
}
export default MailBot;
export * from '@satorijs/adapter-mail';
