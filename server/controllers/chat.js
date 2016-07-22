var Slack = require('slack-node');
var _ = require('underscore');

exports.install = function() {
    
    F.route('/chat/create', this.create_chat, { flags: ['post'] });
    F.route('/chat/{chat_id}/history', this.channel_history);
    F.route('/chat/{chat_id}/post', this.post_message, { flags: ['post']});
    F.route('/chat/{chat_id}/end', this.end_chat, { flags: ['post']});
    F.route('/chat/{chat_id}/invite_bot', this.invite_bot, { flags : ['post']});

};

exports.create_chat = function() {

	var self = this;

	var body = self.body;

	var userName = body.user_name;
	var userEmail = body.user_email;

	if (userName==undefined || userEmail==undefined) {
		self.json({status: false, message: 'Either name or email is invalid'});
	}

	slack = new Slack(CONFIG('slack_api_token'));

	//as channelname length should be within 21 words
	userName = userName.trim().toLowerCase().replace(' ', '-').substr(0, 10);

	slack.api("channels.create", {
		name: 'z-'+userName+'-'+parseInt(new Date().getTime()/1000)
	}, function(err, response){
		if (err) {
			self.json({status: false, message: err});
		}
		var topic = 'name- '+body.user_name+' email- '+body.user_email;
		setTopic(response.channel.id, topic, function(err, response){});
		postMessage(response.channel.id, 'Hii '+body.user_name+', how we can help you?', {as_user: true}, function(err, response){});
		postMessage(CONFIG('customer_support_channel_id'), 'New channel is created by user - '+body.user_name, {}, function(err, response){

		});
		// postMeMessage(response.channel.id, '/invite @slackify_bot', function(err, response){
		// 	console.log(response);
		// });
		// inviteUserToChannel(response.channel.id, CONFIG('chat_bot_id'), function(err, response) {
		// 	console.log(response);
		// });
		self.json({status: true, channel: { id: response.channel.id }});

	});

}

exports.channel_history = function(chat_id) {

	var self = this;

	slack = new Slack(CONFIG('slack_api_token'));

	var options = { channel: chat_id };

	if (self.get.latest!=undefined) {
		options['oldest'] = self.get.latest;
	}

	slack.api("channels.history", options,function(err, response) {
	  self.json(response);
	});

}

exports.post_message = function(chat_id) {

	var self = this;

	var body = self.body;

	var message = body.text;

	if (message==undefined) {
		self.json({status: false, message: 'Please provide message'});
	}

	postMessage(chat_id, message, {username: 'User'}, function(err, response){
		self.json(response);
	});

}

exports.end_chat = function(chat_id) {

	var self = this;

	slack = new Slack(CONFIG('slack_api_token'));

	slack.api("channels.archive", {
		channel: chat_id
	}, function(err, response) {
		self.json(response);
	});

}

exports.invite_bot = function(chat_id) {

	var self = this;

	inviteUserToChannel(chat_id, CONFIG('chat_bot_id'), function(err, response){
		self.json(response)
	});

}

function postMessage(channel_id, text, options, callback) {
	slack = new Slack(CONFIG('slack_api_token'));

	var values = {
		channel: channel_id,
		text: text
	}

	values = _.extend(values, options);

	slack.api("chat.postMessage", values, function(err, response) {
	  	callback(err, response);
	});
}

function postMeMessage(channel_id, text, callback) {
	slack = new Slack(CONFIG('slack_api_token'));

	var values = {
		channel: channel_id,
		text: text
	}

	slack.api("chat.meMessage", values, function(err, response) {
	  	callback(err, response);
	});
}

function setTopic(channel_id, topic, callback) {
	slack = new Slack(CONFIG('slack_api_token'));
	slack.api("channels.setTopic", {
		channel: channel_id,
		topic: topic
	}, function(err, response) {
	  	callback(err, response);
	});
}

function inviteUserToChannel(channel_id, user_id, callback) {
	console.log(channel_id);
	console.log(user_id);
	slack = new Slack(CONFIG('slack_api_token'));
	slack.api("channels.invite", {
		channel: channel_id,
		user: user_id
	}, function(err, response) {
	  	callback(err, response);
	});
}