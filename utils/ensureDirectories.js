const fs = require('fs');
const path = require('path');

/**
 * Garante que os diretórios necessários existam
 */
function ensureDirectories() {
  const directories = [
    path.join(__dirname, '..', '..', 'uploads'),
    path.join(__dirname, '..', '..', 'uploads', 'profiles'),
    path.join(__dirname, '..', '..', 'uploads', 'prescriptions'),
    path.join(__dirname, '..', '..', 'uploads', 'documents'),
    path.join(__dirname, '..', '..', 'logs'),
    path.join(__dirname, '..', '..', 'temp')
  ];

  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Diretório criado: ${dir}`);
    }
  });
}

module.exports = ensureDirectories;

