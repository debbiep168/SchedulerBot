"use strict";

var { web, rtm } = require('./slackbot');
var { User, Reminder } = require('./models/models');
var moment = require('moment');

var currDate = new Date();
currDate.setDate(currDate.getDate() - 1);
var cur = currDate.toISOString().split('T')[0];
var today = new Date().toISOString().split('T')[0];
var tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 2);
var tom = tomorrow.toISOString().split('T')[0];

//FIND ALL REMINDERS THAT ARE DUE TODAY OR TOMORROW AND SEND REMINDERS THROUGH SLACK
Reminder.find({date: {$gt: cur, $lt: tom}})
  .then(function(reminders) {
    for (var i = 0; i < reminders.length; i++) {
      if (reminders[i].date === today) {
        web.chat.postMessage(reminders[i].user, "REMINDER🎉: Remember to "
        + reminders[i].task + " today!");
        reminders[i].remove();
      }
      else {
        web.chat.postMessage(reminders[i].user, "REMINDER🎉: Remember to "
        + reminders[i].task + " on " + reminders[i].date + "!");
      }
    }
  });
