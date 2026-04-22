import { parseMidiMessage } from '../../src/midi/parser';

function bytes(...values: number[]): Uint8Array {
  return Uint8Array.from(values);
}

describe('parseMidiMessage', () => {
  const deviceId = 'test-device';
  const timestamp = 123;

  it('parses Note On on channel 1', () => {
    const msg = parseMidiMessage(bytes(0x90, 60, 100), deviceId, timestamp);
    expect(msg).toMatchObject({
      type: 'noteOn',
      channel: 1,
      note: 60,
      velocity: 100,
      deviceId,
      timestamp,
    });
  });

  it('parses Note On on channel 16', () => {
    const msg = parseMidiMessage(bytes(0x9f, 72, 80), deviceId, timestamp);
    expect(msg).toMatchObject({ type: 'noteOn', channel: 16 });
  });

  it('parses Note Off', () => {
    const msg = parseMidiMessage(bytes(0x80, 60, 64), deviceId, timestamp);
    expect(msg).toMatchObject({ type: 'noteOff', channel: 1, note: 60, velocity: 64 });
  });

  it('treats Note On with velocity 0 as Note Off', () => {
    const msg = parseMidiMessage(bytes(0x90, 60, 0), deviceId, timestamp);
    expect(msg).toMatchObject({ type: 'noteOff', channel: 1, note: 60, velocity: 0 });
  });

  it('parses Control Change', () => {
    const msg = parseMidiMessage(bytes(0xb0, 7, 127), deviceId, timestamp);
    expect(msg).toMatchObject({
      type: 'controlChange',
      channel: 1,
      controller: 7,
      value: 127,
    });
  });

  it('parses Program Change', () => {
    const msg = parseMidiMessage(bytes(0xc0, 42), deviceId, timestamp);
    expect(msg).toMatchObject({ type: 'programChange', channel: 1, program: 42 });
  });

  it('parses Pitch Bend (center)', () => {
    const msg = parseMidiMessage(bytes(0xe0, 0x00, 0x40), deviceId, timestamp);
    // LSB=0, MSB=64 → 64*128 + 0 = 8192. Converted to signed: 0.
    expect(msg).toMatchObject({ type: 'pitchBend', channel: 1, value: 0 });
  });

  it('parses Pitch Bend (max positive)', () => {
    const msg = parseMidiMessage(bytes(0xe0, 0x7f, 0x7f), deviceId, timestamp);
    expect(msg).toMatchObject({ type: 'pitchBend', channel: 1, value: 8191 });
  });

  it('parses Pitch Bend (max negative)', () => {
    const msg = parseMidiMessage(bytes(0xe0, 0x00, 0x00), deviceId, timestamp);
    expect(msg).toMatchObject({ type: 'pitchBend', channel: 1, value: -8192 });
  });

  it('parses Channel Pressure', () => {
    const msg = parseMidiMessage(bytes(0xd0, 90), deviceId, timestamp);
    expect(msg).toMatchObject({ type: 'channelPressure', channel: 1, pressure: 90 });
  });

  it('parses Polyphonic Aftertouch', () => {
    const msg = parseMidiMessage(bytes(0xa0, 60, 90), deviceId, timestamp);
    expect(msg).toMatchObject({
      type: 'polyAftertouch',
      channel: 1,
      note: 60,
      pressure: 90,
    });
  });

  it('parses SysEx (with F0/F7 framing)', () => {
    const msg = parseMidiMessage(bytes(0xf0, 0x41, 0x10, 0x42, 0xf7), deviceId, timestamp);
    expect(msg.type).toBe('sysex');
    if (msg.type === 'sysex') {
      expect(Array.from(msg.bytes)).toEqual([0xf0, 0x41, 0x10, 0x42, 0xf7]);
    }
  });

  it('parses MIDI Clock', () => {
    const msg = parseMidiMessage(bytes(0xf8), deviceId, timestamp);
    expect(msg.type).toBe('clock');
  });

  it('parses Start, Continue, Stop', () => {
    expect(parseMidiMessage(bytes(0xfa), deviceId, timestamp).type).toBe('start');
    expect(parseMidiMessage(bytes(0xfb), deviceId, timestamp).type).toBe('continue');
    expect(parseMidiMessage(bytes(0xfc), deviceId, timestamp).type).toBe('stop');
  });

  it('parses Active Sensing', () => {
    expect(parseMidiMessage(bytes(0xfe), deviceId, timestamp).type).toBe('activeSensing');
  });

  it('parses System Reset', () => {
    expect(parseMidiMessage(bytes(0xff), deviceId, timestamp).type).toBe('systemReset');
  });

  it('returns "unknown" for unrecognized status bytes', () => {
    const msg = parseMidiMessage(bytes(0xf4, 0x00), deviceId, timestamp);
    expect(msg.type).toBe('unknown');
    if (msg.type === 'unknown') {
      expect(Array.from(msg.bytes)).toEqual([0xf4, 0x00]);
    }
  });

  it('returns "unknown" for empty byte arrays', () => {
    const msg = parseMidiMessage(bytes(), deviceId, timestamp);
    expect(msg.type).toBe('unknown');
  });
});
