//CONFIGURE GOOGLE APIS
var google = require('googleapis');
var plus = google.plus('v1');
var OAuth2 = google.auth.OAuth2;

fuction oauth2Client() {
  return new OAuth2 (
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'https://floating-headland-63670.herokuapp.com/connect/callback'
)};

module.exports = {
  oauth2Client
}
