import dotenv from "dotenv";
import cors from "cors";
dotenv.config();
import express from "express";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import cookieParser from "cookie-parser";
const app=express();
import {connectDB} from "./lib/db.js";
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin:"http://localhost:5173",
    credentials:true
}
))
const port=process.env.PORT;

app.get("/",(req,res)=>{
    res.send("Hello World");
});  
app.use("/api/auth",authRoutes);
app.use("/api/message",messageRoutes);

app.listen(port,()=>
{
    console.log(`server is running on port ${port}`);
    connectDB();
});
