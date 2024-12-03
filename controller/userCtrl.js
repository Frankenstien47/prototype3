const mongoose=require('mongoose')
const User = require('../models/userSchema');
const bcrypt=require('bcryptjs')
const Address=require('../models/AddressSchema')
const Product = require('../models/productSchema');
const Order=require('../models/OrderSchema')
const OTP = require('../models/otpSchema');
const nodemailer = require('nodemailer');
const Cart=require('../models/userCart')
const passport=require('../config/googleAuth')
const Coupon=require('../models/couponSchema')
const Category=require('../models/categorySchema')
const Offer=require('../models/offerSchema')
const WalletTransaction=require('../models/walletSchema')
const razorpay=require('../config/Razorpay')
const PDFDocument=require('pdfkit')
const path=require('path')
const crypto = require('crypto');
const fs=require('fs')
require("dotenv").config();

// function to create and verify transporter

// Login

//============================= Product Listing ===========================================>>

//============================= Profile===================================//

//============================AddressBook=================================//


//==================================== Cart ======================================================//



//<<============================= CheckOut ===================================================>>//

//========================== order history =============================================//


//================= WishList =========================================================//

//==================================== coupon list ================================================================//

//========================================== userWallet =====================================================================// 


