const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    productName: {
        type: String,
        required: true,
        trim: true
    },
    images: {
        type: [String],
        validate: {
            validator: function(v) {
                return v.length === 3; 
            },
            message: props => `Exactly 3 images are required`
        }
    },
    description: {
        type: String,
        required: true, 
        trim: true
    },
    variant: {
        type: String,
        required: true
    },
    stock: {
        type: Number,
        required: true,
        min: [0, 'Stock cannot be negative']
    },
    price: {
        type: Number,
        required: true,
        min: [0, 'Price cannot be negative']
    },
    status: {
        type: String,
        enum: ['listed', 'unlisted'],
        default: 'unlisted'
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    offerPrice: {
        type: Number,
        validate: {
            validator: function(v) {
                
                return v == null || v < this.price;
            },
            message: props => `Offer price should be less than the original price`
        }
    }
}, {
    timestamps: true  
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
