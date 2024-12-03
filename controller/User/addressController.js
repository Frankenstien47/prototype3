
const Address=require('../../models/AddressSchema')
require("dotenv").config();

// controller render the address book
exports.getAddressBook= async (req, res) => {
    try {
        const userId = req.session.user._id; 
        const addresses = await Address.find({ userId });
        res.render('profileLayout', {
            title: 'Address Book',
            content:'partials/addressBook',
            addresses,
            currentPage:'address-book',
            user: req.session.user
        });
    } catch (error) {
        console.error('Error fetching addresses:', error);
        res.redirect('/addresses?error=' + encodeURIComponent('Error fetching addresses'));
    }
},

// controller to Add a new address
exports.addAddress= async (req, res) => {
    try {
        const userId = req.session.user._id;
        const newAddress = new Address({
            ...req.body,
            userId
        });
        await newAddress.save();
        res.json({ success: true, address: newAddress });
    } catch (error) {
        console.error('Error adding address:', error);
        res.status(400).json({ success: false, error: error.message });
    }
},

// controller to Edit an existing address
exports.editAddress= async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.session.user._id;
        const updatedAddress = await Address.findOneAndUpdate(
            { _id: id, userId },
            req.body,
            { new: true, runValidators: true }
        );
        if (!updatedAddress) {
            return res.status(404).json({ success: false, error: 'Address not found' });
        }
        res.json({ success: true, address: updatedAddress });
    } catch (error) {
        console.error('Error updating address:', error);
        res.status(400).json({ success: false, error: error.message });
    }
},

// controller to  Delete an address
exports.deleteAddress= async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.session.user._id;
        const deletedAddress = await Address.findOneAndDelete({ _id: id, userId });
        if (!deletedAddress) {
            return res.status(404).json({ success: false, error: 'Address not found' });
        }
        res.json({ success: true, message: 'Address deleted successfully' });
    } catch (error) {
        console.error('Error deleting address:', error);
        res.status(400).json({ success: false, error: error.message });
    }

},

// Controller to get a single address for editing
exports.getAddress= async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.session.user._id;
        const address = await Address.findOne({ _id: id, userId });
        if (!address) {
            return res.status(404).json({ success: false, error: 'Address not found' });
        }
        res.json({ success: true, address });
    } catch (error) {
        console.error('Error fetching address:', error);
        res.status(400).json({ success: false, error: error.message });
    }
}
