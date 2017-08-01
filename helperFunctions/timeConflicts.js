//FINSIHSHHHHH
function findTimeConflicts(invitees, start) {
  for (var i = 0; i < invitees.length; i++) {
    var gAuthUser = getGoogleAuth();
     gAuthUser.setCredentials({
       access_token: user.google.id_token,
       refresh_token: user.google.refresh_token
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
}

module.exports = {
  findTimeConflicts
}

//when someone sends a message to the slackbot to schedule a meeting,
//get all the google auth to access the @ users calendars
//and then check their events of the day --> get a list back of events they ahve on that day
//check for time conflicts
//if yes then send back different times
// if not conflicts do the usual
