angular.module('hangoutTab').controller('hangout_info_controller',
    ['$scope', 'cvn_model','user_model','page_model', 'page_users', 'session', 
        'items_model', 'item_users_model', 'items', 'cvn_types', 'filters_functions',
        function( $scope, cvn_model, user_model, page_model, page_users, session, 
            items_model, item_users_model, items, cvn_types, filters_functions ){

            var ctrl = this, step = 1;

            ctrl.type = $scope.type;
            ctrl.types = cvn_types;
            ctrl.users = user_model.list;
            ctrl.loading = true;

            ctrl.getHangoutTitle = function(){
                if( ctrl.conversation.datum.title && ctrl.conversation.datum.title !== 'Chat' ){
                    return ctrl.conversation.datum.title;
                }else{
                    var title = 'Hangout with ', 
                        max= ctrl.conversation.datum.users.length>3?1:2,
                        rest=0;

                    ctrl.conversation.datum.users.forEach(function( user_id ){
                        if( session.id !== user_id ){
                            if( max ){
                            title += filters_functions.username(user_model.list[user_id].datum)+' ';
                            max--;
                            }else{
                                rest++;
                            }
                        }
                    });

                    if( rest ){
                        title += '& '+rest+' other'+(rest>1?'s':'');
                    }else{
                        title = title.slice(0,-1);
                    }
                    return title;
                }
            };

            // Depending on hangout type, load usefull infos.
            if( $scope.type === cvn_types.LIVECLASS ){
                loadLiveClass();
            }else if( $scope.type === cvn_types.HANGOUT ){
                loadHangout();
            }

            function loadHangout(){
                cvn_model.get([$scope.hangout_id]).then(function(){
                    ctrl.conversation = cvn_model.list[$scope.hangout_id];
                    user_model.queue(ctrl.conversation.datum.users).then(loaded);
                });
            }

            function loadLiveClass(){
                step = 2;

                items_model.get([$scope.item_id]).then(function(){
                    // Expose item in controller.
                    ctrl.item = items_model.list[$scope.item_id];
                    // Load course info
                    page_model.queue([ctrl.item.datum.page_id]).then(function(){
                        ctrl.course = page_model.list[ctrl.item.datum.page_id];
                        loaded();
                    });
                    // Load liveclass instructors.
                    page_users.load( ctrl.item.datum.page_id ).then(function(){
                        ctrl.instructors = page_users.pages[ctrl.item.datum.page_id].pinned.length?
                            page_users.pages[ctrl.item.datum.page_id].pinned:page_users.pages[ctrl.item.datum.page_id].administrators;
                        user_model.queue(ctrl.instructors).then(loaded);
                    });
                });   
            }

            function loaded(){
                step--;
                if( !step ){
                    console.log('LOADED?!');
                    ctrl.loading = false;
                    $scope.$evalAsync();
                }
            }
        }
    ]);