const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
         
    },
    isListed: {
        type: Boolean,
        default: true,  // Initially all categories are listed
    },
    image: {
        type: String,  
        required: true  
    }
});

const Category = mongoose.model('Category', categorySchema);
module.exports = Category;