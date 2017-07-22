var RtmClient = require('@slack/client').RtmClient;
var CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;
var bot_token = process.env.SLACK_BOT_TOKEN || '';
var rtm = new RtmClient(bot_token);
var WebClient = require('@slack/client').WebClient;
var token = process.env.SLACK_API_TOKEN || '';
var web = new WebClient(token);
var axios = require('axios');
let channel;

// The client will emit an RTM.AUTHENTICATED event on successful connection,
//with the `rtm.start` payload if you want to cache it
rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, function (rtmStartData) {
  console.log(`Logged in as ${rtmStartData.self.name} of team ${rtmStartData.team.name},
    but not yet connected to a channel`);
});

rtm.on(RTM_EVENTS.MESSAGE, function (message) {
  var dm = rtm.dataStore.getDMByUserId(message.user);
  if (!dm || dm.id !== message.channel || message.type !== 'message') {
    console.log('MESSAGE NOT SENT TO DM, IGNORING');
    return;
  }
  channel = message.channel;
  axios.get('https://api.api.ai/api/query', {
   params: {
     v: 20150910,
     lang: 'en',
     timezone: new Date(),
     query: message.text,
     sessionId: message.user
   },
   headers: {
     Authorization: `Bearer ${process.env.API_AI_TOKEN}`
   }
 })
  .then((response) => {
    if (response.data.result.parameters.date.length === 0) {
      rtm.sendMessage('What is the date?', message.channel);
      return;
    }
    if (response.data.result.parameters.task.length === 0) {
      rtm.sendMessage('What is the task?', message.channel);
      return;
    }
    var attachments = [
            {
              "fallback": "You are unable to choose an option.",
              "callback_id": "reminder",
              "color": "#3AA3E3",
              "attachment_type": "default",
              "fields": [
               {
                   "title": "Subject",
                   "value": response.data.result.parameters.task[0],
                   "short": false
               },
               {
                   "title": "Date",
                   "value": response.data.result.parameters.date[0],
                   "short": false
               },
             ]
           },
           {
             "fallback": "You are unable to choose an option.",
             "callback_id": "reminder",
             "color": "#3AA3E3",
             "attachment_type": "default",
             "text": "Is this reminder correct?",
              "actions": [
                {
                  "name": "confirm",
                  "text": "Confirm",
                  "type": "button",
                  "value": "true"
                },
                {
                  "name": "confirm",
                  "text": "Cancel",
                  "type": "button",
                  "value": "false"
                }
              ]
           }
    ];
    axios.get('https://slack.com/api/chat.postMessage', {
      params: {
        token: process.env.SLACK_BOT_TOKEN,
        bot: 'chat:write:user',
        as_user: true,
        channel: channel,
        text: "Okay! I will create a reminder for you 🗓",
        attachments: JSON.stringify(attachments),
      },
      headers: {
        type: 'application/x-www-form-urlencoded'
      }
    })
    .then((resp) => {
      console.log(resp.data);
    })
    .catch((err) => {
      console.log(err);
    })
  })
  .catch((err) => {
    console.log('Error is:', err);
  });
});

rtm.start();
