/*SlackChat*/
/* v1.5 */
(function( $ ) {

	var mainOptions = {};
	var userList;

	window.chatBox = false;

	var methods = {
		init: function (options) {
			this._defaults = {
				queryInterval: 3000,
				debug: false,
				messageFetchCount: 100,
				isOpen: false,
				serverEndPoint: 'http://localhost:8001'
			};

			this._options = $.extend(true, {}, this._defaults, options);
			this._options.latest = new Date().getTime()/1000;

			this._options.queryIntElem = null;

            if(this._options.debug) console.log('This object :', this);

            window.chatBox._options = mainOptions = this._options;

            //validate the params
            if(typeof moment == 'undefined') methods.validationError('MomentJS is not available. Get it from http://momentjs.com');

            //if disabling is set, then first hide the element and show only if users are online
            //if(this._options.disableIfAway && this._options.elementToDisable !== null) this._options.elementToDisable.hide();

			//create the chat box
			var html = '<div class="container">'
					    +'<div class="row chat-window col-xs-5 col-md-3" id="chat_window_1">'
					    +'    <div class="col-xs-12 col-md-12">'
					    +'    	<div class="panel panel-default">'
					    +'            <div class="panel-heading top-bar">'
					                    +'<div class="col-md-8 col-xs-8">'
					                        +'<h3 class="panel-title"><span class="glyphicon glyphicon-comment"></span> Contact Us</h3>'
					                    +'</div>'
					                    +'<div class="col-md-4 col-xs-4" style="text-align: right;">'
					                    +'    <a href="#"><span id="minim_chat_window" class="glyphicon glyphicon-minus icon_minim"></span></a>'
					                    +'    <a href="#"><span class="glyphicon glyphicon-remove icon_close" data-id="chat_window_1"></span></a>'
					                    +'</div>'
					                +'</div>'
					                +'<div class="panel-body msg_container_base">'
					                	+'<div id="welcome-box">'
						                	+'<div class="hfc-welcome-block">'
							                    +'<p class="hfc-welcome-message">Please help us with some basic information about yourself. Our Taskbob Chat staff will be assisting you in no time.</p>'
							                  +'</div>'
							                +'<div id="form-messages"></div>'
							                +'<form id="ajax-contact" method="post" action="">'
							                +'    <div class="field">'
							                +'        <label for="name">Name:</label>'
							                +'        <input type="text" id="name" name="user_name" required>'
							                +'    </div>'

							                +'    <div class="field">'
							                +'        <label for="email">Email:</label>'
							                +'        <input type="email" id="email" name="user_email" required>'
							                +'    </div>'
							                +'    <div class="field">'
							                +'        <button type="submit">Start Live Chat</button>'
							                +'    </div>'
							                +'</form>'
						                +'</div>'
					                +'</div>'
					                +'<div class="panel-footer">'
					                +'    <div class="input-group">'
					                +'        <input id="btn-input" type="text" class="form-control input-sm chat_input" placeholder="Write your message here..." />'
					                +'        <span class="input-group-btn">'
					                +'        <button class="btn btn-primary btn-sm" id="btn-chat">Send</button>'
					                +'        </span>'
					                +'    </div>'
					                +'</div>'
					    		+'</div>'
					        +'</div>'
					    +'</div>'
					+'</div>';

			$('.chat-box').append(html);

			var $this = window.chatBox = this;

			$('.panel-footer').hide();

			//register events on the chatbox
			//1. query Slack on open
			$(this).on('click', function () {
				
				//reset the badgeElement
				//if(window.slackChat._options.badgeElement)
				//	$(window.slackChat._options.badgeElement).html('').hide();
				
				//if the private channel functionality is used, set the isOpen flag to true.
				// if(window.slackChat._options.privateChannel) window.slackChat._options.isOpen = true;
				//set the height of the messages box
				$('.chat-window').show();
				$('.chat-window').addClass('open');
				// $('.slack-message-box').height($('.slack-chat-box').height() - $('.desc').height() - $('.send-area').height() - parseInt(window.slackChat._options.heightOffset));

				!function querySlackChannel(){
					if(window.chatBox._options.channelId!=undefined && ($('.chat-window').hasClass('open') || window.chatBox._options.privateChannel)) {
						methods.querySlack($this);
						setTimeout(querySlackChannel,  window.chatBox._options.queryInterval);
					}
				 
				}();

				$('.chat-window .chat_input').focus();

			});

			//2. close the chat box
			$('.chat-window .icon_close').on('click', function () {
				$( "#chat_window_1" ).remove();
				$('.chat-window').removeClass('open');
				clearInterval(window.chatBox._options.queryIntElem);
				window.chatBox._options.isOpen = false;
				methods.closeChat(window.chatBox);
			});

			// minimise chatbox
			$('.panel-heading span.icon_minim').on('click', function() {
				var $this = $(this);
			    if (!$this.hasClass('panel-collapsed')) {
			        $this.parents('.panel').find('.panel-body').slideUp();
			        $this.addClass('panel-collapsed');
			        $this.removeClass('glyphicon-minus').addClass('glyphicon-plus');
			    } else {
			        $this.parents('.panel').find('.panel-body').slideDown();
			        $this.removeClass('panel-collapsed');
			        $this.removeClass('glyphicon-plus').addClass('glyphicon-minus');
			    }
			});


			//textbox focus
			$('.panel-footer input.chat_input').on('focus', function(e) {
				var $this = $(this);
			    if ($('#minim_chat_window').hasClass('panel-collapsed')) {
			        $this.parents('.panel').find('.panel-body').slideDown();
			        $('#minim_chat_window').removeClass('panel-collapsed');
			        $('#minim_chat_window').removeClass('glyphicon-plus').addClass('glyphicon-minus');
			    }
			});


			//3. post message to slack
			$('.input-group-btn').click(function () {
				console.log('button clicked');
				methods.postMessage(window.chatBox, window.chatBox._options);
			});

			//4. bind the enter key to the text box
			$('.chat-window .chat_input').keyup(function(e) {
				if(window.chatBox._options.sendOnEnter)
				{
			   		var code = (e.keyCode ? e.keyCode : e.which);
			 		if(code == 13) 
			 		{
			 			methods.postMessage(window.chatBox, window.chatBox._options);
			 			e.preventDefault();
			 		}
			 	}
			});

			$('#ajax-contact').submit(function(event) {
			      // Stop the browser from submitting the form.
			      event.preventDefault();

			      methods.createChannel($('#ajax-contact'), function(status, message){

			      	if (status) {
			      		$('#form-messages').removeClass('error');
		         		$('#form-messages').addClass('success');
		         		$('#form-messages').text(message);
		         		$('#name').val('');
				         $('#email').val('');
				         $('#message').val('');
				         $('#welcome-box').hide();
				         $('.panel-footer').show();
			      	} else {
			      		$('#form-messages').removeClass('success');
		         		$('#form-messages').addClass('error');
			      		$('#form-messages').text(message);
			      	}

			      });
			   });

			//get user online/offline status
			// methods.getUserPresence(window.chatBox, window.chatBox._options);
		},

		querySlack: function ($elem) {
			options = window.chatBox._options;

				channel_id = window.chatBox._options.channelId;
				
				$('.chat-window').prop('disabled', false).prop('placeholder', 'Write a message...');
				
				$.ajax({
					url: window.chatBox._options.serverEndPoint+'/chat/'+channel_id+'/history'
					,type: "GET"
					,data: {
						latest: mainOptions.latest
					}
					,dataType: 'json'
					,success: function (resp) {

						if(options.debug && resp.messages && resp.messages.length) console.log(resp.messages);

						if(resp.ok && resp.messages.length) {
							var html = '';
							window.chatBox._options.latest = resp.messages[0].ts;
							resp.messages = resp.messages.reverse();
							
							var repliesExist = 0;

							for(var i=0; i< resp.messages.length; i++)
							{

								if(resp.messages[i].subtype == 'bot_message' && resp.messages[i].text !== "") {
									
									message = resp.messages[i];
									var userName = '';
									var userImg = '';
									var msgUserId = '';

									if(message.attachments)
									{
										userName = message.attachments[0].author_name;
										userImg = message.attachments[0].author_icon;
									}

									if(message.fields)
										msgUserId = message.fields[0].value;

									var messageText = methods.formatMessage(message.text.trim());

										//var messageText = methods.checkforLinks(message);

										html = '<div class="row msg_container base_receive">'
	                        +'<div class="col-md-2 col-xs-2 avatar">'
	                            +'<img src="" class=" img-responsive ">'
	                        +'</div>'
	                        +'<div class="col-md-10 col-xs-10">'
	                            +'<div class="messages msg_receive">'
	                                +'<p>'+messageText+'</p>'
	                            +'</div>'
	                        +'</div>'
	                    +'</div>';
								}
								else if(typeof resp.messages[i].subtype == 'undefined') {

										//support replies exist
										repliesExist++;
										
										messageText = resp.messages[i].text;

										var userId = resp.messages[i].user;
					                  	var userName = options.defaultSysUser;
					                  	var userImg = options.defaultSysImg;

					                  	if (options.useUserDetails && userList.length) {
					                    	for (var uL = 0; uL < userList.length; uL++) {
						                      	var currentUser = userList[uL];
						                      	if (currentUser.id == userId) {
						                        	if (currentUser.real_name != undefined && currentUser.real_name.length > 0)
						                          		userName = currentUser.real_name;
						                        	else
						                          		userName = currentUser.name;

						                        	userImg = currentUser.profile.image_48;

						                        	break;
						                      	}
					                    	}
					                  	}

										html = '<div class="row msg_container base_sent">'
	                        +'<div class="col-md-10 col-xs-10">'
	                            +'<div class="messages msg_sent">'
	                                +'<p>'+messageText+'</p>'
	                            +'</div>'
	                        +'</div>'
	                        +'<div class="col-md-2 col-xs-2 avatar">'
	                            +'<img src="" class=" img-responsive ">'
	                        +'</div>'
	                    +'</div>';
								}
						}

							$('.msg_container_base').append(html);
							
							//scroll to the bottom
							$('.msg_container_base').stop().animate({
		  						scrollTop: $(".msg_container_base")[0].scrollHeight
							}, 800);
							
							//support team has replied and the chat box is closed
							if(repliesExist > 0 && window.chatBox._options.isOpen === false && window.chatBox._options.badgeElement) {
								$(window.chatBox._options.badgeElement).html(repliesExist).show();
								
							}
						}
						else if(!resp.ok)
						{
							console.log('[SlackChat] Query failed with errors: ');
							console.log(resp);
						}
					}
				});
			
		},

		postMessage: function ($elem, channel) {

			var options = $elem._options;		

			var attachment = {};

			attachment.fallback = "View " + options.user + "'s profile";
			attachment.color = options.slackColor;
			attachment.author_name = options.user;

			if(options.userLink !== '') attachment.author_link = options.userLink;
			if(options.userImg !== '') attachment.author_icon = options.userImg;
			if(options.userId !== '') attachment.fields = [
				{
					"title": "ID",
                    "value": options.userId,
                    "short": true
				}
			];
			
			//do not send the message if the value is empty
			if($('.chat_input').val().trim() === '') return false;

			message = $('.chat_input').val();
			$('.chat_input').val('');

			if(options.debug) {
				console.log('Posting Message:');
				console.log({ message: message, attachment: attachment, options: options});
			}

			$.ajax({
				url: window.chatBox._options.serverEndPoint+'/chat/'+options.channelId+'/post'
				,type: "POST"
				,dataType: 'json'
				,data: {
					text: message
					,username: options.botUser
					,attachments: JSON.stringify([attachment])
				}
				,success: function (resp) {
					if(!resp.ok) {
						$('.slack-new-message').val(message);
						console.log('[SlackChat] Post Message failed with errors: ');
						console.log(resp);
					}
				}
			});
		},

		validationError: function (errorTxt) {
			$.error('[SlackChat Error] ' + errorTxt);
			return false;
		},

		destroy: function ($elem) {
			$($elem).unbind('click');

			$('.slackchat').remove();
		},

		formatMessage: function (text) {
			
			//hack for converting to html entities
			var formattedText = $("<textarea/>").html(text).text();

			return decodeURI(formattedText)
			// <URL>
			.replace(/<(.+?)(\|(.*?))?>/g, function(match, url, _text, text) {
				if (!text) text = url;
				return $('<a>')
				.attr({
					href: url,
					target: '_blank'
				})
				.text(text)
				.prop('outerHTML');
			})
			// `code block`
			.replace(/(?:[`]{3,})(?:\n)([a-zA-Z0-9<>\\\.\*\n\r\-_ ]+)(?:\n)(?:[`]{3,})/g, function(match, code) {
				//console.log(match, code);
				return $('<code>').text(code).prop('outerHTML');
			})
			// `code`
			/*.replace(/(?:[`])([a-zA-Z0-9<>\\\.\*\n\r\-_ ]+)(?:[`])`/g, function(match, code) {
				return $('<code>').text(code).prop('outerHTML');
			})*/
			// new line character
			.replace(/\n/g, "<br />");
		},

		closeChat: function($elem) {

			var options = $elem._options;

			$.ajax({
				url: window.chatBox._options.serverEndPoint+'/chat/'+options.channelId+'/end'
				,dataType: 'json'
				,type: "POST"
				,success: function (resp) {
					if(resp.ok) {
						options.channelId = window.chatBox._options.channelId = resp.data.id;
						callback(resp.data);
					}

					return false;
				}
				,error: function () {
					return false;
				}
			});

		},

		createChannel: function($elem, callback) {

			var options = $elem._options;

			// TODO
		    // Serialize the form data.
		    var formData = $elem.serialize();

		    $.ajax({
		        type: 'POST',
		        url: window.chatBox._options.serverEndPoint+'/chat/create',
		        data: formData, 
		      	success: function(resp) {

		      		window.chatBox._options.channelId = resp.channel.id;
		      		callback(true, resp);
		      	}
		      	,error: function() {
		      		if (data.responseText !== '') {
		             	callback(false, data.responseText);
			        } else {
			        	callback(false, 'Oops! An error occured and your message could not be sent.');
			        }
		      	}
		    });  
		}
	};
 
    $.fn.chatBox = function( methodOrOptions ) {

    	if(methods[methodOrOptions]) {
    		return methods[ methodOrOptions ].apply( this, Array.prototype.slice.call( arguments, 1 ));
    	}
    	else if ( typeof methodOrOptions === 'object' || ! methodOrOptions ) {
    		methods.init.apply( this, arguments );
    	}
    	else {
            $.error( 'Method ' +  methodOrOptions + ' does not exist on jQuery.slackChat' );
        }
    };
 
}( jQuery ));
