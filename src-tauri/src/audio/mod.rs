pub mod fft;
pub mod resampler;

use std::collections::VecDeque;
use std::fs::File;
use std::path::Path;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::mpsc::{self, Receiver, Sender};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{SampleFormat, Stream, StreamConfig};
use serde::Serialize;
use symphonia::core::audio::SampleBuffer;
use symphonia::core::codecs::{Decoder, DecoderOptions, CODEC_TYPE_NULL};
use symphonia::core::errors::Error as SymphoniaError;
use symphonia::core::formats::{FormatOptions, FormatReader, SeekMode, SeekTo};
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;
use symphonia::core::units::Time;
use symphonia::default::{get_codecs, get_probe};

use crate::error::AppError;
pub use fft::{SpectrumAnalyzer, VisualizerFrame, FFT_SIZE};
use resampler::resample_to_stereo;

#[derive(Debug, Clone, Serialize)]
pub struct AudioDeviceInfo {
    pub name: String,
    pub is_default: bool,
}

pub fn list_audio_devices() -> Vec<AudioDeviceInfo> {
    let host = cpal::default_host();
    let default_name = host.default_output_device().and_then(|d| d.name().ok());

    let Ok(devices) = host.output_devices() else {
        return Vec::new();
    };

    devices
        .filter_map(|d| d.name().ok())
        .map(|name| AudioDeviceInfo {
            is_default: default_name.as_deref() == Some(name.as_str()),
            name,
        })
        .collect()
}

#[derive(Debug, Clone, Serialize)]
pub struct PlaybackSnapshot {
    pub status: String,
    pub current_path: Option<String>,
    pub position_ms: u64,
    pub duration_ms: u64,
    pub volume: f32,
    pub muted: bool,
    pub track_ended: bool,
    pub output_device: Option<String>,
    pub last_error: Option<String>,
}

impl Default for PlaybackSnapshot {
    fn default() -> Self {
        Self {
            status: "idle".to_string(),
            current_path: None,
            position_ms: 0,
            duration_ms: 0,
            volume: 0.8,
            muted: false,
            track_ended: false,
            output_device: None,
            last_error: None,
        }
    }
}

enum AudioCommand {
    LoadAndPlay { path: String, start_ms: u64 },
    Play,
    Pause,
    Stop,
    Seek { position_ms: u64 },
    SelectOutputDevice { device_name: Option<String> },
}

pub struct AudioEngine {
    tx: Sender<AudioCommand>,
    snapshot: Arc<Mutex<PlaybackSnapshot>>,
    visualizer: Arc<Mutex<VisualizerFrame>>,
    volume_bits: Arc<AtomicU32>,
    muted: Arc<AtomicBool>,
}

struct LoadedDecoder {
    format: Box<dyn FormatReader>,
    decoder: Box<dyn Decoder>,
    track_id: u32,
    src_rate: u32,
    src_channels: usize,
    duration_ms: u64,
}

fn open_symphonia_decoder(path: &Path) -> Result<LoadedDecoder, AppError> {
    if path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.eq_ignore_ascii_case("wma"))
        .unwrap_or(false)
    {
        return Err(AppError::UnsupportedFormat(
            "WMA is not supported by the Symphonia audio engine".to_string(),
        ));
    }

    let file = File::open(path)?;
    let mss = MediaSourceStream::new(Box::new(file), Default::default());

    let mut hint = Hint::new();
    if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
        hint.with_extension(ext);
    }

    let probed = get_probe()
        .format(
            &hint,
            mss,
            &FormatOptions::default(),
            &MetadataOptions::default(),
        )
        .map_err(|e| AppError::UnsupportedFormat(format!("Unable to probe audio: {e}")))?;

    let format = probed.format;
    let track = format
        .tracks()
        .iter()
        .find(|t| t.codec_params.codec != CODEC_TYPE_NULL)
        .ok_or_else(|| AppError::UnsupportedFormat("No supported audio track found".to_string()))?;

    let track_id = track.id;
    let src_rate = track.codec_params.sample_rate.unwrap_or(44_100);
    let src_channels = track.codec_params.channels.map(|c| c.count()).unwrap_or(2);
    let duration_ms = match (track.codec_params.n_frames, track.codec_params.time_base) {
        (Some(frames), Some(tb)) => {
            let time = tb.calc_time(frames);
            time.seconds * 1000 + (time.frac * 1000.0) as u64
        }
        _ => 0,
    };

    let decoder = get_codecs()
        .make(&track.codec_params, &DecoderOptions::default())
        .map_err(|e| AppError::UnsupportedFormat(format!("Unsupported codec: {e}")))?;

    Ok(LoadedDecoder {
        format,
        decoder,
        track_id,
        src_rate,
        src_channels,
        duration_ms,
    })
}

fn init_cpal_output(
    preferred_device: Option<&str>,
    pcm_queue: Arc<Mutex<VecDeque<f32>>>,
    playing_flag: Arc<AtomicBool>,
    volume_bits: Arc<AtomicU32>,
    muted_flag: Arc<AtomicBool>,
    stream_error_flag: Arc<AtomicBool>,
) -> Result<(Stream, u32, String), AppError> {
    let host = cpal::default_host();

    let device = preferred_device
        .and_then(|target| {
            host.output_devices()
                .ok()
                .and_then(|mut devs| devs.find(|d| d.name().ok().as_deref() == Some(target)))
        })
        .or_else(|| host.default_output_device())
        .ok_or_else(|| AppError::Audio("No audio output device available".to_string()))?;

    let device_name = device
        .name()
        .unwrap_or_else(|_| "Default Output".to_string());
    let supported = device
        .default_output_config()
        .map_err(|e| AppError::Audio(format!("Output config error: {e}")))?;
    let sample_format = supported.sample_format();
    let sample_rate = supported.sample_rate().0;
    let channels = supported.channels() as usize;
    let config: StreamConfig = supported.into();

    let err_flag_cb = Arc::clone(&stream_error_flag);
    let err_callback = move |_err: cpal::StreamError| {
        err_flag_cb.store(true, Ordering::Relaxed);
    };

    let stream = match sample_format {
        SampleFormat::F32 => device.build_output_stream(
            &config,
            move |data: &mut [f32], _| {
                fill_output_f32(
                    data,
                    channels,
                    &pcm_queue,
                    &playing_flag,
                    &volume_bits,
                    &muted_flag,
                );
            },
            err_callback,
            None,
        ),
        SampleFormat::I16 => device.build_output_stream(
            &config,
            move |data: &mut [i16], _| {
                let mut temp = vec![0.0f32; data.len()];
                fill_output_f32(
                    &mut temp,
                    channels,
                    &pcm_queue,
                    &playing_flag,
                    &volume_bits,
                    &muted_flag,
                );
                for (dst, src) in data.iter_mut().zip(temp.iter()) {
                    *dst = (src.clamp(-1.0, 1.0) * i16::MAX as f32) as i16;
                }
            },
            err_callback,
            None,
        ),
        SampleFormat::U16 => device.build_output_stream(
            &config,
            move |data: &mut [u16], _| {
                let mut temp = vec![0.0f32; data.len()];
                fill_output_f32(
                    &mut temp,
                    channels,
                    &pcm_queue,
                    &playing_flag,
                    &volume_bits,
                    &muted_flag,
                );
                for (dst, src) in data.iter_mut().zip(temp.iter()) {
                    *dst = (((src.clamp(-1.0, 1.0) + 1.0) * 0.5) * u16::MAX as f32) as u16;
                }
            },
            err_callback,
            None,
        ),
        other => {
            return Err(AppError::Audio(format!(
                "Unsupported output sample format: {other:?}"
            )))
        }
    }
    .map_err(|e| AppError::Audio(format!("Failed to build audio stream: {e}")))?;

    stream
        .play()
        .map_err(|e| AppError::Audio(format!("Failed to start audio stream: {e}")))?;
    stream_error_flag.store(false, Ordering::Relaxed);
    Ok((stream, sample_rate, device_name))
}

fn fill_output_f32(
    data: &mut [f32],
    out_channels: usize,
    pcm_queue: &Arc<Mutex<VecDeque<f32>>>,
    playing_flag: &Arc<AtomicBool>,
    volume_bits: &Arc<AtomicU32>,
    muted_flag: &Arc<AtomicBool>,
) {
    if !playing_flag.load(Ordering::Relaxed) {
        data.fill(0.0);
        return;
    }

    let gain = if muted_flag.load(Ordering::Relaxed) {
        0.0
    } else {
        f32::from_bits(volume_bits.load(Ordering::Relaxed)).clamp(0.0, 1.0)
    };

    let mut guard = match pcm_queue.lock() {
        Ok(g) => g,
        Err(_) => {
            data.fill(0.0);
            return;
        }
    };

    let frames = data.len() / out_channels.max(1);
    for frame in 0..frames {
        let l = guard.pop_front().unwrap_or(0.0) * gain;
        let r = guard.pop_front().unwrap_or(0.0) * gain;
        let base = frame * out_channels;
        if out_channels == 1 {
            data[base] = (l + r) * 0.5;
        } else {
            data[base] = l;
            data[base + 1] = r;
            for ch in 2..out_channels {
                data[base + ch] = 0.0;
            }
        }
    }
}

fn reset_visualizer(visualizer: &Arc<Mutex<VisualizerFrame>>) {
    if let Ok(mut vis) = visualizer.lock() {
        *vis = VisualizerFrame::default();
    }
}

fn audio_worker_loop(
    rx: Receiver<AudioCommand>,
    snapshot: Arc<Mutex<PlaybackSnapshot>>,
    visualizer: Arc<Mutex<VisualizerFrame>>,
    volume_bits: Arc<AtomicU32>,
    muted_flag: Arc<AtomicBool>,
) {
    let pcm_queue: Arc<Mutex<VecDeque<f32>>> =
        Arc::new(Mutex::new(VecDeque::with_capacity(48_000)));
    let playing_flag = Arc::new(AtomicBool::new(false));
    let stream_error_flag = Arc::new(AtomicBool::new(false));
    let mut preferred_device: Option<String> = None;
    let mut output_stream: Option<(Stream, u32)> = None;
    let mut active_decoder: Option<LoadedDecoder> = None;
    let mut eof_reached = false;
    let mut decoded_frames_played: u64 = 0;

    let mut analyzer = SpectrumAnalyzer::new();
    let mut mono_ring: VecDeque<f32> = VecDeque::with_capacity(FFT_SIZE * 2);

    loop {
        if stream_error_flag.swap(false, Ordering::Relaxed) {
            output_stream = None;
            match init_cpal_output(
                preferred_device.as_deref(),
                Arc::clone(&pcm_queue),
                Arc::clone(&playing_flag),
                Arc::clone(&volume_bits),
                Arc::clone(&muted_flag),
                Arc::clone(&stream_error_flag),
            ) {
                Ok((stream, rate, dev_name)) => {
                    output_stream = Some((stream, rate));
                    if let Ok(mut snap) = snapshot.lock() {
                        snap.output_device = Some(dev_name);
                    }
                }
                Err(e) => {
                    playing_flag.store(false, Ordering::Relaxed);
                    reset_visualizer(&visualizer);
                    if let Ok(mut snap) = snapshot.lock() {
                        snap.status = "error".to_string();
                        snap.last_error = Some(format!("Audio device error: {e}"));
                    }
                }
            }
        }

        while let Ok(cmd) = rx.try_recv() {
            match cmd {
                AudioCommand::SelectOutputDevice { device_name } => {
                    preferred_device = device_name;
                    output_stream = None;
                    match init_cpal_output(
                        preferred_device.as_deref(),
                        Arc::clone(&pcm_queue),
                        Arc::clone(&playing_flag),
                        Arc::clone(&volume_bits),
                        Arc::clone(&muted_flag),
                        Arc::clone(&stream_error_flag),
                    ) {
                        Ok((stream, rate, dev_name)) => {
                            output_stream = Some((stream, rate));
                            if let Ok(mut snap) = snapshot.lock() {
                                snap.output_device = Some(dev_name);
                                snap.last_error = None;
                            }
                        }
                        Err(e) => {
                            if let Ok(mut snap) = snapshot.lock() {
                                snap.last_error = Some(e.to_string());
                            }
                        }
                    }
                }
                AudioCommand::LoadAndPlay { path, start_ms } => {
                    playing_flag.store(false, Ordering::Relaxed);
                    if let Ok(mut q) = pcm_queue.lock() {
                        q.clear();
                    }
                    mono_ring.clear();
                    active_decoder = None;
                    eof_reached = false;

                    if output_stream.is_none() {
                        match init_cpal_output(
                            preferred_device.as_deref(),
                            Arc::clone(&pcm_queue),
                            Arc::clone(&playing_flag),
                            Arc::clone(&volume_bits),
                            Arc::clone(&muted_flag),
                            Arc::clone(&stream_error_flag),
                        ) {
                            Ok((stream, rate, dev_name)) => {
                                output_stream = Some((stream, rate));
                                if let Ok(mut snap) = snapshot.lock() {
                                    snap.output_device = Some(dev_name);
                                }
                            }
                            Err(e) => {
                                reset_visualizer(&visualizer);
                                if let Ok(mut snap) = snapshot.lock() {
                                    snap.status = "error".to_string();
                                    snap.last_error = Some(e.to_string());
                                    snap.track_ended = false;
                                }
                                continue;
                            }
                        }
                    }

                    match open_symphonia_decoder(Path::new(&path)) {
                        Ok(mut loaded) => {
                            if start_ms > 0 {
                                let secs = start_ms / 1000;
                                let frac = (start_ms % 1000) as f64 / 1000.0;
                                let _ = loaded.format.seek(
                                    SeekMode::Accurate,
                                    SeekTo::Time {
                                        time: Time::new(secs, frac),
                                        track_id: Some(loaded.track_id),
                                    },
                                );
                            }
                            let dst_rate =
                                output_stream.as_ref().map(|(_, r)| *r).unwrap_or(44_100);
                            decoded_frames_played = (start_ms * u64::from(dst_rate)) / 1000;

                            if let Ok(mut snap) = snapshot.lock() {
                                snap.status = "playing".to_string();
                                snap.current_path = Some(path);
                                snap.position_ms = start_ms;
                                snap.duration_ms = loaded.duration_ms;
                                snap.track_ended = false;
                                snap.last_error = None;
                            }
                            active_decoder = Some(loaded);
                            playing_flag.store(true, Ordering::Relaxed);
                        }
                        Err(e) => {
                            reset_visualizer(&visualizer);
                            if let Ok(mut snap) = snapshot.lock() {
                                snap.status = "error".to_string();
                                snap.current_path = Some(path);
                                snap.last_error = Some(e.to_string());
                                snap.track_ended = false;
                            }
                        }
                    }
                }
                AudioCommand::Play => {
                    if active_decoder.is_some() {
                        playing_flag.store(true, Ordering::Relaxed);
                        if let Ok(mut snap) = snapshot.lock() {
                            snap.status = "playing".to_string();
                        }
                    }
                }
                AudioCommand::Pause => {
                    playing_flag.store(false, Ordering::Relaxed);
                    reset_visualizer(&visualizer);
                    if let Ok(mut snap) = snapshot.lock() {
                        if snap.status == "playing" {
                            snap.status = "paused".to_string();
                        }
                    }
                }
                AudioCommand::Stop => {
                    playing_flag.store(false, Ordering::Relaxed);
                    active_decoder = None;
                    eof_reached = false;
                    decoded_frames_played = 0;
                    mono_ring.clear();
                    reset_visualizer(&visualizer);
                    if let Ok(mut q) = pcm_queue.lock() {
                        q.clear();
                    }
                    if let Ok(mut snap) = snapshot.lock() {
                        snap.status = "idle".to_string();
                        snap.position_ms = 0;
                        snap.track_ended = false;
                    }
                }
                AudioCommand::Seek { position_ms } => {
                    if let Some(ref mut loaded) = active_decoder {
                        let secs = position_ms / 1000;
                        let frac = (position_ms % 1000) as f64 / 1000.0;
                        if loaded
                            .format
                            .seek(
                                SeekMode::Accurate,
                                SeekTo::Time {
                                    time: Time::new(secs, frac),
                                    track_id: Some(loaded.track_id),
                                },
                            )
                            .is_ok()
                        {
                            loaded.decoder.reset();
                            if let Ok(mut q) = pcm_queue.lock() {
                                q.clear();
                            }
                            mono_ring.clear();
                            let dst_rate =
                                output_stream.as_ref().map(|(_, r)| *r).unwrap_or(44_100);
                            decoded_frames_played = (position_ms * u64::from(dst_rate)) / 1000;
                            eof_reached = false;
                            if let Ok(mut snap) = snapshot.lock() {
                                snap.position_ms = position_ms;
                            }
                        }
                    }
                }
            }
        }

        if playing_flag.load(Ordering::Relaxed) {
            let dst_rate = output_stream.as_ref().map(|(_, r)| *r).unwrap_or(44_100);
            let max_buffered_samples = (dst_rate as usize) * 2;
            let queued_len = pcm_queue.lock().map(|q| q.len()).unwrap_or(0);

            if !eof_reached && queued_len < max_buffered_samples / 2 {
                if let Some(ref mut loaded) = active_decoder {
                    match loaded.format.next_packet() {
                        Ok(packet) => {
                            if packet.track_id() == loaded.track_id {
                                match loaded.decoder.decode(&packet) {
                                    Ok(decoded) => {
                                        let spec = *decoded.spec();
                                        let mut sbuf = SampleBuffer::<f32>::new(
                                            decoded.capacity() as u64,
                                            spec,
                                        );
                                        sbuf.copy_interleaved_ref(decoded);
                                        let stereo = resample_to_stereo(
                                            sbuf.samples(),
                                            loaded.src_channels,
                                            loaded.src_rate,
                                            dst_rate,
                                        );
                                        for pair in stereo.chunks_exact(2) {
                                            mono_ring.push_back((pair[0] + pair[1]) * 0.5);
                                            if mono_ring.len() > FFT_SIZE {
                                                mono_ring.pop_front();
                                            }
                                        }
                                        if mono_ring.len() == FFT_SIZE {
                                            let slice: Vec<f32> =
                                                mono_ring.iter().copied().collect();
                                            let frame = analyzer.analyze(&slice);
                                            if let Ok(mut vis) = visualizer.lock() {
                                                *vis = frame;
                                            }
                                        }
                                        let added_frames = (stereo.len() / 2) as u64;
                                        if let Ok(mut q) = pcm_queue.lock() {
                                            q.extend(stereo);
                                        }
                                        decoded_frames_played += added_frames;
                                    }
                                    Err(SymphoniaError::DecodeError(_)) => {}
                                    Err(_) => eof_reached = true,
                                }
                            }
                        }
                        Err(_) => {
                            eof_reached = true;
                        }
                    }
                }
            }

            let remaining_frames = pcm_queue.lock().map(|q| (q.len() / 2) as u64).unwrap_or(0);
            let played_frames = decoded_frames_played.saturating_sub(remaining_frames);
            let position_ms = (played_frames * 1000) / u64::from(dst_rate.max(1));

            if eof_reached && remaining_frames == 0 {
                playing_flag.store(false, Ordering::Relaxed);
                active_decoder = None;
                reset_visualizer(&visualizer);
                if let Ok(mut snap) = snapshot.lock() {
                    snap.status = "ended".to_string();
                    snap.position_ms = snap.duration_ms;
                    snap.track_ended = true;
                }
            } else if let Ok(mut snap) = snapshot.lock() {
                snap.position_ms = position_ms;
            }
        }

        thread::sleep(Duration::from_millis(12));
    }
}

impl AudioEngine {
    pub fn new() -> Self {
        let (tx, rx) = mpsc::channel();
        let snapshot = Arc::new(Mutex::new(PlaybackSnapshot::default()));
        let visualizer = Arc::new(Mutex::new(VisualizerFrame::default()));
        let volume_bits = Arc::new(AtomicU32::new(0.8f32.to_bits()));
        let muted = Arc::new(AtomicBool::new(false));

        let snap_clone = Arc::clone(&snapshot);
        let vis_clone = Arc::clone(&visualizer);
        let vol_clone = Arc::clone(&volume_bits);
        let mute_clone = Arc::clone(&muted);

        thread::Builder::new()
            .name("auraliq-audio".to_string())
            .spawn(move || {
                audio_worker_loop(rx, snap_clone, vis_clone, vol_clone, mute_clone);
            })
            .expect("failed to spawn audio worker thread");

        Self {
            tx,
            snapshot,
            visualizer,
            volume_bits,
            muted,
        }
    }

    pub fn load_and_play(&self, path: String, start_ms: u64) -> Result<(), AppError> {
        self.tx
            .send(AudioCommand::LoadAndPlay { path, start_ms })
            .map_err(|e| AppError::Audio(e.to_string()))
    }

    pub fn play(&self) -> Result<(), AppError> {
        self.tx
            .send(AudioCommand::Play)
            .map_err(|e| AppError::Audio(e.to_string()))
    }

    pub fn pause(&self) -> Result<(), AppError> {
        self.tx
            .send(AudioCommand::Pause)
            .map_err(|e| AppError::Audio(e.to_string()))
    }

    pub fn stop(&self) -> Result<(), AppError> {
        self.tx
            .send(AudioCommand::Stop)
            .map_err(|e| AppError::Audio(e.to_string()))
    }

    pub fn seek(&self, position_ms: u64) -> Result<(), AppError> {
        self.tx
            .send(AudioCommand::Seek { position_ms })
            .map_err(|e| AppError::Audio(e.to_string()))
    }

    pub fn select_output_device(&self, device_name: Option<String>) -> Result<(), AppError> {
        self.tx
            .send(AudioCommand::SelectOutputDevice { device_name })
            .map_err(|e| AppError::Audio(e.to_string()))
    }

    pub fn set_volume(&self, volume: f32) {
        let clamped = volume.clamp(0.0, 1.0);
        self.volume_bits.store(clamped.to_bits(), Ordering::Relaxed);
        if let Ok(mut snap) = self.snapshot.lock() {
            snap.volume = clamped;
        }
    }

    pub fn set_muted(&self, muted: bool) {
        self.muted.store(muted, Ordering::Relaxed);
        if let Ok(mut snap) = self.snapshot.lock() {
            snap.muted = muted;
        }
    }

    pub fn snapshot(&self) -> PlaybackSnapshot {
        self.snapshot.lock().map(|s| s.clone()).unwrap_or_default()
    }

    pub fn visualizer_frame(&self) -> VisualizerFrame {
        self.visualizer
            .lock()
            .map(|v| v.clone())
            .unwrap_or_default()
    }
}

impl Default for AudioEngine {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn lists_audio_devices_without_panicking() {
        let _devices = list_audio_devices();
    }

    #[test]
    fn decodes_wav_samples_and_rejects_wma() {
        let dir = tempdir().unwrap();
        let wma_path = dir.path().join("legacy.wma");
        fs::write(&wma_path, b"dummy").unwrap();
        assert!(matches!(
            open_symphonia_decoder(&wma_path),
            Err(AppError::UnsupportedFormat(_))
        ));

        let wav_path = dir.path().join("tone.wav");
        crate::library::tests::write_test_wav(&wav_path, 44100, 4410);
        let mut loaded = open_symphonia_decoder(&wav_path).expect("should open wav");
        assert_eq!(loaded.src_rate, 44100);
        assert!(loaded.duration_ms >= 90);

        let packet = loaded.format.next_packet().expect("packet");
        let decoded = loaded.decoder.decode(&packet).expect("decode");
        assert!(decoded.frames() > 0);
    }
}
