const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  studentId:     { type: String, unique: true },
  name:          { type: String, required: true },
  mobile:        { type: String, required: true },
  email:         { type: String },
  qualification: { type: String },
  college:       { type: String },
  joiningDate:   { type: Date },
  address:       { type: String },
  aadhar:        { type: String },
  photo:         { type: String },
  courseId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  courseName:    { type: String },
  courseFee:     { type: Number, default: 0 },
  gst:           { type: Number, default: 0 },
  totalFee:      { type: Number, default: 0 },
  paidFee:       { type: Number, default: 0 },
  balanceFee:    { type: Number, default: 0 },
  status:        { type: String, enum: ['Pending', 'Partial', 'Paid'], default: 'Pending' }
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);
