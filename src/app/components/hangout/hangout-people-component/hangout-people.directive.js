angular.module('hangoutTab')
.directive('hgtPeople',[
    function(){
        return {
            restrict:'E',
            scope:{
                hangout:'=',
            },
            controller: 'hangout_people_controller',
            controllerAs: 'ctrl',
            templateUrl: 'app/components/hangout/hangout-people-component/hangout-people.html'
        };
    }
]);