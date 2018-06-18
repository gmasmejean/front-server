
var uid = 1,
    auth_token = undefined,
    user_id = undefined,
    api_url = undefined,
    dms_url = undefined,
    badge_url = "assets/img/twic.png",
    messageHandlers = {
        authenticate: authenticate,
        unauthenticate: unauthenticate
    },
    pushHandlers = {
        message: messageHandler,
        'connection.request': contactRequestHandler,
        post: postHandler      
    };

// Listening messages.
self.addEventListener('message', function( event ){
    var message;

    console.log('MSGEVENT', event);

    try{
        message = JSON.parse( event.data );
    }catch( e ){
        console.log('PARSE ERROR - Incorrect message', event );
        return;
    }
    if( message.type && messageHandlers[message.type] ){
        messageHandlers[message.type]( message.data );
    }else{
        console.log('MESSAGE TYPE ERROR', event );
    }
});

// Message Handlers
function authenticate( data ){
    auth_token = data.token;
    api_url = data.api_url;
    dms_url = data.dms_url;
    user_id = data.user_id;
}

function unauthenticate( data ){
    user_id = undefined;
    auth_token = undefined;
    api_url = undefined;
    dms_url = undefined;
}

// Listening push notifications.
self.addEventListener('push', function(event){
    var push;
    try{
      push = JSON.parse(event.data.text() );
    }catch( e ){
        console.log('PARSE ERROR - Incorrect notification', event);
    }

    if( pushHandlers[push.type] ){
        var promiseChain = getFocusedClient()
            .then( function(client){
                if( !client ){
                    return pushHandlers[push.type]( push.data );
                }
            });
        event.waitUntil( promiseChain );
    }else{
        console.log('PUSH TYPE ERROR', event );
    }
});

// Push handlers
function messageHandler( data ){
    // data exemple => { conversation_id: 73, id: 291, users: [ 5, 6 ], type: 2 }
    // GET USERS DATAS ( firstname/lastname + avatar )

    var promises = [],
        messages,
        users,
        conversation;

    promises.push( getConversation( data.conversation_id ).then(function(d){ conversation = d; }) );
    promises.push( getUsers( escapeCurrentUser(data.users) ).then(function( d ){ users = d; }) );
    promises.push( getMessagesFrom( data.conversation_id, data.id ).then(function(d){ messages = d.list; }) );

    return Promise.all( promises ).then(function(){

        var title,
            body = '',
            user,
            users_ids = Object.keys(users),
            options = {
                tag: 'message.'+data.conversation_id,
                badge: badge_url
            };

        if( data.type === 1 ){
            user = users[messages[messages.length-1].user_id];  
            title = 'You have '+messages.length+' new message'+(messages.length>1?'s':'')+' in '+conversation.title+' channel';
            body = user.firstname+' '+user.lastname+': '+messages[messages.length-1].text;
        }else if( users_ids.length > 1 ){
            var max = users_ids.length === 3 ? 2:1;

            title = 'You have '+messages.length+' new messages';
            user = users[messages[messages.length-1].user_id];
            body = 'In ';
            
            users_ids.some( function( id, index ){
                if( index === max )
                    return true;
                body += users[id].firstname+' '+users[id].lastname+', ';          
            });

            body = body.slice(0,-2);
            if( messages.length - max > 1 ){
                body += ' & '+(messages.length-2)+' other';
            }
            body += '\'s conversation';

        }else{
            user = users[users_ids[0]];
            title = user.firstname+' '+user.lastname+' sent you '+(messages.length>1? messages.length + 'messages' : 'a message');
            body = messages[messages.length-1].text;
        }

        options.body = body;
        options.icon = dms_url + user.avatar +'-192x192';
          
        return self.registration.showNotification( title, options );
    });
}

function contactRemoveHandler(){
    // { notification: { data: 6, event: 'connection.remove' },  users: [ 7 ], type: 'user' }
}

function postHandler( data ){



}

function contactRequestHandler( data ){
    /* { notification: 
          { id: '381',
          event: 'connection.request',
          source: { id: 6, name: 'user', data: [Object] },
          date: '2018-06-18T09:06:54Z',
          object: { id: 343, name: 'post', data: [Object] } },
        users: [ 7 ],
        type: 'user' } */

    // GET USER DATAS ( firstname + lastname + avatar );
    return getUsers( data.source.id ).then( function( user ){

        var title = user.firstname+' '+user.lastname+' sent you a connection request',
            options = {
                icon: dms_url + user.avatar +'-192x192',
                tag: 'contact.request.'+user.id,
                badge: badge_url              
            };
            
        return self.registration.showNotification( title, options );
    });
}

// API
function fetchAPI( body ){

    let headers = new Headers(),
        options = {
            method: 'POST',
            headers: headers,
            mode: 'cors',
            cache: 'default',
            redirect: 'follow',
            body: JSON.stringify(body)
        };

    headers.append('authorization', auth_token );

    return fetch( api_url, options )
        .then( function(response){ return response.json(); })
        .then( function(data){ 
            if( data.error ){
                throw data.error;
            }else{
                return data.result;
            }
        });
}

function getUsers( users_id ){
    return fetchAPI( jsonrpc2('user.get', {id: users_id}) );
}

function getConversation( conversation_id ){
    return fetchAPI( jsonrpc2("conversation.get", { id: conversation_id } ) );
}

function getMessagesFrom( conversation_id, fromMessageId ){
    let params = {
        conversation_id: conversation_id,
        filter:{
            c:{'message.id': ">"},
            o:{'message.id': "DESC"},
            s: fromMessageId
        }
    };
    return fetchAPI( jsonrpc2('message.getList', params ));
}

// Utilities
function getFocusedClient() {
    return clients.matchAll({
        type: 'window',
        includeUncontrolled: true
    })
    .then((windowClients) => {
        var client;
        for( var i = 0; i < windowClients.length; i++) {
            if (windowClients[i].focused) {
                client = windowClients[i];
                break;
            }
        }
        return client;
    });
}

function jsonrpc2( method, params ){
    return { jsonrpc: "2.0", method: method, params: params, id: uid++};
}

function escapeCurrentUser( users ){
    return users.reduce( function( acc, id ){
        if( user_id != id ){
            acc.push(id);
        }
        return acc;
    }, []);
}








self.addEventListener('install', function(event) {
    // Perform install steps

    console.log('INSTALL?');
});


















self.addEventListener('push', function(event) {
    if (event.data) {
      console.log('This push event has data: ', event.data.text());
    } else {
      console.log('This push event has no data.');
    }


    /*

    const analyticsPromise = pushReceivedTracking();
  const pushInfoPromise = fetch('/api/get-more-data')
    .then(function(response) {
      return response.json();
    })
    .then(function(response) {
      const title = response.data.userName + ' says...';
      const message = response.data.message;

      return self.registration.showNotification(title, {
            "//": "Visual Options",
            "body": "<String>",
            "icon": "<URL String>", // 64dp => 192px min
            "image": "<URL String>", // 4:3 ratio & 450dp => 1350px
            "badge": "<URL String>", // 24px ratio => 72px min
            "vibrate": "<Array of Integers>",
            "sound": "<URL String>",
            "dir": "<String of 'auto' | 'ltr' | 'rtl'>",

            "//": "Behavioural Options",
            "tag": "<String>",
            "data": "<Anything>",
            "requireInteraction": "<boolean>",
            "renotify": "<Boolean>",
            "silent": "<Boolean>",

            "//": "Both Visual & Behavioural Options",
            "actions": [ // Check support ( Chrome & Opera for android only ) && Notification.maxActions
            //  {
            //        action: 'atom-action',
            //        title: 'Atom',
            //        icon: '/images/demos/action-4-128x128.png'
            //  } 
            ],

            "//": "Information Option. No visual affect.",
            "timestamp": "<Long>"
      });
    });

  const promiseChain = Promise.all([
    analyticsPromise,
    pushInfoPromise
  ]);

  event.waitUntil(promiseChain);

  */
});

if ('actions' in Notification.prototype) {
    // Action buttons are supported.
  } else {
    // Action buttons are NOT supported.
  }
  

self.addEventListener('notificationclick', function(event) {
    const clickedNotification = event.notification;
    clickedNotification.close();

    switch (event.action) {
        case 'coffee-action':
          console.log('User ❤️️\'s coffee.');
          break;
        case 'doughnut-action':
          console.log('User ❤️️\'s doughnuts.');
          break;
        case 'gramophone-action':
          console.log('User ❤️️\'s music.');
          break;
        case 'atom-action':
          console.log('User ❤️️\'s science.');
          break;
        default:
          console.log(`Unknown action clicked: '${event.action}'`);
          break;
    }
  
    // Do something as the result of the notification click
    const promiseChain = doSomething();
    event.waitUntil(promiseChain);
});

/* Opening a window...
var found = false;
  clients.matchAll().then(function(clientsArr) {
    for (i = 0; i < clientsArr.length; i++) {
      if (clientsArr[i].url === event.data.url) {
        // We already have a window to use, focus it.
        found = true;
        clientsArr[i].focus();
        break;
      }
    }
    if (!found) {
      // Create a new window.
      let promise = clients.openWindow(event.data.url).then(function(windowClient) {
        // do something with the windowClient.
      });
    }
  });


    const urlToOpen = new URL(examplePage, self.location.origin).href;

    const promiseChain = clients.matchAll({
        type: 'window',
        includeUncontrolled: true
    })
    .then((windowClients) => {
        let matchingClient = null;

        for (let i = 0; i < windowClients.length; i++) {
            const windowClient = windowClients[i];
            if (windowClient.url === urlToOpen) {
                matchingClient = windowClient;
                break;
            }
        }

        if (matchingClient) {
            return matchingClient.focus();
        } else {
            return clients.openWindow(urlToOpen);
        }
    });

  event.waitUntil(promiseChain);


  */

  /*

      const promiseChain = registration.getNotifications()
    .then(notifications => {
      let currentNotification;

      for(let i = 0; i < notifications.length; i++) {
        if (notifications[i].data &&
          notifications[i].data.userName === userName) {
          currentNotification = notifications[i];
        }
      }

      return currentNotification;
    }).then((currentNotification) => {
      
      let notificationTitle;
      const options = {
        icon: userIcon,
      }

      if (currentNotification) {
        // We have an open notification, let's do something with it.
        const messageCount = currentNotification.data.newMessageCount + 1;

        options.body = `You have ${messageCount} new messages from ${userName}.`;
        options.data = {
          userName: userName,
          newMessageCount: messageCount
        };
        notificationTitle = `New Messages from ${userName}`;

        // Remember to close the old notification.
        currentNotification.close();
      } else {
        options.body = `"${userMessage}"`;
        options.data = {
          userName: userName,
          newMessageCount: 1
        };
        notificationTitle = `New Message from ${userName}`;
      }

      return registration.showNotification(
        notificationTitle,
        options
      );
    });


    function isClientFocused() {
  return clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  })
  .then((windowClients) => {
    let clientIsFocused = false;

    for (let i = 0; i < windowClients.length; i++) {
      const windowClient = windowClients[i];
      if (windowClient.focused) {
        clientIsFocused = true;
        break;
      }
    }

    return clientIsFocused;
  });
}

    */



// SENDING MESSAGE 
/*
const promiseChain = isClientFocused()
  .then((clientIsFocused) => {
    if (clientIsFocused) {
      windowClients.forEach((windowClient) => {
        windowClient.postMessage({
          message: 'Received a push message.',
          time: new Date().toString()
        });
      });
    } else {
      return self.registration.showNotification('No focused windows', {
        body: 'Had to show a notification instead of messaging each page.'
      });
    }
  });
  // LISTENING ( in client )
  navigator.serviceWorker.addEventListener('message', function(event) {
    console.log('Received a message from service worker: ', event.data);
  });*/




// LISTENING MESSAGE & ANSWER
/*
self.addEventListener('message', function(event){
    console.log("SW Received Message: " + event.data);
    event.ports[0].postMessage("SW Says 'Hello back!'");
});
*/






