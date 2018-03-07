angular.module('page').controller('page_controller',
    ['$scope','session', 'page', 'conversation', 'pages_posts', 'users', 'library_service','$q','api_service',
        'user_model', 'page_model',  'page_modal_service',  'pages', 'page_users', '$translate',
        'user_events', 'user_groups', 'user_courses', 'user_organizations', 'pages_constants',
        'notifier_service', 'page_library',  'social_service', 'modal_service',
        '$state', 'followers', 'parents', 'children', 'events_service', 'filters_functions', 'community_service','cvn_model', 'user_profile', 'pages_config',
        'state_service', '$timeout',
        function($scope, session, page, conversation, pages_posts, users, library_service, $q, api_service,
            user_model, page_model,  page_modal_service, pages, page_users, $translate,
            user_events, user_groups, user_courses, user_organizations, pages_constants,
            notifier_service, page_library, social_service, modal_service, $state, followers,
            parents, children, events_service,  filters_functions, community, cvn_model, user_profile, pages_config,
            state_service, $timeout){

            var ctrl = this;
            ctrl.$state = $state;
            ctrl.label = pages_config[page.datum.type].label;
            document.title = 'TWIC - ' + page.datum.title;
            ctrl.page = page;
            state_service.parent_state = (pages_config[page.datum.type].parent_state || 'lms.community');
            ctrl.defaultBackgrounds = {
                event : "assets/img/defaulteventbackground.png",
                group : "assets/img/defaultgroupbackground.png"
            };
            ctrl.page_counts = {

                users : function(){
                    return ctrl.users.all.length;
                },
                membership : function(){
                    return ctrl.parents.length;
                },
                members : function(){
                    return ctrl.children.length;
                },
                community : function(){
                    return ctrl.followers_count;
                },
                resources : function(){
                    return ctrl.page_library.count || 0;
                },
                submissions : function(){
                    return ctrl.assignments.length || 0;
                },
                content: function(){
                    return ctrl.items_count;
                }
            };

            ctrl.deleteUser = function(uid){
                user_profile.delete(uid).then(function(){
                    events_service.process('pageUsers' + page.datum.id);
                });
            };
            ctrl.config = pages_config;
            ctrl.confidentiality = pages_constants.pageConfidentiality;
            ctrl.page_fields = pages_config[page.datum.type].fields;
            ctrl.page_users = page_users;
            ctrl.users = users;
            ctrl.parents = parents;
            ctrl.children = children;
            ctrl.editable = (users.administrators.indexOf(session.id) !== -1 || session.roles[1]);
            ctrl.isStudnetAdmin = session.roles[1];
            ctrl.me = session.id;
            ctrl.user_model = user_model;
            ctrl.page_model = page_model;
            ctrl.conversation = conversation;
            ctrl.isMember = (users.administrators.indexOf(session.id) !== -1
                || (users.members.indexOf(session.id) !== -1 && page.datum.type !== 'organization')
            );
            ctrl.isStudent = page.datum.type === 'course' && users.members.indexOf(session.id) !== -1;
            ctrl.isAdmin = ctrl.isStudnetAdmin || users.administrators.indexOf(session.id) !== -1;
            
            var type = ctrl.page.datum.type;
            ctrl.breadcrumb =  [
                
                ctrl.isMember &&  type !== pages_constants.pageTypes.ORGANIZATION ? 
                    { 
                        text : "My " + ctrl.label + "s", 
                        href : $state.href('lms.user_' + type + 's') 
                    } : 
                    { 
                        text : "Explore", 
                        href : $state.href('lms.community', 
                            { category : type !== pages_constants.pageTypes.ORGANIZATION ? ctrl.page.datum.type + 's' : 'institutions' }) }, 
                { text : page.datum.title }
            ] ;


            //CUSTOM
            if(ctrl.isStudnetAdmin){
                pages.getCustom(page.datum.id).then(function(custom){
                    ctrl.custom = custom;
                });
            }
            //SEND PASSWORD
            ctrl.sendPassword = function(user_id, page_id){
                page_users.sendPassword(user_id, page_id).then(function(nb){
                    if(user_id){
                        user_model.list[user_id].datum.email_sent = 1;
                    }
                    if(page_id){
                        users.members.concat(users.administrators).concat(users.pending).concat(users.invited).forEach(function(id){
                            if(user_model.list[id] && user_model.list[id].datum){
                                user_model.list[id].datum.email_sent = 1;
                            }
                        });
                    }

                    $translate('ntf.admin_pwd_emails',{number:nb}).then(function( translation ){
                        notifier_service.add({type:'message',title: translation});
                    });
                });
            };

            //POSTS
            ctrl.loadingPosts = true;
            ctrl.posts = pages_posts.getPaginator(page.datum.id);
            ctrl.posts.get().then(function(){
                ctrl.loadingPosts = false;
            });
            ctrl.nextPosts = function(){
                if(ctrl.loadingPosts){
                    return;
                }
                ctrl.loadingPosts = true;
                var posts_length = ctrl.posts.list.length;
                return ctrl.posts.next().then(function(){
                    ctrl.loadingPosts = posts_length === ctrl.posts.list.length;
                });
            };

            ctrl.onPostDeleted = function( postId ){
                ctrl.posts.unset( postId );
            };
            ctrl.onPostAdded = function( ){
                ctrl.posts.refresh();
            };
            //RESOURCES
            ctrl.loadingDocuments= true;
            ctrl.library_service = library_service;
            ctrl.page_library = page_library.get(page.datum.id);
            ctrl.page_library.get().then(function(){
               ctrl.loadingDocuments = false;
            });
            ctrl.nextDocuments = function(){
                if(ctrl.loadingDocuments){
                    return;
                }
                ctrl.loadingDocuments= true;
                var documents_length = ctrl.page_library.list.length;
                ctrl.page_library.next().then(function(){
                    ctrl.loadingDocuments = documents_length === ctrl.page_library.list.length;
                });
            };

            ctrl.addDocument = function(file){
                page_library.add(ctrl.page.datum.id, file, ctrl.onUploadError);
            };

            ctrl.deleteDocument = function(id){
                return page_library.remove(ctrl.page.datum.id, id);
            };

            ctrl.onUploadError = function(){
                $translate('ntf.err_file_upload').then(function( translation ){
                    notifier_service.add({type:'error',title: translation});
                });
            };


            //ADD MATERIAL
            ctrl.openResourceModal = function($event){
                modal_service.open({
                    reference: $event.target,
                    scope : {
                        save : ctrl.addDocument,
                        document : null,
                    },
                    template:'app/components/page/tpl/resource_modal.html'
                });
            };

           //EDITION
           ctrl.hints = pages_config[page.datum.type].hints;
           ctrl.tmp_confidentiality = null;
           ctrl.editDates = function(){
               ctrl.buildStart(page.datum.start_date);
               ctrl.buildEnd(page.datum.end_date);
               ctrl.editingDates = ctrl.editable;
           };

           ctrl.setEditableAddress = function(){
               ctrl.editMap = ctrl.editable;
               ctrl.tmp_address = angular.merge({},ctrl.page.datum.address );
           };

           ctrl.setEditableTags = function(){
               ctrl.editTags = ctrl.editable;
               ctrl.tmp_tags = ctrl.page.datum.tags.concat();
               ctrl.deletedTag = [];
               ctrl.addedTag = [];
           };

           ctrl.removeTag = function(tag){
               ctrl.tmp_tags.splice( ctrl.tmp_tags.indexOf(tag), 1);
           };

           ctrl.addTag = function( $event ){
               if( $event.keyCode === 13 ){
                   $event.stopPropagation();
                   $event.preventDefault();

                   var tags = (ctrl.input_tag||'').match(new RegExp('[A-Za-z0-9_-]+','g'));
                   ctrl.input_tag = '';
                   if( tags && tags.length ){
                       tags.forEach(function(name){
                           if( ctrl.tmp_tags.every(function(tag){ return tag.name!==name; }) ){
                               ctrl.tmp_tags.push({name:name.toLowerCase()});
                           }
                       });
                   }
               }
           };

           ctrl.updateTags = function(){
               var deferred = $q.defer(),
                   requesting = 1,
                   done = function(){
                       requesting--;
                       if( !requesting ){
                           ctrl.editTags = false;
                           deferred.resolve();
                       }
                   },
                   removed = [], added = [];
               // Build removed tags array
               ctrl.page.datum.tags.forEach(function( tag ){
                   if( ctrl.tmp_tags.every(function(t){ return t.name!==tag.name.toLowerCase(); }) ){
                       removed.push(tag);
                   }
               });
               // Build added tags array
               ctrl.tmp_tags.forEach(function(tag){
                   if( ctrl.page.datum.tags.every(function(t){ return t.name.toLowerCase()!==tag.name; }) ){
                       added.push(tag.name);
                   }
               });

               added.forEach(function(name){
                   requesting++;
                   pages.addTag(ctrl.page.datum.id, name).finally(done);
               });
               removed.forEach(function(tag){
                   requesting++;
                   pages.removeTag(ctrl.page.datum.id, tag).finally(done);
               });

               done();
               return deferred.promise;
           };

           // IF DISPLAY pinned
           if( users.pinned.length ){
               user_model.get(users.pinned).then(function(){
                   var ids = [];
                   users.pinned.forEach(function(uid){
                       ids.push( user_model.list[uid].datum.organization_id );
                   });

                   page_model.get(ids);
               });
           }

           ctrl.openEditInstructors = function(){
               ctrl.editInstructors = ctrl.editable;
               ctrl.tmp_instructors = users.pinned.concat();
               ctrl.tmp_instructors_added = [];
               ctrl.tmp_instructors_removed = [];
               ctrl.tmp_instructors_searchs = {};
           };

           ctrl.getAdministrators = function( search, pagination ){
               var deferred = $q.defer();

               if( ctrl.tmp_instructors_searchs[search] ){
                   resolve( ctrl.tmp_instructors_searchs[search].slice( (pagination.p-1)*pagination.n, pagination.p*pagination.n ) );
               }else{
                   page_users.search( ctrl.page.datum.id , search, pages_constants.pageRoles.ADMIN, pages_constants.pageStates.MEMBER )
                        .then(function( result ){
                            if( Object.keys(ctrl.tmp_instructors_searchs).length > 3 ){
                                delete( ctrl.tmp_instructors_searchs[Object.keys(ctrl.tmp_instructors_searchs)[0]] );
                            }

                            ctrl.tmp_instructors.forEach( function(id){
                                var idx = result[ctrl.page.datum.id].indexOf(id);
                                if( idx !== -1 ){
                                    result[ctrl.page.datum.id].splice( idx, 1);
                                }
                            });

                            ctrl.tmp_instructors_searchs[search] = result[ctrl.page.datum.id];

                            resolve( ctrl.tmp_instructors_searchs[search].slice( (pagination.p-1)*pagination.n,pagination.p*pagination.n ) );
                        }, function(){
                            deferred.resolve([]);
                        });
               }

               function resolve( ids ){
                   user_model.get(ids).then(function(){
                       var page_ids = [];
                       ids.forEach(function(uid){
                           page_ids.push( user_model.list[uid].datum.organization_id );
                       });

                       page_model.get(page_ids).then(function(){
                           deferred.resolve(ids);
                       });
                   });
               }

               return deferred.promise;
           };

           ctrl.removeFromInstructors = function(id){
               var adx = ctrl.tmp_instructors_added.indexOf(id);
               if( adx !== -1 ){
                   ctrl.tmp_instructors_added.splice(adx,1);
               }

               ctrl.tmp_instructors.splice( ctrl.tmp_instructors.indexOf(id),1);
               ctrl.tmp_instructors_removed.push(id);
               ctrl.tmp_instructors_searchs = {};
           };

           ctrl.addToInstructors = function(id){
               ctrl.tmp_instructors.push( id );
               ctrl.tmp_instructors_added.push( id );

               var rdx = ctrl.tmp_instructors_removed.indexOf(id);
               if( rdx !== -1 ){
                   ctrl.tmp_instructors_removed.splice(rdx,1);
               }

               Object.keys( ctrl.tmp_instructors_searchs ).forEach(function(k){
                   var idx = ctrl.tmp_instructors_searchs[k].indexOf(id);
                   if( idx !== -1 ){
                       ctrl.tmp_instructors_searchs[k].splice( idx, 1);
                   }
               });
           };

           ctrl.updateInstructors = function( instructors ){
               var step = 1,
                    deferred = $q.defer(),
                    done = function(){
                        step--;
                        if( !step ){
                            ctrl.editInstructors = false;
                            deferred.resolve();
                        }
                    };

                ctrl.tmp_instructors_added.forEach(function( id ){
                    step++;
                    page_users.updatePinned( id, ctrl.page.datum.id, true ).then(done);
                });

                ctrl.tmp_instructors_removed.forEach(function( id ){
                    step++;
                    page_users.updatePinned( id, ctrl.page.datum.id, false ).then(done);
                });

                done();
                return deferred.promise;
            };

            ctrl.updateLogo = function(blob){
                return pages.updateLogo(ctrl.page.datum.id, blob);
            };

            ctrl.updateCover = function(blob){
                return pages.updateCover(ctrl.page.datum.id, blob);
            };

            ctrl.updateAddress = function(address){
                return pages.updateAddress(ctrl.page.datum.id, address).then(function(){
                    ctrl.editMap = false;
                });
            };

            ctrl.updateWebsite = function(website){
                return pages.updateWebsite(ctrl.page.datum.id, website).then(function(){
                    ctrl.editWebsite = false;
                });
            };

            ctrl.updateDescription = function(description){
                return pages.updateDescription(ctrl.page.datum.id, description).then(function(){
                    ctrl.editDescription = false;
                    if(ctrl.onDescriptionChanged){
                        ctrl.onDescriptionChanged();
                    }
                });
            };

            ctrl.updateDates = function(start, end){
                return pages.updateDates(ctrl.page.datum.id, start, end).then(function(){
                    ctrl.editingDates = false;
                });
            };

            ctrl.updateTitle = function(title){
                return pages.updateTitle(ctrl.page.datum.id, title).then(function(){
                    ctrl.editTitle = false;
                });
            };

            ctrl.updateConfidentiality = function(confidentiality){
                var previous =  ctrl.page.datum.confidentiality;
                ctrl.page.datum.confidentiality = confidentiality;
                return pages.updateConfidentiality(ctrl.page.datum.id, confidentiality)
                    .then(function(){}, function(){ ctrl.page.datum.confidentiality = previous; });
            };

            ctrl.switchPublishState = function(){
                if( !ctrl.switchingPubState ){
                    ctrl.switchingPubState = true;

                    pages.updatePublish(ctrl.page.datum.id, !ctrl.page.datum.is_published).then(function(){
                        ctrl.switchingPubState = false;

                        if( ctrl.page.datum.is_published ){
                            cvn_model.get([ctrl.page.datum.conversation_id]).then(function(){
                                ctrl.conversation = cvn_model.list[ctrl.page.datum.conversation_id];
                            });
                        }
                    });
                }
            };

            ctrl.updateCustom = function(libelle, custom){
                if(ctrl.isStudnetAdmin){
                    return pages.updateCustom(ctrl.page.datum.id, libelle, custom).then(function(){
                        $translate('ntf.admin_customfield_updated').then(function( translation ){
                            notifier_service.add({type:'message',title: translation});
                        });
                    });
                }
            };

            //IMPORT
            ctrl.openImportModal = function($event){
                modal_service.open({
                    reference: $event.target,
                    scope : {
                        import : function(users){
                            this.importing  = true;
                            return page_users.import(ctrl.page.datum.id, users).then(function(errors){
                                this.importing = false;
                                this.close();

                                $translate('ntf.user_import',{number:(users.length - errors.length)}).then(function( translation ){
                                    notifier_service.add({type:'message',title: translation});
                                });

                                errors.forEach(function(error){
                                    $translate('ntf.err_user_import',{error:error.message}).then(function( translation ){
                                        notifier_service.add({type:'error',title: translation});
                                    });
                                });
                            });
                        }
                    },
                    template:'app/shared/elements/import-csv/tpl/users-import-modal.html'
                });
            };


            ctrl.openPageModal =  page_modal_service.open;

            //STATE
            var pagetype;
            if( page.datum.type === pages_constants.pageTypes.COURSE ){
                ctrl.user_page_state_service = user_courses;

                events_service.on('page.'+page.datum.id+'.item.updated', getItemsCount );
                getItemsCount();

                pagetype = 'course';
            }else if( page.datum.type === pages_constants.pageTypes.EVENT ){
                ctrl.user_page_state_service = user_events;
                pagetype = 'event';
            }else if( page.datum.type === pages_constants.pageTypes.GROUP ){
                ctrl.user_page_state_service = user_groups;
                pagetype = 'group';
            }else if( page.datum.type === pages_constants.pageTypes.ORGANIZATION ){
                ctrl.user_page_state_service = user_organizations;
                pagetype = 'organization';
            }
            if(ctrl.user_page_state_service){
                ctrl.user_page_state_service.load(true).then(function(){
                    ctrl.state = ctrl.user_page_state_service.getUserState(page.datum.id);
                });
            }
            else{
                ctrl.state = pages_constants.pageStates.NONE;
            }

            ctrl.leave = function(){
                if( !ctrl.requesting ){
                    ctrl.requesting = true;
                    ctrl.user_page_state_service.remove( page.datum.id ).then(function(){
                        ctrl.state = ctrl.user_page_state_service.getUserState(page.datum.id);
                        ctrl.requesting = false;
                        page_users.load(page.datum.id, true);

                        $translate('ntf.page_cancel_apply',{pagetype:pagetype}).then(function( translation ){
                            notifier_service.add({type:'message',title: translation});
                        });
                    });
                }
            };

            ctrl.join = function(){
                if( !ctrl.requesting ){
                    ctrl.user_page_state_service.join( page.datum.id ).then(function(){
                        ctrl.state = ctrl.user_page_state_service.getUserState(page.datum.id);
                        ctrl.requesting = false;
                        page_users.load(page.datum.id, true);

                        $translate('ntf.page_join',{pagetype:pagetype}).then(function( translation ){
                            notifier_service.add({type:'message',title: translation});
                        });
                    });
                }
            };

            ctrl.apply = function(){
                if( !ctrl.requesting ){
                    ctrl.requesting = true;
                    ctrl.user_page_state_service.apply( page.datum.id ).then(function(){
                        ctrl.state = ctrl.user_page_state_service.getUserState(page.datum.id);
                        ctrl.requesting = false;
                        page_users.load(page.datum.id, true);

                        $translate('ntf.page_apply',{pagetype:pagetype}).then(function( translation ){
                            notifier_service.add({type:'message',title: translation});
                        });
                    });
                }
            };

            ctrl.accept = function(){
                if( !ctrl.requesting ){
                    ctrl.requesting = true;
                    ctrl.user_page_state_service.accept( page.datum.id ).then(function(){
                        ctrl.state = ctrl.user_page_state_service.getUserState(page.datum.id);
                        ctrl.requesting = false;
                        page_users.load(page.datum.id, true);
                        if(page.datum.type === pages_constants.pageTypes.EVENT){
                            user_events.load([session.id], true);
                        }
                        else if(page.datum.type === pages_constants.pageTypes.GROUP){
                            user_groups.load([session.id], true);
                        }
                        else if(page.datum.type === pages_constants.pageTypes.COURSE){
                            user_courses.load([session.id], true);
                        }
                        else if(page.datum.type === pages_constants.pageTypes.ORGANIZATION){
                            user_organizations.load([session.id], true);
                        }

                        $translate('ntf.page_join',{pagetype:pagetype}).then(function( translation ){
                            notifier_service.add({type:'message',title: translation});
                        });
                    });
                }
            };

            ctrl.edit = page_modal_service.open;

            //CONVERSATION
            ctrl.openConversation= function(user, conversation){
                social_service.openConversation(null, user ? [user] : null, conversation);
            };

            ctrl.viewConnections = function( $event, id ){
                 if( user_model.list[id].datum.contacts_count ){
                     modal_service.open( {
                         template: 'app/shared/custom_elements/user/user_connections/connections_modal.html',
                         reference: $event.target,
                         scope: {
                             user_id: id
                         },
                         label: filters_functions.username(user_model.list[id].datum) + "'s connection" + (user_model.list[id].datum.contacts_count > 1 ? "s" : "")
                     });
                 }
             };

             //COMMUNITY
            ctrl.followers_count = followers.count;
            ctrl.followers_page = 1;
            ctrl.followers = followers.list;
            ctrl.nextFollowers = function(){
                if(ctrl.loadingFollowers){
                    return;
                }
                ctrl.followers_page++;
                ctrl.loadingFollowers= true;
                community.subscriptions(ctrl.page.datum.id,  ctrl.followers_page, 24).then(function(r){
                    ctrl.followers = ctrl.followers.concat(r.list);
                    ctrl.loadingFollowers = ctrl.followers_count <= followers.length;
                });
            };

            events_service.on('pageUsers' + page.datum.id, function(){
                ctrl.clearSearch();
                page_users.load(page.datum.id, true).then(function(){
                    ctrl.isMember = (users.administrators.indexOf(session.id) !== -1
                        || (users.members.indexOf(session.id) !== -1 && page.datum.type !== 'organization')
                    );
                });
            });

            $scope.$on('$destroy',function(){
                events_service.off('page.'+page.datum.id+'.item.updated');
                events_service.off('pageUsers' + page.datum.id);
                events_service.off('page.'+page.datum.id+'.item.updated', getItemsCount );
            });

            // GETTING ITEMS COUNT ( COURSE ONLY )
            function getItemsCount(){
                api_service.send('item.getCountByPage',{page_id:page.datum.id}).then(function( count ){
                    ctrl.items_count = count;
                });
            }
            
            ctrl.search = "";
            ctrl.order = { 'type' : 'name' };
            var timeout = null;
            ctrl.searchUsers = function(){
                if(timeout !== null){
                    clearTimeout(timeout);
                    timeout = null;
                }
                timeout = setTimeout(function(){
                    timeout = null;
                    var search = ctrl.search;
                    if(!ctrl.search.length && ctrl.order.type === 'name'){
                        ctrl.clearSearch();
                    }
                    else{
                        var deferred = $q.defer();
                        var step = ctrl.editable ? 5 : 3;
                        var onload = function(){
                            step--;
                            if( !step ){
                                this.loadPromise = undefined;
                                deferred.resolve();
                            }
                        }
                        page_users.search(page.datum.id, ctrl.search, null, null, null, null, ctrl.order).then(function(users){
                            if(ctrl.search === search){
                                ctrl.searched_all = users[page.datum.id];
                                ctrl.all_loaded = 36;
                            }
                            onload();
                        });
                        page_users.search(page.datum.id, ctrl.search, pages_constants.pageRoles.USER, pages_constants.pageStates.MEMBER, null, null, ctrl.order).then(function(users){
                            if(ctrl.search === search){
                                ctrl.searched_members = users[page.datum.id];
                                ctrl.members_loaded = 36;
                            }
                            onload();
                        });
                        page_users.search(page.datum.id, ctrl.search, pages_constants.pageRoles.ADMIN, pages_constants.pageStates.MEMBER, null, null, ctrl.order).then(function(users){
                            if(ctrl.search === search){
                                ctrl.searched_administrators = users[page.datum.id];
                                ctrl.administrators_loaded = 36;
                            }
                            onload();
                        });
                        if(ctrl.editable){
                            page_users.search(page.datum.id, ctrl.search, pages_constants.pageRoles.USER, pages_constants.pageStates.PENDING, null, null, ctrl.order).then(function(users){
                                if(ctrl.search === search){
                                    ctrl.searched_pending = users[page.datum.id];
                                    ctrl.pending_loaded = 36;
                                }
                                    onload();
                            });
                            page_users.search(page.datum.id, ctrl.search, pages_constants.pageRoles.USER, pages_constants.pageStates.INVITED, null, null, ctrl.order).then(function(users){
                                if(ctrl.search === search){
                                    ctrl.searched_invited = users[page.datum.id];
                                    ctrl.invited_loaded = 36;
                                }
                                onload();
                            });
                        }
                    }
                }, 250);
              
            };
            
            ctrl.clearSearch = function(){
                $timeout(function(){
                    ctrl.search = "";
                    ctrl.searched_all = null;
                    ctrl.searched_members = null;
                    ctrl.searched_administrators = null;
                    ctrl.searched_pending = null;
                    ctrl.searched_invited = null;
                    ctrl.all_loaded = 36;
                    ctrl.members_loaded = 36;
                    ctrl.invited_loaded = 36;
                    ctrl.pending_loaded = 36;
                    ctrl.administrators_loaded = 36;
                });
            };
        }
    ]);
