const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceNo:        { type: String, unique: true },
  invoiceDate:      { type: Date, default: Date.now },
  studentId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  studentName:      { type: String, required: true },
  studentRegNo:     { type: String },
  mobile:           { type: String },
  courseName:       { type: String, required: true },
  batch:            { type: String },
  trainingFee:      { type: Number, default: 0 },
  studyMaterialFee: { type: Number, default: 0 },
  otherCharges:     { type: Number, default: 0 },
  totalAmount:      { type: Number, required: true },
  paidAmount:       { type: Number, default: 0 },
  balanceAmount:    { type: Number, default: 0 },
  paymentMode:      { type: String },
  transactionNo:    { type: String },
  paymentDate:      { type: Date },
  amountInWords:    { type: String },
  status:           { type: String, enum: ['Paid', 'Pending', 'Partial'], default: 'Pending' }
}, { timestamps: true });

module.exports = mongoose.model('Invoice', invoiceSchema);
