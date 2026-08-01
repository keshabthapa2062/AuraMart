import dns from "dns";
import nodemailer from "nodemailer";

dns.setDefaultResultOrder("ipv4first");

function getTransporter() {
  const user = process.env.GMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "465", 10); 

  if (!user || !pass) return null;


  const isSecure = port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure: isSecure, 
    family: 4, 
    auth: { user, pass },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,
  });
}

export async function sendOtpEmail(toEmail: string, otpCode: string): Promise<boolean> {
  const user = process.env.GMAIL_USER || process.env.SMTP_USER;
  const transporter = getTransporter();

  if (!transporter || !user) {
    console.log(`[SMTP Mailer Notice] GMAIL_USER or GMAIL_APP_PASSWORD not configured. OTP for ${toEmail}: ${otpCode}`);
    return false;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 24px; border: 1px solid #eaeaea; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #f0f0f0;">
        <h1 style="color: #4f46e5; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">AURA</h1>
        <p style="color: #6b7280; font-size: 13px; margin-top: 4px;">Curated E-Commerce Marketplace</p>
      </div>
      <div style="padding: 24px 0;">
        <h2 style="color: #111827; font-size: 18px; margin-bottom: 12px;">Your Verification Code</h2>
        <p style="color: #4b5563; font-size: 14px; line-height: 1.5;">Use the following 6-digit verification OTP code to complete your login or registration on Aura:</p>
        <div style="margin: 24px 0; text-align: center; background-color: #f9fafb; padding: 18px; border-radius: 12px; border: 1px dashed #4f46e5;">
          <span style="font-family: monospace; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #4f46e5;">${otpCode}</span>
        </div>
        <p style="color: #6b7280; font-size: 12px;">This code will expire in <strong>10 minutes</strong>. Do not share this code with anyone for security.</p>
      </div>
      <div style="border-top: 1px solid #f0f0f0; padding-top: 16px; text-align: center; color: #9ca3af; font-size: 11px;">
        &copy; ${new Date().getFullYear()} Aura E-Commerce Marketplace. All rights reserved.
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"Aura Security" <${user}>`,
      to: toEmail,
      subject: `[Aura] Your Verification OTP Code: ${otpCode}`,
      html,
    });
    console.log(`[SMTP Mailer] Verification OTP email sent successfully to ${toEmail}`);
    return true;
  } catch (error) {
    console.error(`[SMTP Mailer Error] Failed to send OTP email to ${toEmail}:`, error);
    return false;
  }
}

export async function sendOrderConfirmationEmail(toEmail: string, order: any): Promise<boolean> {
  const user = process.env.GMAIL_USER || process.env.SMTP_USER;
  const transporter = getTransporter();

  if (!transporter || !user) {
    console.log(`[SMTP Mailer Notice] GMAIL_USER or GMAIL_APP_PASSWORD not configured. Order notification logged for order #${order.id || order.transactionId}`);
    return false;
  }

  const orderId = order.id || order.transactionId || 'AURA-ORD';
  const isCod = (order.paymentMethod || '').toLowerCase().includes('cod') || (order.paymentMethod || '').toLowerCase().includes('cash on delivery');
  const paymentStatusText = isCod ? 'Payment Due on Delivery' : (order.paymentStatus || 'Paid');
  const paymentStatusBadgeColor = isCod ? '#d97706' : '#16a34a';

  const itemsHtml = (order.items || []).map((item: any) => `
    <tr style="border-bottom: 1px solid #f3f4f6;">
      <td style="padding: 10px; font-size: 13px; color: #111827;">${item.name || item.product?.name || 'Product Item'}</td>
      <td style="padding: 10px; font-size: 13px; color: #6b7280; text-align: center;">x${item.quantity || 1}</td>
      <td style="padding: 10px; font-size: 13px; font-weight: bold; color: #111827; text-align: right;">₹${((item.price || item.product?.price || 0) * (item.quantity || 1)).toLocaleString()}</td>
    </tr>
  `).join('');

  const totalVal = order.total || order.totalAmount || order.finalTotal || 0;
  const rawTotalVal = order.originalTotal || order.rawTotal || totalVal;
  const coinsDiscount = order.redeemedCoins || 0;
  const offerDiscount = order.offerDiscount || 0;

  let otpBlockHtml = '';
  if (order.deliveryOtp) {
    otpBlockHtml = `
      <div style="margin: 20px 0; background-color: #fefce8; border: 1.5px dashed #ca8a04; padding: 16px; border-radius: 12px; text-align: center;">
        <p style="color: #854d0e; font-size: 11px; font-weight: 800; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">Handover Delivery Verification OTP</p>
        <div style="font-family: monospace; font-size: 30px; font-weight: 900; letter-spacing: 8px; color: #ca8a04; margin: 6px 0;">${order.deliveryOtp}</div>
        <p style="color: #713f12; font-size: 11px; margin: 0;">Share this 6-digit verification OTP code with your delivery agent to verify and confirm receipt of your package.</p>
      </div>
    `;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #eaeaea; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; padding-bottom: 16px; border-bottom: 2px solid #4f46e5;">
        <h1 style="color: #4f46e5; margin: 0; font-size: 26px; font-weight: 800;">AURA</h1>
        <p style="color: #16a34a; font-size: 14px; font-weight: bold; margin-top: 4px;">🎉 Order Placed Successfully!</p>
      </div>
      <div style="padding: 20px 0;">
        <p style="color: #374151; font-size: 14px;">Thank you for shopping with Aura! Here are your order details and payment summary:</p>
        
        <div style="background-color: #f9fafb; padding: 14px 18px; border-radius: 10px; margin: 16px 0; font-size: 13px; border: 1px solid #f3f4f6;">
          <p style="margin: 4px 0; color: #4b5563;"><strong>Order ID:</strong> #${orderId}</p>
          <p style="margin: 4px 0; color: #4b5563;"><strong>Payment Method:</strong> ${order.paymentMethod || 'Online Payment'}</p>
          <p style="margin: 4px 0; color: #4b5563;">
            <strong>Payment Status:</strong> 
            <span style="background-color: ${paymentStatusBadgeColor}; color: #ffffff; font-size: 11px; font-weight: bold; padding: 2px 8px; border-radius: 6px; display: inline-block; margin-left: 4px;">
              ${paymentStatusText}
            </span>
          </p>
          <p style="margin: 4px 0; color: #4b5563;"><strong>Delivery Address:</strong> ${order.shippingAddress?.street || ''}, ${order.shippingAddress?.city || ''}, ${order.shippingAddress?.postalCode || ''}, ${order.shippingAddress?.country || 'India'}</p>
        </div>

        ${otpBlockHtml}

        <h3 style="color: #111827; font-size: 15px; margin-top: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">Order Items</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
          <thead>
            <tr style="background-color: #f3f4f6; color: #4b5563; font-size: 12px; text-transform: uppercase;">
              <th style="padding: 8px; text-align: left;">Product</th>
              <th style="padding: 8px; text-align: center;">Qty</th>
              <th style="padding: 8px; text-align: right;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div style="margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 12px; font-size: 13px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #6b7280;">
            <span>Subtotal:</span>
            <span>₹${rawTotalVal.toLocaleString()}</span>
          </div>
          ${coinsDiscount > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #d97706; font-weight: bold;">
            <span>AuraCoins Redeemed:</span>
            <span>-₹${coinsDiscount}</span>
          </div>
          ` : ''}
          ${offerDiscount > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #16a34a; font-weight: bold;">
            <span>Payment Offer Discount (${order.appliedOffer || 'UPI/Paytm Offer'}):</span>
            <span>-₹${offerDiscount}</span>
          </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 16px; font-weight: 800; color: #111827;">
            <span>${isCod ? 'Total Payable on Delivery:' : 'Total Amount Paid:'}</span>
            <span style="color: #4f46e5;">₹${totalVal.toLocaleString()}</span>
          </div>
        </div>
      </div>
      <div style="border-top: 1px solid #f0f0f0; padding-top: 16px; text-align: center; color: #9ca3af; font-size: 11px;">
        &copy; ${new Date().getFullYear()} Aura E-Commerce Marketplace. All rights reserved.
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"Aura Orders" <${user}>`,
      to: toEmail,
      subject: `[Aura Order Confirmed] #${orderId}`,
      html,
    });
    console.log(`[SMTP Mailer] Order confirmation email sent to ${toEmail} for order #${orderId}`);
    return true;
  } catch (error) {
    console.error(`[SMTP Mailer Error] Failed to send order confirmation to ${toEmail}:`, error);
    return false;
  }
}

export async function sendOrderStatusEmail(toEmail: string, order: any, newStatus: string, deliveryOtp?: string): Promise<boolean> {
  const user = process.env.GMAIL_USER || process.env.SMTP_USER;
  const transporter = getTransporter();

  if (!transporter || !user) {
    console.log(`[SMTP Mailer Notice] GMAIL_USER or GMAIL_APP_PASSWORD not configured. Order status update (${newStatus}) logged for order #${order.id}`);
    return false;
  }

  let otpBlock = '';
  if (newStatus === 'Out for Delivery' && (deliveryOtp || order.deliveryOtp)) {
    const code = deliveryOtp || order.deliveryOtp;
    otpBlock = `
      <div style="margin: 20px 0; background-color: #fffbeb; border: 1px solid #fcd34d; padding: 16px; border-radius: 12px; text-align: center;">
        <p style="color: #92400e; font-size: 12px; font-weight: bold; margin: 0 0 6px 0; text-transform: uppercase;">Handover Verification OTP</p>
        <span style="font-family: monospace; font-size: 28px; font-weight: 900; letter-spacing: 6px; color: #d97706;">${code}</span>
        <p style="color: #78350f; font-size: 11px; margin-top: 6px;">Share this 6-digit OTP code with your delivery agent upon receiving your order.</p>
      </div>
    `;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 24px; border: 1px solid #eaeaea; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; padding-bottom: 16px; border-bottom: 2px solid #4f46e5;">
        <h1 style="color: #4f46e5; margin: 0; font-size: 26px; font-weight: 800;">AURA</h1>
        <p style="color: #4b5563; font-size: 13px; margin-top: 4px;">Order Status Update Notification</p>
      </div>
      <div style="padding: 20px 0;">
        <h2 style="color: #111827; font-size: 18px; margin-bottom: 8px;">Order #${order.id} Status: <span style="color: #4f46e5;">${newStatus}</span></h2>
        <p style="color: #4b5563; font-size: 14px; line-height: 1.5;">Your order status has been updated to <strong>${newStatus}</strong>.</p>
        
        ${otpBlock}

        <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">You can view detailed updates and invoices in your Aura account.</p>
      </div>
      <div style="border-top: 1px solid #f0f0f0; padding-top: 16px; text-align: center; color: #9ca3af; font-size: 11px;">
        &copy; ${new Date().getFullYear()} Aura E-Commerce Marketplace.
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"Aura Shipping" <${user}>`,
      to: toEmail,
      subject: `[Aura Order Status] Order #${order.id} is ${newStatus}`,
      html,
    });
    console.log(`[SMTP Mailer] Status update email sent to ${toEmail} for order #${order.id}`);
    return true;
  } catch (error) {
    console.error(`[SMTP Mailer Error] Failed to send status email to ${toEmail}:`, error);
    return false;
  }
}
