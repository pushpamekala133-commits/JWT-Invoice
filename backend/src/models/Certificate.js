const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  certificateNo:  { type: String, unique: true },
  studentId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  studentName:    { type: String, required: true },
  courseName:     { type: String, required: true },
  completionDate: { type: Date, required: true },
  grade:          { type: String, default: 'A' },
  issueDate:      { type: Date, default: Date.now },
  trainerName:    { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Certificate', certificateSchema);
