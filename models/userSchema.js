const mongoose=require('mongoose');
const bcrypt=require('bcryptjs');


const userSchema=new mongoose.Schema({
    name:{type:String,required:true},
    email:{type:String,required:true,unique:true},
    password:{type:String,required:true},
    isBlocked:{type:Boolean,default:false,required:true},
    walletBalance:{
        type:Number,
        default:0,
    },
    wishList:[{
        ProductId:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'Product',
            required:true,
        },
        date:{
            type:Date,
            default: Date.now(),
        }
    }]
},{timestamps:true})

//hash password
userSchema.pre('save',async function(next) {
    if(!this.isModified('password')) return next();
    this.password=await bcrypt.hash(this.password,10)
    next()
})

userSchema.methods.comparePassword=function(candidatePassword){
    return bcrypt.compare(candidatePassword,this.password)
}

const User=mongoose.model('User',userSchema);
module.exports=User;