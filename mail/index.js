'use strict'

const fs         = require('fs'),
      Gmail      = require('./gmail'),
      base64url  = require('base64url'),
      Promise    = require('bluebird'),
      MailParser = require('mailparser').MailParser;

const TOKEN = JSON.parse(fs.readFileSync('credentials/gmail-slack.json'));
const CLIENT_SECRET = JSON.parse(fs.readFileSync('credentials/client_secret.json'));
const SLACK_TOKEN = process.env.SLACK_API_TOKEN || '';
const CHANNEL_MAP = JSON.parse(fs.readFileSync('channel-map.json'));

const client = new Gmail({
    credentials: CLIENT_SECRET,
    token: TOKEN
});

function format(mail) {
    return `:incoming_envelope:
Från: ${mail.from[0].name}
Ämne: ${mail.subject}
${mail.text}`
}

function report(mail, channelId) {
    const WebClient = require('@slack/client').WebClient;

    const client = new WebClient(SLACK_TOKEN);
    const message = format(mail);

    client.chat.postMessage(channelId, message, {parse: 'full', unfurl_links: true, as_user: true}).then(() => {
        if (mail.attachments && mail.attachments.length > 0) {

            for (let i = 0; i < mail.attachments.length; i++) {
                let attachment = mail.attachments[i];

                // we can get a writable stream from mailparser (add streamAttachments option)
                // but how the hell do we use that as a readable stream that
                // the slack api (or request) wants?

                // write it to a file instead, read it and clean up. Yuck!
                fs.writeFileSync(attachment.fileName, attachment.content);

                client.files.upload({
                    file: fs.createReadStream(attachment.fileName),
                    filetype: 'auto',
                    title: attachment.fileName,
                    filename: attachment.fileName,
                    channels: channelId
                }, (err, file) => {
                    fs.unlinkSync(attachment.fileName);
                });

            }
        }
    });


}

function reportEmails(labelName, channelId) {
    client.getLabel(labelName).then(label => {
        return client.getFullMessages(label.id);
    }).map(message => {
        return new Promise((resolve, reject) => {

            let mailparser = new MailParser();
            let raw = base64url.decode(message.raw);

            mailparser.on('end', mail => {
                resolve({
                    mail: mail,
                    raw: message
                });
            });

            mailparser.write(raw);
            mailparser.end();
        });
    }).each(parsed => {
        report(parsed.mail, channelId);
        client.removeLabel(parsed.raw.id, parsed.raw.labelId);


    }).catch(e => {
        console.log('ERROR: ');
        console.log(e);
    });
}

function main() {
    for(let i = 0; i < CHANNEL_MAP.channels.length; i++) {
        let channel = CHANNEL_MAP.channels[i];
        reportEmails(channel.label, channel.channel);
    }
}

main();
