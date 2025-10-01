import { connectDB } from "./src/lib/db.js";
import User from "./src/models/user.model.js";
import bcrypt from "bcryptjs";

const createTestUser = async () => {
  try {
    await connectDB();
    
    // Check if test user already exists
    const existingUser = await User.findOne({ email: "test@example.com" });
    if (existingUser) {
      console.log("Test user already exists!");
      console.log("Email: test@example.com");
      console.log("Password: password123");
      return;
    }

    // Create test user
    const hashedPassword = await bcrypt.hash("password123", 10);
    const testUser = new User({
      email: "test@example.com",
      fullName: "Test User",
      password: hashedPassword,
      profilePic: "https://randomuser.me/api/portraits/men/10.jpg"
    });

    await testUser.save();
    console.log("Test user created successfully!");
    console.log("Email: test@example.com");
    console.log("Password: password123");
    console.log("You can now login with this user to see Mark in contacts");
    
  } catch (error) {
    console.error("Error creating test user:", error);
  }
};

createTestUser();
