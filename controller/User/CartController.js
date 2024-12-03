
const Product = require('../../models/productSchema');
const Cart=require('../../models/userCart');
require("dotenv").config();



// function to calculate total cart items 
function calculateCartTotal(cart) {
    if (!cart || !cart.items || !Array.isArray(cart.items)) {
        return 0;
    }
    
    try {
        const total = cart.items.reduce((total, item) => {
            if (!item || !item.productId) {
                return total;
            }

            const price = Number(item.productId.offerPrice || item.productId.price || 0);
            const quantity = Number(item.quantity || 0);

            if (isNaN(price) || isNaN(quantity)) {
                return total;
            }

            return total + (price * quantity);
        }, 0);

        return isNaN(total) ? 0 : Number(total.toFixed(2));
    } catch (error) {
        console.error('Error calculating cart total:', error);
        return 0;
    }
}


// controller to render cart contents
exports.getCart = async (req, res) => {
    try {
        let cart = await Cart.findOne({ userId: req.session.user._id })
                            .populate('items.productId');

        if (!cart) {
            cart = new Cart({
                userId: req.session.user._id,
                items: [],
                total: 0
            });
            await cart.save();
        }

        cart.total = calculateCartTotal(cart);
        await cart.save();

        res.render('layout', {
            content: 'partials/userCart',
            cart: cart,
            total: cart.total,
            user: req.session.user || null,
            title: 'Shopping Cart',
            currentPage: 'cart'
        });

    } catch (error) {
        console.error('Cart Error:', error);
        res.render('layout', {
            content: 'partials/userCart',
            cart: { items: [], total: 0 },
            user: req.session.user || null,
            title: 'Shopping Cart',
            currentPage: 'cart',
            error: 'Unable to load cart. Please try again.'
        });
    }
};

// Controller to Add item to cart
exports.addToCart = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        if (!productId || !quantity) {
            return res.status(400).json({
                success: false,
                message: 'Product ID and quantity are required'
            });
        }

        const addToQuantity = Number(quantity);
        if (isNaN(addToQuantity) || addToQuantity < 1) {
            return res.status(400).json({
                success: false,
                message: 'Invalid quantity'
            });
        }

    
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        if (product.status === 'unlisted' || product.stock < addToQuantity) {
            return res.status(400).json({
                success: false,
                message: 'Product is currently unavailable or not enough stock available'
            });
        }

    
        let cart = await Cart.findOne({ userId: req.session.user._id });
        
        if (!cart) {
            cart = new Cart({
                userId: req.session.user._id,
                items: [],
                total: 0
            });
        }

        const existingItemIndex = cart.items.findIndex(item => 
            item.productId && item.productId.toString() === productId
        );

        if (existingItemIndex !== -1) {
            const newQuantity = cart.items[existingItemIndex].quantity + addToQuantity;
            
            if (newQuantity > product.stock) {
                return res.status(400).json({
                    success: false,
                    message: `Only ${product.stock} units available`
                });
            }
            
            cart.items[existingItemIndex].quantity = newQuantity;
        } else {
            cart.items.push({
                productId: product._id,
                quantity: addToQuantity
            });
        }

        await cart.save();

       
        cart = await Cart.findById(cart._id).populate('items.productId');
        
      
        if (!cart || !cart.items || cart.items.length === 0) {
            throw new Error('Failed to save cart items');
        }

        cart.total = calculateCartTotal(cart);
        await cart.save();

        const finalCart = await Cart.findById(cart._id).populate('items.productId');
        
        if (!finalCart || !finalCart.items || finalCart.items.length === 0) {
            throw new Error('Cart validation failed after save');
        }

        res.json({
            success: true,
            message: 'Product added to cart successfully',
            cart: finalCart,
            total: finalCart.total
        });

    } catch (error) {
        console.error('Add to Cart Error:', error);
        res.status(500).json({
            success: false,
            message: 'Unable to add item to cart. Please try again.',
            error: error.message
        });
    }
};

// Update cart item quantity
exports.updateQuantity = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const newQuantity = Number(quantity);

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        if (newQuantity > product.stock) {
            return res.status(400).json({
                success: false,
                message: 'Not enough stock available'
            });
        }

        let cart = await Cart.findOne({ userId: req.session.user._id })
                            .populate('items.productId');
        
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        const cartItem = cart.items.find(item => 
            item.productId._id.toString() === productId
        );

        if (!cartItem) {
            return res.status(404).json({
                success: false,
                message: 'Item not found in cart'
            });
        }

        cartItem.quantity = newQuantity;
        cart.total = calculateCartTotal(cart);
        await cart.save();

        res.json({
            success: true,
            message: 'Cart updated',
            cart: cart,
            total: cart.total
        });

    } catch (error) {
        console.error('Update Quantity Error:', error);
        res.status(500).json({
            success: false,
            message: 'Unable to update quantity. Please try again.'
        });
    }
};

// Remove item from cart
exports.removeItem = async (req, res) => {
    try {
        const { productId } = req.params;

        let cart = await Cart.findOne({ userId: req.session.user._id })
                            .populate('items.productId');
                            
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        cart.items = cart.items.filter(item => 
            item.productId._id.toString() !== productId
        );
        
        cart.total = calculateCartTotal(cart);
        await cart.save();

        res.json({
            success: true,
            message: 'Item removed from cart',
            cart: cart,
            total: cart.total
        });

    } catch (error) {
        console.error('Remove Item Error:', error);
        res.status(500).json({
            success: false,
            message: 'Unable to remove item. Please try again.'
        });
    }
};

// Clear cart controller
exports.clearCart = async (req, res) => {
    try {
        let cart = await Cart.findOne({ userId: req.session.user._id });
        if (cart) {
            cart.items = [];
            cart.total = 0;
            await cart.save();
        }

        res.json({
            success: true,
            message: 'Cart cleared',
            cart: { items: [], total: 0 }
        });

    } catch (error) {
        console.error('Clear Cart Error:', error);
        res.status(500).json({
            success: false,
            message: 'Unable to clear cart. Please try again.'
        });
    }
};

// controller to get cart item count
exports.getCartCount = async (req, res) => {
    try {
        const cart = await Cart.findOne({ userId: req.session.user._id });
        const count = cart ? cart.items.reduce((total, item) => total + item.quantity, 0) : 0;

        res.json({
            success: true,
            count: count
        });
    } catch (error) {
        console.error('Cart Count Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching cart count'
        });
    }
};
