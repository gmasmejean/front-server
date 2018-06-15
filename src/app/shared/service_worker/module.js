/*angular.module('service_worker',['EVENTS','STORAGE'])
    .factory('service_worker',[
        function(){
            var workerUrl = '/worker.js';

            if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                    navigator.serviceWorker.register( workerUrl ).then(function(registration) {
                        // Registration was successful
                        console.log('ServiceWorker registration successful with scope: ', registration.scope);


                        // subscribe to push.

                        const subscribeOptions = {
                            userVisibleOnly: true,
                            applicationServerKey: urlBase64ToUint8Array(
                              'BORgE17sW3jYT2hADJ03KkMoEj81VfYaIxmuXr6mIfURtWzgMpiWDZKJCx364qK52zSXIzv3FZuPaJ2GHnzollA'
                            )
                        };
                      
                        var pushSubscription = registration.pushManager.subscribe(subscribeOptions);

                        console.log( 'pushSubscription:' , JSON.stringify(pushSubscription) );



                    }, function(err) {
                        // registration failed :(
                        console.log('ServiceWorker registration failed: ', err);
                    });
                });
            }

      
              
            if (!('PushManager' in window)) {
                // Push isn't supported on this browser, disable or hide UI.
                return;
            }



            function askPermission() {
                return new Promise(function(resolve, reject) {
                  const permissionResult = Notification.requestPermission(function(result) {
                    resolve(result);
                  });
              
                  if (permissionResult) {
                    permissionResult.then(resolve, reject);
                  }
                })
                .then(function(permissionResult) {
                  if (permissionResult !== 'granted') {
                    throw new Error('We weren\'t granted permission.');
                  }
                });
              }

            
            function sendSubscriptionToBackEnd(subscription) {
                return fetch('/api/save-subscription/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(subscription)
                })
                .then(function(response) {
                    if (!response.ok) {
                        throw new Error('Bad status code from server.');
                    }
              
                    return response.json();
                })
                .then(function(responseData) {
                    if (!(responseData.data && responseData.data.success)) {
                        throw new Error('Bad response from server.');
                    }
                });
            }

        }
    ])
    .run(['events_service','events','session',
        function( events_service, events, session ){
            
        }
    ]);

ANGULAR_MODULES.push('service_worker');*/



  /*

"{"endpoint":"https://fcm.googleapis.com/fcm/send/dkpHLE4PDHg:APA91bGis4_koQ3SOe1GdC1Om4x0K39irviCfXMFH8znRB_5k-ObsfZtjlfBHbFivx6nN7Rk-HtS3ORolhlEzy-KqTfbGn4XVCxDb8MvVGLoxp0O3Dh1Ru-o5HDpOTETLpJ_dE8RhlsQ","expirationTime":null,"keys":{"p256dh":"BEdIom_7RQmg0FwQenF3h-CW_TAlEmbs0OhjhAMmYdDOuJWm3v6PAHugYlvnZSZaKfhDDw1hepZRXpieJk0TH_A=","auth":"XxsRgvFWAaTHK7Jv3s3UOQ=="}}"
"{"endpoint":"https://fcm.googleapis.com/fcm/send/dkpHLE4PDHg:APA91bGis4_koQ3SOe1GdC1Om4x0K39irviCfXMFH8znRB_5k-ObsfZtjlfBHbFivx6nN7Rk-HtS3ORolhlEzy-KqTfbGn4XVCxDb8MvVGLoxp0O3Dh1Ru-o5HDpOTETLpJ_dE8RhlsQ","expirationTime":null,"keys":{"p256dh":"BEdIom_7RQmg0FwQenF3h-CW_TAlEmbs0OhjhAMmYdDOuJWm3v6PAHugYlvnZSZaKfhDDw1hepZRXpieJk0TH_A=","auth":"XxsRgvFWAaTHK7Jv3s3UOQ=="}}"
  */

function serviceWorker(){

    service = {
        registration: undefined,

        getRegistration: function(){
            return navigator.serviceWorker.getRegistrations().then(function(registrations) {
                if( registrations.length ){
                    return registrations[0];
                }
            });
        },
        register: function(){
            if( 'serviceWorker' in navigator ) {
                return service.getRegistration().then( function(registration){ 
                    if( !registration ){
                        return navigator.serviceWorker.register( CONFIG.worker_url || '/worker.js' );
                    }
                    return registration;
                });
            }
        },
        unregister: function(){
            if( 'serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                    registrations.forEach( function( registration ){
                        registration.unregister();
                    });
                });
            }
        },
        hasWebPushPermission: function( registration ){
            return registration.pushManager.permissionState();
        },
        subscribeWebPush: function( registration ){
            var options = {
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array( CONFIG.webpush_public_key )
            };    
            return registration.pushManager.subscribe( options );
        },
        unsubscribeWebPush: function( registration ){
            registration.pushManager.getSubscription().then( function(subscription){
                if( subscription ){
                    subscription.unsubscribe();
                }
            });
        },
        getWebPushSubscription: function( registration ){
            return registration.pushManager.getSubscription();
        }
    }

}


function urlBase64ToUint8Array(base64String) {
    var padding = '='.repeat((4 - base64String.length % 4) % 4);
    var base64 = (base64String + padding)
        .replace(/\-/g, '+')
      .replace(/_/g, '/');
    
    var rawData = window.atob(base64);
    return Uint8Array.from( Array.prototype.map.call(s, function(char){ return char.charCodeAt(0); }) );
}


