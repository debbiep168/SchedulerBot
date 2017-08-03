var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var rtm = require('./slackbot');
var models = require('./models/models');
var User = models.User;
var Reminder = models.Reminder;
var Meeting = models.Meeting;
var moment = require('moment');
var google = require('googleapis');
var plus = google.plus('v1');
var { oauth2Client } = require('./helperFunctions/configureGoogle');
var app = express();
const GOOGLE_SCOPE = ['https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/calendar'];

//CONFIGURING BODYPARSER
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

//ROUTES

//ROUTE TO GENERATE URL TO CONNECT GOOGLE CALENDAR
app.get('/connect', function(req, res) {
  var url = oauth2Client().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: GOOGLE_SCOPE,
    state: req.query.auth_id
  });
  res.redirect(url);
});

//ROUTE CALLBACK THAT INDICATES SUCCESS IN CONNECTING TO GOOGLE CALENDAR
app.get('/connect/callback', function(req, res) {
  oauth2Client().getToken(req.query.code, function (err, tokens) {
    if (err) {
      res.status(500).json({error: err});
    }
    else {
      oauth2Client().setCredentials(tokens);
      plus.people.get({ auth: oauth2Client(), userId: 'me'}, function(err, googleUser) {
        if (err) {
          res.status(500).json({error: err});
        } else {
          User.findById(req.query.state)
          .then(function(mongoUser) {
            mongoUser.google = tokens;
            mongoUser.google.profile_id = googleUser.id;
            mongoUser.google.profile_name = googleUser.displayName;
            return mongoUser.save();
          })
          .then(function(mongoUser) {
            res.send('Success! You are connected to Google Calendar');
            rtm.sendMessage('Success! You are connected to Google Calendar ✅', mongoUser.slackDmId);
          });
        }
      });
    }
  });
});

//CALLBACK ROUTE THAT IS HIT EVERY TIME USER PRESSES INTERACTIVE MESSAGES BUTTONS ON SLACK
app.post('/slack/interactive', function(req, res) {
  var payload = JSON.parse(req.body.payload);
  console.log('SLACK INTERACTIVEEEEEEE', oauth2Client);
  //SCHEDULING MEETINGS
  if (payload.callback_id === 'meeting') {
    if (payload.actions[0].value === 'true') {
      User.findOne({user: payload.user.id})
        .then(function(mongoUser) {
          var info = mongoUser.pending;
          mongoUser.pending = undefined;
          //REFRESHING GOOGLE CALENDAR TOKEN IF HAS EXPIRED
          if (parseInt(mongoUser.google.expiry_date) < Date.now()) {
           oauth2Client.refreshAccessToken(function(err, tokens) {
             if (err) {
               res.json({failure: err})
               return;
             } else {
               mongoUser.google.id_token = tokens.id_token;
               mongoUser.google.refresh_token = tokens.refresh_token;
               mongoUser.google.expiry_date = tokens.expiry_date;
               mongoUser.google.token_type = tokens.token_type;
               mongoUser.google.access_token = tokens.access_token;
               return;
             }
           });
         }
          mongoUser.save(function(err, usr) {
            var newMeeting = new Meeting({
              user: usr.slackDmId,
              date: info.date,
              subject: info.subject,
              time: info.time,
              invitees: info.invitees
            });
            newMeeting.save(function(err, met) {
              var credentials = Object.assign({}, mongoUser.google);
              oauth2Client().setCredentials(credentials);
              var calendar = google.calendar('v3');
              var dateTimeString = met.date + 'T' + met.time;
              calendar.events.insert({
                auth: oauth2Client(),
                calendarId: 'primary',
                resource: {
                  summary: met.subject,
                  attendees: met.invitees,
                  start: {
                    dateTime: moment.utc(dateTimeString).format('YYYY-MM-DDTHH:mm:ss-07:00'),
                    timeZone: 'America/Los_Angeles'
                  },
                  end: {
                    dateTime: moment.utc(dateTimeString).add(1, 'hours').format('YYYY-MM-DDTHH:mm:ss-07:00'),
                    timeZone: 'America/Los_Angeles'
                  }
                }
              })
            })
          });
        })
      res.send('Scheduled meeting :white_check_mark:');
    } else {
      User.findOne({user: payload.user.id})
        .then(function(mongoUser) {
          mongoUser.pending = undefined;
          return mongoUser.save();
        })
        res.send('Cancelled :x:');
    }
    return;
  }
  //CREATING REMINDERS
  else {
    if (payload.actions[0].value === 'true') {
      User.findOne({user: payload.user.id})
        .then(function(mongoUser) {
          var info = mongoUser.pending;
          mongoUser.pending = undefined;
          if (parseInt(mongoUser.google.expiry_date) < Date.now()) {
            //use refresh token --> get request
           oauth2Client.refreshAccessToken(function(err, tokens) {
             if (err) {
               res.json({failure: err})
               return;
             } else {
               mongoUser.google.id_token = tokens.id_token;
               mongoUser.google.refresh_token = tokens.refresh_token;
               mongoUser.google.expiry_date = tokens.expiry_date;
               mongoUser.google.token_type = tokens.token_type;
               mongoUser.google.access_token = tokens.access_token;
               return;
             }
           });
         }
          mongoUser.save(function(err, usr) {
            var newReminder = new Reminder({
              user: usr.slackDmId,
              date: info.date,
              task: info.subject
            });
            newReminder.save(function(err, rem) {
              console.log('GOING HERE');
              var credentials = Object.assign({}, mongoUser.google);
              oauth2Client().setCredentials(credentials);
              var calendar = google.calendar('v3');
              calendar.events.insert({
                auth: oauth2Client(),
                calendarId: 'primary',
                resource: {
                  summary: rem.task,
                  start: {
                    date: rem.date,
                    timeZone: 'America/Los_Angeles'
                  },
                  end: {
                    date: rem.date,
                    timeZone: 'America/Los_Angeles'
                  }
                }
              })
            })
          });
        })
      res.send('Created reminder :white_check_mark:');
    } else {
      User.findOne({user: payload.user.id})
        .then(function(mongoUser) {
          mongoUser.pending = undefined;
          return mongoUser.save();
        })
        res.send('Cancelled :x:');
    }
  }
})

app.listen(process.env.PORT || 3000, () => {
  console.log("starting to listen");
})
