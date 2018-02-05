angular.module('HANGOUT').factory('hangout_provider',[
    'conversations', 'session', 'events_service', 'hgt_events', '$q', 'tokbox', 'hgt_stream', 'events',
    function( conversations, session, events_service, hgt_events, $q, tokbox, hgt_stream, events){

        var hangout = function(){
            // Hangout informations.
            this.type = options.type || cvn_types.HANGOUT;
            this.id = options.hangout_id;
            this.item_id = options.item_id;
            this.permissions = options.permissions || {};
            // Hangout tokbox datas...
            this.session = undefined;
            this.user_connections = {};
            this.ownStreams = {};
            this.userStreams = {};
            this.streams = {};
        };

        hangout.init = (function(){
            var deferred = $q.defer();
            // Detect & Set WEBRTC support variables.
            if( OT.checkSystemRequirements() ){
                var userAgent = navigator.userAgent.toLowerCase(),
                    supportedBrowsers = ['firefox','opr','chrome'],
                    deniedWords = ['edge','msie'],
                    browser;

                supportedBrowsers.some(function(name){
                    if( userAgent.indexOf(name+'/') !== -1 
                        && deniedWords.every(function(k){ return userAgent.indexOf(k) === -1; }) ){
                        browser = name;
                        return true;
                    }
                });
                // Set webrtc support level.
                if( browser ){
                    hangout.webrtc_support = 'full';
                    // Register chrome screensharing extension.
                    if( browser === 'chrome' ){
                        OT.registerScreenSharingExtension('chrome', CONFIG.tokbox_screensharing_chrome_id, 2);
                    }
                }else{
                    hangout.webrtc_support = 'partial';
                }
                // Set screensharing support.
                OT.checkScreenSharingCapability(function( capability ){
                    if( !capability.supported || capability.extensionRegistered === false ){
                        hangout.screensharing_support = false;
                    }else{
                        hangout.screensharing_support = true;
                        hangout.screensharing_installed = capability.extensionInstalled;
                    }
                    deferred.resolve();
                });
            }
            else{
                hangout.webrtc_support = false;
                hangout.screensharing_support = false;
                deferred.resolve();
            }
            return deferred.promise;
        })();

        hangout.prototype.launch = function(){
            if( this.launching ){
                return this.launching;
            }
            // Init & set launch promise
            var deferred = $q.defer(), hgt = this;
            this.launching = deferred.promise;
            hangout.init.then(function(){
                // Get tokbox user token, then try to connect to tokbox session.
                conversations.getToken(hgt.id).then(function(data){
                    // Create session.
                    var session = OT.initSession( CONFIG.tokbox_api_key, data.session );
                    // Listen to session events.
                    session.on({
                        streamCreated:          hgt._onNewStream.bind(hgt),
                        streamDestroyed:        hgt._onRemovedStream.bind(hgt),
                        sessionDisconnected :   hgt._onDisconnected.bind(hgt),
                        connectionCreated:      hgt._onNewConnection.bind(hgt),
                        connectionDestroyed:    hgt._onRemovedConnection.bind(hgt),
                        //sessionReconnected
                        //sessionReconnecting
                        //archiveStarted
                        //archiveStopped
                        signal:                 hgt._onSignal.bind(hgt)
                    });
                    // Connect to session.
                    session.connect( data.token, function( err ){
                        if( err ){
                            session.off();
                            delete( hgt.launching );
                            deferred.reject();
                        }
                        hgt.session = session;
                        deferred.resolve();
                    });
                }, function(){ 
                    delete( hgt.launching );
                    deferred.reject(); 
                });
            });
            return this.launching;
        };

        hangout.prototype.leave = function(){
            this.session.disconnect();
            this.session.off();
        };

        hangout.prototype.pause = function(){
            if( !this.paused ){
                // Set paused to true
                this.paused = {};
                // Unsubscribe/Unpublish for all streams.
                Object.keys(this.streams).forEach(function(id){
                    if( this.streams[id].publisher ){
                        // Unpublish & save if user was publishing his camera.
                        if( this.streams[id].stream.videoType === 'camera' ){
                            this.paused.hasCamera = true;
                        }
                        this.unpublish( id );
                    }else if( this.streams[id].unsubscribe ){
                        this.streams[id].unsubscribe();
                    }
                }.bind(this));
            }
        };

        hangout.prototype.resume = function(){
            if( this.paused ){
                // Subscribe again to available streams...
                Object.keys(this.streams).forEach(function(id){
                    if( this.streams[id].subscribe ){
                        this.streams[id].subscribe();
                    }
                }.bind(this));
                // If user was publishing, share his camera...
                if( this.paused.hasCamera ){
                    this.shareCamera();
                }
                this.paused = false;
            }
        };

        // --- Methods --- //
        hangout.prototype._hasRight = hasRight;
        hangout.prototype._publish = publish;
        hangout.prototype._unpublish = unpublish;
        
        // Actions methods
        hangout.prototype.shareCamera = shareCamera;
        hangout.prototype.shareMicrophone = shareMicrophone;
        hangout.prototype.shareScreen = shareScreen;

        hangout.prototype.unshareCamera = function(){};
        hangout.prototype.unshareMicrophone = function(){};
        hangout.prototype.unshareScreen = function(){};
        hangout.prototype.raiseHand = function(){};
        // Checking methods
        hangout.prototype.getSharing = function(){};
        hangout.prototype.canShareCamera = canShareCamera
        hangout.prototype.canShareMicrophone = canShareMicrophone;
        hangout.prototype.canShareScreen = canShareScreen;
        hangout.prototype.isUserSharing = function(){};
        // Admin methods...
        hangout.prototype.allowCamera = function( user_id ){};
        hangout.prototype.allowMicrophone = function( user_id ){};
        hangout.prototype.allowScreen = function( user_id ){};
        hangout.prototype.forceUnpublish = function( stream_id ){};
        hangout.prototype.kick = function( user_id ){};
        // Hangout tokbox events handlers...
        hangout.prototype._onNewStream = function(){};
        hangout.prototype._onRemovedStream = function(){};
        hangout.prototype._onNewConnection = function(){};
        hangout.prototype._onRemovedConnection = function(){};
        hangout.prototype._onConnected = function(){};
        hangout.prototype._onDisconnected = function(){};
        hangout.prototype._onSignal = function(){};

        // --- FUNCTIONS --- //
        // Check right
        function hasRight( name ){
            return this.permissions[name];
        }
        // Unpublish a stream 
        function unpublish( id ){
            if( this.streams[id] && this.streams[id].publisher ){
                this.session.unpublish(this.streams[id].publisher);
            }
        }
        // Publish a stream via tokbox...
        function publish( options, ownKey ){
            var stream = {}, 
                deferred = $q.defer(),
                hgt = this;
            // Set flag to avoid creating multiple publisher.
            this._initializingCamera = true;
            // Init tokbox publisher.
            stream.publisher = OT.initPublisher(null,Object.assign({
                insertDefaultUI: false,
                publishVideo: true,
                publishAudio: true
            },options));
            // Bind tokbox event handler on publisher.
            stream.publisher.once({
                videoElementCreated: function( event ){
                    stream.element = event.element;
                    next();                        
                },
                streamCreated: function( event ){
                    stream._tbstream = event.stream;
                    stream.id = event.stream.id;
                    next();
                },
                streamDestroyed: function( event ){
                    event.preventDefault();
                    //!\\ TODO
                },
                accessDenied: function(event){
                    console.log('accessDenied',event);
                    deferred.reject('OT_USER_MEDIA_ACCESS_DENIED');
                }
            });
            // Publish in tokbox session.
            this.session.publish(stream.publisher,function(err){
                if(err){
                    deferred.reject(err.name);
                }
            });
            // When stream is built
            function next(){
                if( stream.element && stream.id ){
                    hgt.streams[stream.id] = stream;
                    hgt.ownStreams[ownKey||stream.id] = stream;
                    hgt._initializingCamera = false;
                    deferred.resolve();
                }
            }
            return deferred.promise;
        }

        function shareCamera(){
            if( this.canShareCamera() ){
                var stream = this.getSharing('self');
                if( stream ){
                    stream.publisher.publishVideo(true);
                }else{
                    this._initializingCamera = true;
                    this._publish({},'self').finally(function(){
                        this._initializingCamera = false;
                    }.bind(this));
                }
            }
        }

        function shareMicrophone(){
            if( this.canShareMicrophone() ){
                var stream = this.getSharing('self');
                if( stream ){
                    stream.publisher.publishVideo(true);
                }else if( !this._initializingCamera ){
                    this._initializingCamera = true;
                    this._publish({publishVideo:false},'self').finally(function(){
                        this._initializingCamera = false;
                    }.bind(this));
                }
            }
        }

        function shareScreen(){
            if( this.canShareScreen() ){
                this._initializingScreen = true;
                this._publish({videoSource:'window',publishAudio:false}).finally(function(){
                    this._initializingScreen = false;
                }.bind(this));
            }
        }

        function canShareCamera(){
            return !this._initializingCamera && this._hasRight('publish') &&
                ( !this.ownStreams.self || !this.ownStreams.self._tbstream.hasVideo );
        }

        function canShareMicrophone(){
            return !this._initializingCamera && this._hasRight('publish') &&
                ( !this.ownStreams.self || !this.ownStreams.self._tbstream.hasAudio );
        }

        function canShareScreen(){
            return !this._initializingScreen && this._hasRight('publish') &&
                hangout.screensharing_support;
        }


        
        

        return hangout;
    }
]);
