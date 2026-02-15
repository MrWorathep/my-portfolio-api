require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// เชื่อม MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
}
connectDB();

// Schema + Model สำหรับ Project
const projectSchema = new mongoose.Schema(
  {
    projectName: { type: String, required: true },
    images: { type: [String], required: true },
    detail: { type: String, required: true },
    role: { type: String, required: true },
    tools: { type: String, required: true },
    linkDemo: { type: String, required: false },
  },
  { timestamps: true }
);
const Project = mongoose.model("Project", projectSchema);

// Schema + Model สำหรับ Experience
const experienceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    image: { type: String, required: true },
    position: { type: String, required: true },
    organization: { type: String, required: true },
    year: { type: String, required: true },
    description: { type: [String], required: true },
  },
  { timestamps: true }
);
const Experience = mongoose.model("Experience", experienceSchema);

// ตั้งค่า Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ตั้งค่า Multer + Cloudinary สำหรับ Project
const projectStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "projects",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
    transformation: [{ quality: "auto" }, { fetch_format: "auto" }],
  },
});
const uploadProjectImages = multer({ storage: projectStorage });

// ตั้งค่า Multer + Cloudinary สำหรับ Experience
const experienceStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "experiences",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
    transformation: [{ quality: "auto" }, { fetch_format: "auto" }],
  },
});
const uploadExperienceImage = multer({ storage: experienceStorage });

// API ดึง Project ทั้งหมด
app.get("/api/projects", async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: 1 });
    res.json(projects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดที่ฝั่งเซิร์ฟเวอร์" });
  }
});

// API สร้าง Project + อัปโหลดรูปหลายรูป
app.post(
  "/api/projects/create-with-images",
  uploadProjectImages.array("images"),
  async (req, res) => {
    const { projectName, detail, role, tools, linkDemo } = req.body;

    if (!projectName || !detail || !role || !tools) {
      return res.status(400).json({
        message:
          "กรุณากรอกข้อมูล projectName, detail, role และ tools ให้ครบถ้วน",
      });
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
        images: imageUrls,
        detail,
        role,
        tools,
        linkDemo,
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

// API ดึง Experience ทั้งหมด
app.get("/api/experiences", async (req, res) => {
  try {
    const experiences = await Experience.find().sort({ createdAt: 1 });
    res.json(experiences);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดที่ฝั่งเซิร์ฟเวอร์" });
  }
});

// API เพิ่ม Experience + อัปโหลดรูป 1 รูป
app.post(
  "/api/experiences/create-with-image",
  uploadExperienceImage.single("image"),
  async (req, res) => {
    const { title, position, organization, year, description } = req.body;

    if (!title || !position || !organization || !year || !description) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "กรุณาอัปโหลดรูปภาพ" });
    }

    let descriptions;
    try {
      descriptions = JSON.parse(description);
      if (!Array.isArray(descriptions)) {
        throw new Error();
      }
    } catch {
      return res
        .status(400)
        .json({ message: "description ต้องเป็น JSON array ของข้อความ" });
    }

    try {
      const imageUrl = req.file.path;

      const newExperience = new Experience({
        title,
        image: imageUrl,
        position,
        organization,
        year,
        description: descriptions,
      });

      await newExperience.save();

      res.status(201).json({
        message: "เพิ่มข้อมูลประสบการณ์พร้อมรูปภาพสำเร็จ",
        experience: newExperience,
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
