shift-ur-gears - 150cc Physics Simulator

A realistic, mobile-first motorcycle simulator built with Next.js and Tailwind CSS. Designed for educational purposes to teach the coordination required between clutch, throttle, gears, and brakes on a manual transmission motorcycle.

🏍️ Project Overview

This is not just a racing game; it is a physics-based simulation of a 150cc single-cylinder street bike (common in India). It focuses on the mechanics of riding: friction zones, gear ratios, engine braking, and the strict requirement of clutch usage.

Live Physics Features:

Stall Logic: Releasing the clutch too fast without throttle kills the engine.

Friction Zone: The clutch isn't an on/off switch; it has a realistic "bite point" curve.

Strict Shifting: You cannot change gears unless the clutch is pulled in at least 80% (Educational enforcement).

Progressive Braking: Holding the brake builds pressure over time rather than instant locking.

150cc Engine Model: Realistic torque curves, gear ratios, and top speed (~115 km/h).

🎮 Controls (Mobile / Touch)

The game is designed for Landscape Mode using a "4-Finger" or "Thumb" grip style.

Left Hand

Thumb: Clutch Slider. (Slide Down = Engage/Go, Slide Up = Disengage/Pulled).

Index Finger: Gear Shifters (Up/Down).

Shift Pattern: 1 - N - 2 - 3 - 4 - 5.

Right Hand

Thumb: Throttle Slider. (Slide Up to Rev).

Index Finger: Rear Brake.

🛠️ Technical Stack

Framework: Next.js (App Router, JavaScript)

Styling: Tailwind CSS

Audio: Web Audio API (Custom FM Synthesis for engine "Thump" sound - No external assets).

Input: Custom Multi-touch event handlers (supports independent finger tracking).

🚀 How to Run Locally

Clone the repository:

git clone https://github.com/Riyo10/shift-ur-gears/
cd shift-ur-gears


Install dependencies:

npm install
# or
yarn install


Run the development server:

npm run dev


Open on Mobile:

Find your local IP address (e.g., 192.168.1.x).

Open http://<YOUR_IP>:3000 on your phone's browser.

Note: Ensure your phone and computer are on the same Wi-Fi network.

📂 Project Structure

/app
  ├── page.js             # Main entry point (Client Component)
  ├── layout.js           # Global layout
  └── globals.css         # Tailwind directives

/components
  └── BikeGame.jsx        # The UI Logic, Touch Handlers, and Visuals

/hooks
  └── useBikePhysics.js   # The Core Physics Engine & Audio Synthesizer


🧠 Educational Purpose

This simulator enforces Real-World Riding Habits:

No Clutchless Shifts: To prevent mechanical sympathy issues in real life, the code blocks shifting unless the clutch is fully pulled.

Neutral Handling: You must shift down to 1st before finding Neutral (1 -> N -> 2 logic implemented).

Smooth Takeoff: Users must learn to balance the throttle and clutch slider to start moving without stalling.

🐛 Known Issues & Browser Support

iOS Safari: Audio may need a physical tap on the "Start" button to initialize due to auto-play policies.

Orientation: Strictly designed for Landscape. Portrait mode will look broken.

Browser Gestures: On some Android phones, swiping from the edge might trigger "Back". It is recommended to add the website to your Home Screen to run it in full-screen mode.

Created for educational simulation.
