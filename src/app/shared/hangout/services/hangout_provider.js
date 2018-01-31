angular.module('HANGOUT').factory('hangout_provider',[
    'conversations', 'session', 'events_service', 'hgt_events', '$q', 'tokbox', 'hgt_stream', 'events',
    function( conversations, session, events_service, hgt_events, $q, tokbox, hgt_stream, events){

        var hangout = function(){
            // Hangout informations.
            this.type = options.type || cvn_types.HANGOUT;
            this.id = options.hangout_id;
            this.item_id = options.item_id;

            // Hangout tokbox datas... 
            this.session = undefined;
            this.user_connections = {};

            this.userOwnStreams = {};
            this.otherStreams = {};
            

        };

        hangout.isAvailable = function(){

        };

        hangout.prototype.launch = function(){};

        hangout.prototype.leave = function(){};

        hangout.prototype.pause = function(){
            // Set paused to true
            // Unsubscribe for all streams.
            // Unpublish all streams.
        };

        hangout.prototype.shareCamera = function(){};
        hangout.prototype.shareMicrophone = function(){};
        hangout.prototype.shareScreen = function(){};

        hangout.prototype.canShareCamera = function(){};
        hangout.prototype.canShareMicrophone = function(){};
        hangout.prototype.canShareScreen = function(){};

        hangout.prototype.isUserSharing = function(){};

        // No rights...
        hangout.prototype.raiseHand = function(){};

        // Admin methods...
        hangout.prototype.allowCamera = function(){};
        hangout.prototype.allowMicrophone = function(){};
        hangout.prototype.allowScreen = function(){};

        hangout.prototype._onNewStream = function(){};
        hangout.prototype._onRemovedStream = function(){};
        hangout.prototype._onNewConnection = function(){};


        var hangout = function(conversation_id){
            this.user_id = session.id;
            this.conversation_id = conversation_id;
            this.session = null;
            this.streams = {};
            this.users = [];
            this.connections = {};
            this.nbStream = 0;
            this.listeners = [];
            if(!hangout.is_available){
                events_service.process(hgt_events.hgt_not_available );
            }
        };
        
        tokbox.init().then(function(){
            hangout.is_available =  tokbox.webrtc_support;
        });
       
        hangout.prototype.bind = function(){
            this.listeners = [
                events_service.on(hgt_events.tb_stream_created, this.onStreamCreated.bind(this)),
                events_service.on(hgt_events.tb_stream_destroyed, this.onStreamDestroyed.bind(this)),
                events_service.on(hgt_events.tb_session_ended, this.leave.bind(this)),
                events_service.on(hgt_events.fb_connected_changed, this.onConnectedChanged.bind(this)),
                events_service.on(hgt_events.logout_success, this.leave.bind(this)),
                events_service.on(hgt_events.hgt_user_connected, this.onUserConnected.bind(this)),
                events_service.on(hgt_events.hgt_user_disconnected, this.onUserDisconnected.bind(this)),
            ];
        };
        
        hangout.prototype.unbind = function(){
            this.listeners.forEach(function(listener){
                events_service.off( null, listener);
            });
        };
        
        hangout.prototype.launch = function(){
            var deferred = $q.defer();
            conversations.getToken(this.conversation_id).then(function(c){
                tokbox.getSession(c.session, c.token).then(function(session){
                    this.session = session;
                    this.start_date = new Date();
                    this.bind();
                    events_service.process(hgt_events.hgt_launched, this);
                    deferred.resolve();
                }.bind(this), function(){ deferred.reject(); });
            }.bind(this), function(){ deferred.reject(); });
            
            return deferred.promise;
        };        
        
        hangout.prototype.leave = function(){
            tokbox.disconnect();
            this.session = null;
            this.streams = {};
            this.unbind();
            events_service.process(hgt_events.hgt_left, this);
        };
        
        hangout.prototype.shareMicrophone = function(){
            if( !this.streams.camera && !this.initCameraSharing ){
                this.initCameraSharing = true;

                var stream = {
                    id: 'camera',
                    audio:true,
                    video:false,
                    videoType : 'camera',
                    hasAudio : true,
                    hasVideo : false
                };
                
                var options = {
                    insertDefaultUI: false,
                    publishVideo: stream.video,
                    publishAudio: stream.audio
                };
                tokbox.publish(this.session, stream, options).then(function(){
                    this.initCameraSharing = false;
                    this.addStream(stream);
                }.bind(this), function(){ 
                    this.initCameraSharing = false;
                    
                    events_service.process(hgt_events.hgt_publishing_microphone_error);
                }.bind(this));
            }
        }; 
        
        hangout.prototype.shareCamera = function(){
            if( !this.streams.camera && !this.initCameraSharing ){
                this.initCameraSharing = true;

                var stream = {
                    id: 'camera',
                    audio:true,
                    video:true,
                    videoType : 'camera',
                    hasAudio : true,
                    hasVideo : true
                };
                
                var options = {
                    insertDefaultUI: false,
                    publishVideo: stream.video,
                    publishAudio: stream.audio
                };
                tokbox.publish(this.session, stream, options).then(function(){
                    this.initCameraSharing = false;
                    this.addStream(stream);
                }.bind(this), function(){ 
                    this.initCameraSharing = false;
                    
                    events_service.process(hgt_events.hgt_publishing_camera_error);
                }.bind(this));
            }
        };
        
        hangout.prototype.forceUnpublish = function(stream){
            tokbox.forceUnpublish(stream);
        };
        
        hangout.prototype.unpublish = function(stream){
            if(stream.data.publisher){
                tokbox.unpublish(stream.data.publisher);
            }
        };
        
        hangout.prototype.askShareCamera = function(to){
            if(!this.initCameraSharing ){
                var options = { type : hgt_events.ask_camera_auth };
                if(to !== null){
                    options.to = this.connections[to];
                }
                tokbox.current_session.signal({ type : hgt_events.ask_camera_auth });
            }
        };
        
        hangout.prototype.askShareMicrophone = function(to){
            if( !this.streams.camera && !this.initCameraSharing ){
                var options = { type : hgt_events.ask_microphone_auth };
                if(to !== null){
                    options.to = this.connections[to];
                }
                tokbox.current_session.signal({ type : hgt_events.ask_microphone_auth });
            }
        };
        
        hangout.prototype.askShareScreen = function(to){
            if( !this.streams.screen && !this.initScreenSharing ){
                var options = { type : hgt_events.ask_screen_auth };
                if(to !== null){
                    options.to = this.connections[to];
                }
                tokbox.current_session.signal(options);
            }
        };
        
        hangout.prototype.acceptCameraSharing = function(id){
            tokbox.current_session.signal({ type : hgt_events.camera_requested, to : this.connections[id] });
        };
        
        hangout.prototype.declineCameraSharing = function(id){
            var signal = { type : hgt_events.cancel_camera_auth };
            if(id){
                signal.to = this.connections[id];
            }
            tokbox.current_session.signal(signal);
        };
        
        hangout.prototype.acceptMicrophoneSharing = function(id){
            tokbox.current_session.signal({ type : hgt_events.microphone_requested, to : this.connections[id] });
        };
        
        hangout.prototype.declineMicrophoneSharing = function(id){
            var signal = { type : hgt_events.cancel_microphone_auth };
            if(id){
                signal.to = this.connections[id];
            }
            tokbox.current_session.signal(signal);
        };
        
        hangout.prototype.acceptScreenSharing = function(id){
            tokbox.current_session.signal({ type : hgt_events.screen_requested, to : this.connections[id] });
        };
        
        hangout.prototype.declineScreenSharing = function(id){
            var signal = { type : hgt_events.cancel_screen_auth };
            if(id){
                signal.to = this.connections[id];
            }
            tokbox.current_session.signal(signal);
        };
        
        hangout.prototype.shareScreen = function(){   
            if( !this.initScreenSharing && !this.streams.screen ){      
                tokbox.getExtension().then(function(){
                    var stream = {
                        id : "screen",
                        videoType : 'screen',
                        audio:true,
                        video:true,
                        hasVideo : true,
                        hasAudio : false
                    };

                    var options = {
                        videoSource: 'window',
                        insertDefaultUI: false,
                        publishVideo: stream.video,
                        publishAudio: stream.audio
                    };

                    tokbox.publish(this.session, stream, options).then(function(){
                        this.initScreenSharing = false;
                        this.addStream(stream);
                    }.bind(this), function(){ 
                        this.initScreenSharing = false;
                    }.bind(this));
                }.bind(this));
            }
        };
        
        hangout.prototype.addStream = function(stream){
            this.streams[stream.id] = new hgt_stream(stream) ;
            this.nbStream = Object.keys(this.streams).length;
            events_service.process(hgt_events.hgt_stream_added, this.streams[stream.id]);
        };
        
        hangout.prototype.onStreamCreated = function(e){  
            var stream = e.datas[0];
            stream.audio = true;
            stream.video = true;
            var options = {
                videoSource: stream.videoSource,
                insertDefaultUI: false,
                publishVideo: stream.video,
                publishAudio: stream.audio
            };
            tokbox.suscribe( stream, options).then(function(){
                this.addStream(stream)
            }.bind(this));
        };
        
        hangout.prototype.onStreamDestroyed = function(e){  
            var stream = e.datas[0];
            delete(this.streams[stream.id]);
            this.nbStream = Object.keys(this.streams).length;
            events_service.process(hgt_events.hgt_stream_removed, stream);
        };
        
        hangout.prototype.onConnectedChanged = function(e){ 
            if(e.datas[0] === this.conversation_id){
                this.users = e.datas[1];
            }
        };
        
        hangout.prototype.onUserConnected = function(e){
           this.connections[e.datas[1].id] = e.datas[0].connection ;
        };
        
        hangout.prototype.onUserDisconnected = function(e){
            delete( this.connections[e.datas[1].id] );
        };
        
        hangout.prototype.canShareScreen = function(e){
            return tokbox.screensharing_support && (tokbox.browser !== 'chrome' || tokbox.screensharing_installed) && !this.had_to_refresh;
        };
        
        hangout.prototype.canInstallExtension = function(e){
            return tokbox.browser === 'chrome' && chrome.webstore && !tokbox.screensharing_installed;
        };
        
        hangout.prototype.installExtension = function(){
            tokbox.getExtension().then(function(){
                this.had_to_refresh = true;
            }.bind(this));
        };

        hangout.prototype.isUserSharing = function( user_id, type, prop ){
            return Object.keys(this.streams).some(function(key){
                if( this.streams[key] && this.streams[key].data && parseInt(this.streams[key].user_id) === parseInt(user_id) ){
                    if( !type && !prop ){
                        return true;
                    }else if( !prop && type && this.streams[key].data.videoType === type ){
                        return true;
                    }else{
                        return type && prop && this.streams[key].data.videoType === type
                            && this.streams[key].data[prop];
                    }
                }
            });
        };

        
        return hangout;
    }
]);
