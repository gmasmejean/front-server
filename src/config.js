var CONFIG = {};
// BUILD NUMBER /!\ DO NOT TOUCH !
CONFIG.buildVersion = BUILD_ID;
// API
CONFIG.api = {};
CONFIG.api.domain = API_DOMAIN;
CONFIG.api.authorization_header = API_AUTH_HEADER;
CONFIG.api.paths = {};
CONFIG.api.paths.jsonrpc = API_JSONRPC_PATH;
CONFIG.api.url = '//'+CONFIG.api.domain+'/'+CONFIG.api.paths.jsonrpc;
// DMS
CONFIG.dms = {};
CONFIG.dms.domain = DMS_DOMAIN;
CONFIG.dms.paths = {};
CONFIG.dms.paths.datas = DMS_DATAS_PATH;
CONFIG.dms.paths.download = DMS_DOWNLOAD_PATH;
CONFIG.dms.paths.upload = DMS_UPLOAD_PATH;
CONFIG.dms.base_url = '//'+CONFIG.dms.domain+'/';
CONFIG.dms.max_upload_size = DMS_MAX_UPLOAD;
// REAL TIME APP
CONFIG.rt = {};
CONFIG.rt.domain = RT_DOMAIN;
CONFIG.rt.port = RT_PORT;
// SOCIAL
CONFIG.social = {};
CONFIG.social.facebook = SOCIAL_FACEBOOK;
CONFIG.social.twitter = SOCIAL_TWITTER;
CONFIG.social.linkedin = SOCIAL_LINKEDIN;
// ABOUT OUR ENTERPRISE
CONFIG.enterprise = {};
CONFIG.enterprise.title = GUEST_ENTERPRISE_TITLE;
CONFIG.enterprise.link = GUEST_ENTERPRISE_LINK;
// URL WHITE LIST
CONFIG.whitelist = WHITELIST||[];
// TOKBOX
CONFIG.tokbox_api_key = TOKBOX_API_KEY;
CONFIG.tokbox_screensharing_chrome_id = TOKBOX_CHROME_SS_ID;
CONFIG.tokbox_chrome_extension_url = CHROME_WEBSTORE_URL + '/' + TOKBOX_CHROME_SS_ID;
// FIREBASE
CONFIG.firebase_config = {
    apiKey : FIREBASE_API_KEY,
    authDomain: FIREBASE_DOMAIN,
    databaseURL: FIREBASE_DATABASE,
    projectId: FIREBASE_PROJECT,
    storageBucket: FIREBASE_STORAGE,
    messagingSenderId: FIREBASE_SENDER
};
//CONSTANT
CONFIG.date_format = 'MMM d, y - h:mm a';
// MOBILE APP STORES
CONFIG.stores = {};
CONFIG.stores.googleplay = PLAY_STORE_URL;
CONFIG.stores.appstore = APP_STORE_URL;
// IMAGES PATH
CONFIG.images_path = IMAGES_PATH;
// VIDEOS PATH
CONFIG.videos_path = VIDEOS_PATH;
// DEFAULT CUSTOMIZATION
CONFIG.hostname_end = HOSTNAME_END;
//MAPBOX 
CONFIG.mapboxToken = MAPBOX_TOKEN;

// LINKEDIN SIGNIN
CONFIG.signin = {
    linkedin:{
        id: LINKEDIN_CLIENT_ID,
        url:LINKEDIN_SIGNIN_URL
    }
};

// VAPID KEY PUBLIC
CONFIG.webpush_public_key = "BORgE17sW3jYT2hADJ03KkMoEj81VfYaIxmuXr6mIfURtWzgMpiWDZKJCx364qK52zSXIzv3FZuPaJ2GHnzollA";