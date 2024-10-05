const AdvancedSocketDebug = JSON.parse( document.body.dataset.debug || false );
const AdvancedSocket = {
    debugStyle : 'color:OrangeRed; font-weight:400; ',
    clientID   : 0,
    clientInfo : { advancedsocket : true },
    debug      : AdvancedSocketDebug,
    timer      : 0,
    timerCount : 0,
    options    : {},
    ui         : {},

    init() {
        this.doLog( '%cAdvancedSocket.init', this.debugStyle );

        // set defaults
        this.options = {
            autoConnect  : true,
            channels     : '',
            doMessage    : 'doMessage',
            name         : 'ws',
            pingUrl      : '',
            statusLabel  : 'status-message',
            ipApiLookup  : false,
            ipApiService : 'ip-api.com', // allowed values are ip-api.com, ipapi.com
            ipApiKey     : '',           // api key for ip-api.com or ipapi.com
            ...document.body.dataset
        };

        this.options.autoConnect    = JSON.parse( this.options.autoConnect || true );
        this.options.ipApiLookup    = JSON.parse( this.options.ipApiLookup || false );
        this.options.offlineTimer   = ( parseFloat( this.options.offlineTimer ) || 5 ) * 1e3;
        this.options.onlineTimer    = ( parseFloat( this.options.onlineTimer ) || 30 ) * 1e3;
        this.options.reconnectTimer = ( parseFloat( this.options.reconnectTimer ) || 0.5 ) * 1e3;
        this.ui.statusLabel         = document.getElementById( this.options.statusLabel || 'status-message' );
        this.timerCount             = this.options.onlineTimer;


        this.setupListeners();
        this.checkConnection();
    },

    checkConnection() {
        clearTimeout( this.timer );
        if ( navigator.onLine && this.options.pingUrl !== '' && this.options.autoConnect ){
            this.doLog( '%cAdvancedSocket.checkConnection', this.debugStyle );
            this.timer = setTimeout( () => { this.ping(); } , this.timerCount );
        }
    },

    dispatchEvent( name, data = {} ) {
        this.doLog( '%cAdvancedSocket.dispatchEvent', this.debugStyle, { name, data } );
        const event = new CustomEvent( name, {
            detail     : data,
            bubbles    : true,
            cancelable : true
        });
        window.dispatchEvent( event );
    },

    forceReconnect() {
        this.doLog( '%cAdvancedSocket.forceReconnect', this.debugStyle );

        if( typeof window[this.options.name] !== 'object' )
            return;

        window[this.options.name].closeConnection();
        window[this.options.name].openConnection();
    },

    async getIPInfo() {
        this.doLog( '%cAdvancedSocket.getIPInfo', this.debugStyle );

        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
            // handle timeout if needed
        }, 5000);

        try {
            const serviceUrl = this.options.ipApiService === 'ip-api.com' ?
                                'http://ip-api.com/json/' :
                                `https://api.ipapi.com/api/check?access_key=${this.options.ipApiKey}`;

            const response = await fetch( serviceUrl, { signal: controller.signal } );

            clearTimeout( timeoutId );

            if ( response.ok ) {
                const data = await response.json();

                if ( data.ip || data.query ){
                    // response from ip-api.com ( set to ip instead of query )
                    if ( data.query )
                        data.ip = data.query;
                    // clean up
                    delete data.status;
                    delete data.query;
                    this.clientInfo.geo = { ...data };
                }
            }
        }
        catch (error) {
            if ( error.name === 'AbortError' ) {
                // Request was aborted
                return;
            }
            else {
                // handle other errors
                console.error('Fetch error:', error);
            }
        }
        finally {
            // connect
            if ( this.options.autoConnect )
                this.subscribe();
        }
    },

    handleConnectionError( event ) {
        this.doLog( '%cAdvancedSocket.Event', this.debugStyle, { type: 'connectionerror', event } );
        this.setTimer( false );
        this.disconnected();
    },

    handleGoodConnection( event ) {
        this.doLog( '%cAdvancedSocket.Event', this.debugStyle, { type: 'goodconnection', event } );
        this.setTimer( true );
        this.connected();
    },

    handleRequireConnection( event ) {
        this.doLog( '%cAdvancedSocket.Event', this.debugStyle, { type: 'requireconnection', event } );
        this.forceReconnect();
    },

    handleOffline( event ) {
        this.setTimer( false );
        this.disconnected();
        clearTimeout( this.timer );
        this.doLog('%cAdvancedSocket.Event', this.debugStyle, { type: 'offline', event });
    },

    handleOnline( event ) {
        this.doLog('%cAdvancedSocket.Event', this.debugStyle, { type: 'online', event });
        this.checkConnection();
    },

    async ping( url ) {
        this.doLog( '%cAdvancedSocket.ping', this.debugStyle );

        const controller = new AbortController();
        const timeoutId  = setTimeout( () => {
            controller.abort();
            // fire event
            this.dispatchEvent( 'connectiontimeout' );
        }, 5000 );

        try {
            // create form data to post
            const formData = new FormData();
            formData.append( 'clientID', this.clientID );
            formData.append( 'channels', this.options.channels );

            // send the ping
            const response = await fetch( this.options.pingUrl, {
                method : 'POST',
                body   : formData,
                signal : controller.signal
            } );

            clearTimeout( timeoutId );

            if ( response.ok ) {
                const data = await response.json();

                if ( data.success === true )
                    this.dispatchEvent( 'goodconnection' );
                else
                    this.dispatchEvent( 'requireconnection' );
            }
            else {
                this.dispatchEvent( 'connectionerror' );
            }
        }
        catch ( error ) {
            if ( error.name === 'AbortError' )
                return;
            this.dispatchEvent( 'connectionerror' );
        }
        finally {
            this.checkConnection();
        }
    },

    processAuthentication( response ) {
        this.doLog( '%cAdvancedSocket.processAuthenticationResponse', this.debugStyle, response );

        if( response.code === -1 ) {
            this.doLog( '%cAdvancedSocket -> Authentication failed', this.debugStyle );
        }
        else if( response.code === 0 ) {
            this.subscribe();
            // set our autoconnect to true after running initial connect
            this.autoConnect = true;
            this.checkConnection();
        }
        this.connected();
    },

    processMessage( message ) {
        this.doLog( '%cAdvancedSocket.processMessage', this.debugStyle, message );

        if ( message.type === 'data' ) {

            if ( this.options.doMessage && !this.doMessageFunc )
                this.doMessageFunc = window[this.options.doMessage];


            if ( message.data === 'FORCE-RECONNECT')
                setTimeout( () => this.forceReconnect(), this.options.reconnectTimer );

            if ( this.doMessageFunc && typeof this.doMessageFunc === 'function' )
                this.doMessageFunc( message );
            else
                this.doLog('%cAdvancedSocket : Create a doMessage function and pass it in the data-do-message attribute of the body', this.debugStyle );
        }
    },

    setTimer( isOnline ) {
        this.doLog( '%cAdvancedSocket.setTimer', this.debugStyle , { isOnline } );
        if ( !isOnline ) {
            // speed up timer to check
            this.timerCount = this.options.offlineTimer;
        } else if ( this.timerCount !== this.options.onlineTimer ) {
            // return back to normal
            this.timerCount = this.options.onlineTimer;
        }
    },

    setupListeners() {
        this.doLog( '%cAdvancedSocket.setupListeners', this.debugStyle );
        window.addEventListener( 'connectionerror', this.handleConnectionError.bind(this) );
        window.addEventListener( 'goodconnection', this.handleGoodConnection.bind(this) );
        window.addEventListener( 'requireconnection', this.handleRequireConnection.bind(this) );
        window.addEventListener( 'offline', this.handleOffline.bind(this), false );
        window.addEventListener( 'online', this.handleOnline.bind(this), false );
    },

    subscribe() {
        this.doLog( '%cAdvancedSocket.subscribe', this.debugStyle );

        if ( typeof this.options.channels === 'string' )
            this.options.channels = this.options.channels.split(',');

        this.options.channels.forEach( (value,index) => {
            this.doLog( `%c\tSubscribing to ${value} : ${index+1} of ${this.options.channels.length}` , this.debugStyle );
            let params = { clientinfo: this.clientInfo };
            // send username info if in clientInfo struct
            if ( this.clientInfo.username )
                params.username = this.clientInfo.username;
            window[this.options.name].subscribe(value,params);
        });
    },

    /**
     * The following functions are called by the CFWebSocketWrapper
     * therefore they need to reference the AdvancedSocket object directly
     * instead of using the 'this' keyword
     */
    onClose( data ) {
        const self = AdvancedSocket;

        self.doLog( '%cAdvancedSocket.onClose', self.debugStyle, data );
    },

    onError( error ) {
        const self = AdvancedSocket;

        self.doLog( '%AdvancedSocket.onError', self.debugStyle, error );
    },

    onMessage( message ) {
        const self = AdvancedSocket;

        self.doLog( '%cAdvancedSocket.onMessage', self.debugStyle, message );

        switch ( message.reqType ) {
            case 'welcome':
                self.clientID = message.clientid;
                self.connecting();
                break;
            case 'authenticate':
                self.processAuthentication( message );
                break;
            case 'subscribe':
                self.connected();
                break;
            default:
                self.processMessage( message );
                break;
        }
    },

    onOpen() {
        const self = AdvancedSocket;

        self.doLog( '%cAdvancedSocket.onOpen', self.debugStyle );

        // if we need to re-authenticate ( fired on a force reconnect )
        if ( self.clientInfo.username && self.clientInfo.password && self.autoConnect ){
            self.autoConnect = false;
            window[ self.options.name ].authenticate( self.clientInfo.username, self.clientInfo.password );
        }

        // go fetch the info for this client
        if ( self.options.ipApiLookup )
            self.getIPInfo();
        else if ( self.options.autoConnect )
            self.subscribe();
    },

    /**
     * The following functions should be overwritten by the user
     * to customize experience
     */
    disconnected() {
        this.doLog( '%cAdvancedSocket.disconnected', this.debugStyle );
        if ( this.ui.statusLabel )
            this.ui.statusLabel.innerHTML = 'We are disconnected!!!';
    },

    connecting() {
        this.doLog( '%cAdvancedSocket.connecting', this.debugStyle );
        if ( this.ui.statusLabel )
            this.ui.statusLabel.innerHTML = 'We are connecting ...';
    },

    connected () {
        this.doLog( '%cAdvancedSocket.connected', this.debugStyle );
        if ( this.ui.statusLabel )
            this.ui.statusLabel.innerHTML = 'We are connected!!!';
    },

    // for debugging
    doLog : (
        AdvancedSocketDebug ?
        console.log.bind( window.console ) :
        function() {}
    )
};

// initialize
AdvancedSocket.init();

