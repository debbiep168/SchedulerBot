var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var rtm = require('./slackbot');
var models = require('./models/models');
var User = models.User;
var app = express();

//CONFIGURE GOOGLE APIS
var google = require('googleapis');
var plus = google.plus('v1');
var OAuth2 = google.auth.OAuth2;
var oauth2Client = new OAuth2 (
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://ffc2b348.ngrok.io/connect/callback'
);
const GOOGLE_SCOPE = ['https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/calendar'];

//CONFIGURING BODYPARSER
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

//ROUTES

//ROUTE TO GENERATE URL TO CONNECT GOOGLE CALENDAR
app.get('/connect', function(req, res) {
  var url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: GOOGLE_SCOPE,
    state: req.query.auth_id
  });
  res.redirect(url);
});

//ROUTE CALLBACK THAT INDICATES SUCCESS IN CONNECTING TO GOOGLE CALENDAR
app.get('/connect/callback', function(req, res) {
  oauth2Client.getToken(req.query.code, function (err, tokens) {
    if (err) {
      res.status(500).json({error: err});
    }
    else {
      oauth2Client.setCredentials(tokens);
      plus.people.get({ auth: oauth2Client, userId: 'me'}, function(err, googleUser) {
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
  if (payload.actions[0].value === 'true') {
    User.findOne({user: payload.user.id})
      .then(function(mongoUser) {
        var info = mongoUser.pending;
        mongoUser.task = info.subject;
        mongoUser.date = info.date;
        mongoUser.pending = undefined;
        return mongoUser.save();
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
})


app.listen(3000);
