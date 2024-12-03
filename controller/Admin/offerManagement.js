
const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const Offer=require('../../models/offerSchema')




// controller to render offer management page
exports.renderManageOffers=async(req, res)=>{
    try {
        const categories = await Category.find({ isListed: true });
        const products = await Product.find({ status: 'listed' });
        const offers = await Offer.find()
            .populate('categoryId')
            .populate('productId')
            .sort('-createdAt');
        
        res.render('adminLayout', { 
            content:'partials/adminOffers',
            title:'Offer Management',
            categories, 
            products, 
            offers,
            message: req.flash('message')
        });
    } catch (error) {
        console.error('Error rendering offer management:', error);
        res.status(500).send('Internal Server Error');
    }
},

// controller to create new offer
exports.createOffer= async (req, res)=> {
    try {
        const offerData = req.body;
        
        
        if (offerData.discountType === 'PERCENTAGE' && offerData.discountValue > 100) {
            req.flash('message', 'Percentage discount cannot exceed 100%');
            return res.redirect('/admin/offers/manage');
        }

        
        offerData.startDate = new Date(offerData.startDate);
        offerData.endDate = new Date(offerData.endDate);

        
        if (offerData.startDate >= offerData.endDate) {
            req.flash('message', 'End date must be after start date');
            return res.redirect('/admin/offers/manage');
        }

        
        switch (offerData.type) {
            case 'CATEGORY':
                delete offerData.productId;
                delete offerData.referralDetails;
                break;
            case 'PRODUCT':
                delete offerData.categoryId;
                delete offerData.referralDetails;
                break;
            case 'REFERRAL':
                delete offerData.categoryId;
                delete offerData.productId;
                break;
        }

        
        const offer = new Offer(offerData);
        await offer.save();

        req.flash('message', 'Offer created successfully');
        res.redirect('/admin/offers/manage');
    } catch (error) {
        console.error('Error creating offer:', error);
        req.flash('message', 'Error creating offer');
        res.redirect('/admin/offers/manage');
    }
},

// controller to Toggle offer status
exports.toggleOfferStatus=async (req, res)=> {
    try {
        const offerId = req.params.id;
        const offer = await Offer.findById(offerId);
        
        if (!offer) {
            req.flash('message', 'Offer not found');
            return res.redirect('/admin/offers/manage');
        }

        offer.isActive = !offer.isActive;
        await offer.save();

        req.flash('message', `Offer ${offer.isActive ? 'activated' : 'deactivated'} successfully`);
        res.redirect('/admin/offers/manage');
    } catch (error) {
        console.error('Error toggling offer status:', error);
        req.flash('message', 'Error updating offer status');
        res.redirect('/admin/offers/manage');
    }
},

// controller to delete offer
exports.deleteOffer=async(req, res)=>{
    try {
        const offerId = req.params.id;
        await Offer.findByIdAndDelete(offerId);
        
        req.flash('message', 'Offer deleted successfully');
        res.redirect('/admin/offers/manage');
    } catch (error) {
        console.error('Error deleting offer:', error);
        req.flash('message', 'Error deleting offer');
        res.redirect('/admin/offers/manage');
    }
},

// controller to render edit offer page
exports.renderEditOffer=async (req, res)=> {
    try {
        const offerId = req.params.id;
        const offer = await Offer.findById(offerId)
            .populate('categoryId')
            .populate('productId');
        
        if (!offer) {
            req.flash('message', 'Offer not found');
            return res.redirect('/admin/offers/manage');
        }

        const categories = await Category.find({ isListed: true });
        const products = await Product.find({ status: 'listed' });

        res.render('partials/editOffer', { 
            offer, 
            categories, 
            products,
            message: req.flash('message')
        });
    } catch (error) {
        console.error('Error rendering edit offer:', error);
        req.flash('message', 'Error loading offer');
        res.redirect('/admin/offers/manage');
    }
},

// controller to update offer
exports.updateOffer=async (req, res)=>{
    try {
        const offerId = req.params.id;
        const updateData = req.body;

        
        if (updateData.discountType === 'PERCENTAGE' && updateData.discountValue > 100) {
            req.flash('message', 'Percentage discount cannot exceed 100%');
            return res.redirect(`/admin/offers/edit/${offerId}`);
        }

        // Convert dates to UTC
        updateData.startDate = new Date(updateData.startDate);
        updateData.endDate = new Date(updateData.endDate);

       
        if (updateData.startDate >= updateData.endDate) {
            req.flash('message', 'End date must be after start date');
            return res.redirect(`/admin/offers/edit/${offerId}`);
        }

       
        await Offer.findByIdAndUpdate(offerId, updateData);

        req.flash('message', 'Offer updated successfully');
        res.redirect('/admin/offers/manage');
    } catch (error) {
        console.error('Error updating offer:', error);
        req.flash('message', 'Error updating offer');
        res.redirect(`/admin/offers/edit/${req.params.id}`);
    }
}
