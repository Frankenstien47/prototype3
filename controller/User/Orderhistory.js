
const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');
const Order=require('../../models/OrderSchema')
const WalletTransaction=require('../../models/walletSchema')
const walletController=require('./UserWallet')

const PDFDocument=require('pdfkit')
require("dotenv").config();

// controller to render orders
exports.getOrderHistory = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const user=User.findById(userId)
        
        const orders = await Order.find({ userId })
            .populate({
                path: 'items.productId',
                select: 'productName images',
            })
            .sort({ createdAt: -1 });
            
        res.render('profileLayout', {
            content: 'partials/userOrderHistory',
            title: 'Order History',
            currentPage: 'orders',
            orders,
            user,
            RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID  
        });
    } catch (error) {
        console.error('Error fetching order history:', error);
        res.status(500).send('Error fetching order history');
    }
};
  
// controller to cancel order item
  exports.cancelOrderItem = async (req, res) => {
    try {
        const { orderId, itemId } = req.params;
        const userId = req.session.user._id;

        const order = await Order.findOne({ _id: orderId, userId });
        
        
        

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found.'
            });
        }

        const orderItem = order.items.id(itemId);
        if (!orderItem) {
            return res.status(404).json({
                success: false,
                message: 'Order item not found.'
            });
        }

        if (orderItem.status !== 'Processing' && orderItem.status !== 'Shipped') {
            return res.status(400).json({
                success: false,
                message: 'This item cannot be cancelled in its current status.'
            });
        }
     
    
        let refundAmount=orderItem.price;

        await walletController.createWalletTransaction(
            userId,
            'Credit',
            refundAmount,
            `Refund for cancelled item from order #${order._id}`,
            orderId
        );

        orderItem.status = 'Cancelled';
        if (orderItem.productId && orderItem.productId._id) {
            await Product.findByIdAndUpdate(orderItem.productId._id, {
                $inc: { stock: orderItem.quantity }
            });
        
        } else {
            console.warn('Product ID not found for order item');
        }

      
        const user= await User.findById(userId);
        await user.save()

      
        order.recalculateTotal();

        const allItemsCancelled = order.items.every(item => item.status === 'Cancelled');
        if (allItemsCancelled) {
            order.orderStatus = 'Cancelled';
        }

        let newWalletBalance=user.walletBalance;

        await order.save();
        

        return res.json({
            success: true,
            message: 'Item cancelled and refunded to wallet successfully',
            refundAmount
        });
    } catch (error) {
        console.error('Error cancelling order item:', error);
        return res.status(500).json({
            success: false,
            message: 'Error cancelling order item'
        });
    }
};
// controller to request return the delivered item
exports.requestReturn=async(req,res)=>{
    try{
        const {orderId,itemId}=req.params
        const userId=req.session.user._id;
        const {reason}=req.body;
        const order = await Order.findOne({ _id: orderId, userId });

        if(!order){
            return res.status(404).json({
                success:false,
                message:"Order not found"
            })
        }
        const orderItem=order.items.id(itemId);
        if(!orderItem){
            return res.status(404).json({
                success:false,
                message:"Order Item not found"
            })
        }
        if(orderItem.status!=='Delivered'){
            return res.status(400).json({
                success:false,
                message:'Only Delivered items can be returned'
            })
        }
        orderItem.status='Return Requested';
        orderItem.returnRequest={
            reason,
            requestDate:new Date(),
            status:"Pending"
        }

        await order.save()

        return res.json({
            success:true,
            message:"Return request submitted successfully"
        })

    }catch(error){
        console.error('Error submitting return request:', error);
        return res.status(500).json({
            success: false,
            message: 'Error submitting return request'
        });
    

    }
}

const formatCurrency=(amount)=>{
    return new Intl.NumberFormat('en-IN').format(amount)
}

const generateInvoice = async (order, user) => {
    const doc = new PDFDocument({ margin: 50 });
    doc.fontSize(24).text('DC-STORES', { align: 'center',underline: true });
    doc.moveDown(0.5);
    doc.fontSize(14).text('Bill Invoice', { align: 'center', underline: true });
    doc.moveDown();


    doc.rect(50, doc.y, 500, 80).stroke();
    const detailsY = doc.y + 10;
    doc.fontSize(10);
    doc.text(`Invoice Date: ${new Date(order.createdAt).toLocaleDateString()}`, 60, detailsY);
    doc.text(`Order ID: ${order._id}`, 60, detailsY + 20);
    doc.text(`Payment Method: ${order.paymentMethod}`, 60, detailsY + 40);
    doc.moveDown(4);


    doc.rect(50, doc.y, 500, 100).stroke();
    const customerY = doc.y + 10;
    doc.text('Bill To:', 60, customerY);
    doc.text(`Name: ${user.name}`, 60, customerY + 20);
    doc.text(`Email: ${user.email}`, 60, customerY + 40);
    const address = order.shippingAddress;
    doc.text(`Address: ${address.location}, ${address.city}`, 60, customerY + 60);
    doc.text(`${address.state}, ${address.pinCode}`, 120, customerY + 80);
    doc.moveDown(6);

 
    const tableTop = doc.y;
    const itemX = 50;
    const quantityX = 250;
    const priceX = 350;
    const amountX = 450;

    doc.rect(50, tableTop, 500, 20).fill('#f0f0f0').stroke();
    
    
    doc.fill('#000000').font('Helvetica-Bold');
    doc.text('Item', itemX + 5, tableTop + 5);
    doc.text('Quantity', quantityX + 5, tableTop + 5);
    doc.text('Price', priceX + 5, tableTop + 5);
    doc.text('Amount', amountX + 5, tableTop + 5);

    let itemY = tableTop + 25;
    doc.font('Helvetica');
    
    order.items.forEach((item, index) => {
        if (item.status === 'Delivered') {
            
            doc.rect(50, itemY - 5, 500, 25).stroke();
            
            doc.text(item.productId.productName, itemX + 5, itemY);
            doc.text(item.quantity.toString(), quantityX + 5, itemY);
            doc.text(formatCurrency(item.price), priceX + 5, itemY);
            doc.text(formatCurrency(item.price * item.quantity), amountX + 5, itemY);
            
            itemY += 25;
        }
    });

  
    doc.moveDown(2);
    const summaryX = 300;
    const summaryStartY = doc.y;
    

    doc.rect(summaryX - 10, summaryStartY, 260, 100).stroke();
    
    doc.text('Subtotal:', summaryX, summaryStartY + 10);
    doc.text(formatCurrency(order.subtotal), amountX, summaryStartY + 10);
    
    if (order.coupon && order.discountAmount > 0) {
        doc.text('Discount:', summaryX, summaryStartY + 30);
        doc.text(`-${formatCurrency(order.discountAmount)}`, amountX, summaryStartY + 30);
    }
    
    doc.text('Delivery Fee:', summaryX, summaryStartY + 50);
    doc.text(formatCurrency(order.deliveryFee), amountX, summaryStartY + 50);
    
    doc.font('Helvetica-Bold');
    doc.text('Total Amount:', summaryX, summaryStartY + 70);
    doc.text(formatCurrency(order.finalAmount), amountX, summaryStartY + 70);

    // Add footer
    doc.fontSize(8).font('Helvetica');
    doc.moveDown(4);
    doc.text('This is a computer generated invoice and does not require physical signature.', { align: 'center' });
    
    return doc;
};
// controller to download Invoice
exports.downloadInvoice= async(req,res)=>{
    try{
        const { orderId } = req.params;
        const userId = req.session.user._id;

        const order = await Order.findOne({
            _id: orderId,
            userId,
            orderStatus: 'Delivered'
        }).populate('items.productId shippingAddress userId');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found or not delivered'
            });
        }

        const user = await User.findById(userId);

        const doc = await generateInvoice(order, user);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${orderId}.pdf`);
        
        doc.pipe(res);
        doc.end();


    } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating invoice'
        });
    }
};