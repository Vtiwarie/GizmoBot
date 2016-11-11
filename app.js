/*
 * Copyright 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/* jshint node: true, devel: true */


//'use strict';

const 
  bodyParser = require('body-parser'),
  config = require('config'),
  crypto = require('crypto'),
  express = require('express'),
  https = require('https'),  
  request = require('request');

var app = express();
app.set('port', process.env.PORT || 5000);
app.set('view engine', 'ejs');
app.use(bodyParser.json({ verify: verifyRequestSignature }));
app.use(express.static('public'));

/*
 * Be sure to setup your config values before running this code. You can 
 * set them using environment rvariables or modifying the config file in /config.
 *
 */
 
process.env.MESSENGER_APP_SECRET = 'd841e02c0b864a2568e2e7a437e7a40b';
process.env.MESSENGER_VALIDATION_TOKEN = 'gizmo-bot-verify-token';
process.env.MESSENGER_PAGE_ACCESS_TOKEN = 'EAADHa8uhuN8BAEEgE7M1ZBZA8Ln9RZCtnFG9cQIV0gZCdQP2TbwpCZCoCZAGtw0RSug0oGqzeP2ZCMsSPf1oJvrGW9GZBarDs8T6fGRrRNvd9V0yUVp07hTDfMOCdgYESrBUcKsZBb106iFOqnZCJtSffh4pkF4NuVAIHfbbZBoXXda0AZDZD';
process.env.SERVER_URL = 'https://bot-test-gizmo.herokuapp.com/';


// App Secret can be retrieved from the App Dashboard
const APP_SECRET = (process.env.MESSENGER_APP_SECRET) ? 
  process.env.MESSENGER_APP_SECRET :
  config.get('appSecret');

// Arbitrary value used to validate a webhook
const VALIDATION_TOKEN = (process.env.MESSENGER_VALIDATION_TOKEN) ?
  (process.env.MESSENGER_VALIDATION_TOKEN) :
  config.get('validationToken');

// Generate a page access token for your page from the App Dashboard
const PAGE_ACCESS_TOKEN = (process.env.MESSENGER_PAGE_ACCESS_TOKEN) ?
  (process.env.MESSENGER_PAGE_ACCESS_TOKEN) :
  config.get('pageAccessToken');

// URL where the app is running (include protocol). Used to point to scripts and 
// assets located at this address. 
const SERVER_URL = (process.env.SERVER_URL) ?
  (process.env.SERVER_URL) :
  config.get('serverURL');

if (!(APP_SECRET && VALIDATION_TOKEN && PAGE_ACCESS_TOKEN && SERVER_URL)) {
  console.error("Missing config values");
  process.exit(1);
}

/*
 * Use your own validation token. Check that the token used in the Webhook 
 * setup is the same token used here.
 *
 */
app.get('/webhook', function(req, res) {
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === VALIDATION_TOKEN) {
    console.log("Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);          
  }  
});

/*
 * This path is used for account linking. The account linking call-to-action
 * (sendAccountLinking) is pointed to this URL. 
 * 
 */
app.get('/authorize', function(req, res) {
  var accountLinkingToken = req.query.account_linking_token;
  var redirectURI = req.query.redirect_uri;

  // Authorization Code should be generated per user by the developer. This will 
  // be passed to the Account Linking callback.
  var authCode = "1234567890";

  // Redirect users to this URI on successful login
  var redirectURISuccess = redirectURI + "&authorization_code=" + authCode;

  res.render('authorize', {
    accountLinkingToken: accountLinkingToken,
    redirectURI: redirectURI,
    redirectURISuccess: redirectURISuccess
  });
});

/*
 * Verify that the callback came from Facebook. Using the App Secret from 
 * the App Dashboard, we can verify the signature that is sent with each 
 * callback in the x-hub-signature field, located in the header.
 *
 * https://developers.facebook.com/docs/graph-api/webhooks#setup
 *
 */
function verifyRequestSignature(req, res, buf) {
  var signature = req.headers["x-hub-signature"];

  if (!signature) {
    // For testing, let's log an error. In production, you should throw an 
    // error.
    console.error("Couldn't validate the signature.");
  } else {
    var elements = signature.split('=');
    var method = elements[0];
    var signatureHash = elements[1];

    var expectedHash = crypto.createHmac('sha1', APP_SECRET)
                        .update(buf)
                        .digest('hex');

    if (signatureHash != expectedHash) {
      throw new Error("Couldn't validate the request signature.");
    }
  }
}

/*
 * Authorization Event
 *
 * The value for 'optin.ref' is defined in the entry point. For the "Send to 
 * Messenger" plugin, it is the 'data-ref' field. Read more at 
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/authentication
 *
 */
function receivedAuthentication(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfAuth = event.timestamp;

  // The 'ref' field is set in the 'Send to Messenger' plugin, in the 'data-ref'
  // The developer can set this to an arbitrary value to associate the 
  // authentication callback with the 'Send to Messenger' click event. This is
  // a way to do account linking when the user clicks the 'Send to Messenger' 
  // plugin.
  var passThroughParam = event.optin.ref;

  console.log("Received authentication for user %d and page %d with pass " +
    "through param '%s' at %d", senderID, recipientID, passThroughParam, 
    timeOfAuth);

  // When an authentication is received, we'll send a message back to the sender
  // to let them know it was successful.
  sendTextMessage(senderID, "Authentication successful");
}

function makeGreeting(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;
      if(typeof buttons != "object" || buttons == null) {
    return;
  }
  
  var messageData = {
    recipient: {
      id: recipientId
    },
    message:{
      "setting_type":"greeting",
        "greeting":{
        "text":"Welcome to Gizmo Support!"
        }
    }
  }

  callSendAPI(messageData);
}



/*
 * All callbacks for Messenger are POST-ed. They will be sent to the same
 * webhook. Be sure to subscribe your app to your page to receive callbacks
 * for your page. 
 * https://developers.facebook.com/docs/messenger-platform/product-overview/setup#subscribe_app
 *
 */
app.post('/webhook', function (req, res) {
  var data = req.body;
  console.log(req);

  // Make sure this is a page subscription
  if (data.object == 'page') {
    // Iterate over each entry
    // There may be multiple if batched
    data.entry.forEach(function(pageEntry) {
      var pageID = pageEntry.id;
      var timeOfEvent = pageEntry.time;

      // Iterate over each messaging event
      pageEntry.messaging.forEach(function(messagingEvent) {
        if (messagingEvent.optin) {
          receivedAuthentication(messagingEvent);
        } else if (messagingEvent.message) {
          receivedMessage(messagingEvent);
        } else if (messagingEvent.delivery) {
          receivedDeliveryConfirmation(messagingEvent);
        } else if (messagingEvent.postback) {
          receivedPostback(messagingEvent);
        } else if (messagingEvent.read) {
          receivedMessageRead(messagingEvent);
        } else if (messagingEvent.account_linking) {
          receivedAccountLink(messagingEvent);
        } else {
          console.log("Webhook received unknown messagingEvent: ", messagingEvent);
        }
      });
    });

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know you've 
    // successfully received the callback. Otherwise, the request will time out.
    res.sendStatus(200);
  }
});

/*
 * Message Event
 *
 * This event is called when a message is sent to your page. The 'message' 
 * object format can vary depending on the kind of message that was received.
 * Read more at https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-received
 *
 * For this example, we're going to echo any text that we get. If we get some 
 * special keywords ('button', 'generic', 'receipt'), then we'll send back
 * examples of those bubbles to illustrate the special message bubbles we've 
 * created. If we receive a message with an attachment (image, video, audio), 
 * then we'll simply confirm that we've received the attachment.
 * 
 */
function receivedMessage(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;

  console.log("Received message for user %d and page %d at %d with message:", 
    senderID, recipientID, timeOfMessage);
  console.log(JSON.stringify(message));

  var isEcho = message.is_echo;
  var messageId = message.mid;
  var appId = message.app_id;
  var metadata = message.metadata;

  // You may get a text or attachment but not both
  var messageText = message.text;
  var messageAttachments = message.attachments;
  var quickReply = message.quick_reply;

  if (isEcho) {
    // Just logging message echoes to console
    console.log("Received echo for message %s and app %d with metadata %s", 
      messageId, appId, metadata);
    return;
  } else if (quickReply) {
    var quickReplyPayload = quickReply.payload;
    console.log("Quick reply for message %s with payload %s",
      messageId, quickReplyPayload);
      
      if(checkRegex(/\bqr_yes_Unable_to_Call_Gizmo\b/im, quickReplyPayload)) {
          sendTextMessage(senderID, "Great! If you are able to receive calls from the gizmo. Is possible that you might have an outbound caller ID Block.", 
            function(){sendQuickReply(senderID, 
                          [{
                          "content_type":"text",
                          "title":"Yes",
                          "payload":"qr_yes_call_connects"
                        },
                        {
                          "content_type":"text",
                          "title":"No",
                          "payload":"qr_no_call_connects"
                        }],
                        "If you dial gizmo # directly with *82 + Gizmo # does the call connect?");
                
            });
         
     }  else if(checkRegex(/\bqr_yes_call_connects\b/im, quickReplyPayload)) {
         sendTextMessage(senderID,"Great! Glad you where able to call. In order to con-tinue calling gizmo you will need to dial *82 to un-block your number when dialing out.",
            function(){sendTextMessage(senderID, "Alternatively you go to the Block and Unblock Services page in My Verizon to enabled outbound caller ID.")});
         
     } else if(checkRegex(/\bqr_no_call_connects\b/im, quickReplyPayload)) {
         sendTextMessage(senderID, "When you called the gizmo did you get this message?", 
             function(){sendQuickReply(senderID, 
              [{
              "content_type":"text",
              "title":"Yes",
              "payload":"qr_yes_got_call_message"
            },
            {
              "content_type":"text",
              "title":"no",
              "payload":"qr_no_got_call_message"
            }],
            "\"Welcome to Verizon Wireless. The cellular custom-er you have called is not available at this time. Please try your call again later.\"");
             });
         
         
     } else if(checkRegex(/\bqr_yes_got_call_message\b/im, quickReplyPayload)) {
         sendTextMessage(senderID, "This typically indicates that unit is powered off or not connected to the network. Please power gizmo off and back on.",
            function(){sendTextMessage(senderID, "Once the gizmo is powered back on make an out-bound call from the gizmo to ensure its connected to network.")});
          
     } else if(checkRegex(/\bqr_no_got_call_message\b/im, quickReplyPayload)) {
         sendQuickReply(senderID, [{
              "content_type":"text",
              "title":"2",
              "payload":"qr_enter_customer_input_2"
            },
            {
              "content_type":"text",
              "title":"3",
              "payload":"qr_enter_customer_input_3"
            },
            {
              "content_type":"text",
              "title":"4",
              "payload":"qr_enter_customer_input_4"
            },
            {
              "content_type":"text",
              "title":"Other",
              "payload":"qr_enter_customer_input_other"
            }],
            "If you listen to the recording it should give you an announcement # at the end. What was the first number?");
         
     } else if(checkRegex(/\bqr_enter_customer_input_2\b/im, quickReplyPayload)) {
         sendTextMessage(senderID, "Please check the number and dial again. You must dial the area code plus the number you wish to reach.");
     } else if(checkRegex(/\bqr_enter_customer_input_3\b/im, quickReplyPayload)) {
          sendTextMessage(senderID, "Please contact customer care to further assist.\n\nYou can call from your Verizon cell by dialing #611 or calling 1 (800) 922-0204.");
     } else if(checkRegex(/\bqr_enter_customer_input_4\b/im, quickReplyPayload)) {
          sendTextMessage(senderID, "Please check the number and dial again. You must dial the area code plus the number you wish to reach.");
     } else if(checkRegex(/\bqr_enter_customer_input_other\b/im, quickReplyPayload)) {
         sendTextMessage(senderID, "It appears that the gizmo might not be registered to the network. Please power gizmo off and back on.", 
         function() {sendQuickReply(senderID, [
             {
              "content_type":"text",
              "title":"Yes",
              "payload":"qr_yes_enter_customer_input_other"
            },
            {
              "content_type":"text",
              "title":"No",
              "payload":"qr_no_enter_customer_input_other"
            }],
            "Can any of the registered contacts call the gizmo?");
         });
          
         
     } else if(checkRegex(/\bqr_yes_enter_customer_input_other\b/im, quickReplyPayload)) {
         sendQuickReply(senderID, [
             {
              "content_type":"text",
              "title":"Yes",
              "payload":"qr_yes_enter_customer_input_other_can_call"
            },
            {
              "content_type":"text",
              "title":"No",
              "payload":"qr_yes_enter_customer_input_other_cannot_call"
            }],
            "Can you call the Gizmo now?");
         
     } else if(checkRegex(/\bqr_no_enter_customer_input_other\b/im, quickReplyPayload)) {
         sendTextMessage(senderID, "Ok. Next step here is to reset the gizmo. This will allow the gizmo to re-activate on network.", 
         function(){
             Flow_Which_Gizmo(senderID);
         })
         
         
     } else if(checkRegex(/\bqr_yes_enter_customer_input_other_can_call\b/im, quickReplyPayload)) {
         sendTextMessage(senderID, "Great! Glad this cleared the issue for you.");
         
     } else if(checkRegex(/\bqr_yes_enter_customer_input_other_cannot_call\b/im, quickReplyPayload)) {
          sendTextMessage(senderID, "Please contact customer care to further assist. It appears there might a network issue when calling from your # to the gizmo.", 
            function(){
                  sendTextMessage(senderID, "You can call from your Verizon cell by dialing #611 or calling 1 (800) 922-0204.");
            });

     }else if(false) {
         
         
     }else if(false) {
         
         
     }else if(false) {
         
         
     } else if(checkRegex(/\bqr_no_Unable_to_Call_Gizmo\b/im, quickReplyPayload)) {
          sendQuickReply(senderID, 
              [{
              "content_type":"text",
              "title":"Yes",
              "payload":"qr_yes_call_other_contacts"
            },
            {
              "content_type":"text",
              "title":"No",
              "payload":"qr_no_call_other_contacts"
            }],
            "Can the gizmo call any other contact that is registered?");
     } else if(checkRegex(/\bqr_yes_call_other_contacts\b/im, quickReplyPayload)) {
         sendTextMessage(senderID, "Please check to ensure the gizmo shows you as a contact. If you’re a secondary caregiver or contact.");
          sendTextMessage(senderID, "Please call the primary caregiver to ensure your add-ed to the gizmo.");

         
     } else if(checkRegex(/\bqr_no_call_other_contacts\b/im, quickReplyPayload)) {
          sendTextMessage(senderID, "Ok. Next step here is to reset the gizmo. This will allow the gizmo to re-activate on network.", 
              function(){sendGenericMessage(senderID, 
                         {
                          attachment: {
                            type: "template",
                            payload: {
                              template_type: "generic",
                              elements: [{
                                title: "Gizmo Gadget",
                                image_url: SERVER_URL + "/assets/GizmoGadget.png",
                                buttons: [{
                                  type: "postback",
                                  title: "Select",
                                  payload: "pb_gizmo_gadget"
                                }],
                              }, {
                                title: "Gizmo Pal 2",
                                image_url: SERVER_URL + "/assets/GizmoPal_2-2.png",
                                buttons: [{
                                  type: "postback",
                                  title: "Select",
                                  payload: "my payload"
                                }],
                              }, {
                                title: "Gizmo Pal 1",
                                image_url: SERVER_URL + "/assets/LG-Gizmopal1-2.jpg",
                                buttons: [{
                                  type: "postback",
                                  title: "Select",
                                  payload: "my payload"
                                }],
                              }]
                            }
                          }
                     });
                  
              });
          
         
     } else if(checkRegex(/\bqr_gizmo_gadget_proceed\b/im, quickReplyPayload)) {
         sendTextMessage(senderID, "Connect the Gizmo device to the charger or a com-puter via the USB cable.", 
             function(){sendTextMessage(senderID, "Ensure the device is powered on and the home screen is visible.", 
                 function(){sendTextMessage(senderID, "Quickly press the End/Back button 4 times.", 
                        function(){
                            sendGenericMessage(senderID, 
                             {
                              attachment: {
                                type: "template",
                                payload: {
                                  template_type: "generic",
                                  elements: [{
                                    image_url: SERVER_URL + "/assets/device_front_gadget_1_RESET.jpg",
                                    title: "Press End/Back 4 times."
                                  }]
                                }
                              }
                             }, 
                             function(){sendTextMessage(senderID, "From the \"Reset Gizmogadget\" screen, tap Yes to delete all saved settings and contacts.",
                                           function(){sendTextMessage(senderID, "A voice message tells the user that the GizmoPal is resetting",
                                               function(){sendAudioMessage(senderID, '/assets/resetting.mp3')});
                                               
                                           });
                                           
                                       });
                             });});
                        });
                 
     } else if(checkRegex(/\bqr_gizmo_gadget_cancel\b/im, quickReplyPayload)) {
         sendTextMessage(senderID, "Ok. If you need instructions on how to reset the gizmo in the future you can go to https://www.verizonwireless.com/support/knowledge-base-201101/")
     }

    //sendTextMessage(senderID, "Quick reply tapped");
    return;
  }

  if (messageText) {
     if(checkRegex(/\bh\w*e\w*l\w*p\b/im, messageText)) {
         sendGenericMessage(senderID, 
             {
              attachment: {
                type: "template",
                payload: {
                  template_type: "generic",
                  elements: [{
                    image_url: SERVER_URL + "/assets/Call_Icon.png",
                    title: "Phone Troubleshooting",
                    buttons: [{
                      type: "postback",
                      title: "Unable to Call Gizmo",
                      payload: "pb_unable_call_gizmo"
                    }, {
                      type: "postback",
                      title: "Gizmo Drops Out",
                      payload: "Call Droppings",
                    }, {
                      type: "postback",
                      title: "Cannot Call Out",
                      payload: "Cannot Call Out",
                    }],
                  }, 
                  {
                    title: "Unable to Link, Linking Replace-ment Gizmo, Changing Primary CareGiver, Adding Caregivers",
                    image_url: SERVER_URL + "/assets/registration_icon.png",
                    buttons: [{
                      type: "web_url",
                      url: "https://www.oculus.com/en-us/touch/",
                      title: "Open Web URL"
                    }, {
                      type: "postback",
                      title: "Call Postback",
                      payload: "Payload for second bubble",
                    }]
                  }, 
                  {
                    title: "Setting up Place Alerts, Schedule Location Checks, To-Do List",
                    image_url: SERVER_URL + "/assets/Gear.png",
                    buttons: [{
                      type: "web_url",
                      url: "https://www.oculus.com/en-us/touch/",
                      title: "Open Web URL"
                    }, {
                      type: "postback",
                      title: "Call Postback",
                      payload: "Payload for second bubble",
                    }]
                  }]
                }
              }
         });
     } else if(checkRegex(/\bh\w*i\w*\b/im, messageText)) {
        sendTextMessage(senderID, "Hi. What do you want from me??");         
     } else if(false) {
         
     } else if(false) {
         
     } else if(false) {
         
     } else if(false) {
         
     } else if(false) {
         
     } else if(false) {
         
     } else if(checkRegex(/((\br\w*e\w*j\w*e\w*c\w*t)|(\be\w*n\w*d)).*\bcall/im, messageText)) {
        sendButtonMessage(senderID, "I am sorry that you are experiencing issues with the ending  calls feature.  Is this happening  when:", [{
            type: "postback",
            title: 'Gizmo calls out?',
            payload: "pb_gizmo_calls_out"

          }, {
            type: "postback",
            title: "Gizmo receives call?",
            payload: "pb_gizmo_receives_call"
          }]);
    } else if(checkRegex(/(\bc\w*h\w*a\w*n\w*g).*(\bc\w*a\w*r\w*e*(\s)*g\w*i\w*v\w*e\w*r)/im, messageText)) {
         sendButtonMessage(senderID, "Great! I can help you with your request to change primary caregiver. To change primary caregivers the gizmo will need to be reset. Before we proceed please be aware that this will require linking to the gizmo and adding all contacts & settings as if it were a  new gizmo. ", 
		      [{
            type:"web_url",
            url: SERVER_URL + "/assets/Factory Reset Gizmo.pdf",
            title:"Yes, Please send me reset instructions?",
            webview_height_ratio: "compact"
          }, {
            type:"web_url",
            url: SERVER_URL + "/assets/Adding or Removing Caregivers.pdf",
            title:"No, I just want to change other contacts on the gizmo.",
            webview_height_ratio: "compact" 
          }]);
    } else if(checkRegex(/(\bR\w*e\w*g\w*i\w*s\w*t\w*e\w*r).*(\bG\w*i\w*z\w*m\w*o)/im, messageText) || checkRegex(/\bP\w*a\w*i\w*r/im, messageText)  || checkRegex(/\bL\w*i\w*n\w*k/im, messageText)) {

        sendButtonMessage(senderID, "Great! I can help you with your request to link with the gizmo. First to better provide instructions are you trying to pair with:", 
		      [{
            type:"web_url",
            url: SERVER_URL + "/assets/Android - Adding A Gizmo.pdf",
            title:"Android",
            webview_height_ratio: "compact"
          }, {
            type:"web_url",
            url: SERVER_URL + "/assets/Android - Adding A Gizmo.pdf",
            title:"iPhone",
            webview_height_ratio: "compact" 
          }]);
    } else {
        sendTextMessage(senderID, "I didn't get that. Please rephrase.");
    }
    
  } else if (messageAttachments) {
    sendTextMessage(senderID, "Message with attachment received");
  }
}

function log(msg, funcName) {
    if(!msg || msg.length < 1 || msg == '') {
        console.log('Could not report log');
    }
    var logText = "--------LOG-------\n";
    var funcLogText = "--------" + funcName + "-------\n";
    if(funcName && funcName.length>0 && funcName != '') {
         console.log(funcLogText + msg);
    } else {
        console.log(logText + msg);
    }
    return;
   
}

function checkRegex (regex, txt) {
    debugFunc(arguments.callee);
 
    if(regex && txt && (regex instanceof RegExp) && txt != '') {
        return regex.test(txt);
    } else {
        errorMsg(this.name, 'Could not test regex.');
        return false;
    }
}

function debugFunc(func) {
    if(!func || typeof func != 'function') {
        log(func + ' is not a function', arguments.callee.name);
    } else {
        var msg = '';
        for(var i=0; i<func.arguments.length; i++) {
            msg += 'Param: ' + i + "\nParam Type: " + typeof func.arguments[i] + "\nVal: " + func.arguments[i] + "\n";
        }
        log(msg, func.arguments.callee.name);
    } 
}
        
function errorMsg(funcName, errMsg) {
    if(funcName && typeof funcName == 'string' && errMsg && typeof errMsg == 'string') {
        console.log('ERROR [' + funcName + ']: ' + errMsg);
    } else {
        console.log('ERROR: [No message]');
    }
}


/*
 * Delivery Confirmation Event
 *
 * This event is sent to confirm the delivery of a message. Read more about 
 * these fields at https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-delivered
 *
 */
function receivedDeliveryConfirmation(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var delivery = event.delivery;
  var messageIDs = delivery.mids;
  var watermark = delivery.watermark;
  var sequenceNumber = delivery.seq;

  if (messageIDs) {
    messageIDs.forEach(function(messageID) {
      console.log("Received delivery confirmation for message ID: %s", 
        messageID);
    });
  }

  console.log("All message before %d were delivered.", watermark);
}


/*
 * Postback Event
 *
 * This event is called when a postback is tapped on a Structured Message. 
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/postback-received
 * 
 */
function receivedPostback(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfPostback = event.timestamp;

  // The 'payload' param is a developer-defined field which is set in a postback 
  // button for Structured Messages. 
  var payload = event.postback.payload;

  console.log("Received postback for user %d and page %d with payload '%s' " + 
    "at %d", senderID, recipientID, payload, timeOfPostback);
    
    
  // When a postback is called, we'll send a message back to the sender to 
  // let them know it was successful
  //sendTextMessage(senderID, (payload !== null && payload !== undefined && payload != "") ? payload : "Postback called");
  
     if(checkRegex(/\bpb_unable_call_gizmo\b/im, payload)) {
         sendTextMessage(senderID, "I’m sorry you are having difficulties calling the gizmo. In order to better assist you I do have a series of ques-tions.", 
            function(){sendQuickReply(senderID, 
                          [{
                          "content_type":"text",
                          "title":"Yes",
                          "payload":"qr_yes_Unable_to_Call_Gizmo"
                        },
                        {
                          "content_type":"text",
                          "title":"No",
                          "payload":"qr_no_Unable_to_Call_Gizmo"
                        }],
                        "Is the Gizmo able to call you?");
                        });
         
     } else if(checkRegex(/\bpb_gizmo_gadget\b/im, payload)) {
         sendTextMessage(senderID, "A factory data reset may help with a blank or frozen screen, apps crashing or freezing, keypad/touchscreen problems, can't hear, device making noises, can't make or receive calls, and device won't", 
         function(){sendQuickReply(senderID, 
                          [{
                          "content_type":"text",
                          "title":"Proceed",
                          "payload":"qr_gizmo_gadget_proceed"
                        },
                        {
                          "content_type":"text",
                          "title":"Cancel",
                          "payload":"qr_gizmo_gadget_cancel"
                        }],
                        "Keep in mind resetting the unit will clear all contacts and settings. Which will need to be added again.");});
         
     } else if(checkRegex(/\bpb_gizmo_calls_out\b/im, payload)) {
         sendButtonMessage(senderID, "As long as the gizmo initiates the call to a caregiver of contact, it can hang up on the user.", [{
                type: "postback",
                title: "I'm still having Issues",
                payload: "pb_ending_calls_still_issues"
    
              }]);
         
          
         
     } else if(checkRegex(/\bpb_gizmo_receives_call\b/im, payload)) {
         sendButtonMessage(senderID, "When a caregiver or contact Initiates call to Gizmo. Once the call is answered the Gizmo will not discon-nect call. Call on this case must be disconnected by contact to end call.", 
            [{
                type: "postback",
                title: "I'm still having Issues",
                payload: "pb_ending_calls_still_issues"
              }]);
                
     } else if(checkRegex(/\bpb_ending_calls_still_issues\b/im, payload)) {
         sendButtonMessage(senderID, "Ok, What other issues are you having with calls?", 
            [{
                type: "postback",
                title: "Unable to call gizmo",
                payload: "pb_unable_call_gizmo"
              },
              {
                type: "postback",
                title: "Calls Dropping",
                payload: "my payload"
              },
              {
                type: "postback",
                title: "I'm still having issues ending calls",
                payload: "pb_ending_calls_still_issues_2"
              }]);
     } else if(checkRegex(/\bpb_ending_calls_still_issues_2\b/im, payload)) {
         sendTextMessage(senderID, "Ok. If gizmo still not able to hang up calls when calling out. Next step here is to reset the gizmo.",
            function() {Flow_Which_Gizmo(senderID);});
     }
    
}

function Flow_Which_Gizmo(senderID) {
    sendTextMessage(senderID, "Which Gizmo do you have?", 
    function(){sendGenericMessage(senderID, 
             {
              attachment: {
                type: "template",
                payload: {
                  template_type: "generic",
                  elements: [{
                    image_url: SERVER_URL + "/assets/GizmoGadget.png",
                    title: "Gizmo Gadget",
                    buttons: [{
                      type: "postback",
                      title: "Select",
                      payload: "pb_gizmo_gadget"
                    }],
                  }, {
                    title: "Gizmo Pal 2",
                    image_url: SERVER_URL + "/assets/GizmoPal_2-2.png",
                    buttons: [{
                      type: "postback",
                      title: "Select",
                      payload:"my payload"
                    }]
                  }, {
                    title: "Gizmo Pal 1",
                    image_url: SERVER_URL + "/assets/LG-Gizmopal1.jpg",
                    buttons: [{
                      type: "postback",
                      title: "Select",
                      payload:"my payload"
                    }]
                  }]
                }
              }
         });
        
    });
    
}
    

/*
 * Message Read Event
 *
 * This event is called when a previously-sent message has been read.
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-read
 * 
 */
function receivedMessageRead(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;

  // All messages before watermark (a timestamp) or sequence have been seen.
  var watermark = event.read.watermark;
  var sequenceNumber = event.read.seq;

  console.log("Received message read event for watermark %d and sequence " +
    "number %d", watermark, sequenceNumber);
}

/*
 * Account Link Event
 *
 * This event is called when the Link Account or UnLink Account action has been
 * tapped.
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/account-linking
 * 
 */
function receivedAccountLink(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;

  var status = event.account_linking.status;
  var authCode = event.account_linking.authorization_code;

  console.log("Received account link event with for user %d with status %s " +
    "and auth code %s ", senderID, status, authCode);
}

/*
 * Send an image using the Send API.
 *
 */
function sendImageMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "image",
        payload: {
          url: SERVER_URL + "/assets/rift.png"
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a Gif using the Send API.
 *
 */
function sendGifMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "image",
        payload: {
          url: SERVER_URL + "/assets/instagram_logo.gif"
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Send audio using the Send API.
 *
 */
function sendAudioMessage(recipientId, payloadUrl) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "audio",
        payload: {
          url: SERVER_URL + payloadUrl
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a video using the Send API.
 *
 */
function sendVideoMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "video",
        payload: {
          url: SERVER_URL + "/assets/allofus480.mov"
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a file using the Send API.
 *
 */
function sendFileMessage(recipientId, messageData) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: messageData
  };

  callSendAPI(messageData);
}

/*
 * Send a text message using the Send API.
 *
 */
function sendTextMessage(recipientId, messageText, callbackFunc) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText,
      metadata: "DEVELOPER_DEFINED_METADATA"
    }
  };

  callSendAPI(messageData, callbackFunc);
}

/*
 * Send a button message using the Send API.
 *
 */
function sendButtonMessage(recipientId, messageText, buttons) {
  if(typeof buttons != "object" || buttons == null) {
    return;
  }
  
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: (messageText && messageText != "") ? messageText : "This is a test button text",
          buttons: buttons
        }
      }
    }
  };  

  callSendAPI(messageData);
}

/*
 * Send a Structured Message (Generic Message type) using the Send API.
 *
 */
function sendGenericMessage(recipientId, message, callbackFunc) {
    if(typeof message != 'object') {
        throw new Error('sendGenericMessage: argument must be an object');
    }
  var messageData = {
    recipient: {
      id: recipientId
    },
   /* message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{
            title: "rift",
            subtitle: "Next-generation virtual reality",
            item_url: "https://www.oculus.com/en-us/rift/",               
            image_url: SERVER_URL + "/assets/rift.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/rift/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for first bubble",
            }],
          }, {
            title: "touch",
            subtitle: "Your Hands, Now in VR",
            item_url: "https://www.oculus.com/en-us/touch/",               
            image_url: SERVER_URL + "/assets/touch.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/touch/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for second bubble",
            }]
          }]
        }
      }
    }*/
    message:message
  };  

  callSendAPI(messageData, callbackFunc);
}

/*
 * Send a receipt message using the Send API.
 *
 */
function sendReceiptMessage(recipientId) {
  // Generate a random receipt ID as the API requires a unique ID
  var receiptId = "order" + Math.floor(Math.random()*1000);

  var messageData = {
    recipient: {
      id: recipientId
    },
    message:{
      attachment: {
        type: "template",
        payload: {
          template_type: "receipt",
          recipient_name: "Peter Chang",
          order_number: receiptId,
          currency: "USD",
          payment_method: "Visa 1234",        
          timestamp: "1428444852", 
          elements: [{
            title: "Oculus Rift",
            subtitle: "Includes: headset, sensor, remote",
            quantity: 1,
            price: 599.00,
            currency: "USD",
            image_url: SERVER_URL + "/assets/riftsq.png"
          }, {
            title: "Samsung Gear VR",
            subtitle: "Frost White",
            quantity: 1,
            price: 99.99,
            currency: "USD",
            image_url: SERVER_URL + "/assets/gearvrsq.png"
          }],
          address: {
            street_1: "1 Hacker Way",
            street_2: "",
            city: "Menlo Park",
            postal_code: "94025",
            state: "CA",
            country: "US"
          },
          summary: {
            subtotal: 698.99,
            shipping_cost: 20.00,
            total_tax: 57.67,
            total_cost: 626.66
          },
          adjustments: [{
            name: "New Customer Discount",
            amount: -50
          }, {
            name: "$100 Off Coupon",
            amount: -100
          }]
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a message with Quick Reply buttons.
 *
 */
function sendQuickReply(recipientId, quick_reply_message_array, text, attachment) {
    if(typeof attachment == 'undefined' || typeof attachment == 'null') {
        attachment = {};
    }
    if(typeof text == 'undefined' || typeof text == 'null') {
        text = '';
    }
    
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: text,
      quick_replies: quick_reply_message_array
    }
  };


  callSendAPI(messageData);
}

/*
 * Send a read receipt to indicate the message has been read
 *
 */
function sendReadReceipt(recipientId) {
  console.log("Sending a read receipt to mark message as seen");

  var messageData = {
    recipient: {
      id: recipientId
    },
    sender_action: "mark_seen"
  };

  callSendAPI(messageData);
}

/*
 * Turn typing indicator on
 *
 */
function sendTypingOn(recipientId) {
  console.log("Turning typing indicator on");

  var messageData = {
    recipient: {
      id: recipientId
    },
    sender_action: "typing_on"
  };

  callSendAPI(messageData);
}

/*
 * Turn typing indicator off
 *
 */
function sendTypingOff(recipientId) {
  console.log("Turning typing indicator off");

  var messageData = {
    recipient: {
      id: recipientId
    },
    sender_action: "typing_off"
  };

  callSendAPI(messageData);
}

/*
 * Send a message with the account linking call-to-action
 *
 */
function sendAccountLinking(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: "Welcome. Link your account.",
          buttons:[{
            type: "account_link",
            url: SERVER_URL + "/authorize"
          }]
        }
      }
    }
  };  

  callSendAPI(messageData);
}

/*
 * Call the Send API. The message data goes in the body. If successful, we'll 
 * get the message id in a response 
 *
 */
function callSendAPI(messageData, callbackFunc) {
  log("Calling: " + this.name);
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      if (messageId) {
        console.log("Successfully sent message with id %s to recipient %s", 
          messageId, recipientId);
      } else {
      console.log("Successfully called Send API for recipient %s", 
        recipientId);
      }
      if(callbackFunc && typeof callbackFunc == 'function') {
          callbackFunc();
      }
    } else {
      console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
    }
  });  
}

// Start server
// Webhooks must be available via SSL with a certificate signed by a valid 
// certificate authority.
app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

module.exports = app;

