angular.module('hangoutTab').controller('thehangout_controller',
    ['$scope', 'cvn_model','user_model','page_model','session', '$stateParams', 'cvn_types','items_model',
    'hangout_state_manager','events_service','$state','hgt_events','users_status','statuses',
        function( $scope, cvn_model, user_model, page_model, session, $stateParams, cvn_types, items_model,
            hangout_state_manager, events_service, $state, hgt_events, users_status, statuses ){

            var ctrl = this;
                
            ctrl.item_id = $stateParams.item_id;
            ctrl.hangout_id = $stateParams.hangout_id;
            ctrl.loading = true;

            console.log('HERE?');
            
            if( ctrl.item_id && !ctrl.hangout_id ){
                items_model.get([ctrl.item_id]).then(function(){
                    ctrl.hangout_id = items_model.list[ctrl.item_id].datum.conversation_id;
                    ctrl.type = cvn_types.LIVECLASS;
                    ctrl.loading = false;

                    console.log('?', ctrl.item_id, ctrl.hangout_id);
                });
            }else if( ctrl.hangout_id ){
                ctrl.type = cvn_types.HANGOUT;
                ctrl.loading = false;
            }

            
        }
    ]);