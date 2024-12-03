const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['CATEGORY', 'PRODUCT', 'REFERRAL'],
        required: true
    },
    discountType: {
        type: String,
        enum: ['PERCENTAGE', 'FLAT'],
        required: true
    },
    discountValue: {
        type: Number,
        required: true,
        min: [0, 'Discount value cannot be negative']
    },
    maxDiscountAmount: {
        type: Number,
        required: function() {
            return this.discountType === 'PERCENTAGE';
        }
    },
    minProductPrice: {
        type: Number,
        default: 0
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    // For category-based offers
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: function() {
            return this.type === 'CATEGORY';
        }
    },
    // For product-based offers
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: function() {
            return this.type === 'PRODUCT';
        }
    },
    // For referral offers
    referralDetails: {
        referrerBonus: {
            type: Number,
            required: function() {
                return this.type === 'REFERRAL';
            }
        },
        refereeBonus: {
            type: Number,
            required: function() {
                return this.type === 'REFERRAL';
            }
        },
        maxReferrals: {
            type: Number,
            required: function() {
                return this.type === 'REFERRAL';
            }
        }
    },
    usageLimit: {
        type: Number,
        default: null // null means unlimited
    },
    usageCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Add index for efficient querying
offerSchema.index({ type: 1, isActive: 1 });
offerSchema.index({ startDate: 1, endDate: 1 });

const Offer = mongoose.model('Offer', offerSchema);
module.exports = Offer;