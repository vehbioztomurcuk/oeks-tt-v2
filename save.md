We made progress.

1. Everything looks good on the terminal and console. (I guess you check anyway)
2. Video is storing with no problems on the directory 
`\videos\staff_pc_141\staff_pc_141-03-04-2025.mp4`


Problem is simple actually. We just need to stream the video itself to the admin panel in 
the related staff section.

But when I open admin panel `http://192.168.1.183:8080/` from admin pc there is no team 
member list on the home page. 

Normally there should be connected person there (my staff laptop that i do testing as team 
member)

And the live stream should be available, (It might have 3-5 sec delay no problem do not 
focus on the live stream word)

To summarize, I need to see the screen of the online members on admin panel. We already 
got everything working, video stores the correct place, but I cannot see it on admin panel.

admin pc panel browser console 

```
utils.js:227 Connecting to WebSocket: ws://localhost:8765
utils.js:234 WebSocket bağlantısı kuruldu
utils.js:256 WebSocket mesajı alındı: {"status": "authenticated", "message": 
"Authentication successful"}
utils.js:261 WebSocket authentication successful
dashboard.js:274 Staff staff_pc_141 video path: videos/staff_pc_141/latest.mp4, valid: true
dashboard.js:274 Staff unknown video path: null, valid: null
favicon.ico:1 
        
        
       GET http://localhost:8080/favicon.ico 404 (Not Found)
dashboard.js:274 Staff unknown video path: null, valid: null
dashboard.js:274 Staff staff_pc_141 video path: videos/staff_pc_141/latest.mp4, valid: true
dashboard.js:274 Staff unknown video path: null, valid: null
dashboard.js:274 Staff staff_pc_141 video path: videos/staff_pc_141/latest.mp4, valid: true

```

admin pc terminal 
```
2025-03-04 16:52:09,502 - INFO - Successfully served JavaScript file: 
C:\Users\vehbi-oeks-7800x3d\Documents\Code\oeks-tt-2\js/modal.js                           
                                                                               2025-03-04 
16:52:09,502 - INFO - Request for JavaScript file: /js/history.js, serving from: 
C:\Users\vehbi-oeks-7800x3d\Documents\Code\oeks-tt-2\js/history.js                         
                                                         2025-03-04 16:52:09,502 - INFO - 
127.0.0.1 - "GET /js/history.js HTTP/1.1" 200 -                                        
2025-03-04 16:52:09,503 - INFO - Successfully served JavaScript file: 
C:\Users\vehbi-oeks-7800x3d\Documents\Code\oeks-tt-2\js/history.js                         
                                                                               2025-03-04 
16:52:09,503 - INFO - Request for JavaScript file: /js/script.js, serving from: 
C:\Users\vehbi-oeks-7800x3d\Documents\Code\oeks-tt-2\js/script.js                          
                                                          2025-03-04 16:52:09,503 - INFO - 
127.0.0.1 - "GET /js/script.js HTTP/1.1" 200 -                                         
2025-03-04 16:52:09,503 - INFO - Successfully served JavaScript file: 
C:\Users\vehbi-oeks-7800x3d\Documents\Code\oeks-tt-2\js/script.js                          
                                                                               2025-03-04 
16:52:09,812 - INFO - connection 
open                                                                        2025-03-04 
16:52:09,812 - INFO - Connection open from 
127.0.0.1                                                         2025-03-04 16:52:09,813 
- INFO - Staff member Unknown User (unknown) from Unassigned 
authenticated                      2025-03-04 16:52:09,818 - ERROR - Error reading 
metadata for unknown: Expecting value: line 1 column 1 (char 0)         2025-03-04 
16:52:09,818 - WARNING - No videos found for staff 
unknown                                                   2025-03-04 16:52:09,818 - INFO - 
127.0.0.1 - "GET /api/staff-list HTTP/1.1" 200 -                                       
2025-03-04 16:52:10,076 - INFO - Request for video file: /videos/staff_pc_141/latest.mp4, 
serving from: 
C:\Users\vehbi-oeks-7800x3d\Documents\Code\oeks-tt-2\videos/staff_pc_141/latest.mp4        
                                             2025-03-04 16:52:10,076 - INFO - 127.0.0.1 - 
"GET /videos/staff_pc_141/latest.mp4?t=1741096329819 HTTP/1.1" 200 -       2025-03-04 
16:52:10,077 - INFO - Successfully served video file: 
C:\Users\vehbi-oeks-7800x3d\Documents\Code\oeks-tt-2\videos/staff_pc_141/latest.mp4        
                                                                                    
2025-03-04 16:52:10,120 - INFO - Received video metadata for staff_pc_141, filename: 
staff_pc_141-03-04-2025.mp4        2025-03-04 16:52:10,123 - INFO - Request for video 
file: /videos/staff_pc_141/latest.mp4, serving from: 
C:\Users\vehbi-oeks-7800x3d\Documents\Code\oeks-tt-2\videos/staff_pc_141/latest.mp4        
                                             2025-03-04 16:52:10,123 - INFO - 127.0.0.1 - 
"GET /videos/staff_pc_141/latest.mp4?t=1741096329819 HTTP/1.1" 200 -       2025-03-04 
16:52:10,124 - INFO - Successfully served video file: 
C:\Users\vehbi-oeks-7800x3d\Documents\Code\oeks-tt-2\videos/staff_pc_141/latest.mp4        
                                                                                    
2025-03-04 16:52:10,139 - INFO - Saved video file: 
videos\staff_pc_141\staff_pc_141-03-04-2025.mp4 (154104 bytes)       2025-03-04 
16:52:10,140 - INFO - Created latest.mp4 for 
staff_pc_141                                                    2025-03-04 16:52:11,309 - 
WARNING - No videos found for staff 
unknown                                                   2025-03-04 16:52:11,310 - INFO - 
127.0.0.1 - "GET /api/staff-list HTTP/1.1" 200 -                                       
2025-03-04 16:52:11,616 - INFO - Request for video file: /videos/staff_pc_141/latest.mp4, 
serving from: 
C:\Users\vehbi-oeks-7800x3d\Documents\Code\oeks-tt-2\videos/staff_pc_141/latest.mp4        
                                             2025-03-04 16:52:11,616 - INFO - 127.0.0.1 - 
"GET /videos/staff_pc_141/latest.mp4?t=1741096331311 HTTP/1.1" 200 -       2025-03-04 
16:52:11,620 - INFO - Successfully served video file: 
C:\Users\vehbi-oeks-7800x3d\Documents\Code\oeks-tt-2\videos/staff_pc_141/latest.mp4        
                                                                                    
2025-03-04 16:52:12,512 - WARNING - No videos found for staff 
unknown                                                   2025-03-04 16:52:12,512 - INFO - 
127.0.0.1 - "GET /api/staff-list HTTP/1.1" 200 -                                       
2025-03-04 16:52:12,826 - INFO - Request for video file: /videos/staff_pc_141/latest.mp4, 
serving from: 
C:\Users\vehbi-oeks-7800x3d\Documents\Code\oeks-tt-2\videos/staff_pc_141/latest.mp4        
                                             2025-03-04 16:52:12,826 - INFO - 127.0.0.1 - 
"GET /videos/staff_pc_141/latest.mp4?t=1741096332513 HTTP/1.1" 200 -       2025-03-04 
16:52:12,827 - INFO - Successfully served video file: 
C:\Users\vehbi-oeks-7800x3d\Documents\Code\oeks-tt-2\videos/staff_pc_141/latest.mp4        
                                                                                    
2025-03-04 16:52:14,304 - WARNING - No videos found for staff 
unknown                                                   2025-03-04 16:52:14,304 - INFO - 
127.0.0.1 - "GET /api/staff-list HTTP/1.1" 200 -                                       
2025-03-04 16:52:14,619 - INFO - Request for video file: /videos/staff_pc_141/latest.mp4, 
serving from: 
C:\Users\vehbi-oeks-7800x3d\Documents\Code\oeks-tt-2\videos/staff_pc_141/latest.mp4        
                                             2025-03-04 16:52:14,620 - INFO - 127.0.0.1 - 
"GET /videos/staff_pc_141/latest.mp4?t=1741096334305 HTTP/1.1" 200 -       2025-03-04 
16:52:14,620 - INFO - Successfully served video file: 
C:\Users\vehbi-oeks-7800x3d\Documents\Code\oeks-tt-2\videos/staff_pc_141/latest.mp4        
                                                                                    
2025-03-04 16:52:15,388 - INFO - Received video metadata for staff_pc_141, filename: 
staff_pc_141-03-04-2025.mp4        2025-03-04 16:52:15,409 - INFO - Saved video file: 
videos\staff_pc_141\staff_pc_141-03-04-2025.mp4 (166054 bytes)       2025-03-04 
16:52:15,409 - INFO - Created latest.mp4 for 
staff_pc_141                                                    2025-03-04 16:52:15,522 - 
WARNING - No videos found for staff 
unknown                                                   2025-03-04 16:52:15,522 - INFO - 
127.0.0.1 - "GET /api/staff-list HTTP/1.1" 200 -                                       
2025-03-04 16:52:15,830 - INFO - Request for video file: /videos/staff_pc_141/latest.mp4, 
serving from: 
C:\Users\vehbi-oeks-7800x3d\Documents\Code\oeks-tt-2\videos/staff_pc_141/latest.mp4        
                                             2025-03-04 16:52:15,831 - INFO - 127.0.0.1 - 
"GET /videos/staff_pc_141/latest.mp4?t=1741096335524 HTTP/1.1" 200 -       2025-03-04 
16:52:15,835 - INFO - Successfully served video file: 
C:\Users\vehbi-oeks-7800x3d\Documents\Code\oeks-tt-2\videos/staff_pc_141/latest.mp4        
                                                                                    
2025-03-04 16:52:17,309 - WARNING - No videos found for staff 
unknown                                                   2025-03-04 16:52:17,309 - INFO - 
127.0.0.1 - "GET /api/staff-list HTTP/1.1" 200 -                                       
2025-03-04 16:52:17,622 - INFO - Request for video file: /videos/staff_pc_141/latest.mp4, 
serving from: 
C:\Users\vehbi-oeks-7800x3d\Documents\Code\oeks-tt-2\videos/staff_pc_141/latest.mp4        
                                             2025-03-04 16:52:17,622 - INFO - 127.0.0.1 - 
"GET /videos/staff_pc_141/latest.mp4?t=1741096337310 HTTP/1.1" 200 -       2025-03-04 
16:52:17,622 - INFO - Successfully served video file: 
C:\Users\vehbi-oeks-7800x3d\Documents\Code\oeks-tt-2\videos/staff_pc_141/latest.mp4        
                                                                                    
2025-03-04 16:52:18,519 - WARNING - No videos found for staff 
unknown                                                   2025-03-04 16:52:18,519 - INFO - 
127.0.0.1 - "GET /api/staff-list HTTP/1.1" 200 -                                       
2025-03-04 16:52:18,833 - INFO - Request for video file: /videos/staff_pc_141/latest.mp4, 
serving from: 
C:\Users\vehbi-oeks-7800x3d\Documents\Code\oeks-tt-2\videos/staff_pc_141/latest.mp4        
                                             2025-03-04 16:52:18,833 - INFO - 127.0.0.1 - 
"GET /videos/staff_pc_141/latest.mp4?t=1741096338521 HTTP/1.1" 200 -       2025-03-04 
16:52:18,833 - INFO - Successfully served video file: 
C:\Users\vehbi-oeks-7800x3d\Documents\Code\oeks-tt-2\videos/staff_pc_141/latest.mp4        
                                                                                    
2025-03-04 16:52:20,660 - INFO - Received video metadata for staff_pc_141, filename: 
staff_pc_141-03-04-2025.mp4        2025-03-04 16:52:20,693 - INFO - Saved video file: 
videos\staff_pc_141\staff_pc_141-03-04-2025.mp4 (248908 bytes)       2025-03-04 
16:52:20,695 - INFO - Created latest.mp4 for 
staff_pc_141                                                    2025-03-04 16:52:21,513 - 
WARNING - No videos found for staff 
unknown                                                   2025-03-04 16:52:21,514 - INFO - 
127.0.0.1 - "GET /api/staff-list HTTP/1.1" 200 -                                       
2025-03-04 16:52:21,824 - INFO - Request for video file: /videos/staff_pc_141/latest.mp4, 
serving from: 
C:\Users\vehbi-oeks-7800x3d\Documents\Code\oeks-tt-2\videos/staff_pc_141/latest.mp4        
                                             2025-03-04 16:52:21,825 - INFO - 127.0.0.1 - 
"GET /videos/staff_pc_141/latest.mp4?t=1741096341516 HTTP/1.1" 200 -       2025-03-04 
16:52:21,830 - INFO - Successfully served video file: 
C:\Users\vehbi-oeks-7800x3d\Documents\Code\oeks-tt-2\videos/staff_pc_141/latest.mp4        
                                                                                    
2025-03-04 16:52:23,521 - INFO - 127.0.0.1 - "GET / HTTP/1.1" 200 
-                                                     2025-03-04 16:52:23,521 - INFO - 
Successfully served file: index.html                                                   
2025-03-04 16:52:23,524 - INFO - Staff member unknown 
disconnected                                                      2025-03-04 16:52:23,841 
- INFO - Request for CSS file: /css/styles.css, serving from: 
C:\Users\vehbi-oeks-7800x3d\Documents\Code\oeks-tt-2\css/styles.css                        
                                                               2025-03-04 16:52:23,841 - 
INFO - 127.0.0.1 - "GET /css/styles.css HTTP/1.1" 200 
-                                       2025-03-04 16:52:23,841 - INFO - Successfully 
served CSS file: 
C:\Users\vehbi-oeks-7800x3d\Documents\Code\oeks-tt-2\css/styles.css                        
                                                                                      
2025-03-04 16:52:23,842 - INFO - Request for JavaScript file: /js/utils.js, serving from: 
C:\Users\vehbi-oeks-7800x3d\Documents\Code\oeks-tt-2\js/utils.js                           
                                                           2025-03-04 16:52:23,842 - INFO 
- 127.0.0.1 - "GET /js/utils.js HTTP/1.1" 200 -                                          
2025-03-04 16:52:23,842 - INFO - Successfully served JavaScript file: 
C:\Users\vehbi-oeks-7800x3d\Documents\Code\oeks-tt-2\js/utils.js                           
                                                                               2025-03-04 
16:52:23,842 - INFO - Request for JavaScript file: /js/dashboard.js, serving from: 
C:\Users\vehbi-oeks-7800x3d\Documents\Code\oeks-tt-2\js/dashboard.js                       
                                                       2025-03-04 16:52:23,842 - INFO - 
127.0.0.1 - "GET /js/dashboard.js HTTP/1.1" 200 -                                      
2025-03-04 16:52:23,843 - INFO - Successfully served JavaScript file: 
C:\Users\vehbi-oeks-7800x3d\Documents\Code\oeks-tt-2\js/dashboard.js                       
                                                                               2025-03-04 
16:52:23,843 - INFO - Request for JavaScript file: /js/modal.js, serving from: 
C:\Users\vehbi-oeks-7800x3d\Documents\Code\oeks-tt-2\js/modal.js                           
                                                           2025-03-04 16:52:23,843 - INFO 
- 127.0.0.1 - "GET /js/modal.js HTTP/1.1" 200 -                                          
2025-03-04 16:52:23,843 - INFO - Successfully served JavaScript file: 
C:\Users\vehbi-oeks-7800x3d\Documents\Code\oeks-tt-2\js/modal.js                           
                                                                               2025-03-04 
16:52:23,844 - INFO - Request for JavaScript file: /js/history.js, serving from: 
C:\Users\vehbi-oeks-7800x3d\Documents\Code\oeks-tt-2\js/history.js                         
                                                         2025-03-04 16:52:23,844 - INFO - 
127.0.0.1 - "GET /js/history.js HTTP/1.1" 200 -                                        
2025-03-04 16:52:23,844 - INFO - Successfully served JavaScript file: 
C:\Users\vehbi-oeks-7800x3d\Documents\Code\oeks-tt-2\js/history.js                         
                                                                               2025-03-04 
16:52:23,845 - INFO - Request for JavaScript file: /js/script.js, serving from: 
C:\Users\vehbi-oeks-7800x3d\Documents\Code\oeks-tt-2\js/script.js                          
                                                          2025-03-04 16:52:23,845 - INFO - 
127.0.0.1 - "GET /js/script.js HTTP/1.1" 200 -                                         
2025-03-04 16:52:23,845 - INFO - Successfully served JavaScript file: 
C:\Users\vehbi-oeks-7800x3d\Documents\Code\oeks-tt-2\js/script.js                          
                                                                               2025-03-04 
16:52:24,154 - INFO - connection 
open                                                                        2025-03-04 
16:52:24,154 - INFO - Connection open from 
127.0.0.1                                                         2025-03-04 16:52:24,155 
- INFO - Staff member Unknown User (unknown) from Unassigned 
authenticated                      2025-03-04 16:52:24,159 - ERROR - Error reading 
metadata for unknown: Expecting value: line 1 column 1 (char 0)         2025-03-04 
16:52:24,159 - WARNING - No videos found for staff 
unknown                                                   2025-03-04 16:52:24,159 - INFO - 
127.0.0.1 - "GET /api/staff-list HTTP/1.1" 200 -                                       
2025-03-04 16:52:24,217 - INFO - 127.0.0.1 - "GET /favicon.ico HTTP/1.1" 404 
-                                          2025-03-04 16:52:24,420 - INFO - Request for 
video file: /videos/staff_pc_141/latest.mp4, serving from: 
C:\Users\vehbi-oeks-7800x3d\Documents\Code\oeks-tt-2\videos/staff_pc_141/latest.mp4        
                                             2025-03-04 16:52:24,420 - INFO - 127.0.0.1 - 
"GET /videos/staff_pc_141/latest.mp4?t=1741096344160 HTTP/1.1" 200 -       2025-03-04 
16:52:24,421 - INFO - Successfully served video file: 
C:\Users\vehbi-oeks-7800x3d\Documents\Code\oeks-tt-2\videos/staff_pc_141/latest.mp4        
                                                                                    
2025-03-04 16:52:24,467 - INFO - Request for video file: /videos/staff_pc_141/latest.mp4, 
serving from: 
C:\Users\vehbi-oeks-7800x3d\Documents\Code\oeks-tt-2\videos/staff_pc_141/latest.mp4        
                                             2025-03-04 16:52:24,468 - INFO - 127.0.0.1 - 
"GET /videos/staff_pc_141/latest.mp4?t=1741096344160 HTTP/1.1" 200 -       2025-03-04 
16:52:24,468 - INFO - Successfully served video file: 
C:\Users\vehbi-oeks-7800x3d\Documents\Code\oeks-tt-2\videos/staff_pc_141/latest.mp4        
                                                                                    
2025-03-04 16:52:25,958 - INFO - Received video metadata for staff_pc_141, filename: 
staff_pc_141-03-04-2025.mp4        2025-03-04 16:52:25,992 - INFO - Saved video file: 
videos\staff_pc_141\staff_pc_141-03-04-2025.mp4 (258942 bytes)       2025-03-04 
16:52:25,993 - INFO - Created latest.mp4 for 
staff_pc_141                                                    2025-03-04 16:52:26,864 - 
WARNING - No videos found for staff 
unknown                                                   2025-03-04 16:52:26,865 - INFO - 
127.0.0.1 - "GET /api/staff-list HTTP/1.1" 200 -                                       
2025-03-04 16:52:27,183 - INFO - Request for video file: /videos/staff_pc_141/latest.mp4, 
serving from: 
C:\Users\vehbi-oeks-7800x3d\Documents\Code\oeks-tt-2\videos/staff_pc_141/latest.mp4        
                                             2025-03-04 16:52:27,183 - INFO - 127.0.0.1 - 
"GET /videos/staff_pc_141/latest.mp4?t=1741096346866 HTTP/1.1" 200 -       2025-03-04 
16:52:27,188 - INFO - Successfully served video file: 
C:\Users\vehbi-oeks-7800x3d\Documents\Code\oeks-tt-2\videos/staff_pc_141/latest.mp4        
                                                                                    
2025-03-04 16:52:29,857 - WARNING - No videos found for staff 
unknown                                                   2025-03-04 16:52:29,857 - INFO - 
127.0.0.1 - "GET /api/staff-list HTTP/1.1" 200 -                                       
2025-03-04 16:52:30,169 - INFO - Request for video file: /videos/staff_pc_141/latest.mp4, 
serving from: 
C:\Users\vehbi-oeks-7800x3d\Documents\Code\oeks-tt-2\videos/staff_pc_141/latest.mp4        
                                             2025-03-04 16:52:30,169 - INFO - 127.0.0.1 - 
"GET /videos/staff_pc_141/latest.mp4?t=1741096349859 HTTP/1.1" 200 -       2025-03-04 
16:52:30,170 - INFO - Successfully served video file: 
C:\Users\vehbi-oeks-7800x3d\Documents\Code\oeks-tt-2\videos/staff_pc_141/latest.mp4        
                                                                                    
2025-03-04 16:52:31,252 - INFO - Received video metadata for staff_pc_141, filename: 
staff_pc_141-03-04-2025.mp4        2025-03-04 16:52:31,285 - INFO - Saved video file: 
videos\staff_pc_141\staff_pc_141-03-04-2025.mp4 (258784 bytes)       2025-03-04 
16:52:31,286 - INFO - Created latest.mp4 for 
staff_pc_141                                                    2025-03-04 16:52:32,857 - 
WARNING - No videos found for staff 
unknown                                                   2025-03-04 16:52:32,857 - INFO - 
127.0.0.1 - "GET /api/staff-list HTTP/1.1" 200 -                                       
2025-03-04 16:52:33,167 - INFO - Request for video file: /videos/staff_pc_141/latest.mp4, 
serving from: 
C:\Users\vehbi-oeks-7800x3d\Documents\Code\oeks-tt-2\videos/staff_pc_141/latest.mp4        
                                             2025-03-04 16:52:33,167 - INFO - 127.0.0.1 - 
"GET /videos/staff_pc_141/latest.mp4?t=1741096352859 HTTP/1.1" 200 -       2025-03-04 
16:52:33,172 - INFO - Successfully served video file: 
C:\Users\vehbi-oeks-7800x3d\Documents\Code\oeks-tt-2\videos/staff_pc_141/latest.mp4        
                                                                                    
2025-03-04 16:52:34,346 - INFO - Shutting 
down...                                                                       2025-03-04 
16:52:34,346 - INFO - Staff member unknown 
disconnected                                                      2025-03-04 16:52:34,347 
- INFO - Staff member staff_pc_141 
disconnected                                                 2025-03-04 16:52:34,347 - 
INFO - server 
closing                                                                         2025-03-04 
16:52:34,505 - INFO - Shutting 
down...                                                                       2025-03-04 
16:52:34,508 - ERROR - Task was destroyed but it is 
pending!                                                 task: <Task pending 
name='Task-19' coro=<Server._close() done, defined at 
C:\Python313\Lib\site-packages\websockets\asyncio\server.py:431> wait_for=<Future pending 
cb=[Task.task_wakeup()]>>                                                   2025-03-04 
16:52:34,509 - ERROR - Task was destroyed but it is 
pending!                                                 task: <Task cancelling 
name='Task-1' coro=<run_server() done, defined at 
C:\Users\vehbi-oeks-7800x3d\Documents\Code\oeks-tt-2\admin_server.py:581> wait_for=<Future 
pending cb=[shield.<locals>._outer_done_callback() at 
C:\Python313\Lib\asyncio\tasks.py:975, Task.task_wakeup()]> 
cb=[gather.<locals>._done_callback() at C:\Python313\Lib\asyncio\tasks.py:820]>   
~\Documents\Code\oeks-tt-2  main  ~4 
                                                                                          
                                                                                           
                                                                                           
                                                                                           
                                                                                           
                                         
```

staff pc terminal

```
~\Code\oeks-tt-v2  main  2  python 
.\staff_app.py                                                                 2025-03-04 
16:53:28,923 - INFO - OEKS Team Tracker - Staff Application 
starting...                                      2025-03-04 16:53:28,925 - INFO - 
Connecting to ws://192.168.1.183:8765                                                  
2025-03-04 16:53:28,967 - INFO - Authentication 
successful                                                              2025-03-04 
16:53:29,082 - INFO - Frame captured 
successfully                                                            2025-03-04 
16:53:30,119 - INFO - Frame captured 
successfully                                                            2025-03-04 
16:53:31,158 - INFO - Frame captured 
successfully                                                            2025-03-04 
16:53:32,209 - INFO - Frame captured 
successfully                                                            2025-03-04 
16:53:33,254 - INFO - Frame captured 
successfully                                                            2025-03-04 
16:53:33,295 - INFO - Sent video data, size: 124879 
bytes                                                    2025-03-04 16:53:34,345 - INFO - 
Frame captured successfully                                                            
2025-03-04 16:53:35,393 - INFO - Frame captured 
successfully                                                            2025-03-04 
16:53:36,438 - INFO - Frame captured 
successfully                                                            2025-03-04 
16:53:37,485 - INFO - Frame captured 
successfully                                                            2025-03-04 
16:53:38,528 - INFO - Frame captured 
successfully                                                            2025-03-04 
16:53:38,569 - INFO - Sent video data, size: 140662 bytes    
```