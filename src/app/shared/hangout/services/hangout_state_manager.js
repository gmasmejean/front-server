angular.module('HANGOUT').factory('hangout_state_manager',[
    'events_service', 'hgt_events', 'FirebaseProvider','session','$q', 'conversations', 'events',
    function(  events_service, hgt_events, FirebaseProvider, session,  $q, conversations, events ){

        var manager = {
            // USER SESSION HANGOUTS STATES
            states: {},
            // REQUESTS YOU GOT
            requests: {},
            // REQUESTS YOU SENT
            demands: {},
            // OBSERVED HANGOUTS
            observeds: {},
            load: function(){
                return FirebaseProvider.get().then(function(firebase){
                    manager.firebase = firebase;
                    manager.loaded = true;
                });
            },
            is_loaded: function(){
                return manager.loaded;
            },
            acceptRequest: function( request ){
                if( manager.requests[request.id] ){
                    // Accept all requests for this hangout id.
                    Object.keys(manager.requests[request.id]).forEach(function( key ){
                        manager.firebase.child('hangout_demands/'+manager.requests[request.id][key].user+'/'+request.id+'/accepted').push( session.id );
                        manager.firebase.child('hangout_requests/'+session.id+'/'+key ).set( null );
                    });
                }
            },
            declineRequest: function( request ){
                // Firebase: Add user_id in demand declined users & remove user_id request.
                manager.firebase.child('hangout_demands/'+request.user+'/'+request.id+'/declined').push( session.id );
                manager.firebase.child('hangout_requests/'+session.id+'/'+request.key ).set( null );
            },
            requestReceived: function( request ){
                if(!manager.requests[request.id]){
                    manager.requests[request.id] = {};
                }
                manager.requests[request.id][request.key] = request;
                events_service.process( hgt_events.fb_request_received, request );
            },
            requestRemoved: function( request ){
                if( manager.requests[request.id] && manager.requests[request.id][request.key] ){
                    delete(manager.requests[request.id][request.key]);
                    // PROCESS EVENT.
                    events_service.process( hgt_events.fb_request_removed, request );
                }
            },
            sendRequest: function( hangout_id, users_ids, timeout ){
                var deferred = $q.defer(),
                    users = removeUserFromIds( users_ids );

                if( !manager.is_loaded() ){
                    deferred.reject( new Error('Hangout state manager not loaded') );
                }
                // Cancel older demands when sending a new one. /!\ TODO: maybe remove this later...
                Object.keys( manager.demands ).forEach(function( hangout_id ){
                    manager.cancelRequest( manager.demands[hangout_id] );
                });
                // Initialize demand firebase ref + demand (user request).
                var demandRef = manager.firebase.child('hangout_demands/'+session.id+'/'+hangout_id );

                demandRef.once('value', function(ds){
                    var key = session.id+'_'+hangout_id,
                        existingFbDemand = ds.exists(),
                        existingMgrDemand = !!manager.demands[hangout_id];
                    // Init demand if not exist.
                    if( !existingMgrDemand ){
                        manager.demands[hangout_id] = {id:hangout_id,users:[],accepted:[],declined:[],key:key};
                        // If existing demand made by an other tab / devices... update the demand!
                        if( existingFbDemand ){
                            var existing = ds.val();
                            // Complete demand.
                            Array.prototype.push.apply(manager.demands[hangout_id].users, existing.users);
                            Array.prototype.push.apply(manager.demands[hangout_id].accepted, existing.accepted);
                            Array.prototype.push.apply(manager.demands[hangout_id].declined, existing.declined);
                        }
                        // Listen to user disconnection from firebase...
                        demandRef.onDisconnect().set(null);
                        // Listen to new users in demand...
                        demandRef.child('users').on('child_added', function( ds ){
                            manager.onEnhancedDemand( hangout_id, ds.val() );
                        });
                        // Listen to removed users in demand...
                        demandRef.child('users').on('child_removed', function( ds ){
                            manager.onReducedDemand( hangout_id, ds.val() );
                        });
                        // Listen to users declining the demand.
                        demandRef.child('declined').on('child_added', function( ds ){
                            manager.onDeclinedDemand( hangout_id, ds.val() );
                        });
                        // Listen to users accepting the demand.
                        demandRef.child('accepted').on('child_added', function( ds ){
                            manager.onAcceptedDemand( hangout_id, ds.val() );
                        });
                    }
                    // For each users add requests & set firebase disconnection handler.
                    var dmd_users = [],
                        request = {key: key, id: hangout_id, user: session.id };

                    users.forEach(function(user_id){
                        if( manager.demands[hangout_id].users.indexOf( user_id ) === -1 ){
                            dmd_users.push(user_id);
                            // Add user to demand if not already in.
                            manager.demands[hangout_id].users.push( user_id );
                            // Get user request reference.
                            var ref = manager.firebase.child('hangout_requests/'+user_id+'/'+key);
                            // Add request
                            ref.set(request);
                            // If user disconnected, cancel request.
                            ref.onDisconnect().set(null);
                            // Update firebase demand.
                            demandRef.child('users').push( user_id );
                        }
                    });
                    // Process sendRequest Event !
                    if( dmd_users.length ){
                        events_service.process( hgt_events.request_sent,{id:hangout_id,users:dmd_users});
                    }
                    // If timeout set => Define timeout before canceling demand.
                    if( timeout ){
                        manager.demands[hangout_id].timeout = setTimeout(function(){
                            manager.cancelRequest( manager.demands[hangout_id], true );
                        },timeout);
                    }                    
                    // Resolve promise.
                    deferred.resolve( manager.demands[hangout_id] );
                });
                return deferred.promise;
            },
            cancelRequest: function( demand, timedOut ){
                manager._removeDemand( demand.id );
                events_service.process( timedOut? hgt_events.fb_demand_timedout:hgt_events.fb_demand_canceled, demand );
            },
            _removeDemand: function( hangout_id ){
                if( manager.demands[hangout_id] ){
                    var demandRef = manager.firebase.child('hangout_demands/'+session.id+'/'+hangout_id);                    
                    // Stop listening events.
                    demandRef.child('accepted').off();
                    demandRef.child('declined').off();
                    demandRef.child('users').off();
                    demandRef.onDisconnect().cancel();
                    // Cancel timeout callback if defined...
                    if( manager.demands[hangout_id].timeout ){
                        clearTimeout( manager.demands[hangout_id].timeout );
                    }
                    manager.demands[hangout_id].users.forEach(function(user_id){
                        manager.firebase.child('hangout_requests/'+user_id+'/'+manager.demands[hangout_id].key).onDisconnect().cancel();
                        manager.firebase.child('hangout_requests/'+user_id+'/'+manager.demands[hangout_id].key).set(null);
                    });
                    // Remove demand from manager.
                    delete( manager.demands[hangout_id] );
                    // Remove demand from firebase.
                    demandRef.set(null);
                }
            },
            onEnhancedDemand: function( hangout_id, user_id ){
                if( manager.demands[hangout_id] && manager.demands[hangout_id].users.indexOf(user_id) === -1 ){
                    manager.demands[hangout_id].users.push( user_id );
                    // TO DO: Create event & process it!
                }
            },
            onReducedDemand: function( hangout_id, user_id ){
                if( manager.demands[hangout_id] ){
                    var idx = manager.demands[hangout_id].users.indexOf(user_id);
                    if( idx !== -1 ){
                        manager.demands[hangout_id].users.splice(idx,1);
                        // TO DO: Create event & process it!
                    }
                }
            },
            onAcceptedDemand: function( hangout_id, user_id ){
                if( manager.demands[hangout_id] && manager.demands[hangout_id].accepted.indexOf(user_id) === -1 ){
                    // Update accepted users list
                    manager.demands[hangout_id].accepted.push( user_id );
                    // Remove listeners on user request reference.
                    manager.firebase.child('hangout_requests/'+user_id+'/'+manager.demands[hangout_id].key).onDisconnect().cancel();
                    // Update demand users list
                    manager.demands[hangout_id].users.splice( manager.demands[hangout_id].users.indexOf(user_id) );
                    // Remove user from demand reference.
                    manager.firebase.child('hangout_demands/'+session.id+'/'+hangout_id+'/users' ).once('value',function(ds){
                        // Iterate on snapshot to find user id & delete it
                        ds.forEach(function(dds){
                            if( dds.val() === user_id ){
                                dds.ref.set(null);
                                return true;
                            }
                        });
                        // Check if users list is empty ( so we can remove demand ).
                        if( !manager.demands[hangout_id].users.length ){
                            manager._removeDemand( hangout_id );
                        }
                        // Process request accepted event !
                        events_service.process( hgt_events.fb_request_accepted, manager.demands[hangout_id] );
                    });                    
                }
            },
            onDeclinedDemand: function( hangout_id, user_id ){
                if( manager.demands[hangout_id] ){
                    var demand = manager.demands[hangout_id];
                    // Update declined users list
                    demand.declined.push( user_id );
                    // Remove listeners on user request reference.
                    manager.firebase.child('hangout_requests/'+user_id+'/'+demand.key).onDisconnect().cancel();
                    // Update demand users list ( remove user )
                    var idx = demand.users.indexOf(user_id);
                    if( idx !== -1 ){
                        demand.users.splice( idx, 1 );
                    }                    
                    // Remove user from demand reference.
                    manager.firebase.child('hangout_demands/'+session.id+'/'+hangout_id+'/users' ).once('value',function(ds){
                        // Iterate on snapshot to find user id & delete it
                        ds.forEach(function(dds){
                            if( dds.val() === user_id ){
                                dds.ref.set(null);
                                return true;
                            }
                        });
                        // Check if users list is empty ( so we can remove demand ).
                        if( !demand.users.length ){
                            manager._removeDemand( hangout_id );
                        }
                        // Process request declined event !
                        events_service.process( hgt_events.fb_request_declined, demand );
                    });
                }
            },
            listenRequests: function( ){
                if( !manager.is_loaded() ){
                    throw new Error('Hangout state manager not loaded');
                }
                if( !manager.listeningRequests ){
                    manager.listeningRequests = true;
                    // Get requests firebase reference.
                    var ref = firebase.child('hangout_requests/'+session.id );
                    // Get current requests & listen to new requests. 
                    ref.on('child_added', function(ds){
                        manager.requestReceived( ds.val() );
                    });
                    // Listen to deleted requests ( accepted / canceled )
                    ref.on('child_removed', function(ds){
                        manager.requestRemoved( ds.val() );
                    });
                }
                return manager;
            },
            stopListeningRequests: function(){
                if( !manager.is_loaded() ){
                    throw new Error('Hangout state manager not loaded');
                }
                if( manager.listeningRequests ){
                    firebase.child('hangout_requests/'+session.id ).off();
                }
                return manager;
            },
            hasRequest: function( hangout_id ){
                return manager.requests[hangout_id] && Object.keys(manager.requests[hangout_id]).length;
            },
            hasDemand: function( hangout_id ){
                return !!manager.demands[hangout_id];
            },
            joinOrResume: function( hangout_id ){
                // Observe user session hangouts states
                manager.observeSession();
                // If not connected to this hangout ... Set disconnect listeners!
                if( !manager.states[hangout_id] ){
                    manager.firebase.child('user_hangouts/'+session.id+'/'+session.uid+'/'+hangout_id).onDisconnect().set(null);
                    manager.firebase.child('hangouts/'+hangout_id+'/connecteds/'+session.id+'/'+session.uid).onDisconnect().set(null);
                }
                if( !manager.states[hangout_id] || manager.states[hangout_id] !== 'ongoing' ){
                    // Update user hangout state.
                    manager.states[hangout_id] = 'ongoing';
                    // Update firebase user session hangout state.
                    manager.firebase.child('user_hangouts/'+session.id+'/'+session.uid+'/'+hangout_id).set('ongoing');
                    // Update firebase hangout users
                    manager.firebase.child('hangouts/'+hangout_id+'/connecteds/'+session.id+'/'+session.uid).set('ongoing');
                    // Process hangout join event
                    //events_service.process( hgt_events.fb_connected_changed, hangout_id, manager.observeds[hangout_id], added, removed, changed );
                }
            },
            putOnHold: function( hangout_id ){
                if( !manager.states[hangout_id] ){
                    throw new Error('You must join hangout before trying to put it in hold.');
                }
                if( manager.states[hangout_id] !== 'onhold' ){
                    // Update user hangout state.
                    manager.states[hangout_id] = 'onhold';
                    // Update firebase user session hangout state.
                    manager.firebase.child('user_hangouts/'+session.id+'/'+session.uid+'/'+hangout_id).set('onhold');
                    // Update firebase hangout users
                    manager.firebase.child('hangouts/'+hangout_id+'/connecteds/'+session.id+'/'+session.uid).set('onhold');
                }
            },
            observeSession: function(){
                if( !manager.observingSession ){
                    manager.observingSession = 1;
                    // Listen to user session hangouts states... 
                    manager.firebase.child('user_hangouts/'+session.id+'/'+session.uid).on('value',function( ds ){
                        manager.onSessionStateChanged( ds.val() );
                    });                    
                }else{
                    manager.observingSession++;
                }
            },
            unobserveSession: function(){
                if( manager.observingSession ){
                    manager.observingSession--;
                    if( !manager.observingSession ){
                        manager.firebase.child('user_hangouts/'+session.id+'/'+session.uid).off();
                    }
                }
            },
            observeHangout: function( hangout_id, users ){
                if( !manager.is_loaded() ){
                    throw new Error('Hangout state manager not loaded');
                }
                if( !manager.observeds[hangout_id] ){
                    // Init observeds object => { user_id: user_hangout_state, ... }
                    manager.observeds[hangout_id] = { listeners:1 };
                    // Listen to firebase user's hangout states ...
                    manager.firebase.child('hangouts/'+hangout_id+'/connecteds').on('value', function(ds){
                        var added=[],
                            changed=[],
                            removed = Object.keys(manager.observeds[hangout_id]);
                        // Build updates arrays & update observeds object.
                        ds.forEach(function(dss){
                            var user_id = dss.key,
                                state = getUserState( dss.val() );

                            if( !manager.observeds[hangout_id][user_id] ){
                                manager.observeds[hangout_id][user_id] = state;
                                added.push( parseInt(user_id) );
                            }else{
                                removed.splice( removed.indexOf(user_id), 1 );
                                if( manager.observeds[hangout_id][user_id] !== state ){
                                    manager.observeds[hangout_id][user_id] = state;
                                }
                            }
                        });
                        // Process hangout users states changed
                        events_service.process( hgt_events.fb_connected_changed, hangout_id, manager.observeds[hangout_id], added, removed, changed );
                    });
                }else{
                    manager.observeds[hangout_id].listeners = manager.observeds[hangout_id].listeners+1;
                }
            },
            unobserveHangout: function( hangout_id ){
                if( manager.observeds[hangout_id] ){
                    manager.observeds[hangout_id].listeners--;
                    if( !manager.observeds[hangout_id].listeners ){
                        delete( manager.observeds[hangout_id] );
                        manager.firebase.child('hangouts/'+hangout_id+'/connecteds').off();
                    }
                }
            }
        };

        function getUserState( session_states ){
            return Object.keys(session_states).some(hasOngoing)?'ongoing':'onhold';
        };

        function hasOngoing( uid, index, states ){
            return states[uid] === 'ongoing';
        }

        function removeUserFromIds( ids ){
            var u = [];
            ids.forEach(function(id){
                if( session.id != id ){
                    u.push(id);
                }
            });
            return u;
        }

        return manager;
    }
]);