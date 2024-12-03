
const User=require('../../models/userSchema')
const Product = require('../../models/productSchema');
const Order=require('../../models/OrderSchema')






// controller to render dashboard page
exports.getDashBoard = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalProducts = await Product.countDocuments();

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todaysSales = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: today },
                    orderStatus: { $nin: ['Cancelled', 'Returned'] }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$finalAmount" }
                }
            }
        ]);
        
        const todaysSalesAmount = todaysSales[0]?.total || 0;

        res.render('adminLayout', {
            title: "Dashboard",
            content: 'partials/adminDashBoard',
            totalUsers,
            totalProducts,
            todaysSalesAmount
        });
    } catch (error) {
        console.error('Dashboard render error:', error);
        res.status(500).render('error', { message: 'Error loading dashboard' });
    }
};

// controller to calculate dashboard statistics
exports.getDashBoardStats = async (req, res) => {
    try {
        const { timeFrame } = req.query;
        
        const getDateRange = () => {
            const now = new Date();
            switch (timeFrame) {
                case 'yearly':
                    return {
                        $gte: new Date(now.getFullYear(), 0, 1),
                        $lte: now
                    };
                case 'monthly':
                    return {
                        $gte: new Date(now.getFullYear(), now.getMonth(), 1),
                        $lte: now
                    };
                case 'weekly':
                    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    return {
                        $gte: lastWeek,
                        $lte: now
                    };
                default:
                    return {
                        $lte: now
                    };
            }
        };

        const salesData = await Order.aggregate([
            {
                $match: {
                    createdAt: getDateRange(),
                    orderStatus: { $nin: ['Cancelled', 'Returned'] }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                        day: { $dayOfMonth: '$createdAt' }
                    },
                    totalAmount: { $sum: '$finalAmount' },
                    orderCount: { $sum: 1 }
                }
            },
            {
                $sort: {
                    '_id.year': 1,
                    '_id.month': 1,
                    '_id.day': 1
                }
            }
        ]);

        const topProducts = await Order.aggregate([
            { $unwind: "$items" },
            {
                $match: {
                    createdAt: getDateRange(),
                    orderStatus: { $nin: ['Cancelled', 'Returned'] }
                }
            },
            {
                $group: {
                    _id: "$items.productId",
                    totalQuantity: { $sum: "$items.quantity" },
                    totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: "$productDetails" },
            {
                $project: {
                    productName: "$productDetails.productName",
                    totalQuantity: 1,
                    totalRevenue: 1
                }
            },
            { $sort: { totalRevenue: -1 } },
            { $limit: 10 }
        ]);

        const topCategories = await Order.aggregate([
            { $unwind: "$items" },
            {
                $match: {
                    createdAt: getDateRange(),
                    orderStatus: { $nin: ['Cancelled', 'Returned'] }
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.productId',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: "$product" },
            {
                $group: {
                    _id: "$product.category",
                    totalQuantity: { $sum: "$items.quantity" },
                    totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
                }
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'categoryDetails'
                }
            },
            { $unwind: "$categoryDetails" },
            { $sort: { totalRevenue: -1 } },
            { $limit: 10 }
        ]);

        res.json({
            success: true,
            data: {
                salesData,
                topProducts,
                topCategories
            }
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard statistics'
        });
    }
};

