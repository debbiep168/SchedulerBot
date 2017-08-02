var moment = require('moment');
//CONFIGURE GOOGLE APIS
var google = require('googleapis');
var plus = google.plus('v1');
var OAuth2 = google.auth.OAuth2;
var oauth2Client = new OAuth2 (
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'https://floating-headland-63670.herokuapp.com/connect/callback'
);

//FINDS TIME CONFLICTS OF ALL ATTENDEES ON THAT DAY AT THAT TIME
function findTimeConflicts(invitees, date, time) {
  var calendar = google.calendar('v3');
  var dateTimeString = date + 'T' + time;
  // console.log('DATE TIME STRING', dateTimeString);
  var start = moment.utc(dateTimeString).format('YYYY-MM-DDTHH:mm:ss-07:00');
  var end = moment.utc(dateTimeString).add(1, 'hours').format('YYYY-MM-DDTHH:mm:ss-07:00');
  for (var i = 0; i < invitees.length; i++) {
     oauth2Client.setCredentials({
       access_token: invitees[i].google.id_token,
       refresh_token: invitees[i].google.refresh_token
     });
    calendar.events.list({
      auth: oauth2Client,
      calendarId: 'primary',
      timeMin: start,
      timeMax: end,
      timeZone: "America/Los_Angeles",
      alwaysIncludeEmail: true,
    }, function(events) {
      console.log("EVENTSSSSS", events);
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
