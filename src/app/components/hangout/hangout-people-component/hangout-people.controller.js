angular.module('hangoutTab').controller('hangout_people_controller',
    ['$scope', 'cvn_model','user_model','page_model','session', '$stateParams', 'cvn_types','items_model',
    'hangout_state_manager','events_service','$state','hgt_events','users_status','statuses',
        function( $scope, cvn_model, user_model, page_model, session, $stateParams, cvn_types, items_model,
            hangout_state_manager, events_service, $state, hgt_events, users_status, statuses ){

            var ctrl = this,
                step = 1,
                type = $scope.hangout.type,
                item_id = $scope.hangout.item_id,
                hangout_id = $scope.hangout.conversation_id;
            
            // Expose in scope & controller variables
            $scope.users = user_model.List;
            $scope.pages = page_model.list;
            ctrl.administrators = [];
            ctrl.participants = [];
            ctrl.presents = [];
            ctrl.others = [];
            ctrl.loading = true;
            // Load users list (administrators & participants)            
            if( type = cvn_types.HANGOUT ){
                // Load HANGOUT users
                loadHangoutUsers();
            }else if( type === cvn_types.LIVECLASS ){
                // Load LIVECLASS users
                loadLiveclassUsers();
            }




            // Listen to events.
            events_service.on( hgt_events.fb_connected_changed, function( event ){
                var hgt_id = event.datas[0];
                if( hangout_id == hgt_id ){
                    var states = event.datas[1],
                        added = event.datas[2],
                        removed = event.datas[3],
                        changed = event.datas[4];

                    
                }
            });

            // Observe firebase hangout users states.
            hangout_state_manager.observe( hangout_id );

            // ON DESTROY !
            $scope.$on('$destroy', function(){
                hangout_state_manager.unobserve( hangout_id );
            });


            function updatePresents(){
                


            }

            // When users list loaded...
            function loaded(){
                step--;
                if( !step ){
                    ctrl.loading = false;
                }
            }
            // Load HANGOUT users...
            function loadHangoutUsers(){
                cvn_model.get([hangout_id]).then(function(){
                    ctrl.participants = cvn_model.list[hangout_id].datum.users.concat();
                    loaded();
                });
            }
            // Load LIVECLASS users...
            function loadLiveclassUsers(){
                items_model.get([item_id]).then(function(){
                    var page_id = items_model.list[item_id].datum.page_id;
                    // Check item participants type (if != all we have to get item users )
                    if( items_model.list[item_id].datum.participants !== items.participants_types.all ){
                        step++;
                        item_users_model.queue([item_id]).then(function(){
                            item_users_model.list[item_id].datum.forEach(function(itu){
                                ctrl.participants.push(itu.user_id);
                            });
                            loaded();
                        });
                    }
                    // Load item page users to get administrators & users (if participants==all)
                    page_users.load( page_id ).then(function(){
                        // Add in administrators 
                        Array.prototype.push.apply( ctrl.administrators, page_users.pages[page_id].administrators );
                        // Add in users ( pinneds || administrators )
                        Array.prototype.push.apply( ctrl.participants, page_users.pages[page_id].pinned.length?
                            page_users.pages[page_id].pinned:page_users.pages[page_id].administrators );
                        // Add page members if item participant type = all
                        if( items_model.list[item_id].datum.participants === items.participants_types.all ){
                            Array.prototype.push.apply( ctrl.participants, page_users.pages[page_id].members );
                        }
                        loaded();
                    });
                });
            }
        }
    ]);