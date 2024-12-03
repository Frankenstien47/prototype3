const mongoose=require('mongoose');

mongoose.connect("mongodb://localhost:27017/DC_stores",{
    serverSelectionTimeoutMS: 30000,
})

.then(()=>console.log('mongoDB Connected'))
.catch(err=>console.log('Error:',err));