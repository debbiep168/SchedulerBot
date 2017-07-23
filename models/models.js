var mongoose = require('mongoose');
var connect = process.env.MONGODB_URI;

mongoose.connect(connect);
var Schema = mongoose.Schema;

var userSchema = new Schema({
  user: String,
  slackDmId: String,
  pending: Object,
  google: Object,
  task: String,
  date: String
});


var User = mongoose.model('User', userSchema);

module.exports = {
  User: User
}
