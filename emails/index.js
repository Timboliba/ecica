const nodemailer = require("nodemailer");
require("dotenv").config();
class Email {
  transporter;
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.USER,
        pass: process.env.PASSWORD,
      },
    });
  }

  sendEmail(option) {
    const email = {};
    return this.transporter.sendMail(email);
  }
}

module.exports = new Email();
