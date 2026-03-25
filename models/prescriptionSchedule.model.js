const mongoose = require('mongoose');

const MedicationRowSchema = new mongoose.Schema({
  // Internal row id (for React key, not stored as _id to avoid confusion)
  rowId: { type: String },
  medicationName: { type: String, required: true, trim: true },
  dosage: { type: String, required: true, trim: true },
  // Each time slot. Value is free text: "1cp", "2cp", "5ml", "SN", etc.
  // colspan: number of columns this cell spans (for merged cells)
  aoAcordar:  { value: { type: String, default: '' }, colspan: { type: Number, default: 1 } },
  manha:      { value: { type: String, default: '' }, colspan: { type: Number, default: 1 } },
  meiodia:    { value: { type: String, default: '' }, colspan: { type: Number, default: 1 } },
  tarde:      { value: { type: String, default: '' }, colspan: { type: Number, default: 1 } },
  noite:      { value: { type: String, default: '' }, colspan: { type: Number, default: 1 } },
  aoDeitar:   { value: { type: String, default: '' }, colspan: { type: Number, default: 1 } },
  // Optional custom note spanning the entire row (replaces time-slot cells)
  rowNote: { type: String, default: '' },
  useRowNote: { type: Boolean, default: false }
}, { _id: false });

const PrescriptionScheduleSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  consultationDate: {
    type: Date,
    default: Date.now
  },
  medications: [MedicationRowSchema],
  observations: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for fast lookup by patient + newest first
PrescriptionScheduleSchema.index({ patient: 1, createdAt: -1 });

module.exports = mongoose.model('PrescriptionSchedule', PrescriptionScheduleSchema);
