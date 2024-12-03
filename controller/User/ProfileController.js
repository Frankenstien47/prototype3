

const User = require('../../models/userSchema');
const bcrypt=require('bcryptjs')
require("dotenv").config();

//controller for rendering the profile page
exports.getProfile = async (req, res) => {
    try {
       

        const user = await User.findById(req.session.user._id).select('-password');
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/user/login');
        }

        res.render('profileLayout', {
            title: 'Profile',
            content: 'partials/profile',
            user: user,
            currentPage: 'profile',
            error: req.flash('error'),
            success_msg: req.flash('success_msg')
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        req.flash('error', 'Failed to load profile');
        res.redirect('/user/login');
    }
};

// controller for editing the userName
exports.editUserName = async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized. Please log in.' });
    }

    try {
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, error: 'Name is required' });
        }

        const user = await User.findById(req.session.user._id);

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

      
        user.name = name;
        await user.save();

        req.session.user.name = name;

    
        return res.status(200).json({ success: true, message: 'Name updated successfully' });
    } catch (error) {
        console.error('Error updating name:', error);
        return res.status(500).json({ success: false, error: 'Error updating name' });
    }
};
// controller for changing the password
exports.changePassword = async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized. Please log in.' });
    }

    try {
        const { currentPassword, newPassword } = req.body;

       
        const user = await User.findById(req.session.user._id);

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

       
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ success: false, error: 'Current password is incorrect' });
        }


        const isSameAsCurrent = await bcrypt.compare(newPassword, user.password);
        if (isSameAsCurrent) {
            return res.status(400).json({ success: false, error: 'New password cannot be the same as the current password' });
        }

    
        user.password = newPassword;  
        await user.save();

        return res.status(200).json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        console.error('Error changing password:', error);
        return res.status(500).json({ success: false, error: 'Error changing password' });
    }
};