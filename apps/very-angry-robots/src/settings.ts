import { drawCircle, drawPolygonOutline, drawText,
  type Color, type DisplayProfile, type DrawingContext, type Point } from "one-more-glow";
import type { AudioEffect, AudioPreferences } from "./audio.ts";

const displayFields = ["lineWidth", "pointRadius", "glowStrength", "glowSpread"] as const;
const displayRanges = [[0.5, 4], [0.5, 4], [0, 2], [0.5, 2]] as const;
const settingsRows = [205, 125, 45, -35, -115, -195] as const;
const cyan: Color = [0.35, 0.95, 1];
const red: Color = [1, 0.35, 0.36];
const amber: Color = [1, 0.75, 0.32];
const blue: Color = [0.28, 0.63, 1];
const white: Color = [0.8, 0.96, 1];
const textOptions = { font: "segment22", height: 19, spacing: "kerned" } as const;

export interface SettingsAudio {
  setPreferences(preferences: AudioPreferences): void;
  playEffects(effects: readonly AudioEffect[]): void;
}

export interface SettingsOptions {
  drawing: DrawingContext;
  displayProfile: Readonly<DisplayProfile>;
  audioPreferences: Readonly<AudioPreferences>;
  audio: SettingsAudio;
  applyDisplayProfile(profile: Readonly<DisplayProfile>): void;
  resetDisplayProfile: Readonly<DisplayProfile>;
}

export interface Settings {
  readonly displayProfile: Readonly<DisplayProfile>;
  readonly audioPreferences: Readonly<AudioPreferences>;
  open(): void;
  close(): void;
  moveSelection(direction: number): void;
  adjustSelection(direction: number): void;
  activateSelection(): "close" | undefined;
  resetDisplay(): void;
  pointer(point: Point, activate?: boolean): "close" | undefined;
  draw(): void;
}

export function createSettings(options: SettingsOptions): Settings {
  let displayProfile = { ...options.displayProfile };
  let audioPreferences = { ...options.audioPreferences };
  let selectedSetting = 0;
  const { drawing, audio } = options;

  function settingsLabel(text: string, x: number, y: number, color: Color = white, height = 18): void {
    drawing.setColor(color); drawing.setIntensity(1);
    drawText(drawing, text, x, y, { ...textOptions, height });
  }

  function line(points: readonly Point[], color: Color, intensity = 1): void {
    drawing.setColor(color); drawing.setIntensity(intensity);
    drawPolygonOutline(drawing, points);
  }

  function setDisplayField(index: number, value: number): void {
    if (index < 0 || index >= displayFields.length) return;
    const [minimum, maximum] = displayRanges[index];
    const field = displayFields[index];
    displayProfile = {
      ...displayProfile,
      [field]: Math.max(minimum, Math.min(maximum, Math.round(value * 10) / 10)),
    };
    options.applyDisplayProfile(displayProfile);
  }

  function setAudioPreferences(next: AudioPreferences): void {
    if (next.enabled === audioPreferences.enabled && next.volume === audioPreferences.volume) return;
    audioPreferences = next;
    audio.setPreferences(audioPreferences);
    audio.playEffects(["interface"]);
  }

  function resetDisplay(): void {
    displayProfile = { ...options.resetDisplayProfile };
    options.applyDisplayProfile(displayProfile);
    audio.playEffects(["interface"]);
  }

  function adjustSelection(direction: number): void {
    if (selectedSetting < displayFields.length) {
      const field = displayFields[selectedSetting]!;
      setDisplayField(selectedSetting, displayProfile[field] + direction * 0.1);
      audio.playEffects(["interface"]);
    } else if (selectedSetting === 4) {
      setAudioPreferences({ ...audioPreferences, enabled: !audioPreferences.enabled });
    } else if (selectedSetting === 5) {
      setAudioPreferences({ ...audioPreferences,
        volume: Math.max(0, Math.min(1, Math.round((audioPreferences.volume + direction * 0.1) * 10) / 10)) });
    }
  }

  function moveSelection(direction: number): void {
    selectedSetting = (selectedSetting + direction + 8) % 8;
    audio.playEffects(["interface"]);
  }

  function activateSelection(): "close" | undefined {
    if (selectedSetting === 4) setAudioPreferences({ ...audioPreferences, enabled: !audioPreferences.enabled });
    else if (selectedSetting === 6) resetDisplay();
    else if (selectedSetting === 7) {
      return "close";
    } else adjustSelection(1);
    return undefined;
  }

  function pointer([x, y]: Point, activate = true): "close" | undefined {
    for (let index = 0; index < settingsRows.length; index += 1) {
      const rowY = settingsRows[index]!;
      if (index >= 4) {
        if (x >= -454 && x <= 65 && y >= rowY - 24 && y <= rowY + 23) {
          selectedSetting = index;
          if (activate && index === 4) setAudioPreferences({ ...audioPreferences, enabled: !audioPreferences.enabled });
        }
        if (index === 5 && x >= -430 && x <= 34 && y >= rowY - 23 && y <= rowY - 10) {
          selectedSetting = index;
          setAudioPreferences({ ...audioPreferences,
            volume: Math.round(Math.max(0, Math.min(1, (x + 420) / 444)) * 10) / 10 });
        }
        continue;
      }
      const trackY = rowY - 29;
      if (x >= -454 && x <= 65 && y >= rowY - 37 && y <= rowY + 30) selectedSetting = index;
      if (x >= -430 && x <= 34 && y >= trackY - 12 && y <= trackY + 12) {
        selectedSetting = index;
        const [minimum, maximum] = displayRanges[index]!;
        setDisplayField(index, minimum + Math.max(0, Math.min(1, (x + 420) / 444)) * (maximum - minimum));
        audio.playEffects(["interface"]);
        return undefined;
      }
    }
    if (x >= -95 && x <= -5 && y >= -300 && y <= -256) {
      selectedSetting = 6;
      resetDisplay();
    } else if (x >= 25 && x <= 115 && y >= -300 && y <= -256) {
      return "close";
    }
    return undefined;
  }

  function draw(): void {
    drawing.beginFrame();
    settingsLabel("DISPLAY & AUDIO SETTINGS", -448, 320, amber, 26);
    settingsLabel("TUNE THE VECTOR DISPLAY", -448, 282, blue, 15);

    const labels = ["LINE WIDTH", "POINT RADIUS", "GLOW STRENGTH", "GLOW SPREAD"];
    const track = { left: -420, right: 24 };
    for (let index = 0; index < displayFields.length; index += 1) {
      const rowY = settingsRows[index]!;
      const trackY = rowY - 29;
      const [minimum, maximum] = displayRanges[index]!;
      const value = displayProfile[displayFields[index]!];
      const focused = selectedSetting === index;
      if (focused) line([[-454,rowY-37],[65,rowY-37],[65,rowY+30],[-454,rowY+30],[-454,rowY-37]], amber, 1);
      settingsLabel(labels[index]!, -420, rowY + 3, focused ? amber : white, 17);
      settingsLabel(value.toFixed(1), -20, rowY + 3, focused ? amber : cyan, 17);
      drawing.setColor(blue); drawing.setIntensity(0.75);
      drawing.moveTo(track.left, trackY); drawing.lineTo(track.right, trackY);
      for (let tick = 0; tick <= 4; tick += 1) {
        const x = track.left + (track.right - track.left) * tick / 4;
        drawing.moveTo(x, trackY - 4); drawing.lineTo(x, trackY + 4);
      }
      const ratio = (value - minimum) / (maximum - minimum);
      const handleX = track.left + ratio * (track.right - track.left);
      drawing.setColor(focused ? amber : cyan); drawing.setIntensity(1.2);
      drawCircle(drawing, [handleX, trackY], 8);
    }

    const soundRow = settingsRows[4]!;
    const volumeRow = settingsRows[5]!;
    for (const [index, rowY, name, value] of [
      [4, soundRow, "SOUND", audioPreferences.enabled ? "ON" : "OFF"],
      [5, volumeRow, "MASTER VOLUME", audioPreferences.volume.toFixed(1)],
    ] as const) {
      const focused = selectedSetting === index;
      if (focused) line([[-454,rowY-24],[65,rowY-24],[65,rowY+23],[-454,rowY+23],[-454,rowY-24]], amber, 1);
      settingsLabel(name, -420, rowY, focused ? amber : white, 15);
      settingsLabel(value, -20, rowY, focused ? amber : cyan, 15);
      if (index === 5) {
        drawing.setColor(blue); drawing.setIntensity(0.75);
        drawing.moveTo(-420, rowY - 17); drawing.lineTo(24, rowY - 17);
        drawing.setColor(focused ? amber : cyan); drawing.setIntensity(1.2);
        drawCircle(drawing, [-420 + audioPreferences.volume * 444, rowY - 17], 6);
      }
    }

    line([[105,-125],[454,-125],[454,220],[105,220],[105,-125]], blue, 0.7);
    settingsLabel("ROOM PREVIEW", 125, 181, blue, 15);
    line([[145,-95],[414,-95],[414,145],[145,145],[145,-95]], blue, 0.85);
    line([[220,-95],[220,-18],[288,-18]], blue, 0.75);
    line([[320,145],[320,52],[365,52]], blue, 0.75);
    line([[145,28],[190,28],[190,73]], blue, 0.75);
    drawing.pushTransform(); drawing.translate(273, 32);
    drawing.setColor(cyan); drawing.setIntensity(1.2); drawCircle(drawing, [0,0], 11);
    drawing.setColor(amber); drawing.setIntensity(1); drawing.moveTo(0, 8); drawing.lineTo(14, 15);
    drawing.popTransform();
    line([[348,104],[365,104],[365,121],[348,121],[348,104]], red, 1);
    line([[179,-42],[196,-42],[196,-25],[179,-25],[179,-42]], red, 1);
    line([[-95,-300],[-5,-300],[-5,-256],[-95,-256],[-95,-300]], selectedSetting === 6 ? amber : blue, 1);
    line([[25,-300],[115,-300],[115,-256],[25,-256],[25,-300]], selectedSetting === 7 ? amber : blue, 1);
    settingsLabel("RESET", -79, -286, selectedSetting === 6 ? amber : white, 15);
    settingsLabel("CLOSE", 42, -286, selectedSetting === 7 ? amber : white, 15);
    settingsLabel("UP / DOWN OR D-PAD: SELECT   LEFT / RIGHT: ADJUST", -448, -320, blue, 12);
    settingsLabel("ENTER / A: ACTIVATE   X: RESET   ESC / B: CLOSE", -448, -344, blue, 12);
    drawing.endFrame();
  }

  return {
    get displayProfile() { return { ...displayProfile }; },
    get audioPreferences() { return { ...audioPreferences }; },
    open() {
      selectedSetting = 0;
      audio.playEffects(["interface"]);
    },
    close() {
      audio.playEffects(["interface"]);
    },
    moveSelection,
    adjustSelection,
    activateSelection,
    resetDisplay,
    pointer,
    draw,
  };
}
