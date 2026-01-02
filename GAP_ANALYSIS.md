
# Story Graph Sequencer Gap Analysis

## Issue: ActNode Relative Positioning & Flattening
The recursive `getAbsoluteX` logic correctly calculates the timeline position for playable clips (`Spine`, `Satellite`). However, there are two primary risks for DaVinci Resolve XML (XMEML) imports:

### 1. Clip Collisions (Track 1 / Track 2 Overlap)
In the current `Sequencer.ts`, all Spines go to Track 1 and all Satellites to Track 2. 
- **The Gap**: If two `ActNodes` or `SceneNodes` overlap horizontally in the spatial workspace, their child clips will be assigned to the same track index. DaVinci Resolve will likely overwrite the first clip with the second if they collide in time.
- **The Fix**: Implement a simple track-packing algorithm that assigns dynamic track indices based on clip boundaries, rather than hardcoding `track: 1` or `track: 2`.

### 2. Timebase Rounding Errors
`PIXELS_PER_SECOND = 100` converts spatial units to seconds. 
- **The Gap**: Floating-point precision issues when mapping `globalX / 100` to frames (`Math.round(time * fps)`). Over long acts (e.g., 20 minutes), small rounding errors can accumulate, causing sync drift between audio and visuals.
- **The Fix**: Store position metadata in frames/timecode rather than raw pixels to ensure 1:1 parity with the NLE clock.

### 3. ActNodes as Markers
Resolve does not have a "Container" concept equivalent to `ActNode` in its XML schema.
- **The Gap**: If an editor expects `ActNodes` to appear as nested sequences or bins, they will be disappointed; the current sequencer flattens them completely.
- **The Fix**: Map `ActNode` boundaries to Timeline Markers in the XMEML to preserve narrative structure.
