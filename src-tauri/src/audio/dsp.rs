use std::f32::consts::PI;

use serde::{Deserialize, Serialize};

pub const EQ_BAND_FREQS_HZ: [f32; 5] = [60.0, 230.0, 910.0, 3600.0, 14000.0];

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(default)]
pub struct AudioEnhancementsConfig {
    pub eq_enabled: bool,
    pub preamp_db: f32,
    pub bands_db: [f32; 5],
    pub replay_gain_enabled: bool,
    pub replay_gain_preamp_db: f32,
    pub gapless_enabled: bool,
    pub crossfade_ms: u32,
}

impl Default for AudioEnhancementsConfig {
    fn default() -> Self {
        Self {
            eq_enabled: false,
            preamp_db: 0.0,
            bands_db: [0.0; 5],
            replay_gain_enabled: false,
            replay_gain_preamp_db: 0.0,
            gapless_enabled: true,
            crossfade_ms: 0,
        }
    }
}

impl AudioEnhancementsConfig {
    pub fn clamped(mut self) -> Self {
        self.preamp_db = self.preamp_db.clamp(-12.0, 12.0);
        for b in &mut self.bands_db {
            *b = b.clamp(-12.0, 12.0);
        }
        self.replay_gain_preamp_db = self.replay_gain_preamp_db.clamp(-6.0, 6.0);
        self.crossfade_ms = self.crossfade_ms.min(8000);
        self
    }
}

pub fn db_to_linear(db: f32) -> f32 {
    10.0_f32.powf(db / 20.0)
}

pub fn parse_replay_gain_db(raw: &str) -> Option<f32> {
    let cleaned = raw
        .trim()
        .trim_end_matches(|c: char| !c.is_ascii_digit() && c != '.' && c != '-' && c != '+')
        .trim();
    cleaned.parse::<f32>().ok().map(|v| v.clamp(-24.0, 24.0))
}

#[derive(Debug, Clone, Copy)]
enum FilterKind {
    LowShelf,
    Peaking,
    HighShelf,
}

#[derive(Debug, Clone, Copy)]
struct StereoBiquad {
    b0: f32,
    b1: f32,
    b2: f32,
    a1: f32,
    a2: f32,
    x1: [f32; 2],
    x2: [f32; 2],
    y1: [f32; 2],
    y2: [f32; 2],
}

impl StereoBiquad {
    fn identity() -> Self {
        Self {
            b0: 1.0,
            b1: 0.0,
            b2: 0.0,
            a1: 0.0,
            a2: 0.0,
            x1: [0.0; 2],
            x2: [0.0; 2],
            y1: [0.0; 2],
            y2: [0.0; 2],
        }
    }

    fn design(&mut self, kind: FilterKind, sample_rate: u32, freq_hz: f32, gain_db: f32) {
        let sr = sample_rate.max(8000) as f32;
        let clamped_freq = freq_hz.min(sr * 0.45);
        let a = 10.0_f32.powf(gain_db / 40.0);
        let w0 = 2.0 * PI * clamped_freq / sr;
        let cos_w0 = w0.cos();
        let sin_w0 = w0.sin();

        let (b0, b1, b2, a0, a1, a2) = match kind {
            FilterKind::LowShelf => {
                let s = 1.0_f32;
                let alpha = sin_w0 * 0.5 * ((a + 1.0 / a) * (1.0 / s - 1.0) + 2.0).max(0.01).sqrt();
                let two_sqrt_a_alpha = 2.0 * a.sqrt() * alpha;
                (
                    a * ((a + 1.0) - (a - 1.0) * cos_w0 + two_sqrt_a_alpha),
                    2.0 * a * ((a - 1.0) - (a + 1.0) * cos_w0),
                    a * ((a + 1.0) - (a - 1.0) * cos_w0 - two_sqrt_a_alpha),
                    (a + 1.0) + (a - 1.0) * cos_w0 + two_sqrt_a_alpha,
                    -2.0 * ((a - 1.0) + (a + 1.0) * cos_w0),
                    (a + 1.0) + (a - 1.0) * cos_w0 - two_sqrt_a_alpha,
                )
            }
            FilterKind::Peaking => {
                let q = 1.1_f32;
                let alpha = sin_w0 / (2.0 * q);
                (
                    1.0 + alpha * a,
                    -2.0 * cos_w0,
                    1.0 - alpha * a,
                    1.0 + alpha / a,
                    -2.0 * cos_w0,
                    1.0 - alpha / a,
                )
            }
            FilterKind::HighShelf => {
                let s = 1.0_f32;
                let alpha = sin_w0 * 0.5 * ((a + 1.0 / a) * (1.0 / s - 1.0) + 2.0).max(0.01).sqrt();
                let two_sqrt_a_alpha = 2.0 * a.sqrt() * alpha;
                (
                    a * ((a + 1.0) + (a - 1.0) * cos_w0 + two_sqrt_a_alpha),
                    -2.0 * a * ((a - 1.0) + (a + 1.0) * cos_w0),
                    a * ((a + 1.0) + (a - 1.0) * cos_w0 - two_sqrt_a_alpha),
                    (a + 1.0) - (a - 1.0) * cos_w0 + two_sqrt_a_alpha,
                    2.0 * ((a - 1.0) - (a + 1.0) * cos_w0),
                    (a + 1.0) - (a - 1.0) * cos_w0 - two_sqrt_a_alpha,
                )
            }
        };

        let inv_a0 = if a0.abs() > 1e-8 { 1.0 / a0 } else { 1.0 };
        self.b0 = b0 * inv_a0;
        self.b1 = b1 * inv_a0;
        self.b2 = b2 * inv_a0;
        self.a1 = a1 * inv_a0;
        self.a2 = a2 * inv_a0;
    }

    fn process_sample(&mut self, ch: usize, x: f32) -> f32 {
        let y = self.b0 * x + self.b1 * self.x1[ch] + self.b2 * self.x2[ch]
            - self.a1 * self.y1[ch]
            - self.a2 * self.y2[ch];
        self.x2[ch] = self.x1[ch];
        self.x1[ch] = x;
        self.y2[ch] = self.y1[ch];
        self.y1[ch] = y;
        y
    }

    fn reset(&mut self) {
        self.x1 = [0.0; 2];
        self.x2 = [0.0; 2];
        self.y1 = [0.0; 2];
        self.y2 = [0.0; 2];
    }
}

pub struct EqualizerProcessor {
    filters: [StereoBiquad; 5],
    last_sample_rate: u32,
    last_bands_db: [f32; 5],
}

impl EqualizerProcessor {
    pub fn new() -> Self {
        Self {
            filters: [StereoBiquad::identity(); 5],
            last_sample_rate: 0,
            last_bands_db: [f32::NAN; 5],
        }
    }

    pub fn reset(&mut self) {
        for f in &mut self.filters {
            f.reset();
        }
    }

    fn sync_coefficients(&mut self, sample_rate: u32, bands_db: &[f32; 5]) {
        if self.last_sample_rate == sample_rate && self.last_bands_db == *bands_db {
            return;
        }
        let kinds = [
            FilterKind::LowShelf,
            FilterKind::Peaking,
            FilterKind::Peaking,
            FilterKind::Peaking,
            FilterKind::HighShelf,
        ];
        for i in 0..5 {
            self.filters[i].design(kinds[i], sample_rate, EQ_BAND_FREQS_HZ[i], bands_db[i]);
        }
        self.last_sample_rate = sample_rate;
        self.last_bands_db = *bands_db;
    }

    pub fn process_stereo(
        &mut self,
        samples: &mut [f32],
        sample_rate: u32,
        cfg: &AudioEnhancementsConfig,
        replay_gain_db: Option<f32>,
    ) {
        let mut gain = 1.0_f32;
        if cfg.replay_gain_enabled {
            if let Some(rg) = replay_gain_db {
                gain *= db_to_linear(rg + cfg.replay_gain_preamp_db);
            }
        }
        if cfg.eq_enabled {
            gain *= db_to_linear(cfg.preamp_db);
            self.sync_coefficients(sample_rate, &cfg.bands_db);
        }

        if !cfg.eq_enabled && (gain - 1.0).abs() < 1e-5 {
            return;
        }

        for pair in samples.as_chunks_mut::<2>().0 {
            let mut l = pair[0] * gain;
            let mut r = pair[1] * gain;
            if cfg.eq_enabled {
                for f in &mut self.filters {
                    l = f.process_sample(0, l);
                    r = f.process_sample(1, r);
                }
            }
            pair[0] = l.clamp(-1.0, 1.0);
            pair[1] = r.clamp(-1.0, 1.0);
        }
    }
}

impl Default for EqualizerProcessor {
    fn default() -> Self {
        Self::new()
    }
}

pub fn mix_crossfade_buffers(
    outgoing: &[f32],
    incoming: &[f32],
    start_frame: usize,
    total_fade_frames: usize,
) -> Vec<f32> {
    let out_frames = outgoing.len() / 2;
    let in_frames = incoming.len() / 2;
    let frames = out_frames.max(in_frames);
    let fade_denom = total_fade_frames.max(1) as f32;
    let mut mixed = Vec::with_capacity(frames * 2);

    for f in 0..frames {
        let progress = ((start_frame + f) as f32 / fade_denom).clamp(0.0, 1.0);
        let out_gain = (1.0 - progress).sqrt();
        let in_gain = progress.sqrt();

        let (ol, or) = if f < out_frames {
            (outgoing[f * 2], outgoing[f * 2 + 1])
        } else {
            (0.0, 0.0)
        };
        let (il, ir) = if f < in_frames {
            (incoming[f * 2], incoming[f * 2 + 1])
        } else {
            (0.0, 0.0)
        };

        mixed.push((ol * out_gain + il * in_gain).clamp(-1.0, 1.0));
        mixed.push((or * out_gain + ir * in_gain).clamp(-1.0, 1.0));
    }

    mixed
}

#[cfg(test)]
mod tests {
    use super::*;

    fn generate_sine_stereo(freq_hz: f32, sample_rate: u32, frames: usize, amp: f32) -> Vec<f32> {
        let mut out = Vec::with_capacity(frames * 2);
        for n in 0..frames {
            let s = amp * (2.0 * PI * freq_hz * n as f32 / sample_rate as f32).sin();
            out.push(s);
            out.push(s);
        }
        out
    }

    fn rms(samples: &[f32]) -> f32 {
        let sum: f32 = samples.iter().map(|s| s * s).sum();
        (sum / samples.len().max(1) as f32).sqrt()
    }

    #[test]
    fn flat_eq_preserves_unity_and_bass_boost_increases_60hz() {
        let sr = 44_100;
        let base = generate_sine_stereo(60.0, sr, 4096, 0.25);

        let mut flat = base.clone();
        let mut eq = EqualizerProcessor::new();
        let flat_cfg = AudioEnhancementsConfig {
            eq_enabled: true,
            ..Default::default()
        };
        eq.process_stereo(&mut flat, sr, &flat_cfg, None);
        assert!((rms(&flat) - rms(&base)).abs() < 0.01);

        let mut boosted = base.clone();
        let mut eq_boost = EqualizerProcessor::new();
        let boost_cfg = AudioEnhancementsConfig {
            eq_enabled: true,
            bands_db: [8.0, 0.0, 0.0, 0.0, 0.0],
            ..Default::default()
        };
        eq_boost.process_stereo(&mut boosted, sr, &boost_cfg, None);
        assert!(rms(&boosted) > rms(&base) * 1.6);
    }

    #[test]
    fn parses_replay_gain_and_mixes_crossfade() {
        assert_eq!(parse_replay_gain_db("-6.42 dB"), Some(-6.42));
        assert_eq!(parse_replay_gain_db("+2.50"), Some(2.5));
        assert!((db_to_linear(-6.0206) - 0.5).abs() < 0.01);

        let out = vec![1.0, 1.0, 1.0, 1.0];
        let inc = vec![0.0, 0.0, 0.0, 0.0];
        let mid = mix_crossfade_buffers(&out, &inc, 50, 100);
        assert!(mid[0] > 0.65 && mid[0] < 0.75);
    }
}
