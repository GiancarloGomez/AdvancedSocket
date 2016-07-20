 // ----------------------------------------------------------------------------
 // AdvancedSocket aims to help handling connectivity issues from the client side when using ColdFusion WebSocket solution.
 // v1.0.0 - released 2016-07-19 22:03
 // Re-organization of repo and addition of grunt workflow for linting and minifying distributable files.
 // Licensed under the MIT license.
 // https://github.com/GiancarloGomez/AdvancedSocket
 // ----------------------------------------------------------------------------
 // Copyright (C) 2013-2016 Giancarlo Gomez
 // http://giancarlogomez.com
 // ----------------------------------------------------------------------------

var AdvancedSocket = {
    autoConnect: JSON.parse(document.body.dataset.autoConnect || true),
    name: document.body.dataset.name || "ws",
    channels: document.body.dataset.channels ? document.body.dataset.channels.split(",") : [],
    clientID: 0,
    clientInfo: {},
    doMessage: document.body.dataset.doMessage || "doMessage",
    timer: 0,
    pingURL: document.body.dataset.pingUrl || "",
    onlineTimer: (parseFloat(document.body.dataset.onlineTimer) || 30) * 1e3,
    offlineTimer: (parseFloat(document.body.dataset.offlineTimer) || 5) * 1e3,
    reconnectTimer: (parseFloat(document.body.dataset.reconnectTimer) || .5) * 1e3,
    timerCount: 0,
    debug: JSON.parse(document.body.dataset.debug || false),
    statusLabel: document.getElementById(document.body.dataset.statusDiv || "status-message"),
    init: function() {
        AdvancedSocket.doLog("init");
        window.addEventListener("connectionerror", function(e) {
            AdvancedSocket.doLog("Event", "connectionerror", e);
            AdvancedSocket.disconnected();
        });
        window.addEventListener("goodconnection", function(e) {
            AdvancedSocket.doLog("Event", "goodconnection", e);
            AdvancedSocket.connected();
        });
        window.addEventListener("requireconnection", function(e) {
            AdvancedSocket.doLog("Event", "requireconnection", e);
            AdvancedSocket.forceReconnect();
        });
        window.addEventListener("offline", function(e) {
            AdvancedSocket.disconnected();
            AdvancedSocket.doLog("Event", "offline", e);
        }, false);
        window.addEventListener("online", function(e) {
            AdvancedSocket.doLog("Event", "online", e);
            AdvancedSocket.checkConnection();
        }, false);
        AdvancedSocket.timerCount = AdvancedSocket.onlineTimer;
        AdvancedSocket.checkConnection();
    },
    checkConnection: function() {
        clearTimeout(AdvancedSocket.timer);
        if (navigator.onLine && AdvancedSocket.pingURL !== "" && AdvancedSocket.autoConnect) {
            AdvancedSocket.doLog("checkConnection");
            AdvancedSocket.timer = setTimeout(function() {
                AdvancedSocket.ping(AdvancedSocket.pingURL);
            }, AdvancedSocket.timerCount);
        }
    },
    fireEvent: function(name, data) {
        var e = document.createEvent("Event");
        e.initEvent(name, true, true);
        e.data = data;
        window.dispatchEvent(e);
    },
    ping: function(url) {
        AdvancedSocket.doLog("ping");
        var xhr = new XMLHttpRequest(), noResponseTimer = setTimeout(function() {
            xhr.abort();
            AdvancedSocket.fireEvent("connectiontimeout", {});
        }, 5e3);
        xhr.onreadystatechange = function() {
            if (xhr.readyState !== 4) {
                return;
            }
            if (xhr.status === 200) {
                if (JSON.parse(xhr.response).success === true) {
                    AdvancedSocket.fireEvent("goodconnection", {});
                } else {
                    AdvancedSocket.fireEvent("requireconnection", {});
                }
                clearTimeout(noResponseTimer);
            } else {
                AdvancedSocket.fireEvent("connectionerror", {});
            }
            AdvancedSocket.checkConnection();
        };
        xhr.open("GET", url + "?id=" + AdvancedSocket.clientID + "&ts=" + new Date().getTime());
        xhr.send();
    },
    onMessage: function(obj) {
        AdvancedSocket.doLog("onMessage", obj.type, obj.reqType, obj);
        if (obj.reqType === "welcome") {
            AdvancedSocket.clientID = obj.clientid;
            AdvancedSocket.connecting();
        }
        if (obj.reqType === "authenticate") {
            if (obj.code === -1) {
                AdvancedSocket.doLog("Authentication failed");
            } else if (obj.code === 0) {
                AdvancedSocket.connectWS();
                AdvancedSocket.autoConnect = true;
                AdvancedSocket.checkConnection();
            }
            AdvancedSocket.connected();
        }
        if (obj.reqType === "subscribe") {
            AdvancedSocket.connected();
        }
        if (obj.type === "data") {
            if (obj.data === "FORCE-RECONNECT") {
                window.setTimeout(AdvancedSocket.forceReconnect, AdvancedSocket.reconnectTimer);
            }
            if (AdvancedSocket.doMessage && typeof window[AdvancedSocket.doMessage] === "function") {
                window[AdvancedSocket.doMessage](obj);
            } else {
                AdvancedSocket.doLog("Create a doMessage function and pass it in the data-do-message attribute of the body");
            }
        }
    },
    onOpen: function(obj) {
        AdvancedSocket.doLog("onOpen", obj);
        if (window.AdvancedSocket.clientInfo.username && AdvancedSocket.autoConnect) {
            AdvancedSocket.autoConnect = false;
            window[AdvancedSocket.name].authenticate(window.AdvancedSocket.clientInfo.username, "");
        }
        AdvancedSocket.getIPInfo();
    },
    onClose: function(obj) {
        AdvancedSocket.doLog("onClose", obj);
    },
    onError: function(obj) {
        AdvancedSocket.doLog("onError", obj);
    },
    getIPInfo: function() {
        AdvancedSocket.doLog("getIPInfo");
        if (window.jQuery && !AdvancedSocket.clientInfo.status && location.protocol !== "https:") {
            $.getJSON("http://ip-api.com/json/", function(response) {
                AdvancedSocket.clientInfo = response;
                AdvancedSocket.clientInfo.userAgent = navigator.userAgent;
                if (AdvancedSocket.autoConnect) {
                    AdvancedSocket.connectWS();
                }
            });
        } else if (AdvancedSocket.autoConnect) {
            AdvancedSocket.connectWS();
        }
    },
    connectWS: function() {
        AdvancedSocket.doLog("connectWS");
        AdvancedSocket.channels.forEach(function(value, index) {
            AdvancedSocket.doLog("Connecting to " + value + " : " + (index + 1) + " of " + AdvancedSocket.channels.length);
            var params = {
                clientInfo: window.AdvancedSocket.clientInfo
            };
            if (window.AdvancedSocket.clientInfo.username) params.username = window.AdvancedSocket.clientInfo.username;
            window[AdvancedSocket.name].subscribe(value, params);
        });
    },
    forceReconnect: function() {
        AdvancedSocket.doLog("forceReconnect");
        window[AdvancedSocket.name].closeConnection();
        window[AdvancedSocket.name].openConnection();
    },
    disconnected: function() {
        AdvancedSocket.doLog("disconnected");
        AdvancedSocket.timerCount = AdvancedSocket.offlineTimer;
        if (AdvancedSocket.statusLabel) {
            AdvancedSocket.statusLabel.className = "alert alert-danger text-center";
            AdvancedSocket.statusLabel.innerHTML = "We are disconnected!!!";
        }
    },
    connecting: function() {
        AdvancedSocket.doLog("connecting");
        if (AdvancedSocket.statusLabel) {
            AdvancedSocket.statusLabel.className = "alert alert-warning text-center";
            AdvancedSocket.statusLabel.innerHTML = "We are connecting ...";
        }
    },
    connected: function() {
        AdvancedSocket.doLog("connected");
        AdvancedSocket.timerCount = AdvancedSocket.onlineTimer;
        if (AdvancedSocket.statusLabel) {
            AdvancedSocket.statusLabel.className = "alert alert-success text-center";
            AdvancedSocket.statusLabel.innerHTML = "We are connected!!!";
        }
    }
};

AdvancedSocket.doLog = AdvancedSocket.debug === true && window.console ? console.log.bind(window.console) : function() {};

AdvancedSocket.init();