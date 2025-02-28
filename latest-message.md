# Network Connection Issue: Firewall Blocking WebSockets
Your logs show a clear connection timeout issue. The staff app is trying to connect to the admin but timing out during the handshake process. This is almost certainly due to a firewall blocking the WebSocket connection on port 8765.
Diagnosing the Problem
The admin server logs show:
This is correct - it's listening on all interfaces.
The staff app logs show:
This means the connection attempt is being blocked or timed out.
Interestingly, HTTP connections to the admin server are working fine (the dashboard is loading), but WebSocket connections are failing.
Solution Steps
1. Check Windows Firewall on Admin Machine
The most likely culprit is Windows Firewall blocking incoming WebSocket connections:
Open Windows Defender Firewall (search for "firewall" in Start menu)
Click "Advanced settings"
Select "Inbound Rules" in the left panel
Click "New Rule..." in the right panel
Select "Port" and click Next
Select "TCP" and enter "8765" in "Specific local ports"
Select "Allow the connection" and click Next
Check all three network types (Domain, Private, Public)
Give it a name like "OEKS Team Tracker WebSocket" and click Finish
2. Quick Test Without Changing Firewall (Temporary)
For a quick test, you can temporarily disable the firewall on the admin machine:
Open Windows Defender Firewall
Click "Turn Windows Defender Firewall on or off" (left panel)
Select "Turn off Windows Defender Firewall" for both private and public networks
Click OK
Test the connection
Remember to turn the firewall back on after testing!
3. Test Basic Network Connectivity
From the staff machine, test if you can connect to the admin machine:
Open Command Prompt
Run: ping 192.168.1.156
You can also test the specific port with: telnet 192.168.1.156 8765
(You may need to install telnet feature first)
4. Check for Port Conflicts
On the admin machine, verify nothing else is using port 8765:
Open Command Prompt (as administrator)
Run: netstat -ano | findstr :8765
If you see any results, something else is using the port
Alternative Connection Method
If the firewall issue continues to be problematic, you could modify the system to use an HTTP-based approach instead of WebSockets:
Have the staff app send screenshots via HTTP POST requests
The admin server would receive these via a standard HTTP endpoint
This is often easier to configure through firewalls since HTTP is commonly allowed.
Anti-Virus Considerations
Some anti-virus software may also block WebSocket connections. Check if your anti-virus has a firewall component that could be blocking the connection.
Let me know if you'd like detailed instructions for switching to an HTTP-based approach, which might be more reliable in environments with restrictive firewalls.