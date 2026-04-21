# 3D Gas Leak and Ventilation Simulation

A web-based, interactive 3D simulation designed for **Occupational Health and Safety (OHS/ISG)** training. This project simulates a gas leak scenario in a laboratory environment, requiring the user to identify the source, manage ventilation, and evacuate safely.

## 🚀 Key Features

### 1. Gas Dispersion System
- **Particle-Based Simulation:** Implemented using `THREE.Points` and custom shaders.
- **Dynamic Growth:** The gas expands and fills the room over time based on leak intensity.
- **Visual Feedback:** Realistic smoke/gas particles that react to environmental changes.

### 2. Advanced Airflow Logic
- **Dynamic Vent Sources:** Includes an extraction fan, openable windows, and a doorway.
- **Vector-Based Airflow:** Gas particles move realistically towards open exits. 
    - *Window Open:* Air flows towards the side wall.
    - *Door Open:* Air flows towards the front exit.
    - *Combined:* Airflow vectors merge for complex ventilation patterns.

### 3. Hazard Monitoring & UI
- **Real-time Sensor:** A dedicated UI bar displaying the current ambient gas concentration percentage.
- **Danger States:** High gas levels trigger visual warnings (red screen tinting) and an emergency audio alarm.
- **Scoring System:** Evaluates performance based on speed, safety (peak gas level), and procedure (turning on fans/windows).

### 4. Detection Mechanics
- **Handheld Gas Detector:** A visual tool that changes color from **Green** to **Red** based on your proximity to the leak source.
- **Interaction Hinting:** Real-time feedback when looking at interactable objects like fans, windows, and the alarm button.

## 🎮 Controls

| Action | Control |
| :--- | :--- |
| **Movement** | `W` `A` `S` `D` |
| **Look Around** | `Mouse` |
| **Interact** | `E` or `Left Click` (Fan, Window, Door, Alarm) |
| **Start Scenario** | `UI Button` |

## 🛠️ Technology Stack

- **Core Engine:** [Three.js](https://threejs.org/) (WebGL)
- **Development Tool:** [Vite](https://vitejs.dev/)
- **Language:** JavaScript (ES6+), HTML5, CSS3
- **Audio:** HTML5 Web Audio API

## 📦 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) installed on your machine.

### Installation
1. Clone the repository or extract the zip.
2. Open the terminal in the `fire-sim` directory.
3. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally
1. Start the development server:
   ```bash
   npx vite
   ```
2. Open your browser and navigate to the provided local URL (usually `http://localhost:5173`).

## 📊 Result Export
The simulation automatically tracks user decisions and performance metrics. Upon completion, a summary report is generated, and results can be exported as a **CSV** file for administrative review.


## 👥 Team: BS Studious

### Student Information
- **Mustafa Berkay Karagöz** - 220208010
- **Şeyma Bayram** - 220208045

---
*Created as part of Mini-Project II - Gas Leak and Ventilation Simulation.*