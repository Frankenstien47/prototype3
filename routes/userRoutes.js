const express = require("express");

const { findOne } = require('../models/userSchema')
const signupController=require('../controller/User/SignupController')
const loginController=require('../controller/User/LoginController')
const productController=require('../controller/User/ProductListController')
const profileController=require('../controller/User/ProfileController')
const cartController=require('../controller/User/CartController')
const checkoutController=require('../controller/User/checkoutController')
const orderController=require('../controller/User/Orderhistory')
const addressController=require('../controller/User/addressController')
const wishListController=require('../controller/User/WishListController')
const couponController=require('../controller/User/CouponsList')
const walletController=require('../controller/User/UserWallet')



const {redirectProfileIfLoggedIn, redirectAdminLoginIfLogout,redirectAdminDashIfLogin,redirectHomeIfUser,checkUserBlocked ,protectBlockedUser,}=require('../middlewares/auth')



const router = express.Router();

router.get('/',(req,res)=>{
    res.redirect('/user/home');
})
router.get('/user/home',redirectAdminDashIfLogin,signupController.getHome)
// Login
router.get('/user/login',redirectHomeIfUser,redirectAdminDashIfLogin, loginController.getLoginUser)
router.post('/user/login',loginController.postLoginUser)
//Google Login
router.get('/user/auth/google',redirectHomeIfUser,protectBlockedUser, loginController.googleLogin);
router.get('/user/auth/google/callback',redirectHomeIfUser,protectBlockedUser, loginController.googleLoginCallback);

//signup
router.get('/user/signup',redirectHomeIfUser,protectBlockedUser,redirectAdminDashIfLogin,signupController.getSignUpUser)
router.post('/user/signup',protectBlockedUser,signupController.postSignupUser)
//Profile Route
router.get('/user/profile',redirectProfileIfLoggedIn,redirectAdminDashIfLogin,protectBlockedUser,profileController.getProfile)
router.post('/user/profile/editName',protectBlockedUser,profileController.editUserName)
router.post('/user/profile/ChangePassword',protectBlockedUser,profileController.changePassword)
router.post('/user/logout',loginController.postUserLogout)

//otpVerification Route
router.get('/user/verify-otp',redirectAdminDashIfLogin,protectBlockedUser, signupController.getVerifyOTP);
router.post('/user/verify-otp',protectBlockedUser,signupController.postVerifyOTP);
router.post('/user/resend-otp',protectBlockedUser, signupController.resendOTP);


//================Product List===============================================================================

router.get('/user/productList',protectBlockedUser, productController.getProductList);



router.get('/user/productList/:id',redirectAdminDashIfLogin,protectBlockedUser,productController.getProductDetails)

//================ AddressBook ===========================================================//
router.get('/user/address',protectBlockedUser,addressController.getAddressBook)

router.put('/user/address/edit/:id',protectBlockedUser,addressController.editAddress)
router.post('/user/address/add',protectBlockedUser,addressController.addAddress)
router.delete('/user/address/:id',protectBlockedUser,addressController.deleteAddress)
router.get('/user/address/:id',protectBlockedUser,addressController.getAddress)
//======================= CART===================================================//

router.get('/user/cart', redirectProfileIfLoggedIn,protectBlockedUser,cartController.getCart);
router.get('/user/cart/count',protectBlockedUser, cartController.getCartCount);
router.post('/user/cart/add',protectBlockedUser, cartController.addToCart);
router.put('/user/cart/update', protectBlockedUser,cartController.updateQuantity);
router.delete('/user/cart/delete/:productId',protectBlockedUser, cartController.removeItem);
router.delete('/user/cart/clear',protectBlockedUser, cartController.clearCart);


//<<======================== CheckOut =============================================>>//
router.get('/user/checkout',redirectProfileIfLoggedIn, protectBlockedUser,checkoutController.getCheckout);
router.post('/user/checkout/create-order',protectBlockedUser, checkoutController.createOrder);

router.post('/user/checkout/verify-payment',protectBlockedUser, checkoutController.verifyPayment);
router.post('/user/checkout/retry-payment/:orderId',protectBlockedUser, checkoutController.retryPayment);
router.post('/validate-coupon', protectBlockedUser,checkoutController.validateCoupon);
//<<======================== Order History =================================================>>//
router.get('/user/orders',redirectProfileIfLoggedIn,protectBlockedUser, orderController.getOrderHistory);
router.post('/user/orders/:orderId/items/:itemId/cancel', protectBlockedUser, orderController.cancelOrderItem);
router.post('/user/orders/:orderId/items/:itemId/return',protectBlockedUser, orderController.requestReturn);
router.post('/user/orders/:orderId/retry-payment', protectBlockedUser,checkoutController.retryPayment);
router.get('/user/orders/:orderId/invoice',redirectProfileIfLoggedIn,protectBlockedUser,orderController.downloadInvoice)
//<<========================== WishList ===========================================>>
router.get('/user/wishlist',redirectProfileIfLoggedIn,protectBlockedUser,wishListController.getWishList)
router.post('/user/wishlist/toggle',wishListController.toggleWishlist)
//<<=========================== CouponList ===============================================>>//
router.get('/user/couponList',redirectProfileIfLoggedIn,protectBlockedUser,couponController.getCoupon)

//<<============================ User Wallet =============================================>>//
router.get('/user/wallet',redirectProfileIfLoggedIn,protectBlockedUser,walletController.getWalletBalance) 
module.exports=router;
