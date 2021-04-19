const { PeerRPCServer } = require("grenache-nodejs-http");
const Link = require("grenache-nodejs-link");
const constants = require("./contants");
const store=  require("./store");

//  TODO: Update grape port
const GRAPE_PORT = 30001;

const link = new Link({
    grape: `http://127.0.0.1:${GRAPE_PORT}`
});

const peer = new PeerRPCServer(link,{});
peer.init();

//
const service = peer.transport('server');

const port = 1024 + Math.floor(Math.random() * 1000)
service.listen(port);

//
setInterval(() => {
    link.announce(constants.SERVICE_NAME , service.port , { });
}, 1000);

service.on('request', (rid,key,payload,handler) => {

    switch (payload.type) {

        case constants.ACTION_TYPES.SYNC_STATE: {
            store.update(payload,handler);
        }break;
        case constants.ACTION_TYPES.QUERY_CHAIN: {
            handler.reply(null, store.getChain() );
        }break;

    }

});

//
store.init();
