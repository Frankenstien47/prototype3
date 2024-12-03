
const User = require('../../models/userSchema');
const Category=require('../../models/categorySchema')
require("dotenv").config();

// controller to render the wishList
exports.getWishList = async (req, res) => {
    try{
 const {sort,category,search}=req.query;
 const userId=req.session.user._id;
 let sortQuery={};
 
 const user=await User.findById(userId)
 .populate({
     path:'wishList.ProductId',
     populate:{
         path:'category',
         match:{isListed:true}
     }
 })
 let products=user.wishList
 .filter(item=>item.ProductId&&item.ProductId.status==='listed'&&item.ProductId.category)
 .map(item=>item.ProductId)
 
 if(search){
     products=products.filter(product=>product.productName.toLowerCase().includes(search.toLowerCase()))
 }
 if(category){
     products=products.filter(product=>product.category._id.toString()===category)
 }
 switch(sort){
     case'price_asc':
     products.sort((a,b)=>a.price-b.price)
     break;
     case'price_desc':
     products.sort((a,b)=>b.price-a.price)
     break;
     case'name_asc':
     products.sort((a,b)=>a.productName-b.productName)
     break;
     case'name_desc':
     products.sort((a,b)=>b.productName-a.productName)
     break;
     default:
         products.sort((a,b)=>{
             const dateA=user.wishList.find(item=>item.ProductId._id.equals(a._id)).date;
             const dateB=user.wishList.find(item=>item.ProductId._id.equals(b._id)).date;
             return dateB-dateA
               }) 
             }    
 const categories= await Category.find({isListed:true})
 
 res.render('layout', {
     title: 'Wishlist',
     content: 'partials/wishlist',
     products: products,
     categories: categories,
     selectedCategory: category || '',
     currentSort: sort || '',
     searchQuery: search || '',
     user: req.session.user
 });
 
 
    }catch(error){
     console.error("Error in getWishlist:", error);
         res.status(500).json({
             success:false,
             message: 'Error loading wishlist',
         }
         );
    }
 };
 
//  controller to add and remove items to wishList
 exports.toggleWishlist = async (req, res) => {
     try {
         const { productId } = req.body;
         const userId = req.session.user._id;
 
         const user = await User.findById(userId);
         const existingItem = user.wishList.find(item => 
             item.ProductId.toString() === productId
         );
 
         if (existingItem) {
             
             user.wishList = user.wishList.filter(item => 
                 item.ProductId.toString() !== productId
             );
             await user.save();
             res.json({ success: true, message: 'Product removed from wishlist' });
         } else {
             user.wishList.push({
                 ProductId: productId,
                 date: new Date()
             });
             await user.save();
             res.json({ success: true, message: 'Product added to wishlist' });
         }
 
     } catch (error) {
         console.error("Error in toggleWishlist:", error);
         res.status(500).json({
             success: false,
             message: 'Error updating wishlist'
         });
     }
 };