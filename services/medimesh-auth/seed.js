const User = require('./models/User');

async function seedAdmin() {
  try {
    const existingAdmin = await User.findOne({ username: 'admin', role: 'admin' });
    if (!existingAdmin) {
      const admin = new User({
        username: 'admin',
        password: '123456',
        role: 'admin',
        fullName: 'System Administrator',
        email: 'admin@medimesh.local'
      });
      await admin.save();
      console.log('✅ Default admin seeded: admin / 123456');
    } else {
      console.log('ℹ️  Admin already exists, skipping seed');
    }
  } catch (err) {
    console.error('❌ Error seeding admin:', err.message);
  }
}

async function seedDoctors() {
  const doctors = [
    { username: 'doctor1', password: 'pass123', fullName: 'Dr. Sarah Wilson', email: 'doctor1@medimesh.local' },
    { username: 'doctor2', password: 'pass123', fullName: 'Dr. James Chen', email: 'doctor2@medimesh.local' },
    { username: 'doctor3', password: 'pass123', fullName: 'Dr. Emily Davis', email: 'doctor3@medimesh.local' },
    { username: 'doctor4', password: 'pass123', fullName: 'Dr. Michael Brown', email: 'doctor4@medimesh.local' },
    { username: 'doctor5', password: 'pass123', fullName: 'Dr. Lisa Anderson', email: 'doctor5@medimesh.local' }
  ];

  for (const doc of doctors) {
    try {
      const existing = await User.findOne({ username: doc.username });
      if (!existing) {
        const doctor = new User({ ...doc, role: 'doctor' });
        await doctor.save();
        console.log(`✅ Default doctor seeded: ${doc.username} / pass123`);
      }
    } catch (err) {
      console.error(`❌ Error seeding ${doc.username}:`, err.message);
    }
  }
}

module.exports = { seedAdmin, seedDoctors };
