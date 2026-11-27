use realfft::{RealFftPlanner, RealToComplex};
use serde::Serialize;
use std::sync::Arc;

pub const FFT_SIZE: usize = 512;
pub const NUM_BARS: usize = 24;
pub const NUM_WAVEFORM_POINTS: usize = 32;

#[derive(Debug, Clone, Serialize)]
pub struct VisualizerFrame {
    pub bars: Vec<f32>,
    pub waveform: Vec<f32>,
    pub peak: f32,
}

impl Default for VisualizerFrame {
    fn default() -> Self {
        Self {
            bars: vec![0.0; NUM_BARS],
            waveform: vec![0.0; NUM_WAVEFORM_POINTS],
            peak: 0.0,
        }
    }
}

pub struct SpectrumAnalyzer {
    fft: Arc<dyn RealToComplex<f32>>,
    window: Vec<f32>,
    input: Vec<f32>,
    spectrum: Vec<realfft::num_complex::Complex<f32>>,
    scratch: Vec<realfft::num_complex::Complex<f32>>,
}

impl SpectrumAnalyzer {
    pub fn new() -> Self {
        let mut planner = RealFftPlanner::<f32>::new();
        let fft = planner.plan_fft_forward(FFT_SIZE);
        let spectrum = fft.make_output_vec();
        let scratch = fft.make_scratch_vec();

        let window = (0..FFT_SIZE)
            .map(|i| {
                let phase = std::f32::consts::TAU * i as f32 / (FFT_SIZE - 1) as f32;
                0.5 * (1.0 - phase.cos())
            })
            .collect();

        Self {
            fft,
            window,
            input: vec![0.0; FFT_SIZE],
            spectrum,
            scratch,
        }
    }

    pub fn analyze(&mut self, mono_samples: &[f32]) -> VisualizerFrame {
        if mono_samples.is_empty() {
            return VisualizerFrame::default();
        }

        let mut peak = 0.0f32;
        for i in 0..FFT_SIZE {
            let sample = mono_samples.get(i).copied().unwrap_or(0.0);
            peak = peak.max(sample.abs());
            self.input[i] = sample * self.window[i];
        }

        if self
            .fft
            .process_with_scratch(&mut self.input, &mut self.spectrum, &mut self.scratch)
            .is_err()
        {
            return VisualizerFrame::default();
        }

        let max_bin = self.spectrum.len().saturating_sub(1).max(1);
        let mut bars = Vec::with_capacity(NUM_BARS);

        for bar_idx in 0..NUM_BARS {
            let t0 = bar_idx as f32 / NUM_BARS as f32;
            let t1 = (bar_idx + 1) as f32 / NUM_BARS as f32;
            let start_bin = ((max_bin as f32).powf(t0) as usize).clamp(1, max_bin);
            let end_bin = ((max_bin as f32).powf(t1) as usize).clamp(start_bin + 1, max_bin + 1);

            let mut sum = 0.0f32;
            let count = (end_bin - start_bin).max(1) as f32;
            for bin in start_bin..end_bin {
                sum += self.spectrum[bin].norm();
            }
            let avg_mag = sum / count;
            let normalized = ((avg_mag / (FFT_SIZE as f32 * 0.12)).ln_1p() / 2.2).clamp(0.0, 1.0);
            bars.push(normalized);
        }

        let step = (mono_samples.len() / NUM_WAVEFORM_POINTS).max(1);
        let waveform = (0..NUM_WAVEFORM_POINTS)
            .map(|i| {
                mono_samples
                    .get(i * step)
                    .copied()
                    .unwrap_or(0.0)
                    .clamp(-1.0, 1.0)
            })
            .collect();

        VisualizerFrame {
            bars,
            waveform,
            peak: peak.clamp(0.0, 1.0),
        }
    }
}

impl Default for SpectrumAnalyzer {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn silence_produces_zero_frame() {
        let mut analyzer = SpectrumAnalyzer::new();
        let frame = analyzer.analyze(&vec![0.0; FFT_SIZE]);
        assert_eq!(frame.peak, 0.0);
        assert!(frame.bars.iter().all(|&b| b == 0.0));
    }

    #[test]
    fn sine_wave_produces_spectrum_energy() {
        let mut analyzer = SpectrumAnalyzer::new();
        let samples: Vec<f32> = (0..FFT_SIZE)
            .map(|i| (i as f32 * 440.0 * std::f32::consts::TAU / 44_100.0).sin() * 0.8)
            .collect();
        let frame = analyzer.analyze(&samples);
        assert!(frame.peak > 0.3);
        assert!(frame.bars.iter().any(|&b| b > 0.05));
    }
}
