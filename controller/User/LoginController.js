
const User = require('../../models/userSchema');

const passport=require('../../config/googleAuth')

const fs=require('fs')
require("dotenv").config();

// controller for rendering login page
exports.getLoginUser = (req, res) => {
    res.render('user/loginUser', {
        user: req.session.user || null,
        error: req.flash('error_msg'),
        success: req.flash('success_msg')
    });
};
//  controller for login submission
exports.postLoginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/user/login');
        }

        if (user.isBlocked) {
            req.flash('error_msg', 'Your account has been blocked. Please contact support.');
            return res.redirect('/user/login');
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            req.flash('error_msg', 'Invalid password');
            return res.redirect('/user/login');
        }

        req.session.user = user;
        res.redirect('/user/home');
    } catch (error) {
        console.error("Login error:", error);
        req.flash('error_msg', 'An error occurred during login');
        res.redirect('/user/login');
    }
};
// controller to authenticate passport
exports.googleLogin = (req, res, next) => {
    passport.authenticate('google', { scope: ['profile', 'email'],prompt:'select_account' })(req, res, next);
};

// handles callback from google after use logs in
exports.googleLoginCallback = (req, res, next) => {
    passport.authenticate('google', (err, user, info) => {
        if (err) {
            console.error("Google login error:", err);
            return next(err);
        }
        
        if (!user) {
            req.flash('error', info ? info.message : 'Login failed');
            return res.redirect('/user/login');
        }

        if (user.isBlocked) {
            req.flash('error_msg', 'Your account has been blocked. Please contact support.');
            return res.redirect('/user/login');
        }

        req.logIn(user, (err) => {
            if (err) {
                console.error("Error logging in user:", err);
                return next(err);
            }

            req.session.user = user;
          
            
            return res.redirect('/user/home');
        });
    })(req, res, next);
};



// Logout controllers
exports.postUserLogout = (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error("Logout error:", err);
        }
        res.clearCookie('connect.sid');
        res.redirect('/user/home');
    });
    exports.postUserLogout = (req, res) => {
    req.logout(function(err) {
        if (err) { return next(err); }
        req.session.destroy(() => {
            res.redirect('/user/login');  
        });
    });
};
};

