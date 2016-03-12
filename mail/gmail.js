'use strict'

const google     = require('googleapis'),
      googleAuth = require('google-auth-library'),
      Promise    = require('bluebird');

function authorize(credentials, token) {
    const secret = credentials.installed.client_secret;
    const id = credentials.installed.client_id;
    const redirectUrl = credentials.installed.redirect_uris[0];

    const auth = new googleAuth();
    const client = new auth.OAuth2(id, secret, redirectUrl);

    client.credentials = token;
    return client;
}

function GmailClient(opts) {
    this._auth = authorize(opts.credentials, opts.token);
    this._gmail = google.gmail('v1');

    Promise.promisifyAll(this._gmail.users.labels);
    Promise.promisifyAll(this._gmail.users.messages);
}

GmailClient.prototype.listLabels = function() {
    return this._gmail.users.labels.listAsync({
        auth: this._auth,
        userId: 'me'
    });
}

GmailClient.prototype.getLabel = function(labelName) {
    return this.listLabels().then(result => {
        var labels = result.labels;

        for (let i = 0; i < labels.length; i++) {
            let label = labels[i];
            if (label.name == labelName) {
                return label;
            }
        }

        throw new Error('Label not found');
    });
}

GmailClient.prototype.getFullMessages = function(labelId) {
    const self = this;
    return self._gmail.users.messages.listAsync({
        auth: self._auth,
        userId: 'me',
        labelIds: labelId
    }).then(response => {
        var messages = response.messages;
        return messages;
    }).map(message => {
        return self._gmail.users.messages.getAsync({
            auth: self._auth,
            userId: 'me',
            id: message.id,
            format: 'raw'
        });
    }).map(message => {
        message.labelId = labelId;
        return message;
    });
}

GmailClient.prototype.removeLabel = function(messageId, labelId) {
    return this._gmail.users.messages.modifyAsync({
        auth: this._auth,
        userId: 'me',
        id: messageId,
        resource: {
            removeLabelIds: [labelId],
            addLabelIds: []
        }
    });
}

module.exports = GmailClient;
