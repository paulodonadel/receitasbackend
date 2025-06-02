const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Por favor, informe seu nome completo'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Por favor, informe seu e-mail'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Por favor, informe um e-mail válido'
    ]
  },
  Cpf: {
    type: String,
    required: false, // CPF agora é opcional
    unique: true,
    trim: true,
    sparse: true // Permite múltiplos documentos com CPF null/undefined
  },
  password: {
    type: String,
    required: [true, 'Por favor, informe uma senha'],
    minlength: 6,
    select: false
  },
  address: {
    street: String,
    number: String,
    complement: String,
    neighborhood: String,
    city: String,
    state: String,
    zipCode: String
  },
  role: {
    type: String,
    enum: ['patient', 'secretary', 'admin'],
    default: 'patient'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Criptografar senha usando bcrypt
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Método para gerar JWT
UserSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// Método para verificar senha
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
