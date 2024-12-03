
const bcrypt=require('bcryptjs')
const Admin=require('../models/adminSchema')
const User=require('../models/userSchema')
const Product = require('../models/productSchema');
const Category = require('../models/categorySchema');
const path = require('path');
const Order=require('../models/OrderSchema')
const Coupon=require('../models/couponSchema')
const Offer=require('../models/offerSchema')
const sharp = require('sharp');
const PDFDocument = require('pdfkit');
const WalletTransaction=require('../models/walletSchema')
const ExcelJS = require('exceljs');
const moment=require('moment')
const { v4: uuidv4 } = require('uuid');

const fs = require('fs').promises;





//================================= product Management =========================================

//=================== category =========================================



//==============================Order Management ============================================//


//============================= Coupon management =================================================================//


//====================================== OfferList ==========================================================================//


//===================== Sales Report =================================================================================//
