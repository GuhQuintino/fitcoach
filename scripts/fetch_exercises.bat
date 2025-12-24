

@echo off
set "URL=https://nnaadrcmrmkwxbxhzbcx.supabase.co/rest/v1/exercises?select=id,name,description,video_url"
set "KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uYWFkcmNtcm1rd3hieGh6YmN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTEyMzksImV4cCI6MjA4MTgyNzIzOX0.fMmnH4uqlqvwUU5I8z13ixRxDZom8DswbnFf8fQPeSU"

curl "%URL%" -H "apikey: %KEY%" -H "Authorization: Bearer %KEY%" -o raw_exercises_dump.json

