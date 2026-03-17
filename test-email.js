const nodemailer = require("nodemailer");
require("dotenv").config();

async function testEmail() {
  console.log("Testing email configuration...");
  console.log("Using User:", process.env.SMTP_USER);

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: `"KraftMobility Test" <${process.env.SMTP_USER}>`,
    to: "khushal.digitalwebkrida@gmail.com",
    subject: "Backend Email Test",
    text: "If you received this, your SMTP configuration is working correctly!",
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully!");
    console.log("Message ID:", info.messageId);
  } catch (error) {
    console.error("❌ Failed to send email:");
    console.error(error);
  }
}

testEmail();
