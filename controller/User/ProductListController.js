
const Product = require('../../models/productSchema');

const Category=require('../../models/categorySchema')
const Offer=require('../../models/offerSchema')

require("dotenv").config();

//controller for listing the products in user-side
exports.getProductList = async (req, res) => {
    try {
        const { sort, category, search, page = 1, limit = 10 } = req.query;
        const currentPage = parseInt(page);
        const itemsPerPage = parseInt(limit);
        let sortQuery = {};
        let filterQuery = { status: 'listed' };

      
        switch (sort) {
            case 'price_asc':
                sortQuery = { price: 1 };
                break;
            case 'price_desc':
                sortQuery = { price: -1 };
                break;
            case 'name_asc':
                sortQuery = { productName: 1 };
                break;
            case 'name_desc':
                sortQuery = { productName: -1 };
                break;
            default:
                sortQuery = { createdAt: -1 }; 
        }

        if (category) {
            filterQuery.category = category;
        }

        if (search) {
            filterQuery.productName = {
                $regex: new RegExp(search, 'i')
            };
        }

        const categories = await Category.find({ isListed: true });
        const totalProducts = await Product.countDocuments(filterQuery);

        const currentDate = new Date();
        const activeOffers = await Offer.find({
            isActive: true,
            startDate: { $lte: currentDate },
            endDate: { $gte: currentDate },
            $or: [
                { usageLimit: null },
                {
                    $expr: {
                        $lt: ['$usageCount', '$usageLimit']
                    }
                }
            ]
        });

        let products = await Product.find(filterQuery)
            .populate({
                path: 'category',
                match: { isListed: true }
            })
            .sort(sortQuery)
            .skip((currentPage - 1) * itemsPerPage)
            .limit(itemsPerPage)
            .exec();

        products = await Promise.all(products.map(async product => {
            let bestOfferPrice = null;

            const productPrice = parseFloat(product.price);
            
            
            const categoryOffers = activeOffers.filter(offer => {
                const minPrice = parseFloat(offer.minProductPrice) || 0;
                const isValidPrice = productPrice >= minPrice;
               
                
                return offer.type === 'CATEGORY' && 
                       offer.categoryId && 
                       product.category && 
                       offer.categoryId.equals(product.category._id) && 
                       isValidPrice;
            });

            const productOffers = activeOffers.filter(offer => {
                const minPrice = parseFloat(offer.minProductPrice) || 0;
                const isValidPrice = productPrice >= minPrice;
               
                
                return offer.type === 'PRODUCT' && 
                       offer.productId && 
                       offer.productId.equals(product._id) && 
                       isValidPrice;
            });

            const applicableOffers = [...categoryOffers, ...productOffers];
            

        
            applicableOffers.forEach(offer => {
                let discountAmount;
                const minPrice = parseFloat(offer.minProductPrice) || 0;

                
                if (productPrice >= minPrice) {
                    if (offer.discountType === 'PERCENTAGE') {
                        discountAmount = (productPrice * offer.discountValue) / 100;
                        if (offer.maxDiscountAmount) {
                            discountAmount = Math.min(discountAmount, offer.maxDiscountAmount);
                        }
                    } else { 
                        discountAmount = offer.discountValue;
                    }

                    const offerPrice = Math.max(0, productPrice - discountAmount);
                   
                    if (!bestOfferPrice || offerPrice < bestOfferPrice) {
                        bestOfferPrice = offerPrice;
                    }
                }
            });

          
            if (!bestOfferPrice && product.offerPrice) {
               
                await Product.findByIdAndUpdate(product._id, { $unset: { offerPrice: 1 } });
                product.offerPrice = null;
            }
          
            else if (bestOfferPrice && (!product.offerPrice || bestOfferPrice < product.offerPrice)) {
               
                await Product.findByIdAndUpdate(product._id, { offerPrice: bestOfferPrice });
                product.offerPrice = bestOfferPrice;
            }

            return product;
        }));

        
        const totalPages = Math.ceil(totalProducts / itemsPerPage);
        const filteredProducts = products.filter(product => product.category !== null);

        res.render('layout', {
            title: 'Store',
            content: 'partials/productList',
            products: filteredProducts,
            categories: categories,
            selectedCategory: category || '',
            currentSort: sort || '',
            searchQuery: search || '',
            user: req.session.user || null,
            totalPages,
            currentPage
        });

    } catch (error) {
        console.error("Error in getProductList:", error);
    }
};

//controller for showing the details of each product
exports.getProductDetails = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('category')
            .exec();
        
        if (!product) {
            return res.status(404).send('Product not found');
        }
        
      
        const relatedProducts = await Product.find({
            category: product.category._id,
            _id: { $ne: product._id } 
        })
        .limit(4) 
        .exec();
        
        res.render('layout',
             { content:'partials/productDetail',
                title:'Product Details',
                product,
                 relatedProducts , 
                });
    } catch (error) {
        console.error("Error fetching product details:", error);
        res.status(500).send('Error fetching product details');
    }
};
