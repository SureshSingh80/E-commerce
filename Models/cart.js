const mongoose=require("mongoose");
const Schema=mongoose.Schema;

const cartSchema=Schema({
    itemID:{
        type:String,
    },
    type:{
        type:String,
        
    },
    title:{
        type:String,
        required:true,
    },
    description:{
        type:String
    },
    specification:{
        type:String
    },
    image:{
        type:String,
        default:"https://live.staticflickr.com/5207/5287310204_86fffc6c5a_b.jpg",
        set:(v)=> v===""?"https://live.staticflickr.com/5207/5287310204_86fffc6c5a_b.jpg":v
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
    price:Number,
    

});
const Cart=mongoose.model("Cart",cartSchema);
module.exports=Cart;