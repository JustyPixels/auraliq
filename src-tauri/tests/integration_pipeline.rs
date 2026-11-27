use std::fs;
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::time::Instant;

use tempfile::tempdir;

use auraliq_lib::audio::dsp::{
    mix_crossfade_buffers, parse_replay_gain_db, AudioEnhancementsConfig, EqualizerProcessor,
};
use auraliq_lib::audio::fft::SpectrumAnalyzer;
use auraliq_lib::cache::CacheManager;
use auraliq_lib::database::models::CachedLyricsRecord;
use auraliq_lib::database::Database;
use auraliq_lib::downloads::{resolve_target_path, DownloadManager};
use auraliq_lib::library::playlists::{export_m3u8, parse_m3u};
use auraliq_lib::library::scan_all_folders;
use auraliq_lib::lyrics::{load_sidecar_lrc, lyrics_cache_key, parse_synced_lrc};
use auraliq_lib::providers::{OnlineTrack, ProviderRegistry};

fn write_test_wav(path: &Path, sample_rate: u32, num_samples: usize) {
    let mut bytes = Vec::with_capacity(44 + num_samples * 2);
    let data_len = (num_samples * 2) as u32;
    let byte_rate = sample_rate * 2;
    bytes.extend_from_slice(b"RIFF");
    bytes.extend_from_slice(&(36 + data_len).to_le_bytes());
    bytes.extend_from_slice(b"WAVEfmt ");
    bytes.extend_from_slice(&16u32.to_le_bytes());
    bytes.extend_from_slice(&1u16.to_le_bytes());
    bytes.extend_from_slice(&1u16.to_le_bytes());
    bytes.extend_from_slice(&sample_rate.to_le_bytes());
    bytes.extend_from_slice(&byte_rate.to_le_bytes());
    bytes.extend_from_slice(&2u16.to_le_bytes());
    bytes.extend_from_slice(&16u16.to_le_bytes());
    bytes.extend_from_slice(b"data");
    bytes.extend_from_slice(&data_len.to_le_bytes());
    for i in 0..num_samples {
        let t = i as f32 / sample_rate as f32;
        let sample = ((t * 440.0 * std::f32::consts::TAU).sin() * 12000.0) as i16;
        bytes.extend_from_slice(&sample.to_le_bytes());
    }
    fs::write(path, bytes).expect("write wav");
}

#[test]
fn library_scan_fts_playlists_and_missing_pipeline() {
    let dir = tempdir().unwrap();
    let music_dir = dir.path().join("music");
    let art_dir = dir.path().join("artwork");
    fs::create_dir_all(&music_dir).unwrap();

    let track_a = music_dir.join("retro_signal.wav");
    let track_b = music_dir.join("neon_echo.wav");
    write_test_wav(&track_a, 44_100, 4_410);
    write_test_wav(&track_b, 44_100, 4_410);

    let db = Database::open_in_memory().unwrap();
    db.add_folder(&music_dir.to_string_lossy()).unwrap();

    let summary = scan_all_folders(&db, &art_dir).unwrap();
    assert_eq!(summary.added, 2);
    assert_eq!(summary.missing, 0);

    let hits = db.search_tracks("retro_signal").unwrap();
    assert_eq!(hits.len(), 1);

    let pl = db.create_playlist("Night Mix", "Integration").unwrap();
    db.add_track_to_playlist(pl.id, hits[0].id).unwrap();

    let pl_tracks = db.get_playlist_tracks(pl.id).unwrap();
    let m3u8_text = export_m3u8(&pl_tracks);
    let parsed_paths = parse_m3u(&m3u8_text, &music_dir);
    assert_eq!(parsed_paths.len(), 1);
    assert_eq!(parsed_paths[0], track_a);

    fs::remove_file(&track_b).unwrap();
    let rescan = scan_all_folders(&db, &art_dir).unwrap();
    assert_eq!(rescan.missing, 1);
}

#[test]
fn audio_dsp_eq_replaygain_crossfade_and_fft_pipeline() {
    let mut stereo = Vec::with_capacity(2048);
    for i in 0..1024 {
        let s = 0.25 * (2.0 * std::f32::consts::PI * 120.0 * i as f32 / 44_100.0).sin();
        stereo.push(s);
        stereo.push(s);
    }

    let mut eq = EqualizerProcessor::new();
    let cfg = AudioEnhancementsConfig {
        eq_enabled: true,
        bands_db: [4.0, 2.0, 0.0, 1.0, 2.0],
        replay_gain_enabled: true,
        ..Default::default()
    };
    let rg = parse_replay_gain_db("-3.0 dB");
    eq.process_stereo(&mut stereo, 44_100, &cfg, rg);

    let mixed = mix_crossfade_buffers(&stereo, &stereo, 256, 1024);
    assert_eq!(mixed.len(), stereo.len());

    let mono: Vec<f32> = mixed
        .as_chunks::<2>()
        .0
        .iter()
        .map(|p| (p[0] + p[1]) * 0.5)
        .collect();
    let mut analyzer = SpectrumAnalyzer::new();
    let frame = analyzer.analyze(&mono);
    assert!(frame.peak > 0.01);
}

#[test]
fn download_and_cache_tos_and_lru_pipeline() {
    let dir = tempdir().unwrap();
    let db = Arc::new(Mutex::new(Database::open_in_memory().unwrap()));
    let providers = Arc::new(ProviderRegistry::new());

    let dm = DownloadManager::new(
        Arc::clone(&db),
        Arc::clone(&providers),
        dir.path().join("downloads"),
        dir.path().join("artwork"),
    )
    .unwrap();

    let blocked = OnlineTrack {
        provider_id: "youtube".into(),
        external_id: "yt1".into(),
        title: "Blocked".into(),
        artist: "YT".into(),
        album: "YT".into(),
        duration_ms: 1000,
        stream_url: None,
        download_url: None,
        artwork_url: None,
        external_url: None,
        license: None,
        downloadable: true,
    };
    assert!(dm.verify_download_permitted(&blocked).is_err());

    let reserved = resolve_target_path(
        dir.path(),
        "{artist}/{album}/{title}",
        "CON",
        "Album",
        "NUL",
        "mp3",
    )
    .unwrap();
    assert_eq!(reserved.file_name().unwrap(), "_NUL.mp3");
    assert!(reserved.to_string_lossy().contains("_CON"));

    let cache = CacheManager::new(Arc::clone(&db), dir.path().join("cache")).unwrap();
    let p = cache
        .store_file_bytes("audius", "a1", "Track", "Artist", "mp3", &[1, 2, 3, 4, 5])
        .unwrap();
    assert!(p.is_file());
    assert!(cache.lookup_valid("audius", "a1").unwrap().is_some());
    assert_eq!(cache.clear_all().unwrap(), 1);
}

#[test]
fn lyrics_sidecar_and_opt_in_default_pipeline() {
    let dir = tempdir().unwrap();
    let audio = dir.path().join("song.flac");
    let lrc = dir.path().join("song.lrc");
    fs::write(&audio, b"audio").unwrap();
    fs::write(&lrc, "[00:01.00]Hello 90s\n[00:05.50]Purple Deck").unwrap();

    let raw = load_sidecar_lrc(&audio).unwrap();
    let lines = parse_synced_lrc(&raw);
    assert_eq!(lines.len(), 2);
    assert_eq!(lines[1].time_ms, 5500);

    let db = Database::open_in_memory().unwrap();
    assert!(!db.get_lyrics_settings().unwrap().lrclib_enabled);

    let key = lyrics_cache_key("Song", "Artist", "Album");
    db.upsert_cached_lyrics(&CachedLyricsRecord {
        cache_key: key.clone(),
        title: "Song".into(),
        artist: "Artist".into(),
        source: "lrclib".into(),
        instrumental: false,
        plain_lyrics: Some("Hello 90s".into()),
        synced_lyrics: Some(raw),
        fetched_at: 100,
    })
    .unwrap();
    assert!(db.get_cached_lyrics(&key).unwrap().is_some());
    assert_eq!(db.clear_lyrics_cache().unwrap(), 1);
}

#[test]
fn batch_scan_performance_100_files() {
    let dir = tempdir().unwrap();
    let music_dir = dir.path().join("bulk");
    let art_dir = dir.path().join("art");
    fs::create_dir_all(&music_dir).unwrap();

    for i in 0..100 {
        write_test_wav(&music_dir.join(format!("track_{i:03}.wav")), 44_100, 1_024);
    }

    let db = Database::open_in_memory().unwrap();
    db.add_folder(&music_dir.to_string_lossy()).unwrap();

    let t0 = Instant::now();
    let first = scan_all_folders(&db, &art_dir).unwrap();
    let first_elapsed = t0.elapsed();
    assert_eq!(first.added, 100);
    assert!(
        first_elapsed.as_secs_f32() < 5.0,
        "100-file batch scan took too long: {first_elapsed:?}"
    );

    let t1 = Instant::now();
    let second = scan_all_folders(&db, &art_dir).unwrap();
    let second_elapsed = t1.elapsed();
    assert_eq!(second.added, 0);
    assert_eq!(second.updated, 0);
    assert!(
        second_elapsed.as_secs_f32() < 2.0,
        "incremental rescan took too long: {second_elapsed:?}"
    );
}
