const fs = require('fs');
const path = require('path');

/**
 * Ensures that required directories exist
 */
function ensureDirectories() {
  const directories = [
    path.join(__dirname, '..', '..', 'uploads'),
    path.join(__dirname, '..', '..', 'uploads', 'profiles'),
    path.join(__dirname, '..', '..', 'uploads', 'profile-photos') // backward compatibility
  ];

  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    } else {
      console.log(`📁 Directory exists: ${dir}`);
    }
  });
}

module.exports = ensureDirectories;
