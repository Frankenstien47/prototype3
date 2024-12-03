
const User = require('../../models/userSchema');
const Category=require('../../models/categorySchema')
const Product=require('../../models/productSchema')

const OTP = require('../../models/otpSchema');
const nodemailer = require('nodemailer');
require("dotenv").config();

const createTransporter = async () => {
    try {
        
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.MyEmail,
                pass: process.env.MyPass
            }
        });
        
        await transporter.verify();
        return transporter;
    } catch (error) {
        console.error('Error creating email transporter:', error);
        throw error;
    }
};

//  function to generate OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

//  function to send OTP
const sendOTP = async (email, otp) => {
    try {
        const transporter = await createTransporter();
        await transporter.sendMail({
            from: process.env.MyEmail,
            to: email,
            subject: 'Your OTP for Registration',
            text: `Your OTP is ${otp}. This OTP will expire in 5 minutes.`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>Your OTP for Registration</h2>
                    <p>Your OTP is: <strong>${otp}</strong></p>
                    <p>This OTP will expire in 5 minutes.</p>
                </div>
            `
        });

        return true;
    } catch (error) {
        console.error('Error sending OTP:', error);
        throw error;
    }
};

// controller to render Home page
exports.getHome = async(req, res) => {
    try{
        seasonalCategory= await Category.findOne({name:'Seasonal'})
        menCategory=await Category.findOne({name:'Men'})
        womenCategory=await Category.findOne({name:'Women'})


  

        seasonalProducts= await Product.find({
            category:seasonalCategory._id,
            status:'listed'
        }).limit(4)
        menProducts= await Product.find({
            category: menCategory._id,
            status:'listed'
        }).limit(4)

        console.log('Men Category ID:', menCategory?._id);
        console.log('Men Products Query:', {
            Category: menCategory?._id,
            status: 'listed'
        });

        // Double-check product schema
        const allProducts = await Product.find({});
        console.log('All Products:', allProducts.map(p => ({
            id: p._id,
            name: p.productName,
            category: p.category._id,
            status: p.status
        })));

        womenProducts= await Product.find({
            category:womenCategory._id,
            status:'listed'
        }).limit(4)
        

        console.log('Men Products:', menProducts.map(p => ({
            name: p.productName,
            price: p.price,
            images: p.images
        })));

        res.render('layout', {
            title: "Home",
            content: 'partials/home',
            user: req.session.user,
            menProducts,
            seasonalProducts,
            womenProducts,
        });
    }catch(error){

        console.error('Error fetching home page products:',error)
        
    }
   
};

// controller to render signup page
exports.getSignUpUser = (req, res) => {
    res.render('user/userSignUp', {
        user: req.session.user || null,
        error: req.flash('error_msg'),
        success: req.flash('success_msg')
    });
};
// controller to submit signup form
exports.postSignupUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
     
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            req.flash('error_msg', 'Email already registered');
            return res.redirect('/user/signup');
        }

        const otp = generateOTP();
        
       
        await OTP.findOneAndUpdate(
            { email },
            { email, otp },
            { upsert: true, new: true }
        );

        req.session.tempUser = { name, email, password };

        
        await sendOTP(email, otp);

        req.flash('success_msg', 'OTP sent successfully. Please check your email.');
        res.redirect('/user/verify-otp');
    } catch (error) {
        console.error("Error in signup process:", error);
        req.flash('error_msg', 'Error in signup process. Please try again.');
        res.redirect('/user/signup');
    }
};
// controller to verify OTP
exports.getVerifyOTP = (req, res) => {
    if (!req.session.tempUser) {
        req.flash('error_msg', 'Session expired. Please sign up again.');
        return res.redirect('/user/signup');
    }
    res.render('user/otpVerification', {
        email: req.session.tempUser.email,
        error: req.flash('error_msg'),
        success: req.flash('success_msg')
    });
};
// controller to submit OTP
exports.postVerifyOTP = async (req, res) => {
    try {
        const { otp } = req.body;
        const tempUser = req.session.tempUser;

        if (!tempUser) {
            req.flash('error_msg', 'Session expired. Please try again');
            return res.redirect('/user/signup');
        }

        const otpDocument = await OTP.findOne({
            email: tempUser.email,
            otp: otp
        });

        if (!otpDocument) {
            req.flash('error_msg', 'Invalid or expired OTP');
            return res.redirect('/user/verify-otp');
        }

      
        const newUser = new User({
            name: tempUser.name,
            email: tempUser.email,
            password: tempUser.password
        });
        await newUser.save();

     
        await OTP.deleteOne({ _id: otpDocument._id });
        
        delete req.session.tempUser;

        req.flash('success_msg', 'Registration successful! Please login');
        res.redirect('/user/login');
    } catch (error) {
        console.error("Error in OTP verification:", error);
        req.flash('error_msg', 'Error in verification process');
        res.redirect('/user/verify-otp');
    }
};
// controller to resend OTP
exports.resendOTP = async (req, res) => {
    try {
        const tempUser = req.session.tempUser;
        if (!tempUser) {
            return res.json({
                success: false,
                message: 'Session expired. Please sign up again.'
            });
        }

        const otp = generateOTP();
        
  
        await OTP.findOneAndUpdate(
            { email: tempUser.email },
            { otp },
            { upsert: true, new: true }
        );

        await sendOTP(tempUser.email, otp);

        res.json({
            success: true,
            message: 'New OTP sent successfully'
        });
    } catch (error) {
        console.error("Error resending OTP:", error);
        res.status(500).json({
            success: false,
            message: 'Error sending OTP. Please try again.'
        });
    }
};