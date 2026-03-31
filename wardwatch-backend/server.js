require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const connectDB = require("./config/db");

// Import all routes
const bedRoutes = require("./routes/bedRoutes");
const patientRoutes = require("./routes/patientRoutes");
const forecastRoutes = require("./routes/forecastRoutes");
const alertRoutes = require("./routes/alertsRoutes");
const queueRoutes = require("./routes/queueRoutes");
const wardsRoutes = require("./routes/wardsRoutes");

// Connect to MongoDB
connectDB();

// Express app setup
const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PATCH", "DELETE"],
  },
});

// Attach io to app so controllers can access it
app.set("io", io);

// Middleware
app.use(cors());
app.use(express.json());

// All routes prefixed with /api
app.use("/api/beds", bedRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/forecast", forecastRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/queue", queueRoutes);
app.use("/api/wards", wardsRoutes);

// Health check route
app.get("/", (req, res) => {
  res.json({ message: "WardWatch API running...", status: "ok" });
});

// Socket connection
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});