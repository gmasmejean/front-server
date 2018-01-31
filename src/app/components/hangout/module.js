angular.module('hangoutTab',['ui.router','API','EVENTS'])
    .config(['$stateProvider', function( $stateProvider ){
        // State for calling.
        $stateProvider.state('request_hangout',{
            url:'/call/hangout/:id',
            controller: 'call_controller as ctrl',
            templateUrl: 'app/components/hangout/call/call.html',
            resolve: {
                hangout_id: ['$stateParams',function($stateParams){
                    return $stateParams.id;
                }]
            }
        })
        // State for calling unexisting hangout.
        .state('request_users',{
            url:'/call/users/:users',
            controller: 'call_controller as ctrl',
            templateUrl: 'app/components/hangout/call/call.html',
            resolve: {
                hangout_id: ['$stateParams','cvn_model', function($stateParams,cvn_model){
                    var users = $stateParams.users.split('_');
                    return cvn_model.getByUsers( users ).then(function(cid){
                        return cid ? cid : cvn_model.create(users);
                    });
                }]
            }
        })
        // Hangout room !
        .state('thehangout',{
            url:'/thehangout/:hangout_id',
            controller: 'thehangout_controller as ctrl',
            templateUrl: 'app/components/hangout/hangout-page/hangout.html'
        })
        // Liveclass room !
        .state('theliveclass',{
            url:'/theliveclass/:item_id',
            controller: 'thehangout_controller as ctrl',
            templateUrl: 'app/components/hangout/hangout-page/hangout.html'
        });

    }
]);

ANGULAR_MODULES.push('hangoutTab');
