
const User = require('../../models/userSchema');
const Address=require('../../models/AddressSchema')
const Product = require('../../models/productSchema');
const Order=require('../../models/OrderSchema')
const Cart=require('../../models/userCart')
const Coupon=require('../../models/couponSchema')
const WalletTransaction=require('../../models/walletSchema')
const razorpay=require('../../config/Razorpay')
const crypto = require('crypto');

require("dotenv").config();

// Controller to render checkout page
exports.getCheckout = async (req, res) => {
    try {
        user=await User.findById(req.session.user)
        const cart = await Cart.findOne({ userId: req.session.user._id })
            .populate('items.productId');

        if (!cart || cart.items.length === 0) {
            req.flash('error', 'Your cart is empty');
            return res.redirect('/user/cart');
        }

        const walletBalance = user.walletBalance;
        const addresses = await Address.find({ userId: req.session.user._id });

      


        const totalAmount=cart.total;

     
        let finalAmount = totalAmount; 
        

        const currentDate = new Date();
        const usableCoupons = await Coupon.find({
            status: 'active',
            expirationDate: { $gt: currentDate },
            $expr: {
                $lt: ['$usedCount', '$usageLimit']
            },
            minOrderValue: { $lte: finalAmount }
        });
        res.render('user/checkout', {
            cart,
            addresses,
            totalAmount,
            finalAmount,
            walletBalance,
            user: req.session.user,
            RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
            usableCoupons,

        });

    } catch (error) {
        console.error('Checkout Error:', error);
        req.flash('error', 'Failed to load checkout page');
        res.redirect('/user/cart');
    }
};

// Controller to create orders
exports.createOrder = async (req, res) => {

    try {
        const { addressId, paymentMethod,appliedCoupon } = req.body;
        
        
    
        if (!req.session.user || !req.session.user._id) {
            throw new Error('User session not found');
        }




        const user=await User.findById(req.session.user._id)
        const cart = await Cart.findOne({ userId: req.session.user._id })
            .populate('items.productId');

        if (!cart || cart.items.length === 0) {
            throw new Error('Cart is empty');
        }

       
        for (const item of cart.items) {
            if (item.quantity > item.productId.stock) {
                throw new Error(`Insufficient stock for ${item.productId.name}`);
            }
        }

    
        const subtotal = cart.total;
        const deliveryFee = 40;
        let discountAmount=0;
        let finalAmount=subtotal+deliveryFee;
        let razorpayOrderId = null;
        let walletTransaction = null;
      
    
       
          if (appliedCoupon) {
        
            
            const coupon = await Coupon.findOne({ 
                code: appliedCoupon.code,
                status: 'active'
            });

            if (coupon) {
               
                if (coupon.discountType === 'percentage') {
                    discountAmount = (subtotal * coupon.discountValue) / 100;
                   
                    if (coupon.maxDiscount) {
                        discountAmount = Math.min(discountAmount, coupon.maxDiscount);
                    }
                } else { 
                    discountAmount = Math.min(coupon.discountValue, subtotal); 
                }

             
                finalAmount = subtotal - discountAmount + deliveryFee;

             
              }  
            }

            if (paymentMethod === 'cashOnDelivery' && (finalAmount-40) < 1000) {
                throw new Error('Cash on Delivery is only available for orders above 1000 Rupees');
            }

           
            if(paymentMethod==='walletPayment'){
                if(user.walletBalance<finalAmount){
                    throw new Error('Insufficient balance in Wallet')
                }else{
                user.walletBalance-=finalAmount;
                }
             } else if (paymentMethod === 'onlinePayment') {
            const razorpayOrder = await razorpay.orders.create({
                amount: Math.round(finalAmount * 100),
                currency: 'INR',
                receipt: `order_${Date.now()}`

        
            });
            razorpayOrderId = razorpayOrder.id;
            console.log(razorpayOrder);
            
               
        }
        
        const order = new Order({
            userId: req.session.user._id,
            items: cart.items.map(item => ({
                productId: item.productId._id,
                quantity: item.quantity,
                price: item.productId.price,
                status: 'Processing'
            })),
            subtotal,
            discountAmount: discountAmount,
            deliveryFee: deliveryFee,
            finalAmount:finalAmount,
            paymentMethod,
            shippingAddress: addressId,
            paymentStatus:paymentMethod==='walletPayment'?'Completed':(paymentMethod === 'onlinePayment' ? 'Pending' : 'Completed'),
            orderStatus: 'Processing',
            razorpayOrderId,
            coupon: appliedCoupon ? {
                code: appliedCoupon.code,
                discountType: appliedCoupon.discountType,
                discountValue: appliedCoupon.discountValue
            } : null
        });
      
        if(paymentMethod==='walletPayment'){
           

            const walletTransaction = new WalletTransaction({
                userId: order.userId._id,
                type: 'Debit',
                amount: finalAmount,
                description: `Refund for returned item from Order ${order._id}`,
                orderId: order._id
            });
            await walletTransaction.save();
        }

        
        await order.save();

        await user.save()
   
        if (paymentMethod === 'cashOnDelivery'|| paymentMethod==='walletPayment') {
        for (const item of cart.items) {
            await Product.findByIdAndUpdate(
                item.productId._id,
                { $inc: { stock: -item.quantity } }
            );
        }

            await Cart.findByIdAndDelete(cart._id);

          
            if (appliedCoupon) {
                await Coupon.findOneAndUpdate(
                    { code: appliedCoupon.code },
                    { $inc: { usedCount: 1 } }
                );
            }
        }

        res.json({
            success: true,
            order,
            message: 'Order created successfully'
        });

    } catch (error) {
        console.error('Create Order Error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create order'
        });
    }
};


// Controller to verify payment 
exports.verifyPayment = async (req, res) => {
    try {
        const { orderId, razorpayPaymentId, razorpaySignature, status, errorMessage } = req.body;
        
      
        const order = await Order.findById(orderId).populate('items.productId');
        if (!order) {
            throw new Error('Order not found');
        }

        if (status === 'failed') {
            
            order.paymentStatus = 'Failed';
            order.paymentFailureReason = errorMessage || 'Payment failed';
            await order.save();

            return res.json({
                success: true,
                message: 'Payment status updated to failed',
            });
        }

     
        const body = `${order.razorpayOrderId}|${razorpayPaymentId}`;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest("hex");

        if (expectedSignature !== razorpaySignature) {
            order.paymentStatus = 'Failed';
            order.paymentFailureReason = 'Invalid payment signature';
            await order.save();
            throw new Error('Invalid payment signature');
        }

      
        order.paymentStatus = 'Completed';
        await order.save();

      
        for (const item of order.items) {
            await Product.findByIdAndUpdate(
                item.productId._id, 
                { $inc: { stock: -item.quantity } }
            );
        }

      
        await Cart.findOneAndDelete({ userId: order.userId });

     
        if (order.coupon) {
            await Coupon.findOneAndUpdate(
                { code: order.coupon.code }, 
                { $inc: { usedCount: 1 } }
            );
        }

        res.json({
            success: true,
            message: 'Payment verified successfully',
        });

    } catch (error) {
        console.error('Payment Verification Error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Payment verification failed',
        });
    }
};

// controller to retry failed payments
exports.retryPayment = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await Order.findById(orderId)
            .populate('userId', 'name email phone walletBalance');

        if (!order) {
            throw new Error('Order not found');
        }

    
        if (order.userId._id.toString() !== req.session.user._id.toString()) {
            throw new Error('Unauthorized access to order');
        }

        if (order.paymentStatus !== 'Failed') {
            throw new Error('Invalid order status for payment retry');
        }
        if(order.paymentMethod==='walletPayment'){
            if(order.finalAmount>user.walletBalance){
                throw new Error('Insufficient amount of Balance in Wallet')
            }

            await User.findByIdAndUpdate(
                order.userId._id,
                {$inc:{walletBalance:-order.finalAmount}
            })

            const walletTransaction=new WalletTransaction({
                userId:user._id,
                Type:'Debit',
                amount:finalAmount,
                orderId:order._id,
            })
            await walletTransaction.save();
            
            order.paymentStatus='Completed'

           for( const item of order.items){
            await Product.findByIdAndUpdate(
                item.productId,
                {$inc:{stock:-item.quantity}}
            )
           }

           if(order.coupon){
            await Coupon.findOneAndUpdate(
                {code:order.coupon.code},
                {$inc:{usedCount:1}}
            )
           }
           order.save()

           res.json({
            success:true,
            message:'payment successfully completed using wallet ',
            order,
           })
        }else if(order.paymentMethod==='onlinePayment'){


const timeStamp=Date.now().toString().slice(-8)
const shortId=orderId.slice(-8)
const receiptId=`retry_${shortId}_${timeStamp}`
       
        const razorpayOrder = await razorpay.orders.create({
            amount: order.finalAmount * 100, 
            currency: 'INR',
            receipt: receiptId,
        });

        order.razorpayOrderId = razorpayOrder.id;
        await order.save();

        res.json({
            success: true,
            order: {
                ...order.toObject(),
                razorpayOrderId: razorpayOrder.id,
            },
        });
    }else{
        throw new Error('Invalid payment method for retry');
    }
    } catch (error) {
        console.error('Retry Payment Error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to initialize payment retry',
        });
    }
};

// controller to validate coupons
exports.validateCoupon = async (req, res) => {
    try {
        const { code, orderAmount } = req.body;

    
        const coupon = await Coupon.findOne({
            code: code.toUpperCase(),
            status: 'active',
            expirationDate: { $gt: new Date() },
        });

        if (!coupon) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired coupon code'
            });
        }
        if (coupon.usedCount >= coupon.usageLimit) {
            return res.status(400).json({
                success: false,
                message: 'Coupon usage limit exceeded'
            });
        }

   
        if (orderAmount < coupon.minOrderValue) {
            return res.status(400).json({
                success: false,
                message: `Minimum order amount should be ₹${coupon.minOrderValue}`
            });
        }

        let discountAmount;
        if (coupon.discountType === 'percentage') {
            discountAmount = (orderAmount * coupon.discountValue) / 100;
            if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
                discountAmount = coupon.maxDiscount;
            }
        } else {
            discountAmount = Math.min(coupon.discountValue, orderAmount);
        }

        const finalAmount = orderAmount - discountAmount;

        res.json({
            success: true,
            coupon: {
                code: coupon.code,
                discountType: coupon.discountType,
                discountValue: coupon.discountValue
            },
            discountAmount,
            finalAmount
        });

    } catch (error) {
        console.error('Coupon validation error:', error);
        res.status(500).json({
            success: false,
            message: 'Error validating coupon'
        });
    }
};
