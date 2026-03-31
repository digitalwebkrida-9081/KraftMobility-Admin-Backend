const { execSync } = require('child_process');
const fs = require('fs');

async function cleanStart() {
  try {
    console.log('Force killing any existing processes on port 5656...');
    try {
      execSync('npx kill-port 5656');
    } catch(e) {
      console.log('Port already free or kill-port failed (usually fine).');
    }

    const logFile = 'C:/Users/siddh/Desktop/KraftMobility-Admin/backend/clean_start.log';
    fs.writeFileSync(logFile, `Backend clean start at ${new Date().toISOString()}\n`);
    
    console.log('Checking model and controller for generation logic presence...');
    const modelStr = fs.readFileSync('C:/Users/siddh/Desktop/KraftMobility-Admin/backend/src/models/case.model.js', 'utf8');
    const ctrlStr = fs.readFileSync('C:/Users/siddh/Desktop/KraftMobility-Admin/backend/src/controllers/case.controller.js', 'utf8');
    
    if (ctrlStr.includes('KM-') && modelStr.includes('KM-')) {
      console.log('✅ PASS: KM- logic detected in both model and controller.');
    } else {
      console.log('❌ FAIL: KM- logic NOT detected in files! This should not happen.');
    }

  } catch (err) {
    console.error('Clean start failed:', err);
  }
}

cleanStart();
