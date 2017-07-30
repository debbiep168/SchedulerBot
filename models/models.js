var mongoose = require('mongoose');
var connect = process.env.MONGODB_URI;

mongoose.connect(connect);
mongoose.Promise = global.Promise;
var Schema = mongoose.Schema;

//USER SCHEMA FOR SLACK USER
var userSchema = new Schema({
  user: String,
  slackDmId: String,
  pending: Object,
  google: Object,
  task: String,
  date: String
});

//SCHEMA FOR REMINDERS CREATED
var reminderSchema = new Schema({
  task: String,
  date: String,
  user: String
});

//SCHEMA FOR MEETINGS SCHEDULED
var meetingSchema = new Schema({
  subject: String,
  date: String,
  user: String,
  time: String,
  invitees: Array
})

//USER MODEL FOR SLACK USER
var User = mongoose.model('User', userSchema);
//REMINDER MODEL FOR CREATING REMINDERS
var Reminder = mongoose.model('Reminder', reminderSchema);
//MEETING MODEL FOR SCHEDULING MEETINGS
var Meeting = mongoose.model('Meeting', meetingSchema);

module.exports = {
  User: User,
  Reminder: Reminder,
  Meeting: Meeting
}
