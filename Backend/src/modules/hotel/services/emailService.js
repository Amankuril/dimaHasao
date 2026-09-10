import nodemailer from 'nodemailer';

class EmailService {
  constructor() {
    this.transporter = null;
    this.brandColor = '#0F766E'; // Teal-700 based on standard UI
    this.companyName = 'RukkooIn';
    this.logoUrl = 'https://res.cloudinary.com/dqowbjoxb/image/upload/v1738411000/rukkooin-logo-placeholder.png'; // Placeholder or Text fallback
  }

  getTransporter() {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });
    }
    return this.transporter;
  }

  /**
   * Generates a standardized HTML email template
   * @param {string} title - Main Heading
   * @param {string} body - HTML Body content
   * @param {string} subtitle - Optional Subtitle/Preheader
   */
  generateHtmlTemplate(title, body, subtitle = '') {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 0 10px rgba(0,0,0,0.05); }
          .header { background-color: ${this.brandColor}; padding: 20px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 1px; }
          .content { padding: 30px 20px; }
          .card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 20px; }
          .card h3 { margin-top: 0; color: ${this.brandColor}; font-size: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 10px; }
          .detail-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
          .detail-row span.label { color: #666; font-weight: 500; }
          .detail-row span.value { color: #111; font-weight: 600; text-align: right; }
          .footer { background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #e5e7eb; }
          .btn { display: inline-block; background-color: ${this.brandColor}; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 5px; font-weight: bold; margin-top: 15px; }
          .footer a { color: ${this.brandColor}; text-decoration: none; }
          @media only screen and (max-width: 600px) {
            .container { margin: 0; border-radius: 0; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <!-- <h1>${this.companyName}</h1> -->
             <div style="font-size: 24px; font-weight: bold;">${this.companyName}</div>
             ${subtitle ? `<p style="margin:5px 0 0; opacity:0.9; font-size:14px;">${subtitle}</p>` : ''}
          </div>
          <div class="content">
            <h2 style="color: #111; margin-top:0;">${title}</h2>
            ${body}
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ${this.companyName}. All rights reserved.</p>
            <p style="margin-top: 10px;">Sent with ❤️ from India</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Send an email
   */
  async sendEmail({ to, subject, html, text }) {
    try {
      const info = await this.getTransporter().sendMail({
        from: `"${process.env.FROM_NAME || this.companyName}" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text,
        html,
      });

      console.log('Message sent: %s', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending email:', error);
      return { success: false, error: error.message };
    }
  }

  // --- USER EMAILS ---

  async sendUserWelcomeEmail(user) {
    const title = `Welcome to ${this.companyName}!`;
    const body = `
      <p>Hi <strong>${user.name || 'Traveler'}</strong>,</p>
      <p>Welcome to the customized travel experience! We are thrilled to have you on board.</p>
      
      <div class="card">
        <h3>Your Profile Details</h3>
        <div class="detail-row"><span class="label">Name</span><span class="value">${user.name}</span></div>
        <div class="detail-row"><span class="label">Email</span><span class="value">${user.email}</span></div>
        <div class="detail-row"><span class="label">Phone</span><span class="value">${user.phone}</span></div>
      </div>
      
      <p>Start exploring amazing stays tailored just for you.</p>
      <div style="text-align: center;">
        <a href="https://rukkoo.in" class="btn">Explore Now</a>
      </div>
    `;
    const html = this.generateHtmlTemplate(title, body, 'Let the journey begin');
    return this.sendEmail({ to: user.email, subject: title, html, text: title });
  }

  async sendBookingConfirmationEmail(user, booking) {
    const property = booking.propertyId || {};
    const room = booking.roomTypeId || {};
    const subject = `Booking Confirmed! #${booking.bookingId}`;

    // Format Dates
    const checkIn = new Date(booking.checkInDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    const checkOut = new Date(booking.checkOutDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

    const body = `
      <p>Hi <strong>${user.name}</strong>,</p>
      <p>Great news! Your booking at <strong>${property.propertyName || property.name || 'your hotel'}</strong> is confirmed.</p>
      
      <div class="card">
        <h3>Booking Details (#${booking.bookingId})</h3>
        <div class="detail-row"><span class="label">Property</span><span class="value">${property.propertyName || property.name}</span></div>
        <div class="detail-row"><span class="label">Address</span><span class="value">${property.address?.city || 'India'}, ${property.address?.state || ''}</span></div>
        <div class="detail-row"><span class="label">Check-in</span><span class="value">${checkIn}</span></div>
        <div class="detail-row"><span class="label">Check-out</span><span class="value">${checkOut}</span></div>
        <div class="detail-row"><span class="label">Guests</span><span class="value">${booking.guests?.adults} Adults, ${booking.guests?.children} Children</span></div>
        <div class="detail-row"><span class="label">Rooms</span><span class="value">${booking.guests?.rooms || 1} x ${room.name || booking.bookingUnit || 'Room'}</span></div>
      </div>

      <div class="card">
        <h3>Payment Information</h3>
        <div class="detail-row"><span class="label">Total Amount</span><span class="value">₹${booking.totalAmount}</span></div>
        <div class="detail-row"><span class="label">Payment Status</span><span class="value" style="color: ${booking.paymentStatus === 'paid' ? 'green' : 'orange'}">${booking.paymentStatus.toUpperCase()}</span></div>
        ${booking.paymentMethod === 'pay_at_hotel' ? '<p style="font-size: 13px; color: #666; font-style: italic; margin-top:5px;">Please pay the total amount at the hotel during check-in.</p>' : ''}
      </div>

      <p>We look forward to hosting you!</p>
    `;

    const html = this.generateHtmlTemplate('Booking Confirmed', body, `Order #${booking.bookingId}`);
    return this.sendEmail({ to: user.email, subject, html, text: subject });
  }

  async sendBookingCancellationEmail(user, booking, refundAmount) {
    const subject = `Booking Cancelled: #${booking.bookingId}`;
    const propertyName = booking.propertyId?.propertyName || booking.propertyId?.name || 'Property';

    const body = `
      <p>Hi <strong>${user.name}</strong>,</p>
      <p>Your booking at <strong>${propertyName}</strong> has been cancelled as requested.</p>

      <div class="card">
        <h3>Cancellation Summary</h3>
        <div class="detail-row"><span class="label">Booking ID</span><span class="value">${booking.bookingId}</span></div>
        <div class="detail-row"><span class="label">Property</span><span class="value">${propertyName}</span></div>
        <div class="detail-row"><span class="label">Refund Status</span><span class="value">${refundAmount > 0 ? 'Initiated' : 'N/A'}</span></div>
        ${refundAmount > 0 ? `<div class="detail-row"><span class="label">Refund Amount</span><span class="value">₹${refundAmount}</span></div>` : ''}
        <div class="detail-row"><span class="label">Reason</span><span class="value">${booking.cancellationReason || 'User Request'}</span></div>
      </div>

      <p>We hope to serve you better next time.</p>
    `;

    const html = this.generateHtmlTemplate('Booking Cancelled', body);
    return this.sendEmail({ to: user.email, subject, html, text: subject });
  }

  // --- PARTNER EMAILS ---

  async sendPartnerRegistrationEmail(partner) {
    const subject = 'Partner Registration Received';
    const body = `
      <p>Hi <strong>${partner.name}</strong>,</p>
      <p>Thank you for registering as a partner with ${this.companyName}. We have received your details.</p>
      
      <div class="card">
        <h3>Application Status</h3>
        <p>Your account is currently <strong>Pending Admin Approval</strong>.</p>
        <p>Our team will verify your documents and get back to you shortly (usually within 24-48 hours).</p>
      </div>
    `;

    const html = this.generateHtmlTemplate(subject, body, 'Action Required: Wait for Approval');
    return this.sendEmail({ to: partner.email, subject, html, text: subject });
  }

  async sendPartnerApprovedEmail(partner) {
    const subject = 'Partner Account Approved!';
    const body = `
      <p>Congratulations <strong>${partner.name}</strong>!</p>
      <p>Your partner account details have been verified and approved by our admin team.</p>
      
      <p>You can now log in to your dashboard and start listing your properties to millions of travelers.</p>
      
      <div style="text-align: center;">
        <a href="https://rukkoo.in/hotel" class="btn">Login to Dashboard</a>
      </div>
    `;

    const html = this.generateHtmlTemplate('Welcome Aboard', body, 'You are live!');
    return this.sendEmail({ to: partner.email, subject, html, text: subject });
  }

  async sendPartnerRejectedEmail(partner, reason) {
    const subject = 'Partner and Account Application Update';
    const body = `
      <p>Hi <strong>${partner.name}</strong>,</p>
      <p>We reviewed your partner application for ${this.companyName}.</p>
      
      <div class="card" style="border-left: 4px solid #ef4444;">
        <h3>Application Status: Rejected</h3>
        <p>Unfortunately, we cannot proceed with your application at this time.</p>
        <p><strong>Reason:</strong> ${reason || 'Document verification failed or criteria not met.'}</p>
      </div>

      <p>If you believe this is an error, please contact our support team.</p>
    `;

    const html = this.generateHtmlTemplate('Application Status', body);
    return this.sendEmail({ to: partner.email, subject, html, text: subject });
  }

  // --- ADMIN EMAILS ---

  async sendAdminNewPropertyEmail(adminEmail, property) {
    const subject = 'New Property Listed';
    const body = `
      <p>Admin,</p>
      <p>A new property has been added and requires verification.</p>
      
      <div class="card">
        <h3>Property Details</h3>
        <div class="detail-row"><span class="label">Name</span><span class="value">${property.propertyName || property.name}</span></div>
        <div class="detail-row"><span class="label">Code</span><span class="value">${property.propertyType}</span></div>
        <div class="detail-row"><span class="label">Location</span><span class="value">${property.address?.city}</span></div>
      </div>
      
      <p><a href="https://rukkoo.in/admin">Go to Admin Panel</a></p>
    `;

    const html = this.generateHtmlTemplate(subject, body, 'Action Required');
    return this.sendEmail({ to: adminEmail, subject, html, text: subject });
  }

  async sendAdminSupportQueryEmail(adminEmail, contact) {
    const subject = `Support: ${contact.subject || 'New Message'}`;
    const body = `
      <p>New support message received.</p>
      
      <div class="card">
        <h3>Message Details</h3>
        <div class="detail-row"><span class="label">From</span><span class="value">${contact.name}</span></div>
        <div class="detail-row"><span class="label">Email</span><span class="value">${contact.email}</span></div>
        <div class="detail-row"><span class="label">Phone</span><span class="value">${contact.phone || 'N/A'}</span></div>
      </div>
      
      <div style="background: #f1f5f9; padding: 15px; border-radius: 5px;">
        <strong>Message:</strong><br/>
        ${contact.message}
      </div>
    `;

    const html = this.generateHtmlTemplate('New Support Query', body);
    return this.sendEmail({ to: adminEmail, subject, html, text: subject });
  }
}

export default new EmailService();
