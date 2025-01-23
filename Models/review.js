// create a review schema
const mongoose=require("mongoose");
const Schema=mongoose.Schema;   

const reviewSchema=Schema({
     itemID:{
        type:String,
     },
     username:{
        type:String,
     },
     review:{
        type:String,
     },
     rating:Number,
     date:String

});

const Review=mongoose.model("Review",reviewSchema);
module.exports=Review;