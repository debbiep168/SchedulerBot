var moment = require('moment');
var google = require('googleapis');
var plus = google.plus('v1');
var { oauth2Client } = require('./configureGoogle');

//FINDS TIME CONFLICTS OF ALL ATTENDEES ON THAT DAY AT THAT TIME
function findTimeConflicts(invitees, date, time) {
  var gClient = oauth2Client();
  //var dateTimeString = date + 'T' + time;
  var dateTimeString = '2017-08-02T20:00:00';
  console.log('DATE TIME STRING', dateTimeString);
  var start = moment.utc(dateTimeString).format('YYYY-MM-DDTHH:mm:ss-07:00');
  var end = moment.utc(dateTimeString).add(1, 'hours').format('YYYY-MM-DDTHH:mm:ss-07:00');
  for (var i = 0; i < invitees.length; i++) {
    console.log('WORKSSSS', invitees[i].google);
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
        return null;
      }
      else {
        console.log("EVENTSSSSS", events);
        return true;
      }
    })
    //console.log('EVENTSSSSS', events);
  }
  return true;
}


//when someone sends a message to the slackbot to schedule a meeting,
//get all the google auth to access the @users calendars
//and then check their events of the day --> get a list back of events they ahve on that day
//check for time conflicts
//if yes then send back different times
// if not conflicts do the usual

module.exports = {
  findTimeConflicts
}
