const Product = require('../../models/productSchema');
const path = require('path');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

const fs = require('fs').promises;

//controller to render product management page
exports.getProducts=async(req,res)=>{
    try{
        const products=await Product.find({});
        if (!products || products.length === 0) {
            req.flash('error_msg', 'No products found.');
            console.log('error finding product');
            
        }
        res.render('adminLayout',{
            title:"Products",
            content:'partials/adminProductList',
            products
        }) 
    }catch(error){
        console.error('Error Fetching products',error)
        req.flash('error_msg','Failed to fetch the products' )
        res.redirect('/admin/dashBoard')
    }
}
//controller to fetch Add Products page 
exports.getAddProducts=(req,res)=>{
    res.render('admin/addProducts',{ success_msg: req.flash('success_msg'),
        error_msg: req.flash('error_msg')})
}
// controller to handle Add product submission 
exports.postAddProduct = async (req, res) => {
    try {
        const { productName,description, variant, stock, price, category } = req.body;
        const imagePaths = [];

       
        for (let i = 1; i <= 3; i++) {
            const croppedImage = req.body[`croppedImage${i}`];

           
            if (!croppedImage) {
                throw new Error(`croppedImage${i} is missing.`);
            }

            const base64Data = croppedImage.split(';base64,').pop();
            const imageBuffer = Buffer.from(base64Data, 'base64');

            
            if (imageBuffer.length === 0) {
                throw new Error(`Image buffer for croppedImage${i} is empty.`);
            }

           
            const processedImageBuffer = await sharp(imageBuffer)
                .resize(800, 800, {
                    fit: 'contain',
                    background: { r: 255, g: 255, b: 255, alpha: 1 }
                })
                .jpeg({ quality: 90 })
                .toBuffer();

          
            const filename = `${uuidv4()}.jpg`;
            const filepath = path.join(__dirname, '..', 'public', 'uploads', filename);
            await fs.writeFile(filepath, processedImageBuffer);

            imagePaths.push(`/uploads/${filename}`);
        }

        const product = new Product({
            productName,
            description,
            images: imagePaths,
            variant,
            stock,
            price,
            category
        });

        await product.save();
        req.flash('success_msg', 'Product added successfully!');
        res.redirect('/admin/products');
    } catch (err) {
        console.error('Error adding product:', err.message); 
        req.flash('error_msg', 'Error adding product: ' + err.message); 
        res.redirect('/admin/products/add');
    }
};
  //controller to  Delete product
exports.postDeleteProduct = async (req, res) => {
    const productId = req.params.id;

    try {
        await Product.findByIdAndDelete(productId);  
        req.flash('success_msg', 'Product deleted successfully!');
        res.redirect('/admin/products');
    } catch (error) {
        console.error("Error deleting product:", error);
        req.flash('error_msg', 'Failed to delete product.');
        res.redirect('/admin/products');
    }
};

// controller to Toggle product status between "listed" and "unlisted"
exports.postToggleProductStatus = async (req, res) => {
    const productId = req.params.id;

    try {
        const product = await Product.findById(productId);
        if (!product) {
            return res.json({
                success: false,
                message: 'Product not found.'
            });
        }

        product.status = product.status === 'listed' ? 'unlisted' : 'listed';
        await product.save();
        
        res.json({
            success: true,
            message: `Product ${product.status === 'listed' ? 'listed' : 'unlisted'} successfully!`,
            newStatus: product.status
        });
    } catch (error) {
        console.error("Error toggling product status:", error);
        res.json({
            success: false,
            message: 'Failed to update product status.'
        });
    }
};
// controller to fetch the editing page
exports.getEditProduct = async (req, res) => {
    try {
        const productId = req.params.id; 
        const product = await Product.findById(productId); 

        if (!product) {
            req.flash('error_msg', 'Product not found.'); 
            return res.redirect('/admin/products');
        }

        res.render('admin/editProducts', { product,
            error_msg:req.flash('error_msg')
         }); 
    } catch (error) {
        console.error('Error fetching product for edit:', error);
        req.flash('error_msg', 'Failed to fetch product details.'); 
        res.redirect('/admin/products'); 
}
};
// controller to Handle product update
exports.postEditProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const { productName, variant, price, stock, status, description, category } = req.body;
        
      
        let updatedImages = [];
        
       
        for (let i = 1; i <= 3; i++) {
            const croppedImage = req.body[`croppedImage${i}`];
            
            if (croppedImage && croppedImage.startsWith('data:image')) {
                
                const base64Data = croppedImage.split(';base64,').pop();
                const imageBuffer = Buffer.from(base64Data, 'base64');
                
                
                const processedImageBuffer = await sharp(imageBuffer)
                    .resize(800, 800, {
                        fit: 'contain',
                        background: { r: 255, g: 255, b: 255, alpha: 1 }
                    })
                    .jpeg({ quality: 90 })
                    .toBuffer();

                const filename = `${uuidv4()}.jpg`;
                const filepath = path.join(__dirname, '..', 'public', 'uploads', filename);
                await fs.writeFile(filepath, processedImageBuffer);
                
                updatedImages.push(`/uploads/${filename}`);
            } else {
               
                const existingProduct = await Product.findById(productId);
                if (existingProduct.images[i-1]) {
                    updatedImages.push(existingProduct.images[i-1]);
                }
            }
        }

       
        await Product.findByIdAndUpdate(productId, {
            productName,
            variant,
            price,
            stock,
            status,
            description,
            category,
            images: updatedImages
        });

        req.flash('success_msg', 'Product updated successfully!');
        res.redirect('/admin/products');
    } catch (error) {
        console.error('Error updating product:', error);
        req.flash('error_msg', 'Error updating product.');
        res.redirect('/admin/products');
    }
};

