import "dotenv/config";
import { connectDB } from "./src/lib/db.js";
import User from "./src/models/user.model.js";

const checkMarkUser = async () => {
  try {
    console.log("Connecting to database...");
    await connectDB();
    console.log("Connected to database successfully!");

    // Check if Mark user exists
    const markUser = await User.findOne({ email: "mark@gmail.com" });
    
    if (markUser) {
      console.log("✅ Mark user found in database!");
      console.log("User details:");
      console.log("- ID:", markUser._id);
      console.log("- Full Name:", markUser.fullName);
      console.log("- Email:", markUser.email);
      console.log("- Profile Pic:", markUser.profilePic);
      console.log("- Created At:", markUser.createdAt);
      console.log("- Has OAuth Providers:", markUser.oauthProviders?.length > 0);
    } else {
      console.log("❌ Mark user NOT found in database!");
    }

    // Also get total user count and show all emails for reference
    const allUsers = await User.find({}).select("email fullName");
    console.log(`\nTotal users in database: ${allUsers.length}`);
    console.log("All user emails:");
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.fullName})`);
    });

    process.exit(0);
  } catch (error) {
    console.error("Error checking Mark user:", error);
    process.exit(1);
  }
};

checkMarkUser();
