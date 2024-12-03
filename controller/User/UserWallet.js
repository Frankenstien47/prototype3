
const User = require('../../models/userSchema');
const WalletTransaction=require('../../models/walletSchema')
require("dotenv").config();

// controller to render wallet page
exports.createWalletTransaction = async (userId, type, amount, description, orderId = null) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        let newBalance;
        if (type.toLowerCase() === 'credit') {
            newBalance = user.walletBalance + amount;
        } else if (type.toLowerCase() === 'debit') {
            newBalance = user.walletBalance - amount;
            if (newBalance < 0) {
                throw new Error('Insufficient wallet balance');
            }
        } else {
            throw new Error('Invalid transaction type');
        }

        const transaction = new WalletTransaction({
            userId,
            type: type.toLowerCase() === 'credit' ? 'Credit' : 'Debit',
            amount,
            description,
            orderId,
            balance: newBalance
        });

      
        await transaction.save();
        user.walletBalance = newBalance;
        await user.save();

        return transaction;
    } catch (error) {
        throw error;
    }
};

//controller to get wallet balance 
exports.getWalletBalance = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const transactions = await WalletTransaction.find({ userId })
            .sort({ createdAt: -1 })
            .limit(10);

        res.render('profileLayout', {
            content: 'partials/wallet',
            title: 'Wallet',
            currentPage: 'wallet',
            walletBalance: user.walletBalance,
            transactions
        });

    } catch (error) {
        console.error('Error fetching wallet details:', error);
        res.status(500).json({ success: false, message: 'Error fetching wallet details' });
    }
};
