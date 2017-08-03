var RtmClient = require('@slack/client').RtmClient;
var CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;
var bot_token = process.env.SLACK_BOT_TOKEN || '';
var rtm = new RtmClient(bot_token);
var WebClient = require('@slack/client').WebClient;
var token = process.env.SLACK_BOT_TOKEN || '';
var web = new WebClient(token);
var axios = require('axios');
var models = require('./models/models');
var User = models.User;
var Reminder = models.Reminder;
var { findTimeConflicts } = require('./helperFunctions/findTimeConflicts');
let channel;
let users = [];

//INITIALIZING SLACKBOT
rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, function (rtmStartData) {
  console.log(`Logged in as ${rtmStartData.self.name} of team ${rtmStartData.team.name},
    but not yet connected to a channel`);
});

//WHEN THE SLACKBOT RECEIVES A MESSAGE
rtm.on(RTM_EVENTS.MESSAGE, function (message) {
  var dm = rtm.dataStore.getDMByUserId(message.user);
  if (!dm || dm.id !== message.channel || message.type !== 'message') {
    return;
  }
  channel = message.channel;
  //USE REGEX TO FILTER OUT SLACK USER'S REAL NAME AND SLACK ID
  console.log('wejfijweifjiowejofw', message.text)
  var regex = /<@\w+>/g;
  message.text = message.text.replace(regex, function(match) {
    var userId = match.slice(2, -1);
    console.log('USERID IS', userId);
    userObj = rtm.dataStore.getUserById(userId);
    console.log('THIS FINDS THE USER OBJECT FINE', userObj);
    //assume everyone is old user and already has gcalendar
    User.findOne({user: userId})
      .then((usr) => {
        // if (usr.google === undefined) {
        //   //send a message saying that the invitee hasn't set up their google calendar yet
        //   return;
        // }
        console.log('FOUND THE USER', usr);
        var userObjToPush = {
          name: userObj.profile.first_name || userObj.profile.real_name,
          email: userObj.profile.email,
          userId: userId,
          google: usr.google //ASSUME FOR NOW THAT EVERYONE HAS ALREADY SIGNED UP
        }
        users.push(userObjToPush);
      })
    // var userObjToPush = {
    //   name: userObj.profile.first_name || userObj.profile.real_name,
    //   email: userObj.profile.email,
    //   userId: userId
    // }
    // users.push(userObjToPush);
    return userObj.profile.first_name || userObj.profile.real_name;
  });
  console.log('USERSSSSS', users);
  //USERS WHO ARE ATTENDING THE MEETING
  var attending = '';
  for (var i = 0; i < users.length; i++) {
    if (i === users.length - 1) {
      attending += users[i].name;
    }
    else {
      attending += users[i].name + ', ';
    }
  }
  console.log('ATTENDING', attending)
  //PARSING MESSAGE USING API.AI TO GET TASK AND DATE
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
    //USER WANTS TO SCHEDULE A MEETING
    console.log('RESPOSNEEEEEE', response.data.result.metadata);
    if (response.data.result.metadata.intentName === 'meeting') {
      console.log('HERE');
      if(response.data.result.parameters.invitees.length === 0) {
        rtm.sendMessage('Who are you meeting with?', message.channel);
        return;
      }
      if (response.data.result.parameters.time.length === 0) {
        rtm.sendMessage('What time is the meeting?', message.channel);
        return;
      }
      if (response.data.result.parameters.date.length === 0) {
        rtm.sendMessage('What is the date?', message.channel);
        return;
      }
      // User.find() //assume everyone has arleady given permission for now
      //   .then(function(mongoUsers) {
      //     console.log('USERSSSS LIST', mongoUsers);
      //     mongoUsers.map((mUsr) => {
      //       if (mUsr.userId === users[i].userId) {
      //         users[i].google = mongoUsers[i].google;
      //       }
      //     })
      //   })
      // users.map((usr) => {
      //   User.findOne({user: usr.userId})
      //     .then((user) => {
      //       console.log('USRE IS', user)
      //       usr.google = user.google;
      //       return;
      //     })
      // })

      // users.map((usr) => {
      //   checkCalendarAccess(usr, web, rtm);
      //   //if not given calendar access --> send message saying need permission
      // })
      console.log('FINISHED LISTTTTTT', users);
      findTimeConflicts(users, response.data.result.parameters.date, response.data.result.parameters.time, rtm, channel);
      var attachments = [
              {
                "fallback": "You are unable to choose an option.",
                "callback_id": "meeting",
                "color": "#3AA3E3",
                "attachment_type": "default",
                "fields": [
                 {
                     "title": "Subject",
                     "value": response.data.result.parameters.subject || 'None',
                     "short": false
                 },
                 {
                     "title": "Date",
                     "value": response.data.result.parameters.date,
                     "short": false
                 },
                 {
                     "title": "Time",
                     "value": response.data.result.parameters.time,
                     "short": false
                 },
                 {
                     "title": "Invitees",
                     "value": attending,
                     "short": false
                 },
               ]
             },
             {
               "fallback": "You are unable to choose an option.",
               "callback_id": "meeting",
               "color": "#3AA3E3",
               "attachment_type": "default",
               "text": "Is this information correct for the meeting?",
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
      //CHECK TO SEE IF USER IS ALREADY IN DATABASE
      User.findOne({user: message.user}, function(err, usr) {
        //MAKE NEW USER IF FIRST TIME
        if (usr === null) {
          var newUser = new User ({
            user: message.user,
            slackDmId: channel,
            pending: {},
            google: {}
          });
          newUser.save(function(err, usr) {
            rtm.sendMessage("Welcome to SchedulerBot! To do a really good job, I need your permission to access your calendar. I will not be sharing your information with others, I just check when you are busy or free to meet. Please sign up with this link to connect your calendar:", channel);
            rtm.sendMessage("https://floating-headland-63670.herokuapp.com/connect?auth_id=" + usr._id, channel);
            return;
          });
        }
        //USER ALREADY IN DATABASE
        else {
          //DID NOT CONNECT GOOGLE CALENDAR
          if (usr.google === undefined) {
            rtm.sendMessage("Welcome to SchedulerBot! To do a really good job, I need your permission to access your calendar. I will not be sharing your information with others, I just check when you are busy or free to meet. Please sign up with this link to connect your calendar:", channel);
            rtm.sendMessage("https://floating-headland-63670.herokuapp.com/connect?auth_id=" + usr._id, channel);
            return;
          }
          //PREVIOUS MEETING STILL PENDING
          if (usr.pending !== undefined) {
            rtm.sendMessage("I think you are trying to schedule a new meeting. If so, please press `Cancel` first to stop the current meeting.", channel);
            return;
          }
          //SETTING NEW MEETING
          else {
            //CHECK TO SEE AVAILABILITY
            var dateTimeString = response.data.result.parameters.date + 'T' + response.data.result.parameters.time;
            // findTimeConflicts(users, dateTimeString);
            usr.pending = {
              subject: response.data.result.parameters.subject || 'Meeting',
              date: response.data.result.parameters.date,
              time: response.data.result.parameters.time,
              invitees: users
            }
            usr.save();
            //SLACKBOT POSTS CONFIRMATION MESSAGE
            axios.get('https://slack.com/api/chat.postMessage', {
              params: {
                token: process.env.SLACK_BOT_TOKEN,
                bot: 'chat:write:user',
                as_user: true,
                channel: channel,
                text: "Okay! I will schedule a meeting for you 🗂",
                attachments: JSON.stringify(attachments),
              },
              headers: {
                type: 'application/x-www-form-urlencoded'
              }
            })
            .then((resp) => {
              console.log(resp);
            })
            .catch((err) => {
              console.log(err);
            })
          }
        }
      });
      return;
    }
    //USER WANTS TO CREATE A REMINDER
    else if (response.data.result.metadata.intentName === 'reminder') {
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

      //CHECK TO SEE IF USER IS ALREADY IN DATABASE
      User.findOne({user: message.user}, function(err, usr) {
        //MAKE NEW USER IF FIRST TIME
        if (usr === null) {
          var newUser = new User ({
            user: message.user,
            slackDmId: channel,
            pending: {},
            google: {}
          });
          newUser.save(function(err, usr) {
            rtm.sendMessage("Welcome to SchedulerBot! To do a really good job, I need your permission to access your calendar. I will not be sharing your information with others, I just check when you are busy or free to meet. Please sign up with this link to connect your calendar:", channel);
            rtm.sendMessage("https://floating-headland-63670.herokuapp.com/connect?auth_id=" + usr._id, channel);
            return;
          });
        }
        //USER ALREADY IN DATABASE
        else {
          //DID NOT CONNECT GOOGLE CALENDAR
          if (usr.google === undefined) {
            rtm.sendMessage("Welcome to SchedulerBot! To do a really good job, I need your permission to access your calendar. I will not be sharing your information with others, I just check when you are busy or free to meet. Please sign up with this link to connect your calendar:", channel);
            rtm.sendMessage("https://floating-headland-63670.herokuapp.com/connect?auth_id=" + usr._id, channel);
            return;
          }
          //PREVIOUS REMINDER STILL PENDING
          if (usr.pending !== undefined) {
            rtm.sendMessage("I think you are trying to create a new reminder. If so, please press `Cancel` first to stop the current reminder.", channel);
            return;
          }
          //SETTING NEW REMINDER
          else {
            usr.pending = {
              subject: response.data.result.parameters.task[0],
              date: response.data.result.parameters.date[0]
            }
            usr.save();
            //SLACKBOT POSTS CONFIRMATION MESSAGE
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
              console.log(resp);
            })
            .catch((err) => {
              console.log(err);
            })
          }
        }
      });
    }
    //Catching
    else {
      return;
    }
    })
    .catch((err) => {
      console.log('Error is:', err);
    });
});

rtm.start();

module.exports = {
  rtm,
  web
};
