const mongoose=require('mongoose')

const walletTransactionSchema=new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true,
    },
    type:{
        type:String,
        enum:['Credit','Debit'],
        required:true,
    },
    amount:{
        type:Number,
        default:0,
    },
    description: {
        type: String,
        required: true
    },
    orderId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Order',
        required:true,
    }
},{timestamps:true})

const WalletTransaction=mongoose.model('WalletTransaction',walletTransactionSchema);
module.exports=WalletTransaction;