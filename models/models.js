var mongoose = require('mongoose');
var connect = process.env.MONGODB_URI;

mongoose.connect(connect);
mongoose.Promise = global.Promise;
var Schema = mongoose.Schema;

var userSchema = new Schema({
  user: String,
  slackDmId: String,
  pending: Object,
  google: Object,
  task: String,
  date: String
});

var reminderSchema = new Schema({
  task: String,
  date: String,
  user: String
});

var User = mongoose.model('User', userSchema);
var Reminder = mongoose.model('Reminder', reminderSchema);

module.exports = {
  User: User,
  Reminder: Reminder
}
