import fs from "fs";
import path from "path";

/**
 * Updates .env file with deployed contract addresses
 * @param {string} key - Environment variable key (TOKEN_ADDRESS or DAO_ADDRESS)
 * @param {string} value - Contract address
 */
function updateEnvFile(key, value) {
  const envPath = path.join(process.cwd(), '.env');
  
  // Check if .env exists, if not copy from .env.example
  if (!fs.existsSync(envPath)) {
    const examplePath = path.join(process.cwd(), '.env.example');
    if (fs.existsSync(examplePath)) {
      fs.copyFileSync(examplePath, envPath);
      console.log("📄 Created .env file from .env.example");
    } else {
      // Create basic .env file
      fs.writeFileSync(envPath, `PRIVATE_KEY=\nBSCSCAN_API_KEY=\nTOKEN_ADDRESS=\nDAO_ADDRESS=\n`);
      console.log("📄 Created new .env file");
    }
  }
  
  // Read current .env content
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Update or add the key-value pair
  const keyPattern = new RegExp(`^${key}=.*$`, 'm');
  if (keyPattern.test(envContent)) {
    // Update existing key
    envContent = envContent.replace(keyPattern, `${key}=${value}`);
    console.log(`🔄 Updated ${key} in .env file`);
  } else {
    // Add new key
    envContent += `\n${key}=${value}`;
    console.log(`➕ Added ${key} to .env file`);
  }
  
  // Write back to file
  fs.writeFileSync(envPath, envContent);
  console.log(`✅ ${key}=${value}`);
}

export { updateEnvFile };