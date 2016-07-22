'use strict';

var util = require('util');
var path = require('path');
var fs = require('fs');
var SQLite = require('sqlite3').verbose();
var Bot = require('slackbots');

/**
 * Constructor function. It accepts a settings object which should contain the following keys:
 *      token : the API token of the bot (mandatory)
 *      name : the name of the bot (will default to "norrisbot")
 *      dbPath : the path to access the database (will default to "data/norrisbot.db")
 *
 * @param {object} settings
 * @constructor
 *
 * @author Luciano Mammino <lucianomammino@gmail.com>
 */
var NorrisBot = function Constructor(settings) {
    this.settings = settings;
    this.settings.name = this.settings.name || 'norrisbot';
    this.dbPath = settings.dbPath || path.resolve(__dirname, '..', 'data', 'norrisbot.db');

    this.user = null;
    this.db = null;
    this.service = null;
    console.log(this.settings.name);
};

// inherits methods and properties from the Bot constructor
util.inherits(NorrisBot, Bot);

/**
 * Run the bot
 * @public
 */
NorrisBot.prototype.run = function () {
    NorrisBot.super_.call(this, this.settings);

    this.on('start', this._onStart);
    this.on('message', this._onMessage);
};

/**
 * On Start callback, called when the bot connects to the Slack server and access the channel
 * @private
 */
NorrisBot.prototype._onStart = function () {
    this._loadBotUser();
    this._connectDb();
    this._firstRunCheck();
};

/**
 * On message callback, called when a message (of any type) is detected with the real time messaging API
 * @param {object} message
 * @private
 */
NorrisBot.prototype._onMessage = function (message) {
    console.log(message);
    if (this._isChatMessage(message) &&
        this._isChannelConversation(message) &&
        !this._isFromNorrisBot(message) &&
        this._isMentioningChuckNorris(message)
    ) {
        this._replyWithRandomJoke(message);
    }
    else if (this._isBookAService(message)) {
        this.service = message;
        this._replyForBookService(message);
    }
    else if (this._isNeedHelp(message)) {
        this._replyNeedHelp(message);
    }
    else if (this._isAddressProvided(message)){
        this._replyServiceForAddress(message);
    }
    else if (this._isBookingConfirmed(message)){
        this._replyBookingConfirmation(message);
    };
};

/**
 * Replyes to a message with a random Joke
 * @param {object} originalMessage
 * @private
 */
NorrisBot.prototype._replyWithRandomJoke = function (originalMessage) {
    var self = this;
    self.db.get('SELECT id, joke FROM jokes ORDER BY used ASC, RANDOM() LIMIT 1', function (err, record) {
        if (err) {
            return console.error('DATABASE ERROR:', err);
        }

        var channel = self._getChannelById(originalMessage.channel);
        console.log(originalMessage.channel);
        if (channel!=undefined) {
            self.postMessageToChannel(channel.name, record.joke, {as_user: true});
            self.db.run('UPDATE jokes SET used = used + 1 WHERE id = ?', record.id);
        }
    });
};

/**
 * Loads the user object representing the bot
 * @private
 */
NorrisBot.prototype._loadBotUser = function () {
    var self = this;
    this.user = this.users.filter(function (user) {
        return user.name === self.name;
    })[0];
};

/**
 * Open connection to the db
 * @private
 */
NorrisBot.prototype._connectDb = function () {
    if (!fs.existsSync(this.dbPath)) {
        console.error('Database path ' + '"' + this.dbPath + '" does not exists or it\'s not readable.');
        process.exit(1);
    }

    this.db = new SQLite.Database(this.dbPath);
};

/**
 * Check if the first time the bot is run. It's used to send a welcome message into the channel
 * @private
 */
NorrisBot.prototype._firstRunCheck = function () {
    var self = this;
    self.db.get('SELECT val FROM info WHERE name = "lastrun" LIMIT 1', function (err, record) {
        if (err) {
            return console.error('DATABASE ERROR:', err);
        }

        var currentTime = (new Date()).toJSON();

        // this is a first run
        if (!record) {
            self._welcomeMessage();
            return self.db.run('INSERT INTO info(name, val) VALUES("lastrun", ?)', currentTime);
        }

        // updates with new last running time
        self.db.run('UPDATE info SET val = ? WHERE name = "lastrun"', currentTime);
    });
};

/**
 * Sends a welcome message in the channel
 * @private
 */
NorrisBot.prototype._welcomeMessage = function () {
    this.postMessageToChannel(this.channels[0].name, 'Hi guys, roundhouse-kick anyone?' +
        '\n I can tell jokes, but very honest ones. Just say `Chuck Norris` or `' + this.name + '` to invoke me!',
        {as_user: true});
};

/**
 * Util function to check if a given real time message object represents a chat message
 * @param {object} message
 * @returns {boolean}
 * @private
 */
NorrisBot.prototype._isChatMessage = function (message) {
    return message.type === 'message' && Boolean(message.text);
};

/**
 * Util function to check if a given real time message object is directed to a channel
 * @param {object} message
 * @returns {boolean}
 * @private
 */
NorrisBot.prototype._isChannelConversation = function (message) {
    return typeof message.channel === 'string' && 
        message.channel[0] === 'C';
};

/**
 * Util function to check if a given real time message object is directed to a user
 * @param {object} message
 * @returns {boolean}
 * @private
 */
NorrisBot.prototype._isDirectConversation = function (message) {
    return typeof message.channel === 'string' && 
        message.channel[0] === 'D';
};

/**
 * Util function to check if a given real time message is mentioning Chuck Norris or the norrisbot
 * @param {object} message
 * @returns {boolean}
 * @private
 */
NorrisBot.prototype._isMentioningChuckNorris = function (message) {
    return message.text.toLowerCase().indexOf('chuck norris') > -1 ||
        message.text.toLowerCase().indexOf(this.name) > -1;
};

/**
 * Util function to check if a given real time message has ben sent by the norrisbot
 * @param {object} message
 * @returns {boolean}
 * @private
 */
NorrisBot.prototype._isFromNorrisBot = function (message) {
    return message.user === this.user.id;
};

NorrisBot.prototype._isBookAService = function (message) {
    if (message.text!=undefined) {
        return message.text.toLowerCase().indexOf('plumber') > -1 ||
        message.text.toLowerCase().indexOf('electrician') > -1
        message.text.toLowerCase().indexOf('ac repair') > -1
        message.text.toLowerCase().indexOf('car spa') > -1
        message.text.toLowerCase().indexOf('home cleaning') > -1
        message.text.toLowerCase().indexOf('carpenter') > -1
        message.text.toLowerCase().indexOf('beauty') > -1;
    }
    return false;
}


NorrisBot.prototype._replyForBookService = function (originalMessage) {
    var channel = this._getChannelById(originalMessage.channel);
        console.log(originalMessage.channel);
        if (channel!=undefined) {
            this.postMessageToChannel(channel.name, 'Kindly provide your current address', {as_user: true});
        }
}

NorrisBot.prototype._isNeedHelp = function (message) {
    if (message.text!=undefined) {
        return message.text.toLowerCase().indexOf('need') > -1 ||
        message.text.toLowerCase().indexOf('want') > -1
        message.text.toLowerCase().indexOf('require') > -1
        message.text.toLowerCase().indexOf('help') > -1;    
    }
    return false;
}

NorrisBot.prototype._replyNeedHelp = function (originalMessage) {
    var channel = this._getChannelById(originalMessage.channel);
        console.log(originalMessage.channel);
        if (channel!=undefined) {
            this.postMessageToChannel(channel.name, 'What is the service you need?', {as_user: true});
        }
}

NorrisBot.prototype._isAddressProvided = function (message) {
    if (message.text!=undefined) {
        return message.text.toLowerCase().indexOf('west') > -1 ||
        message.text.toLowerCase().indexOf('east') > -1
        message.text.toLowerCase().indexOf('powai') > -1
        message.text.toLowerCase().indexOf('hiranandani') > -1;
    }
    return false;
}

NorrisBot.prototype._replyServiceForAddress = function (originalMessage) {
    var channel = this._getChannelById(originalMessage.channel);
        console.log(originalMessage.channel);
        if (channel!=undefined) {
            this.postMessageToChannel(channel.name, 'plumber at your location is available earliest at 6:30PM today. Book it now?', {as_user: true});
        }
}

NorrisBot.prototype._isBookingConfirmed = function (message) {
    if (message.text!=undefined) {
        return message.text.toLowerCase().indexOf('yes') > -1 ||
        message.text.toLowerCase().indexOf('no') > -1;
    }
    return false;
}

NorrisBot.prototype._replyBookingConfirmation = function (message) {
    var channel = this._getChannelById(message.channel);
        if (channel!=undefined) {
            if (message.text.toLowerCase().indexOf('yes') > -1){
                console.log(message);
                this.postMessageToChannel(channel.name, 'Please wait while we confirm your booking', {as_user: true});
            }
            else
            {
             this.postMessageToChannel(channel.name, 'Thank you for querying', {as_user: true});   
            }
        }
}
/**
 * Util function to get the name of a channel given its id
 * @param {string} channelId
 * @returns {Object}
 * @private
 */
NorrisBot.prototype._getChannelById = function (channelId) {
    return this.channels.filter(function (item) {
        return item.id === channelId;
    })[0];
};

module.exports = NorrisBot;
