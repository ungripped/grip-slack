'use strict'

/*
 * Har bokningssidan för familjekurserna ändrats? Dags att boka?
 */
 
const request = require('request'),
      crypto  = require('crypto'),
      fs      = require('fs');


const hash = crypto.createHash('sha256');
const oldValue = fs.readFileSync('kurser-for-barn.hash');
const url = 'http://www.modernamuseet.se/stockholm/sv/besok-museet/familj/kurser-for-barn/';

function report(message) {
    const WebClient = require('@slack/client').WebClient;
    const token = process.env.SLACK_API_TOKEN || '';
    const channelId = process.env.SLACK_CHANNEL_ID || '';

    const client = new WebClient(token);

    client.chat.postMessage(channelId, message, {parse: 'full', unfurl_links: true, as_user: true});
}

request
    .get(url)
    .on('response', (response) => {

        hash.end();

        if (response.statusCode == 200) {
            let value = hash.read().toString('hex');

            if (value != oldValue) {
                report(`:loudspeaker: \n ${url} har ändrats! \n Dags att boka?`);
                fs.writeFileSync('kurser-for-barn.hash', value);
            }
        }
        else if (response.statusCode == 404) {
            report(`:warning: \n ${url} har flyttat, what up?`);
        }
        else {
            report(`:warning \n ${url} svarar med ${response.statusCode}, what up?`);
        }
    })
    .pipe(hash);
