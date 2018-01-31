angular.module('hangoutTab').controller('call_controller',
    ['$scope', 'hangout_id', 'cvn_model','user_model','page_model','session',
    'hangout_state_manager','events_service','$state','hgt_events','users_status','statuses',
        function( $scope, hangout_id, cvn_model, user_model, page_model, session, 
            hangout_state_manager, events_service, $state, hgt_events, users_status, statuses ){
            
            //!\\ TODO => Observe hangout to connect user if someone else go on hangout via direct link !

            var ctrl = this,
                hangupSound = new Audio('assets/audio/hangupone.mp3')
                hangoutRing = new Audio('assets/audio/hangouts_call.mp3'),
                callTimeoutDuration = 30*1000;

            hangupSound.onended = function(){ window.close(); };
            hangoutRing.loop = true;
            // Expose variables...
            ctrl.loaded = false;
            ctrl.users = user_model.list;
            ctrl.pages = page_model.list;
            ctrl.caller_id = session.id;
            ctrl.title = 'Calling...';

            // Expose hangUp method.
            ctrl.hangUp = function(){
                ctrl.title = 'Hanging up...';
                ctrl.hangingUp = true;
                hangoutRing.pause();
                hangupSound.play();
            };
            ctrl.getUserCallStatus = function( user_id ){
                if( users_status.getUserStatus(user_id) === statuses.disconnected ){
                    return 'Not connected';
                }else if( ctrl.request.declined.indexOf(user_id) !== -1 ){
                    return 'Has hang up';
                }else{
                    return 'Ringing...';
                }
            };
            ctrl.hasHangUp = function( user_id ){
                return ctrl.request.declined.indexOf(user_id) !== -1;
            };
            ctrl.isDisconnected = function( user_id ){
                return users_status.getUserStatus(user_id) === statuses.disconnected;
            }
            // Get conversation & users data.
            cvn_model.get([hangout_id]).then(function(){
                ctrl.conversation = cvn_model.list[hangout_id];

                if( cvn_model.list[hangout_id] && cvn_model.list[hangout_id].datum ){
                    ctrl.conversation = cvn_model.list[hangout_id];

                    user_model.get(ctrl.conversation.datum.users).then(function(){
                        var organizations = ctrl.conversation.datum.users.reduce(function(orgs,id){
                            if( user_model.list[id].datum.organization_id ){
                                orgs.push(user_model.list[id].datum.organization_id);
                            }
                            return orgs;
                        },[]);
                        page_model.queue(organizations).then(onLoadedData);
                    }, onIncorrectHangout );
                }else{
                    onIncorrectHangout();
                }
            }, onIncorrectHangout);
            // When hangout data fetched => Request users for hangout...
            function onLoadedData(){
                // Load hangout state manager.
                hangout_state_manager.load().then(function(){
                    // Set hangout request listeners ( on accept / on decline )
                    events_service.on( hgt_events.fb_request_accepted, onAcceptedRequest );
                    events_service.on( hgt_events.fb_request_declined, onDeclinedRequest );
                    events_service.on( hgt_events.fb_demand_timedout, onTimeout );
                    // Set users status changed listeners
                    events_service.on( 'usersOnline', evalScope );
                    events_service.on( 'usersOffline', onUserOffline );
                    // Launch request ! :D
                    hangout_state_manager.sendRequest( hangout_id, ctrl.conversation.datum.users, callTimeoutDuration ).then(function(demand){
                        // Watch demand users status
                        ctrl.watchStatusId = users_status.watch( demand.users );
                        // Set controller hangout request.
                        ctrl.request = demand;
                        // Loaded !
                        ctrl.loaded = true;
                        $scope.$evalAsync();
                        hangoutRing.play();
                    });                    
                });
            }
            // When call timeout expired => cancel demand & close window...
            function onTimeout( event ){
                var demand = event.datas[0];
                if( demand.id === ctrl.request.id ){
                    ctrl.title = 'No response, hanging up...';
                    ctrl.hangingUp = true;
                    $scope.$evalAsync();
                    // Update sound effects...
                    hangoutRing.pause();
                    hangupSound.play();
                }
            }
            // When a request is declined
            function onDeclinedRequest( event ){
                console.log('EVENT?!', event );
                var request = event.datas[0];
                // If it's our hangout concerned & there is no user left in demand => Close!
                if( request.id == hangout_id && !request.users.length ){
                    ctrl.hangUp();
                }
            }
            // When a request is accepted.
            function onAcceptedRequest( event ){
                var request = event.datas[0];
                // If it's our hangout concerned...
                if( request.id == hangout_id ){
                    request.accepted.some(function(user_id){
                        if( user_id != session.id ){
                            $state.go('hangout',{id:hangout_id});
                        }
                    });
                }
            }
            // Executed if error happens while fetching hangout data.
            function onIncorrectHangout(){
                window.close();
            }
            // On users offline
            function onUserOffline( event ){
                evalScope();
            }
            // Force scope eval
            function evalScope(){
                $scope.$evalAsync();
            }
            // When leaving, destroy all listeners.
            $scope.$on('$destroy', function(){
                // Unset hangout request listeners ( on accept / on decline )
                events_service.off( hgt_events.fb_request_accepted, onAcceptedRequest );
                events_service.off( hgt_events.fb_request_declined, onDeclinedRequest );
                // Unset users status changed listeners
                events_service.off( 'usersOnline', evalScope );
                events_service.off( 'usersOffline', onUserOffline );
                // Unwatch users status
                if( ctrl.watchStatusId ){
                    users_status.unwatch( ctrl.watchStatusId );
                }
            });

        }
    ]);