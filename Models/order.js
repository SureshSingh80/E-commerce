const mongoose=require("mongoose");
const Schema=mongoose.Schema;

const orderSchema=Schema({
    itemID:{
        type:String,
    },
    title:{
        type:String
    },
    type:{
        type:String
    },
    description:{
        type:String
    },
    specification:{
        type:String
    },
    brand:{
        type:String
    },
    color:{
        type:String
    },
    warranty:{
        type:String
    },
    reviews:[
        {
          type:Schema.Types.ObjectId,
          ref:"Review",
        }
    ],
    orderName:{
        type:String
    },
    orderImage:{
        type:String
    },
    orderPrice:{
        type:Number
    },
    expectedDelivery:{
        type:String
    },
    orderDate:{
        type:String
    },
    orderAddress:{
        type:String
    },
    customerName:{
        type:String
    },
    mobNo:{
        type:String
    },
    status:{
        type:String
    }
    
    

});
const Order=mongoose.model("Order",orderSchema);
module.exports=Order;