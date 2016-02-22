var express = require('express');
var https = require('https');
var bodyParser = require('body-parser');

var app = express();
app.use(bodyParser.json({extended: true}));

var options = {
    host: 'hooks.slack.com',
    port: 443,
    path: '/services/' + process.env.SLACK_TOKEN, // NOTE: Slack のIncoming Webhook URL を指定する
    method: 'POST',
    headers: {'Content-Type': 'application/json'}
};

// Slack へのPOST
var proxy = function (data) {
    var req = https.request(options, function (res) {
        var body = '';
        console.log('Status:', res.statusCode);
        console.log('Headers:', JSON.stringify(res.headers));
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            body += chunk;
        });
        res.on('end', function () {
            console.log('Successfully processed HTTPS response');
            // If we know it's JSON, parse it
            if (res.headers['content-type'] === 'application/json') {
                body = JSON.parse(body);
            }
        });
    });

    req.write(data);
    req.end();
};


// Slack への投稿フォーマット指定
// cf. https://api.slack.com/incoming-webhooks
var response = {
    channel: process.env.SLACK_CHANNEL,
    username: process.env.SLACK_USERNAME,
    icon_emoji: process.env.SLACK_ICON,
    attachments: []
};

app.post('/knowledge', function (req, res) {
    console.log('event: ' + JSON.stringify(req.body, null, 4));
    var payload = req.body;

    // Slack への投稿フォーマット指定
    // cf. https://api.slack.com/incoming-webhooks
    response.attachments = [
        {
            "pretext": process.env.KNOWLEDGE_MAN + 'の悪知恵が' + ((payload.status === 'created') ? '増えました' : '更新されました'),
            "title": payload.title,
            "title_link": payload.link,
            "text": payload.content,
            "fields": [
                {
                    "title": "登録者",
                    "value": payload.insert_user,
                    "short": true
                },
                {
                    "title": "更新者",
                    "value": payload.update_user,
                    "short": true
                }
            ],
            "color": ((payload.status === 'created') ? '#7CD197' : '#F35A00')
        }
    ];

    proxy(JSON.stringify(response));

    response.attachments = [];
    res.send('ok');
});

app.post('/comment', function (req, res) {
    console.log('event: ' + JSON.stringify(req.body, null, 4));
    var payload = req.body;

    // Slack への投稿フォーマット指定
    // cf. https://api.slack.com/incoming-webhooks
    response.attachments = [
        {
            "pretext": process.env.KNOWLEDGE_MAN + 'の悪知恵にコメントが追加されました',
            "title": payload.knowledge.title,
            "title_link": payload.knowledge.link,
            "text": payload.comment,
            "fields": [
                {
                    "title": "登録者",
                    "value": payload.insert_user,
                    "short": true
                },
                {
                    "title": "更新者",
                    "value": payload.update_user,
                    "short": true
                },
                {
                    "title": "記事",
                    "value": payload.knowledge.content
                }
            ],
            "color": "#764FA5"
        }
    ];

    proxy(JSON.stringify(response));

    response.attachments = [];
    res.send('ok');
});

app.listen(3000);
console.log('Server running at http://localhost:3000/');
