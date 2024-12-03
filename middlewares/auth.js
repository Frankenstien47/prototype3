

const User = require('../models/userSchema');


async function checkUserBlocked(req, res, next){
    try {
        const user = await User.findOne({ email: req.body.email });
        
        if (user && user.isBlocked) {
            // Clear any existing session
            req.session.destroy((err) => {
                if (err) {
                    console.error('Session destruction error:', err);
                }
                return res.render('login', { 
                    error: 'Your account has been blocked. Please contact support.' 
                });
            });
        } else {
            next();
        }
    } catch (error) {
        console.error('Block check error:', error);
        res.status(500).send('Server error');
    }
};


async function  protectBlockedUser(req, res, next){
    try {
       
        if (req.session.userId) {
            const user = await User.findById(req.session.userId);
            
            if (user && user.isBlocked) {
        
                req.session.destroy((err) => {
                    if (err) {
                        console.error('Session destruction error:', err);
                    }
                    return res.redirect('/login');
                });
            } else {
                next();
            }
        } else {
            next();
        }
    } catch (error) {
        console.error('Protected route block check error:', error);
        res.status(500).send('Server error');
    }
};
function redirectProfileIfLoggedIn(req,res,next){
    if(!req.session.user){
        return res.redirect('/user/login')
    }else{
        
 next()
    }
};


function redirectAdminLoginIfLogout(req,res,next){
    if(!req.session.admin){
        return res.redirect('/admin/login')
    }else{
  next()
    }
};
function redirectAdminDashIfLogin(req,res,next){
    if(req.session.admin){
        return res.redirect('/admin/dashBoard')
    }
    next()
}
function redirectHomeIfUser(req,res,next){
    if(req.session.user){
        return res.redirect('/user/home')
    }
    next()
}
// function redirectHome
module.exports={redirectProfileIfLoggedIn, redirectAdminLoginIfLogout,redirectAdminDashIfLogin,redirectHomeIfUser,checkUserBlocked ,protectBlockedUser,};