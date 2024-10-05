# AdvancedSocket

AdvancedSockets aims to help handling connectivity issues from the client side 
when using ColdFusion's WebSockets.

Below is a simple example of how to implement. The data attributes defined in the 
body are the default values and do not have to be set but can be overridden. For 
more information on how and where they are set refer to the __Attributes / Properties__ 
section.

 ``` html
<body data-auto-connect    = "true"
       data-name            = "ws"
       data-channels        = "channelname"
       data-debug           = "true"
       data-do-message      = "doMessage"
       data-online-timer    = "30"
       data-offline-timer   = "5"
       data-reconnect-timer = ".5"
       data-ping-url        = "/ping/">

    <div id="status-message"></div>

    <cfwebsocket name      = "ws"
                 onMessage = "AdvancedSocket.onMessage"
                 onOpen    = "AdvancedSocket.onOpen"
                 onClose   = "AdvancedSocket.onClose"
                 onError   = "AdvancedSocket.onError">
    
    <script src="dist/advancedsocket.min.js"></script>
    
    <script>
        function doMessage( obj ){
            console.log( obj );
        }
    </script>
</body>
 ```

## Properties / Attributes

- __autoConnect__  
Controls the auto connect feature of the AdvancedSocket.  
Defaults to `true` but can be managed by the `data-auto-connect` attribute in the body tag. It also requires a pingURL to be defined.
- __ipApiLookup__  
Controls the ip api lookup feature.  
Defaults to `false` but can be managed by the `data-api-lookup` attribute in the body tag.
- __ipApiService__  
The ip api service that is used when feature is enabled.  
Defaults to `ip-api.com` but can be managed by the `data-api-service` attribute in the body tag. 
Please note, this only allows for either __ip-api.com__ or __ipapi.com__. At the current moment __ip-api.com__ does not require a key as HTTPS calls are not enabled. Once we support this
feature, then an API Key will be required. __ipapi.com__ does allow for HTTPS requests.  
> [!IMPORTANT]
> Please review the sites for these services for more information.
- __ipApiKey__  
The api key for the ip api service.  
Can be managed by the `data-api-key` attribute in the body tag. Currently, this 
is only required for __ipapi.com__.
- __name__  
The name of your global websocket variable name.  
Defaults to `ws` but can be managed by the `data-name` attribute in the body tag.
- __channels__  
Comma separated list of channels to subscribe to.  
Managed by the `data-channels` attribute in the body tag.
- __clientID__  
The subscriber ID returned from ColdFusion on a succesful connection. This is used when the autoConnect feature is enabled to make sure that we are still an active subscriber.
- __clientInfo__  
This is a key-value object that is passed when creating a connection. By default AdvancedSocket uses a third party request to find out additional geo-based data of the request. This is also used to pass in a username and any additional info you may want to.
- __doMessage__  
Defines the global function to run on a succesful message. Defaults to `doMessage`. If the function is not defined or does not exists a log message will be displayed (if debug is enabled).  
Defaults to `doMessage` but can be managed by the `data-do-message` attribute in the body tag.
- __timer__  
Used for the check AdvancedSocket.checkConnection setTimeout
- __pingURL__  
The URL that will be used to ping if we are still a good connection. Should return a JSON object with a success value of true or false.  
Managed by the `data-ping-url` attribute in the body tag.
- __onlineTimer__  
The timeout value to ping if autoConnect is enabled while we have a good connection.  
Defaults to `30 seconds` but can be managed by the `data-online-timer` attribute in the body tag.
- __offlineTimer__  
The timeout value to ping if autoConnect is enabled while we have a bad connection.  
Defaults to `5 seconds` but can be managed by the `data-offline-timer` attribute in the body tag.
- __reconnectTimer__  
The timeout value call a reconnect attempt when a `FORCE-RECONNECT` value is received from the server.  
Defaults to `500ms` but can be managed by the `data-reconnect-timer` attribute in the body tag.
- __timerCount__  
The timeout value that is used on reconnect calls. It is automally updated to either the online or offline value based on current state.
- __debug__  
Boolean value to display log messages.  
Defaults to `false` but can be managed by the `data-debug` attribute in the body tag.
- __statusLabel__  
The status document element defined by an id of status-message.  
Defaults to `status-message` but can be managed by the `data-status-label` attribute in the body tag.

## Functions

- __init__  
Initializes the `AdvancedSocket` with options defined in the body's data
attributes.
- __checkConnection__  
Sets up timer and request first `ping()` call if `autoConnect` is enabled.
- __dispatchEvent__  
Creates and dispatches custom events.
- __forceReconnect__  
Fired when a __FORCE-RECONNECT__ message is received and executes `CFWebSocketWrapper.closeConnection()` and `CFWebSocketWrapper.openConnection()` which execute `onOpen()` when the socket is open again.
- __getIPInfo__  
Calls the IP API Service if enabled and adds the result to the subscribers information on connection 
under `clientInfo.geo`.
- __handleConnectionError__  
Handles a connection error event.
- __handleGoodConnection__  
Handles a good connection event.
- __handleRequireConnection__  
Handles a require connection event.
- __handleOffline__  
Handles an offline event.
- __handleOnline__  
Handles an online event.
- __ping__  
Polls request to the server to check if connection is still valid. Expects an `application/json` 
response as follows:
```json
{ "success" : true|false }
```
- __processAuthentication__ 
Handles an authentication request and logs error or continues on success.
- __processMessage__  
On `FORCE-RECONNECT` messages fires the `forceReconnect()` based on the `reconnectCount` and forwards the message to the Global Function defined in the options.
- __setTimer__  
Handles setting the timer that fires off the check connection event using `window.setTimeout`
- __setupListeners__  
Handles setting the listeners for connection events.
- __subscribe__  
Loops thru the defined channels and executes the `CFWebSocketWrapper.subscribe()` function for each.
- __onClose__ [ executed from `CFWebSocketWrapper` ]  
Fired on connection close 
- __onError__ [ executed from `CFWebSocketWrapper` ]  
Fired on connection errors
- __onMessage__ [ executed from `CFWebSocketWrapper` ]  
Handles messages received and routes based on `reqType`. If none match, it routes to `processMessage()`. 
  - `welcome`  
  Sets clientID and executes `connecting()`
  - `authenticate`  
  Executes `processAuthentication()`
  - `subscribe`  
  Executes `connected()`
- __onOpen__ [ executed from `CFWebSocketWrapper` ]  
Fired onced the connection is open. If authentication is required, it calls the `CFWebSocketWrapper.authenticate()` function if not passes to the `getIPInfo()` if feature enabled or `subscribe()` if not.
- __disconnected__ :metal: _(overwrite to customize)_  
Fired when a socket is disconnected. Updates the status label.
- __connecting__ :metal: _(overwrite to customize)_  
Fired when the socket is connecting. Updates the status label.
- __connected__ :metal: _(overwrite to customize)_  
Fired when the socket is connected. Updates the status label.
- __doLog__  
Outputs console logs if debug is set to true. This can be defined with the body data-debug attribute.
