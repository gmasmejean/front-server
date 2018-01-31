
angular.module('hangoutTab').directive('hgtAdminActions',[
    function(){
        return {
            restrict:'E',
            scope:{
                hangout:'=',
                user_id: '=userId'
            },
            templateUrl: 'app/components/hangout/hangout-admin-actions-component/admin-actions.html',
            link: function( scope, element, attrs ){
                var stopScreenLabel = 'Cut screen sharing',
                    stopSharingLabel = 'Cut stream';

                // Expose scope methods.
                scope.toggleScreen = toggleScreen;
                scope.hasCameraOff = hasCameraOff;
                // Expose scope variables.
                scope.microphone_action_label = '';
                scope.screen_action_label = '';
                scope.camera_action_label = '';

                function toggleScreen(){
                    if( scope.hangout.isUserSharing( scope.user_id, 'screen' ) ){
                        scope.hangout.stopUserScreen()
                    }else{
                        scope.hangout.allowUserScreen()
                    }
                }

                function hasCameraOff(){
                    return scope.hangout.isUserSharing( scope.user_id, 'camera', 'hasVideo' );
                }
            }
        };
    }
]);