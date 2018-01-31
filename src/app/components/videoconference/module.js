angular.module('videoconference',['ui.router','API','EVENTS'])
    .config(['$stateProvider',
        function( $stateProvider ){
            $stateProvider.state('videoconference',{
                url:'/hangout/:id/:mode',
                controller:'hangout_controller as ctrl',
                templateUrl:'app/components/videoconference/tpl/main.html',
                resolve: {
                    conversation_id : ['$stateParams', '$q', function($stateParams,$q){
                        var deferred = $q.defer();
                        deferred.resolve($stateParams.id);
                        return deferred.promise;
                    }],
                    current_hangout: ['conversation_id','hangout', 'privates_hangouts',function(conversation_id, hangout, privates_hangouts){
                        privates_hangouts.init(true)
                        return privates_hangouts.observe(conversation_id).then(function(){
                            return new hangout(conversation_id);
                        });
                    }],
                    mode : ['$stateParams',function($stateParams){
                        return $stateParams.mode;
                    }],
                    conversation: ['$stateParams','cvn_model',function($stateParams, conversation_model){
                        return conversation_model.queue([$stateParams.id]).then(function(){
                            return conversation_model.list[$stateParams.id];
                        });
                    }],
                    users : ['conversation', function(conversation){
                        return conversation.datum.users;
                    }]

                }
            })
            .state('create_videoconference',{
                url:'/create_hangout/:users',
                controller:'hangout_controller as ctrl',
                templateUrl:'app/components/videoconference/tpl/main.html',
                resolve: {
                    conversation_id: ['$stateParams', 'cvn_model', function($stateParams, cvn_model ){
                        return cvn_model.getByUsers( $stateParams.users.split('_') ).then(function(cid){
                            return cid ? cid : cvn_model.create($stateParams.users.split('_'));
                        });
                    }],
                    current_hangout: ['conversation_id','hangout', 'privates_hangouts',function(conversation_id, hangout, privates_hangouts){
                        privates_hangouts.init(true)
                        return privates_hangouts.observe(conversation_id).then(function(){
                            return new hangout(conversation_id);
                        });
                    }],
                    mode : function(){
                        return 'call';
                    },
                    conversation: ['conversation_id','cvn_model',function( conversation_id, conversation_model){
                        return conversation_model.queue([conversation_id]).then(function(){
                            return conversation_model.list[conversation_id];
                        });
                    }],
                    users : ['conversation', function(conversation){
                        return conversation.datum.users;
                    }]
                }
            })
            .state('liveclass',{
                url:'/liveclass/:id',
                controller:'hangout_controller as ctrl',
                templateUrl:'app/components/videoconference/tpl/main.html',
                resolve: {
                    item :  ['items_model', '$stateParams', function(items_model, $stateParams){
                        return items_model.queue([$stateParams.id]).then(function(){
                            return items_model.list[$stateParams.id];
                        });
                    }],
                    conversation_id : ['item', '$q', function(item, $q){
                        var deferred = $q.defer();
                        if(item.datum.conversation_id){
                            deferred.resolve(item.datum.conversation_id);
                        }
                        else{
                            deferred.reject();
                        }
                        return deferred.promise;
                    }],
                    current_hangout: ['conversation_id','hangout', 'privates_hangouts',function(conversation_id, hangout, privates_hangouts){
                        privates_hangouts.init(true)
                        return privates_hangouts.observe(conversation_id).then(function(){
                            return new hangout(conversation_id);
                        });
                    }],
                    mode : ['item', 'page_users', 'session',function(item, page_users, session){
                        return page_users.load(item.datum.page_id, true).then(function(){
                            var users = page_users.pages[item.datum.page_id];
                            return users.administrators.indexOf(session.id) !== -1 ? "admin" : "user";
                        });
                    }],
                    conversation: ['conversation_id','cvn_model',function(conversation_id, conversation_model){
                        return conversation_model.queue([conversation_id]).then(function(){
                            return conversation_model.list[conversation_id];
                        });
                    }],
                    users : ['item', 'item_users_model', 'page_users', 'items', function(item, item_users_model, page_users, items){
                        var promise = page_users.load(item.datum.page_id, true);

                        if(item.datum.participants === items.participants_types.all){
                            return promise.then(function(){
                                var users = page_users.pages[item.datum.page_id];
                                return users.members.concat(users.administrators);
                            });
                        }
                        else{
                            return promise.then(function(){
                                return item_users_model.queue([item.datum.id]).then(function(){
                                    var users = page_users.pages[item.datum.page_id].administrators.concat();
                                    item_users_model.list[item.datum.id].datum.forEach(function(itu){
                                        users.push( itu.user_id );
                                    });
                                    return users;
                                });
                            });
                        }
                    }]
                }
            });
        }
    ]);

ANGULAR_MODULES.push('videoconference');
