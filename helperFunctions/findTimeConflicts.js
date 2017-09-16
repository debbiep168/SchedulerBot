var moment = require('moment');
var google = require('googleapis');
var plus = google.plus('v1');
var { oauth2Client } = require('./configureGoogle');
var { findAvailableTimes } = require('./availableTimes');

//FINDS TIME CONFLICTS OF ALL ATTENDEES ON THAT DAY AT THAT TIME
function findTimeConflicts(invitees, date, time, rtm, channel) {
  var gClient = oauth2Client();
  var dateTimeString = date + 'T' + time;
  //var dateTimeString = '2017-08-02T20:00:00'; items: []
  console.log('DATE TIME STRING', dateTimeString);
  var start = moment.utc(dateTimeString).format('YYYY-MM-DDTHH:mm:ss-07:00');
  var end = moment.utc(dateTimeString).add(1, 'hours').format('YYYY-MM-DDTHH:mm:ss-07:00');
  for (var i = 0; i < invitees.length; i++) {
    gClient.setCredentials(invitees[i].google);
    var calendar = google.calendar('v3');
    calendar.events.list({
      auth: gClient,
      calendarId: 'primary',
      timeMin: start,
      timeMax: end,
      timeZone: "America/Los_Angeles",
      alwaysIncludeEmail: true,
    }, function(err, events) {
      if (err) {
        console.log('ERROR', err)
      }
      else {
        if (events.items.length === 0) {
          console.log('i have no events at this time')
          return;
        } else {
          //findAvailableTimes(start);
          rtm.sendMessage("This time is not available! Please pick another time.", channel);
          return;
        }
      }
    })
  }
  return true;
}

module.exports = {
  findTimeConflicts
}
