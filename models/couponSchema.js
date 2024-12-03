const mongoose=require('mongoose')

const couponSchema=new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true
    },
    discountType: {
        type: String,
        enum: ['flat', 'percentage'],
        required: true
    },
    discountValue: {
        type: Number,
        required: true,
        min: [0, 'Discount value cannot be negative'],
        validate: {
            validator: function(v) {
                if (this.discountType === 'percentage') {
                    return v <= 100;
                }
                return true;
            },
            message: 'Percentage discount cannot exceed 100%'
        }
    },
    minOrderValue: {
        type: Number,
        required: true,
        min: [0, 'Minimum order value cannot be negative'],
        default: 0
    },
    maxDiscount: {
        type: Number,
        min: [0, 'Maximum discount cannot be negative'],
        validate: {
            validator: function(v) {
                if (this.discountType === 'percentage' && v === null) {
                    return false;
                }
                return true;
            },
            message: 'Maximum discount is required for percentage type coupons'
        }
    },
    expirationDate: {
        type: Date,
        required: true,
        validate: {
            validator: function(v) {
                return v > new Date();
            },
            message: 'Expiration date must be in the future'
        }
    },
    usageLimit: {
        type: Number,
        required: true,
        min: [1, 'Usage limit must be at least 1'],
        default: 1
    },
    usedCount: {
        type: Number,
        default: 0,
        min: 0
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }
}, {
    timestamps: true
});

const Coupon = mongoose.model('Coupon', couponSchema);
module.exports = Coupon;