import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement
} from '@stripe/react-stripe-js';

// Replace with your actual publishable key
const stripePromise = loadStripe('pk_test_YOUR_PUBLISHABLE_KEY');

// Secure Payment Component with advanced features
const EnhancedSecurePayment = ({ onSuccess, onCancel }) => {
  // Component State
  const [amount, setAmount] = useState(10);
  const [customAmount, setCustomAmount] = useState('');
  const [isCustomAmount, setIsCustomAmount] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentIntent, setPaymentIntent] = useState(null);
  const [emailAddress, setEmailAddress] = useState('');
  const [savePaymentInfo, setSavePaymentInfo] = useState(false);
  const [billingName, setBillingName] = useState('');
  const [processingStage, setProcessingStage] = useState(0); // 0: initial, 1: processing, 2: confirming, 3: complete

  // Security features
  const [paymentSessionId, setPaymentSessionId] = useState(null);
  const [fraudCheckPassed, setFraudCheckPassed] = useState(true);
  const [clientSecret, setClientSecret] = useState('');

  // Stripe hooks
  const stripe = useStripe();
  const elements = useElements();

  // Card Element styles
  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#32325d',
        fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
        fontSmoothing: 'antialiased',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#fa755a',
        iconColor: '#fa755a',
      },
    },
    hidePostalCode: true,
  };

  // Bitcoin payment data (simulated)
  const bitcoinPaymentData = {
    address: '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy',
    amount: amount,
    qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKQAAACkAQMAAAAjexcCAAAAA1BMVEUAAACnej3aAAAAAXRSTlMAQObYZgAAAAlwSFlzAAAOxAAADsQBlSsOGwAAADZJREFUSInt1cEJACAMBEFr0f5LsRIVL+IR5j0YDkuS9NNYy9o9J0kXOJAhQ4YMGTJkyJC/yJIuWxN7RRVNaVEAAAAASUVORK5CYII='
  };

  // PayPal initialization effect
  useEffect(() => {
    if (paymentMethod === 'paypal') {
      const script = document.createElement('script');
      script.src = 'https://www.paypal.com/sdk/js?client-id=YOUR_PAYPAL_CLIENT_ID&currency=USD';
      script.async = true;
      script.onload = () => initializePayPal();
      document.body.appendChild(script);

      return () => {
        document.body.removeChild(script);
      };
    }
  }, [paymentMethod]);

  // Initialize payment session
  useEffect(() => {
    const initializePaymentSession = async () => {
      try {
        // In a real implementation, this would be a server call
        setPaymentSessionId(`session_${Math.random().toString(36).substring(2, 15)}`);
      } catch (error) {
        console.error('Failed to initialize payment session:', error);
        setError('Failed to initialize payment session. Please try again.');
      }
    };

    initializePaymentSession();
  }, []);

  // Create payment intent when amount changes
  useEffect(() => {
    if (!stripe || !paymentSessionId) return;

    const createPaymentIntent = async () => {
      const finalAmount = isCustomAmount ? parseFloat(customAmount) : amount;

      if (isNaN(finalAmount) || finalAmount <= 0) {
        setError('Please enter a valid amount');
        return;
      }

      try {
        // In a real app, this would be a server call
        const response = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-ID': paymentSessionId,
          },
          body: JSON.stringify({
            amount: finalAmount,
            currency: 'usd',
            payment_method_types: [paymentMethod],
            receipt_email: emailAddress || undefined,
            metadata: {
              donation_type: 'app_support',
            },
          }),
        });

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const data = await response.json();
        setClientSecret(data.clientSecret);
        setPaymentIntent(data.paymentIntent);
      } catch (error) {
        console.error('Error creating payment intent:', error);
        setError('Unable to initialize payment. Please try again later.');
      }
    };

    if (paymentMethod === 'card') {
      createPaymentIntent();
    }
  }, [amount, customAmount, isCustomAmount, paymentMethod, emailAddress, paymentSessionId, stripe]);

  // Handle amount selection
  const handleAmountClick = (selectedAmount) => {
    setIsCustomAmount(false);
    setAmount(selectedAmount);
    setError(null);
  };

  // Handle custom amount input
  const handleCustomAmountChange = (e) => {
    const value = e.target.value;
    if (value === '' || /^\d+(\.\d{0,2})?$/.test(value)) {
      setCustomAmount(value);
      if (value !== '') {
        setIsCustomAmount(true);
      }
      setError(null);
    }
  };

  // Handle payment method change
  const handlePaymentMethodChange = (method) => {
    setPaymentMethod(method);
    setError(null);
  };

  // Initialize PayPal (simulated)
  const initializePayPal = () => {
    // This would be replaced with actual PayPal SDK initialization
    console.log('PayPal SDK initialized');
  };

  // Handle form submission
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    const finalAmount = isCustomAmount ? parseFloat(customAmount) : amount;

    if (isNaN(finalAmount) || finalAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (paymentMethod === 'card' && !clientSecret) {
      setError('Payment processing is being initialized. Please try again in a moment.');
      return;
    }

    // Validate email if provided
    if (emailAddress && !/^\S+@\S+\.\S+$/.test(emailAddress)) {
      setError('Please enter a valid email address');
      return;
    }

    // Simulate basic fraud detection
    if (!fraudCheckPassed) {
      setError('We were unable to process your payment. Please try a different payment method.');
      return;
    }

    setLoading(true);
    setProcessingStage(1);
    setError(null);

    try {
      if (paymentMethod === 'card') {
        // Process credit card payment
        const result = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: elements.getElement(CardElement),
            billing_details: {
              name: billingName || undefined,
              email: emailAddress || undefined,
            },
          },
        });

        if (result.error) {
          setError(result.error.message);
          setProcessingStage(0);
        } else if (result.paymentIntent.status === 'succeeded') {
          setPaymentSuccess(true);
          setProcessingStage(3);
          if (onSuccess) onSuccess(result.paymentIntent);
        } else if (['processing', 'requires_action'].includes(result.paymentIntent.status)) {
          setProcessingStage(2);
          // Additional handling for 3D Secure, etc.
        }
      } else if (paymentMethod === 'paypal') {
        // Simulate PayPal payment flow
        setTimeout(() => {
          setPaymentSuccess(true);
          setProcessingStage(3);
          if (onSuccess) onSuccess({ id: `pp_${Date.now()}` });
        }, 2000);
      } else if (paymentMethod === 'crypto') {
        // Crypto payments would typically be monitored separately
        // This is a simulation
        setProcessingStage(2);
        setTimeout(() => {
          setPaymentSuccess(true);
          setProcessingStage(3);
          if (onSuccess) onSuccess({ id: `crypto_${Date.now()}` });
        }, 3000);
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError('An unexpected error occurred. Please try again.');
      setProcessingStage(0);
    } finally {
      setLoading(false);
    }
  };

  // Render the appropriate payment interface
  const renderPaymentInterface = () => {
    switch(paymentMethod) {
      case 'card':
        return (
          <div className="payment-card-interface">
            <div className="form-group">
              <label htmlFor="cardElement" className="form-label">Card details</label>
              <div className="card-element-container">
                <CardElement id="cardElement" options={cardElementOptions} />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="billingName" className="form-label">Name on card</label>
              <input
                type="text"
                id="billingName"
                className="form-input"
                value={billingName}
                onChange={(e) => setBillingName(e.target.value)}
                placeholder="Cardholder Name"
              />
            </div>

            <div className="save-payment-checkbox">
              <input
                type="checkbox"
                id="savePaymentInfo"
                checked={savePaymentInfo}
                onChange={(e) => setSavePaymentInfo(e.target.checked)}
              />
              <label htmlFor="savePaymentInfo">Save this card for future payments</label>
            </div>

            <div className="payment-security-badge">
              <div className="security-icon">🔒</div>
              <div className="security-text">
                Secure payment processed by Stripe. Your card details are encrypted.
              </div>
            </div>
          </div>
        );

      case 'paypal':
        return (
          <div className="payment-paypal-interface">
            <div className="paypal-button-container">
              <div className="paypal-button-placeholder">
                <img
                  src="https://www.paypalobjects.com/webstatic/en_US/i/buttons/checkout-logo-large.png"
                  alt="PayPal Checkout"
                  className="paypal-button-image"
                />
              </div>
              <p className="paypal-info">
                You'll be redirected to PayPal to complete your payment securely.
              </p>
            </div>
          </div>
        );

      case 'crypto':
        return (
          <div className="payment-crypto-interface">
            <div className="crypto-payment-details">
              <div className="crypto-qr-container">
                <img
                  src={bitcoinPaymentData.qrCode}
                  alt="Bitcoin Payment QR Code"
                  className="crypto-qr-code"
                />
              </div>
              <div className="crypto-info">
                <div className="crypto-amount">
                  <span className="crypto-label">Amount:</span>
                  <span className="crypto-value">
                    {(isCustomAmount ? parseFloat(customAmount) : amount) / 40000} BTC
                  </span>
                </div>
                <div className="crypto-address">
                  <span className="crypto-label">Address:</span>
                  <span className="crypto-value">
                    {bitcoinPaymentData.address}
                  </span>
                  <button
                    className="copy-button"
                    onClick={() => {
                      navigator.clipboard.writeText(bitcoinPaymentData.address);
                      alert('Address copied to clipboard');
                    }}
                  >
                    Copy
                  </button>
                </div>
                <p className="crypto-instructions">
                  Send the exact amount to the address above. Payment will be confirmed after 1 network confirmation.
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return <div>Please select a payment method</div>;
    }
  };

  // Render the payment status
  const renderPaymentStatus = () => {
    if (processingStage === 1) {
      return (
        <div className="payment-processing-status">
          <div className="processing-spinner"></div>
          <p>Processing your payment...</p>
        </div>
      );
    } else if (processingStage === 2) {
      return (
        <div className="payment-confirming-status">
          <div className="confirming-icon">🔄</div>
          <p>Confirming your payment...</p>
          <p className="status-details">This might take a moment. Please don't close this window.</p>
        </div>
      );
    } else if (processingStage === 3) {
      return (
        <div className="payment-success-status">
          <div className="success-icon">✅</div>
          <h3>Thank you for your support!</h3>
          <p>Your payment was successful. A receipt has been sent to your email.</p>
          <button
            className="close-button"
            onClick={() => {
              if (onSuccess) onSuccess(paymentIntent);
            }}
          >
            Close
          </button>
        </div>
      );
    }

    return null;
  };

  // Main component render
  return (
    <div className="enhanced-payment-container">
      {processingStage >= 1 ? (
        renderPaymentStatus()
      ) : (
        <form onSubmit={handleSubmit} className="payment-form">
          <div className="form-section amount-section">
            <h3 className="section-title">Choose Amount</h3>
            <div className="amount-buttons">
              {[5, 10, 25, 50].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`amount-button ${!isCustomAmount && amount === value ? 'active' : ''}`}
                  onClick={() => handleAmountClick(value)}
                >
                  ${value}
                </button>
              ))}
              <div className="custom-amount-container">
                <input
                  type="text"
                  className={`custom-amount-input ${isCustomAmount ? 'active' : ''}`}
                  placeholder="Custom"
                  value={isCustomAmount ? customAmount : ''}
                  onChange={handleCustomAmountChange}
                  onClick={() => setIsCustomAmount(true)}
                />
                {isCustomAmount && (
                  <span className="currency-symbol">$</span>
                )}
              </div>
            </div>
          </div>

          <div className="form-section payment-method-section">
            <h3 className="section-title">Payment Method</h3>
            <div className="payment-method-tabs">
              <button
                type="button"
                className={`payment-tab ${paymentMethod === 'card' ? 'active' : ''}`}
                onClick={() => handlePaymentMethodChange('card')}
              >
                <span className="payment-icon">💳</span>
                <span>Credit Card</span>
              </button>
              <button
                type="button"
                className={`payment-tab ${paymentMethod === 'paypal' ? 'active' : ''}`}
                onClick={() => handlePaymentMethodChange('paypal')}
              >
                <span className="payment-icon">P</span>
                <span>PayPal</span>
              </button>
              <button
                type="button"
                className={`payment-tab ${paymentMethod === 'crypto' ? 'active' : ''}`}
                onClick={() => handlePaymentMethodChange('crypto')}
              >
                <span className="payment-icon">₿</span>
                <span>Crypto</span>
              </button>
            </div>

            <div className="payment-method-content">
              {renderPaymentInterface()}
            </div>
          </div>

          <div className="form-section receipt-section">
            <div className="form-group">
              <label htmlFor="emailAddress" className="form-label">Email for Receipt (Optional)</label>
              <input
                type="email"
                id="emailAddress"
                className="form-input"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
          </div>

          {error && (
            <div className="payment-error">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="cancel-button"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`submit-button ${paymentMethod === 'paypal' ? 'paypal-button' : paymentMethod === 'crypto' ? 'crypto-button' : 'credit-button'}`}
              disabled={loading || !paymentSessionId || (paymentMethod === 'card' && !stripe)}
            >
              {loading ? 'Processing...' : paymentMethod === 'card' ? 'Pay Securely' : paymentMethod === 'paypal' ? 'Pay with PayPal' : 'Pay with Crypto'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

// Main wrapper component
const SupportPaymentSection = () => {
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);

  // Handle payment success
  const handlePaymentSuccess = (paymentDetails) => {
    console.log('Payment successful:', paymentDetails);
    setPaymentComplete(true);
    setShowPaymentForm(false);
  };

  // Handle payment cancellation
  const handlePaymentCancel = () => {
    setShowPaymentForm(false);
  };

  return (
    <section id="support" className="support">
      <div className="container">
        <div className="section-header fade-in">
          <h2>Support The Project</h2>
          <p>
            InvyPro will always be free, but your support helps us make it even better
          </p>
        </div>

        <div className="support-container">
          {paymentComplete ? (
            <div className="support-card fade-in thank-you-card">
              <div className="thank-you-header">
                <div className="thank-you-icon">❤️</div>
                <h3>Thank You for Your Support!</h3>
                <p>
                  Your contribution makes a real difference. We're committed to making InvyPro even better with your help.
                </p>
              </div>

              <div className="next-steps">
                <h4>What's Next?</h4>
                <ul className="next-steps-list">
                  <li>
                    <span className="step-icon">📥</span>
                    <span className="step-text">A receipt has been sent to your email</span>
                  </li>
                  <li>
                    <span className="step-icon">🔄</span>
                    <span className="step-text">Try the latest version of InvyPro</span>
                  </li>
                  <li>
                    <span className="step-icon">🌟</span>
                    <span className="step-text">Share your experience with others</span>
                  </li>
                </ul>
              </div>

              <button
                className="action-button"
                onClick={() => setPaymentComplete(false)}
              >
                Return to Support Options
              </button>
            </div>
          ) : showPaymentForm ? (
            <div className="support-card fade-in payment-card">
              <div className="card-header">
                <h3>Secure Payment</h3>
                <button
                  className="close-button"
                  onClick={() => setShowPaymentForm(false)}
                >
                  ✕
                </button>
              </div>

              <Elements stripe={stripePromise}>
                <EnhancedSecurePayment
                  onSuccess={handlePaymentSuccess}
                  onCancel={handlePaymentCancel}
                />
              </Elements>
            </div>
          ) : (
            <div className="support-card fade-in">
              <div className="support-header">
                <h3>Why Support Us?</h3>
                <p>
                  Your contributions help fund continued development, new features, and expansion to mobile platforms.
                </p>
              </div>

              <div className="support-options">
                <div className="one-time-support">
                  <h4>Make a One-Time Contribution</h4>
                  <p>Support the project with a single contribution of any amount.</p>
                  <button
                    className="support-button primary-button"
                    onClick={() => setShowPaymentForm(true)}
                  >
                    Support Now
                  </button>
                </div>

                <div className="or-divider">
                  <span>or</span>
                </div>

                <div className="other-ways">
                  <h4>Other Ways to Support</h4>
                  <div className="other-ways-grid">
                    <div className="support-method">
                      <div className="method-icon">⭐</div>
                      <h5>Rate & Review</h5>
                      <p>Share your experience with others</p>
                      <a href="#review" className="method-link">Write a Review</a>
                    </div>
                    <div className="support-method">
                      <div className="method-icon">🐞</div>
                      <h5>Report Bugs</h5>
                      <p>Help us improve by reporting issues</p>
                      <a href="#bugs" className="method-link">Submit a Bug</a>
                    </div>
                    <div className="support-method">
                      <div className="method-icon">💡</div>
                      <h5>Suggest Features</h5>
                      <p>Share your ideas for new features</p>
                      <a href="#features" className="method-link">Suggest a Feature</a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="support-benefits">
                <div className="benefit-card">
                  <div className="benefit-title">Your Support Helps</div>
                  <p className="benefit-text">Fund development of new features</p>
                </div>
                <div className="benefit-card">
                  <div className="benefit-title">Your Support Accelerates</div>
                  <p className="benefit-text">Mobile app development</p>
                </div>
                <div className="benefit-card">
                  <div className="benefit-title">Your Support Enables</div>
                  <p className="benefit-text">Better community resources</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default SupportPaymentSection;