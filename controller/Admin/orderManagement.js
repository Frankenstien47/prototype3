const User=require('../../models/userSchema')
const Product = require('../../models/productSchema');
const Order=require('../../models/OrderSchema')
const WalletTransaction=require('../../models/walletSchema')





// controller to render Order management page
exports.orderManagement = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('userId', 'name email')
            .populate('items.productId', 'productName')
            .sort({ createdAt: -1 });
        
        const modifiedOrders = orders.map(order => ({
            ...order.toObject(),
            userId: order.userId || { name: 'N/A', email: 'N/A' }
        }));
        
        res.render('adminLayout', {
            content: 'partials/adminOrders',
            title: 'Order Management',
            orders: modifiedOrders,
            messages: req.flash()
        });
    } catch (error) {
        req.flash('error', 'Failed to load orders: ' + error.message);
        res.redirect('/admin/dashboard');
    }
};

//controller to Update individual order item status
exports.updateItemStatus = async (req, res) => {
    try {
        const { orderId, itemId } = req.params;
        const { status } = req.body;

        const order = await Order.findById(orderId);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const item = order.items.id(itemId);
        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Item not found'
            });
        }

        
        item.status = status;

      
        const allItemsHaveStatus = order.items.every(item => item.status === status);
        if (allItemsHaveStatus) {
            order.orderStatus = status;
        } else {
        
            order.orderStatus = 'Processing';
        }

        
        if (status === 'Cancelled' && order.paymentStatus === 'Completed') {
           
            order.paymentStatus = 'Refunded';
        }

        await order.save();

        return res.json({
            success: true,
            message: `Item status updated to ${status}`,
            orderStatus: order.orderStatus
        });
    } catch (error) {
        console.error('Error updating item status:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update item status'
        });
    }
};

//controller to update whole order status
exports.orderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { orderStatus } = req.body;

        const order = await Order.findById(orderId);
        
        if (!order) {
            req.flash('error', 'Order not found');
            return res.redirect('/admin/orders');
        }

        order.items.forEach(item => {
            item.status = orderStatus;
        });
        order.orderStatus = orderStatus;

        if (orderStatus === 'Cancelled' && order.paymentStatus === 'Completed') {
            order.paymentStatus = 'Refunded';
        }

        await order.save();
        req.flash('success', `Order status successfully updated to ${orderStatus}`);
        res.redirect('/admin/orders');
    } catch (error) {
        req.flash('error', 'Failed to update order status: ' + error.message);
        res.redirect('/admin/orders');
    }
};
// controller to approve the return request
exports.approveReturn = async (req, res) => {
    try {
        const { orderId, itemId } = req.params;
        
        const order = await Order.findById(orderId).populate('items.productId');
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const orderItem = order.items.id(itemId);
        if (!orderItem) {
            return res.status(404).json({
                success: false,
                message: 'Order item not found'
            });
        }

        if (orderItem.status !== 'Return Requested') {
            return res.status(400).json({
                success: false,
                message: 'This item is not pending return approval'
            });
        }

      
        orderItem.status = 'Returned';
        orderItem.returnRequest.status = 'Approved';
        
       
        if (orderItem.productId) {
            await Product.findByIdAndUpdate(orderItem.productId._id, {
                $inc: { stock: orderItem.quantity }
            });
        }

        const refundAmount = orderItem.price * orderItem.quantity;
        
     
        const walletTransaction = new WalletTransaction({
            userId: order.userId._id,
            type: 'Credit',
            amount: refundAmount,
            description: `Refund for returned item from Order ${order._id}`,
            orderId: order._id
        });
        await walletTransaction.save();

        
        await User.findByIdAndUpdate(order.userId._id, {
            $inc: { walletBalance: refundAmount }
        });

        order.recalculateTotal();

        
        const allItemsReturned = order.items.every(item => 
            item.status === 'Returned' || item.status === 'Cancelled'
        );
        if (allItemsReturned) {
            order.orderStatus = 'Returned';
        }

        await order.save();

        return res.json({
            success: true,
            message: 'Return request approved successfully'
        });
    } catch (error) {
        console.error('Error approving return request:', error);
        return res.status(500).json({
            success: false,
            message: 'Error processing return approval'
        });
    }
};
// controller to reject return request
exports.rejectReturn = async (req, res) => {
    try {
        const { orderId, itemId } = req.params;
        
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const orderItem = order.items.id(itemId);
        if (!orderItem) {
            return res.status(404).json({
                success: false,
                message: 'Order item not found'
            });
        }

        if (orderItem.status !== 'Return Requested') {
            return res.status(400).json({
                success: false,
                message: 'This item is not pending return approval'
            });
        }

      
        orderItem.status = 'Delivered';
        orderItem.returnRequest.status = 'Rejected';

        await order.save();

        return res.json({
            success: true,
            message: 'Return request rejected successfully'
        });
    } catch (error) {
        console.error('Error rejecting return request:', error);
        return res.status(500).json({
            success: false,
            message: 'Error processing return rejection'
        });
    }
};