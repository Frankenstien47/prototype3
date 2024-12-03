require('./config/mongoose.js')
const express = require("express");
const session=require('express-session')
const passport=require('./config/googleAuth.js')
const userRoutes = require("./routes/userRoutes");
const flash = require('connect-flash');
const adminRoutes=require('./routes/adminRoutes.js')
require("dotenv").config();
const app = express();
const port = process.env.PORT;

app.use(express.static("public"));

app.set("view engine", "ejs");
app.set("views", "./views");
app.use(express.urlencoded({extended:true}))
app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.use(session({
  secret:"my_secret_Key",
  resave:true,
  saveUninitialized:false,
  cookie:{secure:false},
}))
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

// app.use((req,res,next)=>{
//   if(!req.session.user){
//     req.session.user={
//       _id: '6733518a36201fe40adb5d73',
//       name: 'Akshay Kumar',
//       email: 'iamakshaykumar96@gmail.com',
//       password: '$2a$10$.Ud7EnvQmrTgTdeGPi3lNeZHw2SkLs8CyMfpOiMOwjcbWk7DajdnK',
//       isBlocked: false,
//       walletBalance: 68571,
//       wishList: [],
//       createdAt: '2024-11-12T13:00:58.992Z',
//       updatedAt: '2024-11-13T05:30:14.962Z',
//       __v: 0
//     }
//   }
  
//   next()
  
// })

app.use((req,res,next)=>{
  res.setHeader('cache-control','no-store')
  next();
})

app.use(flash());

app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  next();
});
app.use("/", userRoutes);
app.use("/",adminRoutes)
app.use((req,res)=>{
  res.status(404).send('Page Not Found')
})

app.listen(port, () => {
  console.log(`http://localhost:${port}`);
});
