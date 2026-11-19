#!/bin/bash
set -e
for v in "out:RESULTZ_VSL_v3_balken" "out_black:RESULTZ_VSL_v3_schwarz_balken"; do
  d=${v%%:*}; n=${v##*:}
  ffmpeg -v error -y -framerate 25 -start_number 0 -i $d/%05d.jpg -f rawvideo -pix_fmt rgba -s 1920x6 -r 25 -i bar.rgba -i mix.wav \
    -filter_complex "[0:v][1:v]overlay=0:H-6:shortest=1,format=yuv420p[v]" -map "[v]" -map 2:a \
    -c:v libx264 -preset slow -crf 17 -profile:v high -movflags +faststart -c:a aac -b:a 256k -shortest ${n}_master.mp4
  ffmpeg -v error -y -i ${n}_master.mp4 -c:v libx264 -preset slow -b:v 980k -pass 1 -passlogfile x264_$n -an -f null /dev/null
  ffmpeg -v error -y -i ${n}_master.mp4 -c:v libx264 -preset slow -b:v 980k -maxrate 2800k -bufsize 5600k -pass 2 -passlogfile x264_$n \
    -pix_fmt yuv420p -profile:v high -c:a aac -b:a 128k -movflags +faststart ${n}_web.mp4
  echo "DONE $n"
done
echo ALL_DONE
