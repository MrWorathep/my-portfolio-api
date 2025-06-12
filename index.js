require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const app = express();
app.use(express.json());

// เชื่อม MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1); // หยุดโปรแกรมถ้าเชื่อมต่อไม่ได้
  }
}
connectDB();

// สร้าง Schema + Model สำหรับ Project
const projectSchema = new mongoose.Schema(
  {
    projectName: { type: String, required: true },
    images: { type: [String], required: true }, // เปลี่ยนชื่อฟิลด์ image → images
    detail: { type: String, required: true },
  },
  { timestamps: true }
);

const Project = mongoose.model("Project", projectSchema);

// ตั้งค่า Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ตั้งค่า Multer + Cloudinary
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "projects",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
    transformation: [{ quality: "auto" }, { fetch_format: "auto" }],
  },
});
const upload = multer({ storage });

// ดึงโปรเจกต์ทั้งหมด
app.get("/api/projects", async (req, res) => {
  try {
    const projects = await Project.find();
    res.json(projects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดที่ฝั่งเซิร์ฟเวอร์" });
  }
});

// สร้างโปรเจกต์ + อัปโหลดรูป
app.post(
  "/api/projects/create-with-images",
  upload.array("images"),
  async (req, res) => {
    const { projectName, detail } = req.body;

    if (!projectName || !detail) {
      return res.status(400).json({ message: "projectName และ detail จำเป็น" });
    }

    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ message: "กรุณาอัปโหลดรูปอย่างน้อย 1 รูป" });
    }

    try {
      const imageUrls = req.files.map((file) => file.path);

      const newProject = new Project({
        projectName,
        images: imageUrls, // ตรงกับ schema ใหม่
        detail,
      });

      await newProject.save();

      res.status(201).json({
        message: "สร้างโปรเจกต์พร้อมอัปโหลดรูปสำเร็จ",
        project: newProject,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" });
    }
  }
);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
