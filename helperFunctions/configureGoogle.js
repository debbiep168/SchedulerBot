//CONFIGURE GOOGLE APIS
var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;

function oauth2Client() {
  return new OAuth2 (
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'https://agile-reaches-64711.herokuapp.com/connect/callback'
)};

module.exports = {
  oauth2Client
}
