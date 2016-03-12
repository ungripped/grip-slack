const fs         = require('fs'),
      readline   = require('readline'),
      googleAuth = require('google-auth-library');

const SCOPES = ['https://www.googleapis.com/auth/gmail.modify'];
const TOKEN_PATH = 'credentials/gmail-slack.json';
const CLIENT_SECRET = JSON.parse(fs.readFileSync('credentials/client_secret.json'));


function authorize(credentials) {

    const clientSecret = credentials.installed.client_secret;
    const clientId = credentials.installed.client_id;
    const redirectUrl = credentials.installed.redirect_uris[0];

    const auth = new googleAuth();
    const client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

    const authUrl = client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES
    });

    console.log('Authorize this app by visiting this url: ', authUrl);
    var rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question('Enter the code from that page here: ', function(code) {
      rl.close();
      client.getToken(code, function(err, token) {
        if (err) {
          console.log('Error while trying to retrieve access token', err);
          return;
        }
        client.credentials = token;
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
      });
    });
}

authorize(CLIENT_SECRET);
