const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  receiptNo:      { type: String, unique: true },
  studentId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  studentName:    { type: String },
  invoiceId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  invoiceNo:      { type: String },
  courseName:     { type: String },
  amount:         { type: Number, required: true },
  paymentDate:    { type: Date, default: Date.now },
  paymentMode:    { type: String, enum: ['Cash', 'UPI', 'Bank Transfer', 'Card'], default: 'Cash' },
  transactionNo:  { type: String },
  notes:          { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
