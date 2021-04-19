const _ = require("lodash");
const constants = require("./contants");

/**
 * Contains clients state
 * @type {*[]}
 */
const store = [];

const filterOrderType = (orders,type) => {
    return  orders.filter(x => x.type === type);
};

/**
 * Order matching algorithm
 * @param id
 * @param orders
 * @param callback
 * @param removeOrder
 */
const processOrders = (id,orders, { callback , removeOrder }) =>{

    const trades = [];
    const buyOrders = filterOrderType(orders,constants.ORDER_TYPES.BUY);
    const sellOrders = filterOrderType(orders,constants.ORDER_TYPES.SELL);

    //  get other clients orderbook
    const otherFrames = store.filter(x => x.id !== id);

    if(buyOrders.length > 0){

        //  process every buy order
        for(let k = 0 ; k < buyOrders.length; k++){

            const order = buyOrders[k];

            for(let i = 0 ; i < otherFrames.length ; i++){

                const frame = otherFrames[i];
                const sellOrders = filterOrderType(frame.orders  , constants.ORDER_TYPES.SELL);
                if(sellOrders.length === 0)
                    continue;

                let sellOrder = null;
                for(let j = 0 ; j < sellOrders.length ; j++){
                    sellOrder = sellOrders[j];

                    if(sellOrder.amount >= order.amount){
                        sellOrder.amount -= order.amount;
                        if(sellOrder.amount === 0){
                            trades.push({ orderId: order.id , sellOrderId: sellOrder.id , amount: sellOrder.amount , price: sellOrder.price });
                            // remove sell order
                            removeOrder(sellOrder.id);
                        }

                        if(sellOrder.amount < order.amount){
                            trades.push({ orderId: order.id , sellOrderId: sellOrder.id , amount: sellOrder.amount , price: sellOrder.price })
                            order.amount -= sellOrder.amount;

                            //  remove sell order
                            removeOrder(sellOrder.id);
                        }
                    }
                }

            }

        }

    }

    if(sellOrders.length > 0){

        //  process every sell order
        for(let k = 0 ; k < sellOrders.length; k++) {

            const order = sellOrders[k];
            for(let i = 0 ; i < otherFrames.length ; i++) {

                const frame = otherFrames[i];
                const buyOrders = filterOrderType(frame.orders, constants.ORDER_TYPES.BUY);
                if (buyOrders.length === 0)
                    continue;

                let buyOrder = null;
                for(let j = 0 ; j < buyOrders.length ; j++) {
                    buyOrder = buyOrders[j];

                    if(buyOrder.amount >= order.amount){
                        trades.push({ orderId: order.id , buyOrderId: buyOrder.id , amount: buyOrder.amount , price: buyOrder.price });
                        buyOrder.amount -= order.amount;
                        if(buyOrder.amount === 0){
                            removeOrder(buyOrder.id);
                        }

                    }

                    if(buyOrder.amount < order.amount){
                        trades.push({ orderId: order.id , buyOrderId: buyOrder.id , amount: buyOrder.amount , price: buyOrder.price });
                        order.amount -= buyOrder.amount;
                        removeOrder(buyOrder.id);
                    }
                }

            }
        }

    }

    //  reply with the trades
    callback.reply(null,{ trades });
}

exports.init = () => {

    //  TODO: fetch store from external client and run initialization here


};

exports.update = (state,callback) => {

    const clientId = state.id;
    let instance = store.find(x => x.id = clientId);
    if(_.isNil(instance)){
        instance = {
            id: clientId,
            orders: [],
            lastSyncIndex: 0
        };

        store.push(instance);
    }

    //
    instance.lastSyncIndex = state.lastSyncIndex;
    instance.orders = instance.orders.concat(state.orders);

    const removeOrder = (id) => {

        const index = instance.orders.findIndex(x => x.id === id);
        if(index >= 0)
            instance.orders.splice(index,1);
    };

    //
    return processOrders(instance.id, state, { callback, removeOrder  });
};

exports.getChain = () => store;
