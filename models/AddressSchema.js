const mongoose=require('mongoose');

const addressSchema=new mongoose.Schema({
userId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'User',
    required:true
},
userName:{
    type:String,
    required:true,
},
phone:{
    type:Number,
    required:true,
},
country:{
type:String,
required:true,
},
state:{
    type:String,
    required:true,
},
district:{
    type:String,
    required:true,
},
city:{
    type:String,
    required:true,
},
location:{
    type:String,
    required:true,
},
pinCode:{
    type:Number,
    required:true,
},
house:{
type:String,
required:true,
},
addressType:{
    type:String,
    enum:['home','work'],
    required:true,
}

})
const Address=mongoose.model('Address',addressSchema)
module.exports=Address;
