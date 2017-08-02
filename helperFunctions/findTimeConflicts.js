var moment = require('moment');


//FINDS TIME CONFLICTS OF ALL ATTENDEES ON THAT DAY AT THAT TIME
function findTimeConflicts(invitees, date, time ) {
  var calendar = google.calendar('v3');
  var dateTimeString = date + 'T' + time;
  var start = moment.utc(dateTimeString).format('YYYY-MM-DDTHH:mm:ss-07:00');
  var end = moment.utc(dateTimeString).add(1, 'hours').format('YYYY-MM-DDTHH:mm:ss-07:00');
  for (var i = 0; i < invitees.length; i++) {
    var gAuthUser = getGoogleAuth();
     gAuthUser.setCredentials({
       access_token: invitees[i].google.id_token,
       refresh_token: invitees[i].google.refresh_token
     })
    calendar.events.list ({
      auth: gAuthUser,
      calendarId: 'primary',
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      timeZone: "America/Los_Angeles",
      alwaysIncludeEmail: true,
    })
    .then((res) => {
      console.log('RESPONSE IS', res);
    })

  }
  return true;
}

module.exports = {
  findTimeConflicts
}

//when someone sends a message to the slackbot to schedule a meeting,
//get all the google auth to access the @users calendars
//and then check their events of the day --> get a list back of events they ahve on that day
//check for time conflicts
//if yes then send back different times
// if not conflicts do the usual
