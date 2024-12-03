class ValidationUtils {
    static phoneRegex = /^\d{10}$/;
    static pincodeRegex = /^\d{6}$/;

    static validatePhone(phone) {
        return this.phoneRegex.test(phone);
    }

    static validatePincode(pincode) {
        return this.pincodeRegex.test(pincode);
    }

    static validateName(name) {
        return name.length >= 3 && name.length <= 50;
    }

    static validateForm(form) {
        const inputs = form.querySelectorAll('input[required], select[required]');
        let isValid = true;

        inputs.forEach(input => {
            if (!input.value.trim()) {
                isValid = false;
                input.classList.add('error');
            } else {
                input.classList.remove('error');
            }
        });
        return isValid;
    }
}

class UIUtils {
    static showLoading() {
        return Swal.fire({
            title: 'Processing...',
            allowOutsideClick: false,
            didOpen: Swal.showLoading
        });
    }

    static showAlert(type, title, text) {
        return Swal.fire({ icon: type, title, text });
    }

    static formatPrice(amount) {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
    }
}

class AddressManager {
    constructor(modal, form) {
        this.modal = modal;
        this.form = form;
        this.initListeners();
    }

    initListeners() {
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitAddress();
        });

        document.querySelectorAll('.address-card').forEach(card => {
            card.addEventListener('click', () => this.selectAddress(card));
        });
    }

    selectAddress(card) {
        document.querySelectorAll('.address-card').forEach(el => el.classList.remove('selected'));
        card.classList.add('selected');
        card.querySelector('input[type="radio"]').checked = true;
    }

    async submitAddress() {
        if (!ValidationUtils.validateForm(this.form)) {
            UIUtils.showAlert('error', 'Error', 'Please fill all required fields correctly.');
            return;
        }

        const formData = new FormData(this.form);
        const addressData = Object.fromEntries(formData.entries());

        try {
            // const loading = UIUtils.showLoading();
            const response = await fetch('/user/address/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(addressData)
            });
            const data = await response.json();
            // loading.close();

            if (data.success) {
                await UIUtils.showAlert('success', 'Success', 'Address added successfully');
                location.reload();
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            UIUtils.showAlert('error', 'Error', error.message);
        }
    }
}
class CouponManager {
    constructor() {
        this.appliedCoupon = null;
        this.initListeners();
    }

    initListeners() {
        document.getElementById('applyCoupon')?.addEventListener('click', () => this.applyCoupon());
        document.getElementById('removeCoupon')?.addEventListener('click',()=>this.removeCoupon())
    }

    getCurrentTotal() {
        const totalText = document.querySelector('#finalAmount')?.textContent || '';
        const amountMatch = totalText.match(/₹?(\d+(\.\d+)?)/);
        return amountMatch ? parseFloat(amountMatch[1]) : 0;
    }

    async applyCoupon() {
        const couponCode = document.getElementById('couponCode')?.value.trim();
        const messageDiv = document.getElementById('couponMessage');
        
        if (!couponCode) {
            messageDiv.textContent = 'Please enter a coupon code';
            messageDiv.className = 'coupon-message error';
            return;
        }

        try {
            const response = await fetch('/validate-coupon', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: couponCode,
                    orderAmount: this.getCurrentTotal() - 40 // Subtract delivery fee
                })
            });

            const data = await response.json();

            if (data.success) {
                this.updateCouponUI(data.discountAmount, data.finalAmount, data.coupon);
                this.appliedCoupon = data.coupon;
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            messageDiv.textContent = error.message;
            messageDiv.className = 'coupon-message error';
        }
    }

    updateCouponUI(discountAmount, finalAmount, coupon) {
        const messageDiv = document.getElementById('couponMessage');
        const discountRow = document.querySelector('.discount-row');
        const discountAmountEl = document.getElementById('discountAmount');
        const finalAmountEl = document.getElementById('finalAmount');
        const couponInput = document.getElementById('couponCode');
        const applyButton = document.getElementById('applyCoupon');
        const removeButton=document.getElementById('removeCoupon')

        // Show discount row
        discountRow.style.display = 'flex';
        
        // Update amounts
        discountAmountEl.textContent = `-₹${discountAmount.toFixed(2)}`;
        finalAmountEl.textContent = `₹${(finalAmount + 40).toFixed(2)}`;

        // Disable coupon input
        couponInput.disabled = true;
        applyButton.disabled = true;
        couponInput.disabled = true;
        applyButton.style.display = 'none';
        removeButton.style.display = 'inline-block';

        // Show success message
        messageDiv.textContent = `Coupon applied successfully! ${coupon.discountType === 'percentage' ? 
            `${coupon.discountValue}% off` : 
            `₹${coupon.discountValue} off`}`;
        messageDiv.className = 'coupon-message success';
    }

    removeCoupon() {
        const messageDiv = document.getElementById('couponMessage');
        const discountRow = document.querySelector('.discount-row');
        const couponInput = document.getElementById('couponCode');
        const applyButton = document.getElementById('applyCoupon');
        const finalAmountEl = document.getElementById('finalAmount');

        // Reset UI
        discountRow.style.display = 'none';
        couponInput.disabled = false;
        couponInput.value = '';
        applyButton.disabled = false;
        messageDiv.textContent = '';
        
        // Reset amounts
        const subtotal = this.getCurrentTotal() - 40;
        finalAmountEl.textContent = `₹${(subtotal + 40).toFixed(2)}`;

        this.appliedCoupon = null;
        messageDiv.style.color='red'
        messageDiv.textContent = `Coupon removed successfully!`;
        
    messageDiv.className = 'coupon-message success';
    }
}


class PaymentManager {
    constructor(orderId = null) {
        this.orderId = orderId;
        this.razorpay = null;
    }

    async initializePayment(order) {
        const finalAmountInPaise = Math.round(order.finalAmount * 100);
        const options = {
            key: 'rzp_test_XiCYn82mlH83RG',
            amount: finalAmountInPaise,
            currency: "INR",
            name: 'DC-stores',
            description: `Order Payment - ${order._id}`,
            order_id: order.razorpayOrderId,
            handler: (response) => this.verifyPayment(response),
            modal: { 
                ondismiss: () => this.handlePaymentFailure('Payment was cancelled')
            },
            prefill: {
                name: 'Customer',
                email: '',
                contact: ''
            },
            notes: {
                subtotal: order.subtotal,
                delivery_fee: order.deliveryFee,
                discount: order.discountAmount,
                final_amount: order.finalAmount
            }
        };

        this.razorpay = new Razorpay(options);
        this.razorpay.open();
    }

    async verifyPayment(paymentResponse) {
        try {
            const response = await fetch('/user/checkout/verify-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: this.orderId,
                    razorpayPaymentId: paymentResponse.razorpay_payment_id,
                    razorpaySignature: paymentResponse.razorpay_signature,
                    status: 'success'
                })
            });
            const data = await response.json();
           
           const result= await Swal.fire({
                title:'Order Success',
                icon:'success',
                text:data.message,
                confirmButtonText:'Ok'
            })
       
            if(result.isConfirmed){
              window.location.href = '/user/orders';
            }
        } catch (error) {
            this.handlePaymentFailure(error.message);
        }
    }

    async handlePaymentFailure(errorMessage = 'Payment failed') {
        try {
            // Update order status to failed
            const response = await fetch('/user/checkout/verify-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: this.orderId,
                    status: 'failed',
                    errorMessage
                })
            });
            
            const data = await response.json();
            if (!data.success) throw new Error(data.message);

            // Show failure message to user
            const result = await Swal.fire({
                title: 'Payment Failed',
                text: `${errorMessage}. Would you like to retry?`,
                icon: 'error',
                showCancelButton: true,
                confirmButtonText: 'Retry Payment',
                cancelButtonText: 'View Order'
            });

            if (result.isConfirmed) {
                this.retryPayment();
            } else {
                window.location.href = `/user/orders/${this.orderId}`;
            }
        } catch (error) {
            console.error('Error handling payment failure:', error);
            UIUtils.showAlert('error', 'Error', 'Failed to process payment status');
        }
    }

    async retryPayment() {
        try {
            const response = await fetch(`/user/checkout/retry-payment/${this.orderId}`,{
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: this.orderId,
                    status: 'Failed'
                })

            });
            const data = await response.json();
            if (data.success) {
                this.initializePayment(data.order);
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            UIUtils.showAlert('error', 'Error', error.message);
        }
    }
}

class CheckoutManager {
    constructor() {
          // Initialize all required elements
          this.modal = document.getElementById('addAddressModal');
          this.form = document.getElementById('addAddressForm');
          this.addressManager = new AddressManager(this.modal, this.form);
          this.couponManager = new CouponManager();
          this.paymentManager = new PaymentManager();
          this.placeOrderButton = document.getElementById('place-order');
          
          // Bind methods to maintain correct 'this' context
          this.handleAddressSubmission = this.handleAddressSubmission.bind(this);
          this.openModal = this.openModal.bind(this);
          this.closeModal = this.closeModal.bind(this);
          this.initListeners();

          this.walletBalanceElement=document.getElementById('walletBalance')
          this.walletPaymentOption=document.querySelector('input[value="walletBalance"]')
          if(this.walletPaymentOption){
            this.walletPaymentOption.addEventListener('change',()=>handleWalletPaymentSelection())
          }  
    }
    handleWalletPaymentSelection() {
        const walletBalance = parseFloat(this.walletBalanceElement?.dataset.balance || 0);
        const orderTotal = parseFloat(document.getElementById('finalAmount')?.textContent.replace('₹', '') || 0);

        if (this.walletPaymentOption.checked && walletBalance < orderTotal) {
            Swal.fire({
                icon: 'error',
                title: 'Insufficient Balance',
                text: `Your wallet balance (₹${walletBalance}) is less than the order total (₹${orderTotal})`
            });
            this.walletPaymentOption.checked = false;
        }
    }

    initListeners() {
        document.querySelectorAll('.add-address-btn').forEach(button => {
            button.addEventListener('click', this.openModal);
        });

        // Modal close button
        const closeButton = this.modal.querySelector('.close-modal');
        if (closeButton) {
            closeButton.addEventListener('click', this.closeModal);
        }

        // Close modal on outside click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });

        // Save address button
        const saveButton = document.getElementById('saveAddress');
        if (saveButton) {
            saveButton.addEventListener('click', this.handleAddressSubmission);
        }

        // Place order button
        if (this.placeOrderButton) {
            this.placeOrderButton.addEventListener('click', () => this.placeOrder());
        }

        // Form input validation
        this.form.querySelectorAll('input, select').forEach(input => {
            input.addEventListener('blur', () => this.validateInput(input));
            input.addEventListener('input', () => this.validateInput(input));
        });
       
    }
    validateInput(input) {
        const isValid = input.checkValidity();
        input.classList.toggle('error', !isValid);

        // Additional validation for specific fields
        if (input.name === 'phone') {
            const isValidPhone = ValidationUtils.validatePhone(input.value);
            input.classList.toggle('error', !isValidPhone);
            return isValidPhone;
        }
        if (input.name === 'pinCode') {
            const isValidPincode = ValidationUtils.validatePincode(input.value);
            input.classList.toggle('error', !isValidPincode);
            return isValidPincode;
        }
        if (input.name === 'userName') {
            const isValidName = ValidationUtils.validateName(input.value);
            input.classList.toggle('error', !isValidName);
            return isValidName;
        }

        return isValid;
    }

    validateForm() {
        let isValid = true;
        this.form.querySelectorAll('input, select').forEach(input => {
            if (!this.validateInput(input)) {
                isValid = false;
            }
        });
        return isValid;
    }

    openModal() {
        this.modal.classList.add('active');
        this.form.reset();
        this.clearValidationStyles();
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        this.modal.classList.remove('active');
        this.clearValidationStyles();
        // Restore body scroll when modal is closed
        document.body.style.overflow = '';
    }

    clearValidationStyles() {
        this.form.querySelectorAll('.error').forEach(element => {
            element.classList.remove('error');
        });
    }


    selectAddress(card) {
        document.querySelectorAll('.address-card').forEach(element => {
            element.classList.remove('selected');
        });
        card.classList.add('selected');
        card.querySelector('input[type="radio"]').checked = true;
    }

    async handleAddressSubmission() {
        if (!this.validateForm()) {
            await UIUtils.showAlert('error', 'Validation Error', 'Please fill all required fields correctly.');
            return;
        }

        const formData = new FormData(this.form);
        const addressData = Object.fromEntries(formData.entries());

        try {
           
            const response = await fetch('/user/address/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(addressData)
            });

            const data = await response.json();
       

            if (data.success) {
               
                location.reload();
            } else {
                throw new Error(data.message || 'Failed to add address');
            }
        } catch (error) {
            await UIUtils.showAlert('error', 'Error', error.message || 'Something went wrong. Please try again.');
        }

        this.closeModal();
    }
   
    async placeOrder() {
        try {
            const selectedAddress = document.querySelector('input[name="addressId"]:checked');
            const selectedPaymentMethod = document.querySelector('input[name="paymentMethod"]:checked');

            if (!selectedAddress) throw new Error('Please select a delivery address');
            if (!selectedPaymentMethod) throw new Error('Please select a payment method');

            
            

            // const loading = UIUtils.showLoading();
            const response = await fetch('/user/checkout/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    addressId: selectedAddress.value,
                    paymentMethod: selectedPaymentMethod.value,
                    appliedCoupon: this.couponManager.appliedCoupon
                })
            });

            const orderData = await response.json();
            // loading.close();

            if (!orderData.success) throw new Error(orderData.message);
            this.paymentManager.orderId = orderData.order._id;

            switch (selectedPaymentMethod.value) {
                case 'onlinePayment':
                    this.paymentManager.initializePayment(orderData.order);
                    break;
                case 'walletPayment':  this.showOrderSuccess(orderData.order._id);
                    break;
                case 'cashOnDelivery':
                    this.showOrderSuccess(orderData.order._id);
                    break;
            }
       } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message
            });
        }
    }


    async showOrderSuccess(orderId) {
        const result = await UIUtils.showAlert('success', 'Order Placed Successfully!', 'Thank you for your order.');
        if (result.isConfirmed) window.location.href ='/user/orders';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new CheckoutManager();
    
  
    document.head.insertAdjacentHTML('beforeend', `
        <style>
            .form-control.error { 
                border-color: #e53e3e; 
                background-color: #fff5f5; 
            }
            .form-control.error:focus {
                box-shadow: 0 0 0 2px rgba(229, 62, 62, 0.2);
            }
            .address-card { transition: transform 0.2s ease; }
            .address-card.selected { 
                border: 2px solid #3182ce; 
                transform: scale(1.02);
                background-color: #ebf8ff;
            }
            .coupon-message.error { color: #e53e3e; }
            .coupon-message.success { color: #48bb78; }
            .modal.active {
                display: flex;
                align-items: center;
                justify-content: center;
            }
            body.modal-open {
                overflow: hidden;
            }
        </style>
    `);
});