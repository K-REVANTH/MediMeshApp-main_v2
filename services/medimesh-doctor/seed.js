const Doctor = require('./models/Doctor');

async function seedDoctors() {
  const defaults = [
    { userId: 'doctor1', username: 'doctor1', fullName: 'Dr. Sarah Wilson', specialization: 'Cardiology', experience: 10 },
    { userId: 'doctor2', username: 'doctor2', fullName: 'Dr. James Chen', specialization: 'Neurology', experience: 8 },
    { userId: 'doctor3', username: 'doctor3', fullName: 'Dr. Emily Davis', specialization: 'Orthopedics', experience: 12 },
    { userId: 'doctor4', username: 'doctor4', fullName: 'Dr. Michael Brown', specialization: 'Pediatrics', experience: 6 },
    { userId: 'doctor5', username: 'doctor5', fullName: 'Dr. Lisa Anderson', specialization: 'Dermatology', experience: 9 }
  ];

  for (const doc of defaults) {
    try {
      const existing = await Doctor.findOne({ userId: doc.userId });
      if (!existing) {
        await Doctor.create(doc);
        console.log(`✅ Seeded doctor profile: ${doc.fullName}`);
      }
    } catch (err) {
      console.error(`❌ Error seeding ${doc.fullName}:`, err.message);
    }
  }
}

module.exports = { seedDoctors };
