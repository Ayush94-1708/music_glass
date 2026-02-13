const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const User = require('./models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/music_app';

async function createAdmin() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: 'admin@music.com' });
        if (existingAdmin) {
            console.log('Admin user already exists!');
            console.log('Email: admin@music.com');
            console.log('You can login with the password you set previously');
            process.exit(0);
        }

        // Create admin user
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);

        const adminUser = new User({
            username: 'admin',
            email: 'admin@music.com',
            password: hashedPassword,
            role: 'admin'
        });

        await adminUser.save();
        console.log('\n✅ Admin user created successfully!');
        console.log('==========================================');
        console.log('Email:    admin@music.com');
        console.log('Password: admin123');
        console.log('==========================================');
        console.log('⚠️  Please change this password after first login!\n');

        process.exit(0);
    } catch (error) {
        console.error('Error creating admin user:', error);
        process.exit(1);
    }
}

createAdmin();
