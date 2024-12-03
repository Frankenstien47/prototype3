
const Coupon=require('../../models/couponSchema')


// controller to render the coupon management page
exports.renderCouponList = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const coupons = await Coupon.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Coupon.countDocuments();

        res.render('adminLayout', {
            title:'coupon management',
            content:'partials/adminCoupons',
            coupons,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalCoupons: total
            }
        });
    } catch (error) {
        console.error('Error in renderCouponList:', error);
        res.status(500).send('Internal Server Error');
    }
};

// controller to add coupon
exports.addCoupon = async (req, res) => {
    try {
        const {
            code,
            discountType,
            discountValue,
            minOrderValue,
            maxDiscount,
            expirationDate,
            usageLimit
        } = req.body;

     
        if (!code || !discountType || !discountValue || !expirationDate) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

       
        const parsedMinOrderValue = parseFloat(minOrderValue);
        if (isNaN(parsedMinOrderValue) || parsedMinOrderValue < 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid minimum order value'
            });
        }

       
        if (discountType === 'percentage') {
            if (!maxDiscount) {
                return res.status(400).json({
                    success: false,
                    message: 'Maximum discount is required for percentage type coupons'
                });
            }
            const parsedMaxDiscount = parseFloat(maxDiscount);
            if (isNaN(parsedMaxDiscount) || parsedMaxDiscount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid maximum discount value'
                });
            }
        }

    
        const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
        if (existingCoupon) {
            return res.status(400).json({
                success: false,
                message: 'Coupon code already exists'
            });
        }

    
        const newCoupon = new Coupon({
            code: code.toUpperCase(),
            discountType,
            discountValue: parseFloat(discountValue),
            minOrderValue: parsedMinOrderValue,
            maxDiscount: discountType === 'percentage' ? parseFloat(maxDiscount) : null,
            expirationDate: new Date(expirationDate),
            usageLimit: parseInt(usageLimit) || 1
        });

        await newCoupon.save();

        res.status(201).json({
            success: true,
            message: 'Coupon created successfully',
            coupon: newCoupon
        });

    } catch (error) {
        console.error('Error in addCoupon:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};


// controller to Update coupon
exports.updateCoupon = async (req, res) => {
    try {
        const { couponId } = req.params;
        const updateData = { ...req.body };

        if (updateData.minOrderValue) {
            updateData.minOrderValue = parseFloat(updateData.minOrderValue);
        }
        if (updateData.maxDiscount) {
            updateData.maxDiscount = parseFloat(updateData.maxDiscount);
        }
        if (updateData.discountValue) {
            updateData.discountValue = parseFloat(updateData.discountValue);
        }

        
        if (updateData.discountType === 'percentage') {
            if (!updateData.maxDiscount) {
                return res.status(400).json({
                    success: false,
                    message: 'Maximum discount is required for percentage type coupons'
                });
            }
        }

       
        if (updateData.code) {
            const existingCoupon = await Coupon.findOne({
                code: updateData.code.toUpperCase(),
                _id: { $ne: couponId }
            });
            if (existingCoupon) {
                return res.status(400).json({
                    success: false,
                    message: 'Coupon code already exists'
                });
            }
            updateData.code = updateData.code.toUpperCase();
        }

        const coupon = await Coupon.findByIdAndUpdate(
            couponId,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Coupon not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Coupon updated successfully',
            coupon
        });

    } catch (error) {
        console.error('Error in updateCoupon:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};
// controller to get single coupon details
exports.getCouponDetails = async (req, res) => {
    try {
        const { couponId } = req.params;

        const coupon = await Coupon.findById(couponId);
        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Coupon not found'
            });
        }

        res.status(200).json({
            success: true,
            coupon
        });

    } catch (error) {
        console.error('Error in getCouponDetails:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};



// controller to Update coupon status
exports.updateCouponStatus = async (req, res) => {
    try {
        const { couponId } = req.params;
        const { status } = req.body;

        if (!['active', 'inactive'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status value'
            });
        }

        const coupon = await Coupon.findByIdAndUpdate(
            couponId,
            { $set: { status } },
            { new: true }
        );

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Coupon not found'
            });
        }

        res.status(200).json({
            success: true,
            message: `Coupon ${status === 'active' ? 'activated' : 'deactivated'} successfully`,
            coupon
        });

    } catch (error) {
        console.error('Error in updateCouponStatus:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// controller Delete coupon
exports.deleteCoupon = async (req, res) => {
    try {
        const { couponId } = req.params;

        const coupon = await Coupon.findByIdAndDelete(couponId);
        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Coupon not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Coupon deleted successfully'
        });

    } catch (error) {
        console.error('Error in deleteCoupon:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};