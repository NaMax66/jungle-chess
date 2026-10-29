# Quiet background music

## Track and rights

- Title: **Guzheng City**
- Creator: **Kevin MacLeod (incompetech.com)**
- ISRC: USUAN2100001
- Composer's track page:
  https://incompetech.com/music/royalty-free/index.html?isrc=USUAN2100001
- Composer's description lists guzheng and percussion (dhol), with the moods
  Bright, Calm, Relaxed. This is a modern Chinese-inspired composition, not a
  historical Chinese recording.
- Direct original:
  https://incompetech.com/music/royalty-free/mp3-royaltyfree/Guzheng%20City.mp3
- License: **Creative Commons Attribution 4.0 International**
  https://creativecommons.org/licenses/by/4.0/
- Checked and downloaded: 2026-10-29.

The composer's attribution text:

> "Guzheng City" Kevin MacLeod (incompetech.com)
> Licensed under Creative Commons: By Attribution 4.0 License
> https://creativecommons.org/licenses/by/4.0/

The local-game footer credits the track and composer, links to the original
track and license, and states that this is a compressed web copy. Keep that
credit wherever the music is used. The original recording remains copyrighted;
it is freely reusable under CC BY 4.0, not public domain.

## Web asset

`public/assets/audio/guzheng-city.mp3` is an MP3 web conversion at 96 kbps,
44.1 kHz stereo. Duration: approximately 114 seconds. Size: 1,369,873 bytes
(original download: 3,654,552 bytes). No musical rearrangement or trimming.

Example conversion, with ffmpeg installed:

```sh
ffmpeg -i original.mp3 -codec:a libmp3lame -b:a 96k -ar 44100 -ac 2 guzheng-city.mp3
```

`public/music.js` attaches the source only after the listener enables it.
The initial page load does not download or play the music. Playback loops,
fades in at low volume, fades out on disable, and pauses while the tab is
hidden. Web Audio gain keeps the volume low on mobile browsers that ignore
the media element's volume property. Each visit starts silent.
