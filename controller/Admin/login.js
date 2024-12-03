
const bcrypt=require('bcryptjs')
const Admin=require('../../models/adminSchema')

// controller to render login 
exports.getLogin=(req,res)=>{
    const error= req.session.error||null;
    req.session.error=null;
    res.render('admin/loginAdmin',{admin:req.session.admin,error})
}
// controller for login form submission
exports.postLogin=async (req, res) => {
        const { email, password } = req.body;
        const admin =  await Admin.findOne({ email});
    
    
        if (admin && await bcrypt.compare(password, admin.password)) {
    
            req.session.admin = admin;
           return res.redirect('/admin/dashBoard');
            
        } else {
            req.flash('error_msg', 'Invalid email or password!');
            return res.redirect('/admin/login');
        }
    }
    // controller for admin logout
exports.getAdminLogout=(req, res) => {
    req.session.destroy(error => {
        if (error) {
            console.err(error);
            
            return res.redirect('/admin/dashBoard');
        }
        res.clearCookie('connect.sid');
        return res.redirect('/admin/login');
    });
}