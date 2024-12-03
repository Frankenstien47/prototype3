
const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');



// controller to render the category management page
exports.getCategories = async (req, res) => {
    try {
        const categories = await Category.find();  
        res.render('adminLayout', {
            title:'Category',
            content:'partials/adminCategory',
            categories,
            error:req.flash('error_msg')|| null,
            success_msg:req.flash('success_msg')||null
        });
    } catch (err) {
        res.status(500).send('Server Error');
    }
};
//controller to fetch categories for editing and Adding products
exports.getCategoriesJson = async (req, res) => {
    try {
        const categories = await Category.find();
        res.json(categories);  
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
};

//controller to list category
exports.listCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;

        
        await Category.findByIdAndUpdate(categoryId, { isListed: true });

        
        await Product.updateMany({ category: categoryId }, { isListed: true });

        res.redirect('/admin/categories');
    } catch (err) {
        res.status(500).send('Server Error');
    }
};

// controller to Unlist a category 
exports.unlistCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;

      
        await Category.findByIdAndUpdate(categoryId, { isListed: false });
        await Product.updateMany({ category: categoryId }, { isListed: false });

        res.redirect('/admin/categories');
    } catch (err) {
        res.status(500).send('Server Error');
    }
};

// controller to add category
exports.addCategory = async (req, res) => {
    try {
        const { name } = req.body;
    
        if (!name || !req.file) {
            throw new Error('Name or image file is missing');
        }
    
        const existingCategory = await Category.findOne({ name });
        if (existingCategory) {
            req.flash('error_msg', 'Category already exists');
            return res.redirect('/admin/categories');
        }
    
        const category = new Category({
            name,
            image: req.file.filename  
        });
    
        await category.save();
        req.flash('success_msg', 'Category added successfully!');
        res.redirect('/admin/categories');
    } catch (err) {
        console.error(err.message); 
        req.flash('error_msg', 'Server Error');
        res.status(500).send('Server Error');
    }
};
// controller to render edit category page
exports.getEditCategory=async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).send("Category not found");
        }
        res.render('admin/editCategory', { category,
            error_msg:req.flash('error_msg')
        });
    } catch (error) {
        res.status(500).send("Server error");
    }
};
// controller to handle edit category submission
exports.editCategory=async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).send("Category not found");
        }

      
        category.name = req.body.name;

        if (req.file) {
            category.image = req.file.filename;
        }

       
        await category.save();

        
        res.redirect('/admin/categories');
    } catch (error) {
        res.status(500).send("Server error");
    }
};
