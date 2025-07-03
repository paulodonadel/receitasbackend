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
  phone: {
    type: String,
    required: false,
    trim: true
  },
  address: {
    street: String,
    number: String,
    complement: String,
    neighborhood: String,
    city: String,
    state: String,
    cep: String
  },
  // NOVOS CAMPOS PARA COMPLETAR CADASTRO
  dateOfBirth: {
    type: Date,
    required: false
  },
  gender: {
    type: String,
    enum: ['masculino', 'feminino', 'outro', 'nao_informar'],
    required: false
  },
  profession: {
    type: String,
    required: false,
    trim: true
  },
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  },
  medicalInfo: {
    allergies: [String],
    chronicConditions: [String],
    currentMedications: [String],
    notes: String
  },
  profilePhoto: {
    type: String, // URL ou caminho para a foto (backward compatibility)
    required: false
  },
  profileImage: {
    type: String, // Main profile image URL
    default: null
  },
  profileImageAPI: {
    type: String, // Alternative API URL for CORS
    default: null
  },
  // CAMPOS DE CONFIGURAÇÃO
  preferences: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: false
    },
    language: {
      type: String,
      default: 'pt-BR'
    }
  },
  role: {
    type: String,
    enum: ['patient', 'secretary', 'admin'],
    default: 'patient'
  },
  // CAMPOS DE CONTROLE
  isActive: {
    type: Boolean,
    default: true
  },
  isProfileComplete: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  resetPasswordToken: {
    type: String
  },
  resetPasswordExpires: {
    type: Date
  }
});

// Middleware para atualizar updatedAt
UserSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
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

// Método para verificar se o perfil está completo
UserSchema.methods.checkProfileCompleteness = function() {
  const requiredFields = ['name', 'email', 'phone'];
  const optionalButImportant = ['Cpf', 'address.street', 'address.city', 'address.cep'];
  
  let completeness = 0;
  const totalFields = requiredFields.length + optionalButImportant.length;
  
  // Verificar campos obrigatórios
  requiredFields.forEach(field => {
    if (this[field] && this[field].trim() !== '') {
      completeness++;
    }
  });
  
  // Verificar campos opcionais importantes
  optionalButImportant.forEach(field => {
    const fieldParts = field.split('.');
    let value = this;
    
    for (const part of fieldParts) {
      value = value?.[part];
    }
    
    if (value && value.trim && value.trim() !== '') {
      completeness++;
    } else if (value && !value.trim) {
      completeness++;
    }
  });
  
  const percentage = Math.round((completeness / totalFields) * 100);
  this.isProfileComplete = percentage >= 70; // 70% ou mais considera completo
  
  return {
    percentage,
    isComplete: this.isProfileComplete,
    missingFields: this.getMissingFields()
  };
};

// Método para obter campos faltantes
UserSchema.methods.getMissingFields = function() {
  const missing = [];
  
  if (!this.name || this.name.trim() === '') missing.push('name');
  if (!this.email || this.email.trim() === '') missing.push('email');
  if (!this.phone || this.phone.trim() === '') missing.push('phone');
  if (!this.Cpf || this.Cpf.trim() === '') missing.push('cpf');
  if (!this.address?.street || this.address.street.trim() === '') missing.push('address.street');
  if (!this.address?.city || this.address.city.trim() === '') missing.push('address.city');
  if (!this.address?.cep || this.address.cep.trim() === '') missing.push('address.cep');
  
  return missing;
};

// Método para atualizar último login
UserSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save();
};

// Virtual para nome completo formatado
UserSchema.virtual('displayName').get(function() {
  return this.name || this.email;
});

// Virtual para endereço completo
UserSchema.virtual('fullAddress').get(function() {
  if (!this.address) return '';
  
  const parts = [
    this.address.street,
    this.address.number,
    this.address.complement,
    this.address.neighborhood,
    this.address.city,
    this.address.state,
    this.address.cep
  ].filter(part => part && part.trim() !== '');
  
  return parts.join(', ');
});

// Índices para otimização
UserSchema.index({ email: 1 });
UserSchema.index({ Cpf: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });

module.exports = mongoose.model('User', UserSchema);

