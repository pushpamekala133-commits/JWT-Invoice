const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  courseId: { type: String, unique: true },
  name:     { type: String, required: true },
  duration: { type: String, required: true },
  "Course fee":      { type: Number, required: true },
  gst:      { type: Number, default: 0 },
  total:    { type: Number, default: 0 }
}, { timestamps: true });

courseSchema.pre('save', function (next) {
  this.gst   = parseFloat(((this["Course fee"] * 18) / 100).toFixed(2));
  this.total = parseFloat((this["Course fee"] + this.gst).toFixed(2));
  next();
});

module.exports = mongoose.model('Course', courseSchema);
