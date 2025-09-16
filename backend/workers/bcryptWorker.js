// backend/workers/bcryptWorker.js
import bcrypt from "bcryptjs";

export default async function ({ task, password, hash }) {
  if (task === "hash") {
    const salt = await bcrypt.genSalt(10); // adjust rounds if needed
    return await bcrypt.hash(password, salt);
  } else if (task === "compare") {
    return await bcrypt.compare(password, hash);
  } else {
    throw new Error("Unknown task");
  }
}
