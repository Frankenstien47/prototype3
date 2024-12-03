
const Coupon=require('../../models/couponSchema')
require("dotenv").config();

// controller to list the coupons
exports.getCoupon= async (req, res) => {
    try {
      const coupons = await Coupon.find({}).lean();
  
    
      const processedCoupons = coupons.map(coupon => {
        const isExpired = new Date(coupon.expirationDate) < new Date();
        return {
          ...coupon,
          isExpired,
          remainingUses: coupon.usageLimit - coupon.usedCount,
          formattedExpiryDate: coupon.expirationDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }),
          discountFormatted: coupon.discountType === 'percentage' 
            ? `${coupon.discountValue}% OFF${coupon.maxDiscount ? ` up to $${coupon.maxDiscount}` : ''}`
            : `$${coupon.discountValue} OFF`
        };
      });
  
      res.render('profileLayout', {
        title:'coupons',
        content:'partials/userCouponList',
        currentPage:'coupons',
         coupons: processedCoupons
         });
    } catch (error) {
      console.error('Error fetching coupons:', error);
      res.status(500).send('Error fetching coupons');
    }
  }
