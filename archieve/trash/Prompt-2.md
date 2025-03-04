### **OEKS Team Tracker - Step-by-Step Development Plan**  

---

### **1. Technology Stack & Tools**  

- **Programming Language:** Python (for staff application & admin backend)  
- **Screenshot Capture:** `mss` (lightweight, fast for Windows)  
- **Communication:** WebSocket (`websockets` Python library for sending, JavaScript WebSocket API for receiving)  
- **Admin Dashboard:** Static HTML + JavaScript (`index.html`, basic `fetch` API for real-time updates)  
- **Storage:** Local filesystem on the admin machine  
- **Cleanup Automation:** Python script (scheduled with `Task Scheduler` to remove old files)  
- **Security:** API key validation (simple string-based token check)  
- **Logging:** Console logs for routine events, debugger logs for critical actions  

---

### **2. System Architecture**  

#### **Staff Application (Windows PC)**
- Captures a **low-quality** screenshot every **3 seconds**  
- Sends screenshot **via WebSocket** to the **Admin Server**  
- Uses an **API key** for simple authentication  
- Logs each action (sending success, failure, retry attempts)  

#### **Admin Machine**
- **Receives screenshots via WebSocket**  
- Saves images to a local directory (e.g., `screenshots/{staff_id}/{timestamp}.jpg`)  
- Displays live screenshots using a **static HTML + JavaScript frontend**  
- Automatically deletes screenshots older than **1 month**  

---

### **3. Development Steps**  

#### **Step 1: Staff Application (Python)**
- Use `mss` to capture the screen every **3 seconds**  
- Convert to **low-quality JPEG** to reduce size  
- Send via **WebSocket** with an **API key** for validation  
- Log actions (success, failure, retries)  

#### **Step 2: Admin Server (Python)**
- Implement a **WebSocket server** to receive images  
- Validate API key before accepting images  
- Save images to local storage in a structured format  
- Log important events (new screenshot received, errors)  

#### **Step 3: Admin Dashboard (Static HTML + JavaScript)**
- Create a **basic webpage** to display incoming images live  
- Fetch and update images dynamically using **JavaScript WebSocket API**  
- Organize images by **staff ID & timestamp**  

#### **Step 4: Storage & Cleanup**
- Store images as `{screenshots/{staff_id}/{timestamp}.jpg}`  
- Implement a **Python cleanup script** (deletes files older than 1 month)  
- Automate cleanup using **Windows Task Scheduler**  

---

### **4. Deployment & Setup**  

#### **For Staff PCs:**
- Package the script into a **single executable (`.exe`)** using `pyinstaller`  
- Provide a simple **config file** (`config.json`) for API key & admin machine IP  
- Run on startup using **Task Scheduler**  

#### **For Admin Machine:**
- Run the WebSocket server (`admin_server.py`)  
- Serve the static dashboard (`index.html`)  
- Schedule the cleanup script to run **daily**  

---

### **5. Optimization & Logging Strategy**  

- **Compression:** Ensure images are compressed before sending  
- **Non-blocking WebSockets:** Use `asyncio` to prevent blocking the loop  
- **Logging:**  
  - **Normal events:** Console log (e.g., "Screenshot sent successfully")  
  - **Critical actions:** Debug logs before/after processing (e.g., "Saving image", "Image saved successfully")  
  - **Failures:** Retry mechanism with exponential backoff  

---

### **Final Notes**  
This setup ensures **fast performance**, **low bandwidth usage**, and **simple deployment**. Since there is only **one admin machine**, the WebSocket approach will work efficiently without scaling concerns.  

Ready to code? 🚀