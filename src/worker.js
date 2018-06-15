
var auth_token = undefined,
    messageHandlers = {
        authenticate: authenticate,
        unauthenticate: unauthenticate
    },
    notificationHandlers = {
        message: messageHandler,
        'connection.request': contactRequestHandler,
        post: postHandler      
    };

// Listening messages.
self.addEventListener('message', function( event ){
    var message;
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
}

function unauthenticate( data ){
    auth_token = undefined;
}

// Listening push notifications.
self.addEventListener('push', function(event){
    var notification;
    try{
        notification = JSON.parse(event.data);
    }catch( e ){
        console.log('PARSE ERROR - Incorrect notification', event);
    }

    if( notificationHandler[notification.type] ){
        var promiseChain = getFocusedClient()
            .then( function(client){
                if( client ){
                    return notificationHandler[notification.type]( notification.data );
                }
            });
        event.waitUntil( promiseChain );
    }else{
        console.log('NOTIFICATION TYPE ERROR', event );
    }
});

// Notification handlers
function messageHandler( data ){}

function postHandler( data ){}

function contactRequestHandler( data ){

    return self.registration.showNotification( "TEST OF NTF!", {
        "body": JSON.stringify( data )
    });

    /*
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
        "timestamp": "<Long>"*/

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






