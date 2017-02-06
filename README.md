# dsaudio_import 
Convert a folder of music files to he_aac, check each file for duplicate on synlogy
dsaudio and create a dsaudio compatible playlist m3u playlist.

The script prompts for the synology username and password and stores the synology sid.
On sid expire it will prompt for the password again. 

Usage: 

```bash
node index.js path_to_musicfolder
```