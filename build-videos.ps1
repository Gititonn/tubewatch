Write-Host "Building main tutorial video..."
ffmpeg -y -i marketing/raw/walkthrough.mp4 -i marketing/raw/voiceover.wav -vf "subtitles='marketing/raw/captions.srt':force_style='FontSize=16,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,MarginV=20'" -c:v libx264 -preset fast -crf 22 -c:a aac -b:a 192k -shortest marketing/tubewatch-tutorial-final.mp4

Write-Host "Building vertical 9:16 teaser..."
ffmpeg -y -ss 00:00:33 -to 00:00:52 -i marketing/tubewatch-tutorial-final.mp4 -vf "crop=450:800:(in_w-450)/2:0" -c:v libx264 -preset fast -crf 22 -c:a aac -b:a 192k marketing/tubewatch-teaser-vertical.mp4

Write-Host "Done! Videos saved in marketing/"
