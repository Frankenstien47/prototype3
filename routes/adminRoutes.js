
const express = require("express");
const dashBoardController=require('../controller/Admin/Dashboard')
const loginController=require('../controller/Admin/login')
const productController=require('../controller/Admin/productManagement')
const categoryController=require('../controller/Admin/categoryManagement')
const couponController=require('../controller/Admin/couponManagement')
const orderController=require('../controller/Admin/orderManagement')
const salesReportController=require('../controller/Admin/salesReportManagement')
const userManagementController=require('../controller/Admin/userManagement')
const offerController=require('../controller/Admin/offerManagement')


const Admin=require('../models/adminSchema')
const {redirectAdminLoginIfLogout,redirectAdminDashIfLogin,redirectHomeIfUser}=require('../middlewares/auth')
const upload=require('../config/multerConfig')
const router=express.Router();

//admin Login & logout
router.get('/admin/login',redirectAdminDashIfLogin,redirectHomeIfUser,loginController.getLogin)

router.post('/admin/login',loginController.postLogin)


//admin Dashboard
router.get('/admin/dashBoard',redirectAdminLoginIfLogout,dashBoardController.getDashBoard)
router.get('/admin/dashboard-stats',redirectAdminLoginIfLogout,dashBoardController.getDashBoardStats)
router.get('/admin/logout',loginController.getAdminLogout);
//admin user management
router.get('/admin/users',redirectAdminLoginIfLogout,userManagementController.getUsers)

router.get('/admin/users/edit/:id',userManagementController.getEditUser)
router.post('/admin/users/edit/:id',userManagementController.postEditUser)
router.post('/admin/users/delete/:id',userManagementController.postDeleteUser)
router.post('/admin/users/block/:id',userManagementController.postBlockUser)


//====================== Product Management ===================================================//
router.get('/admin/products',redirectAdminLoginIfLogout,productController.getProducts)
router.get('/admin/products/add',redirectAdminLoginIfLogout,productController.getAddProducts)
router.post('/admin/products/add', upload.array('images', 3), productController.postAddProduct);
router.post('/admin/products/delete/:id',productController.postDeleteProduct)
router.post('/admin/products/toggle/:id',productController.postToggleProductStatus)
router.get('/admin/products/edit/:id', redirectAdminLoginIfLogout, productController.getEditProduct); // Render edit page
router.post('/admin/products/edit/:id', upload.array('images', 3), productController.postEditProduct);


//===================== category Management ================================================// 
router.get('/admin/categories',redirectAdminLoginIfLogout,categoryController.getCategories)
router.get('/admin/categories/json', redirectAdminLoginIfLogout, categoryController.getCategoriesJson);
router.post('/admin/categories/:id/list',categoryController.listCategory)
router.post('/admin/categories/:id/unList',categoryController.unlistCategory)
router.post('/admin/categories/add', upload.single('image'), categoryController.addCategory);
router.get('/admin/categories/:id/edit',redirectAdminLoginIfLogout,categoryController.getEditCategory)
router.post('/admin/categories/:id/edit', upload.single('image'),categoryController.editCategory)



//======================= Order management =========================================================//
router.get('/admin/orders',redirectAdminLoginIfLogout,orderController.orderManagement)
router.post('/admin/orders/:orderId/items/:itemId/status', orderController.updateItemStatus);
router.post('/admin/orders/:orderId/status', orderController.orderStatus);
router.post('/admin/orders/:orderId/items/:itemId/return-approve', orderController.approveReturn);
router.post('/admin/orders/:orderId/items/:itemId/return-reject', orderController.rejectReturn);

//======================= coupon management =========================================================//
router.get('/admin/coupons', redirectAdminLoginIfLogout, couponController.renderCouponList);
router.post('/admin/coupons', couponController.addCoupon);
router.get('/admin/coupons/:couponId', couponController.getCouponDetails);
router.put('/admin/coupons/:couponId', couponController.updateCoupon);
router.patch('/admin/coupons/:couponId/status', couponController.updateCouponStatus);
router.delete('/admin/coupons/:couponId', couponController.deleteCoupon);

//=========================Offer management ===========================================================//
router.get('/admin/offers/manage', offerController.renderManageOffers);
router.post('/admin/offers/add', offerController.createOffer);
router.get('/admin/offers/edit/:id', offerController.renderEditOffer);
router.post('/admin/offers/update/:id', offerController.updateOffer);
router.post('/admin/offers/toggle/:id', offerController.toggleOfferStatus);
router.post('/admin/offers/delete/:id', offerController.deleteOffer);
//===========================Sales Report=================================================================//
router.get('/admin/sales-report', salesReportController.getSalesReport);
router.get('/admin/sales-report/pdf', salesReportController.downloadSalesReportPDF);
router.get('/admin/sales-report/excel', salesReportController.downloadSalesReportExcel);
module.exports=router;

