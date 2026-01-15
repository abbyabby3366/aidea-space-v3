# Sound Files for QR Code Check-in

This directory contains sound effects for the QR code check-in system.

## Required Sound Files

Please add the following sound files to this directory:

1. **success.mp3** or **success.wav** - Played when check-in is successful
   - Recommended: Pleasant, short success sound (1-2 seconds)
   - Examples: "ding", "chime", "success beep"

2. **error.mp3** or **error.wav** - Played when check-in fails
   - Recommended: Clear error sound (1-2 seconds)
   - Examples: "error beep", "buzz", "warning sound"

3. **already-checked-in.mp3** or **already-checked-in.wav** - Played when user is already checked in
   - Recommended: Distinctive sound different from error (1-2 seconds)
   - Examples: "double beep", "different tone", "info sound"

## File Format Support

The system supports both MP3 and WAV formats. If both are provided, MP3 will be preferred.

## File Size Recommendations

- Keep files under 100KB for fast loading
- Duration should be 1-3 seconds maximum
- Use mono audio to reduce file size

## Testing

After adding the sound files, test the QR code scanning functionality to ensure sounds play correctly.
