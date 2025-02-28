**Tool Name:** **OEKS Team Tracker**  

### **Project Overview**  
OEKS Team Tracker is a **lightweight and time-sensitive monitoring solution** designed for team leaders to oversee remote team productivity efficiently. The system periodically captures screenshots from staff computers and **sends them to a local admin machine for real-time viewing via a centralized dashboard.**  

This tool is intended for **quick deployment** and **minimal overhead**, avoiding complex security policies or additional features that could slow down implementation.  

### **Key Requirements:**  
- **Real-time Screenshot Monitoring:** Staff computers capture periodic screenshots and send them to the admin system.  
- **Simple Two-Part Architecture:**  
  1. **Staff Application:** Installed on team members’ PCs, captures screenshots, and sends them to the admin.  
  2. **Admin Server:** Receives screenshots, categorizes them by team member, and displays them in a control panel.  
- **Local Storage System:** Screenshots are stored directly on the admin machine.  
- **Automatic Cleanup & Storage Management:** Old screenshots should be automatically deleted to save space.  
- **Basic Authentication & Rate Limiting:** To ensure efficient operation without unnecessary complexity.  
- **Performance Optimizations:** Solution should prioritize speed and ease of use.  
- **Designed for Minimum-Wage Teams:** **Prioritize simplicity and functionality over security hardening or additional features.**  

### **Important Considerations Before Coding:**  
I have attempted to implement this system using **Chrome screen sharing**, but it introduced too many complications.  
Now, I need **a barebones yet functional solution** that operates efficiently within the **same local network** with minimal friction.  

### **Decisions to Make Before Development:**  
- **Technology Stack:** Should we use **Python** or **JavaScript** for both staff and admin parts?  
- **Screenshot Capture:** Which library offers the easiest implementation for capturing screenshots with minimal setup?  
- **Communication Method:** What is the simplest way for staff applications to send images to the admin machine?  
- **Control Panel:** What lightweight framework should we use to build the admin dashboard?  
- **Storage Handling:** What is the easiest way to manage screenshot storage and automatic cleanup?  

### **Key Constraints:**  
- **No unnecessary complexity**—choose the easiest tools and methods to achieve functionality quickly.  
- **No coding yet**—first, we finalize the plan before any development starts.  

Ready to hear my plan now?