
angular.module('hangoutTab')
    .directive('hgtInfo',[
        function(){
            return {
                restrict:'E',
                scope:{
                    type:'=',
                    hangout_id: '=hangoutId',
                    item_id: '=itemId'
                },
                controller: 'hangout_info_controller',
                controllerAs: 'ctrl',
                templateUrl: 'app/components/hangout/hangout-info-component/hangout-info.html'
            };
        }
    ]);