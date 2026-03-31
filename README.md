# 🏥 WardWatch – AI-Based Rehabilitation & Smart Bed Management System

---

## 📌 Overview

WardWatch is an AI-powered healthcare system that integrates **real-time physiotherapy tracking** with **hospital ward and bed management**.

The system enables hospitals to monitor patient recovery, manage bed allocation efficiently, and make informed discharge decisions using rehabilitation data.

---

## 🎯 Objectives

* Monitor patient rehabilitation progress using AI
* Track ward-wise bed availability and status
* Improve hospital resource utilization
* Assist administrators in discharge decision-making
* Reduce delays in emergency patient handling

---

## 🧩 Key Features

### 👤 Patient Module (Rehabilitation System)

* Real-time pose detection using MediaPipe
* Joint angle calculation for movement analysis
* Automatic repetition counting
* Live accuracy computation based on exercise performance
* Instant feedback through visual and voice guidance
* Session tracking for rehabilitation progress

---

### 🏥 Admin Module (WardWatch Dashboard)

#### Ward & Bed Overview

* Displays total beds in each ward
* Shows real-time count of:

  * Occupied beds
  * Available beds
  * Beds under cleaning

#### Bed Status Management

* Tracks individual bed states:

  * Available
  * Occupied
  * Cleaning
  * Reserved

#### Cleaning Workflow

* Marks beds for cleaning after discharge
* Updates bed availability after sanitation
* Ensures proper bed hygiene tracking

#### Patient Monitoring

* Displays patient rehabilitation performance
* Tracks accuracy, repetitions, and session activity

#### Ward Analytics

* Bed occupancy rate
* Ward utilization statistics
* Patient stay trends
* Discharge activity tracking

---

### 🤖 AI-Based Rehabilitation Analysis

* Evaluates correctness of exercises in real time
* Measures performance using angle-based calculations
* Tracks improvement trends over multiple sessions
* Provides continuous feedback for better recovery

---

### 📈 Discharge Prediction System

* Estimates patient recovery status using rehabilitation data

* Classifies patients based on performance levels:

  * High performance → Near discharge
  * Moderate performance → Ongoing recovery
  * Low performance → Requires attention

* Assists administrators in planning bed availability

---

### 🚑 Emergency Optimization

* Enables faster identification of available beds
* Supports prioritization during emergency situations
* Improves response time through better resource planning

---

## 🔗 System Architecture

Patient interacts with the rehabilitation module, where pose detection and accuracy calculations are performed. The processed data is stored in a database and accessed by the admin dashboard for monitoring, analytics, and decision-making.

---

## 🛠️ Tech Stack

* **Frontend:** React.js
* **AI Tracking:** MediaPipe Pose
* **Database:** Supabase / MongoDB
* **Backend:** Node.js (optional integration)
* **Visualization:** Recharts

---

## 🚀 Key Highlights

* Combines AI-based physiotherapy with hospital management
* Provides real-time feedback and analytics
* Enables data-driven discharge decisions
* Improves hospital efficiency and bed utilization

---

## 🧠 Future Scope

* Machine learning-based recovery prediction
* Real-time multi-patient monitoring
* Integration with hospital information systems
* Mobile application support
* IoT-based smart bed tracking

---

## 🎯 Conclusion

WardWatch is a comprehensive healthcare solution that bridges the gap between patient rehabilitation and hospital management, enabling smarter decisions and improved patient care through AI-driven insights.

---
